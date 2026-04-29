import json
import os
import re
import sys
import argparse
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# Ensure local imports work when running as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from standalone_pdf2ppt import PDF2PPTx, PPTXGenerator
    from text_utils import build_section_context
    from vision import enrich_catalog
    from utils import _emit, _truncate_words, _parse_jsonish
    from llm_utils import (
        _choose_text_model, _validate_local_models, build_provider, build_task_provider,
        _generate_structured_json, _unload_ollama_models
    )
    from processors import LocalVisionPDFProcessor
    from core_logic import (
        _rank_figures_for_text, _assign_figures_to_slides, _serialize_figure,
        _rank_equations_for_text, _serialize_equation, _slide_content_text
    )
except (ImportError, ModuleNotFoundError):
    from .standalone_pdf2ppt import PDF2PPTx, PPTXGenerator
    from .text_utils import build_section_context
    from .vision import enrich_catalog
    from .utils import _emit, _truncate_words, _parse_jsonish
    from .llm_utils import (
        _choose_text_model, _validate_local_models, build_provider, build_task_provider,
        _generate_structured_json, _unload_ollama_models
    )
    from .processors import LocalVisionPDFProcessor
    from .core_logic import (
        _rank_figures_for_text, _assign_figures_to_slides, _serialize_figure,
        _rank_equations_for_text, _serialize_equation, _slide_content_text
    )

class PDF2PPTxBridge(PDF2PPTx):
    def _normalize_slide_payload(self, payload, orig_slide):
        fallback_title = str(orig_slide.get("title") or "Untitled").strip() or "Untitled"
        normalized = payload if isinstance(payload, dict) else {}

        title = str(normalized.get("title") or fallback_title).strip() or fallback_title

        normalized_points = []
        raw_points = normalized.get("points", [])
        if isinstance(raw_points, list):
            for raw_point in raw_points:
                if not isinstance(raw_point, dict):
                    continue
                heading = str(raw_point.get("heading") or "").strip()
                raw_content = raw_point.get("content", [])
                if isinstance(raw_content, list):
                    content = [str(item).strip() for item in raw_content if str(item).strip()]
                elif isinstance(raw_content, str) and raw_content.strip():
                    content = [raw_content.strip()]
                else:
                    content = []
                if heading or content:
                    normalized_points.append({"heading": heading, "content": content})

        fig_ids = []
        model_fig_id = normalized.get("fig_id")
        if model_fig_id:
            fig_ids.append(str(model_fig_id))
        for requested_fig_id in orig_slide.get("fig_ids", []):
            if requested_fig_id and requested_fig_id not in fig_ids:
                fig_ids.append(requested_fig_id)

        return {
            "title": title,
            "points": normalized_points,
            "fig_id": fig_ids[0] if fig_ids else None,
            "fig_ids": fig_ids,
        }

    def convert_to_json(self, pdf_path, json_output, pptx_output=None, start=0, end=-1, 
                        max_slides=0, max_sections=0, json_progress=False, status_callback=None):
        
        stage_ranges = {
            "processing": (6, 18), "vision_extract": (18, 36), "vision": (36, 38), 
            "analysis": (54, 62), "storyboard": (62, 70), "section": (70, 96), 
            "export": (96, 99), "done": (100, 100)
        }

        def emit(event, message, data=None):
            payload = dict(data or {})
            if "percent" not in payload:
                s, e = stage_ranges.get(event, (0, 0))
                curr, tot = payload.get("current"), payload.get("total")
                if tot and float(tot) > 0:
                    payload["percent"] = int(round(s + (e - s) * (float(curr) / float(tot))))
                else:
                    payload["percent"] = e if event == "done" else s
            if status_callback:
                try: status_callback(event, message, payload)
                except: status_callback(message)
            _emit(event, message, payload, json_mode=json_progress)

        # 1. Extract
        emit("processing", "Extracting text and visuals from PDF")
        proc = LocalVisionPDFProcessor(pdf_path, self.llm, status_callback=lambda ev, msg, data=None: emit(ev, msg, data))
        proc.extract_visuals_hybrid()
        full_text = proc.extract_text(start, end)
        mineru_summary = self._summarize_mineru_context(getattr(proc, "mineru_context", {}) or {})
        
        # 2. Enrich
        emit("vision", "Running local vision LLM on figures")
        enriched_catalog = enrich_catalog(proc.visual_catalog, status_cb=lambda ev, msg, data=None: emit(ev, msg, data))
        
        # 3. Plan
        planning_llm = build_task_provider(task="planning", allow_remote=True)
        paper_frame = self._frame_paper(planning_llm, enriched_catalog, mineru_summary, full_text, emit)
        storyboard = self._plan_storyboard(planning_llm, paper_frame, enriched_catalog, emit)
        if isinstance(storyboard, list): storyboard = {"slides": storyboard}
        if not isinstance(storyboard, dict): storyboard = {"slides": []}
        
        # 4. Generate
        slide_llm = build_task_provider(task="slide_writing", allow_remote=True)
        return self._generate_slides(
            storyboard, enriched_catalog, full_text, mineru_summary, slide_llm,
            json_output, pptx_output, max_slides, max_sections, emit, paper_frame, getattr(proc, "mineru_context", {})
        )

    def _summarize_mineru_context(self, context):
        return {
            "backend": context.get("backend"),
            "visuals": [{"page": i.get("page"), "caption": i.get("caption", ""), "path": i.get("path")} for i in (context.get("visuals") or [])[:18]],
            "figure_captions": (context.get("captions") or [])[:24],
            "equations": [{"page": i.get("page"), "label": i.get("label", ""), "latex": i.get("latex", "")} for i in (context.get("equations") or [])[:16]],
        }

    def _frame_paper(self, llm, catalog, summary, text, emit):
        emit("analysis", "Extracting the paper's central thesis and evidence")
        prompt = (
            "You are a senior scientific editor. Identify the core innovation, problem, and evidence.\n"
            f"Figures: {json.dumps([{'id': f['id'], 'caption': f.get('vision', {}).get('caption_enhanced') or f.get('caption', '')} for f in catalog])}\n"
            f"Paper excerpt: {text[:18000]}"
        )
        res = _generate_structured_json(llm, prompt, "Scientific analysis mode.", "paper framing")
        if not isinstance(res, dict): res = {}
        return res

    def _plan_storyboard(self, llm, frame, catalog, emit):
        emit("storyboard", "Developing scientific narrative storyboard")
        prompt = (
            "You are designing a high-impact scientific presentation.\n\n"
            "Create a **narrative arc (8–12 slides)** that:\n"
            "* builds curiosity\n"
            "* reveals insight progressively\n"
            "* ends with a strong takeaway\n\n"
            "Each slide must have:\n"
            "* a **clear claim**\n"
            "* a **role in the story**\n\n"
            "Structure:\n"
            "{\n"
            '  "title": "Talk title (compelling, not generic)",\n'
            '  "sub": "Subtitle (what audience gains)",\n'
            '  "authors": "List of authors (if available)",\n'
            '  "journal_name": "Journal or conference name (if available)",\n'
            '  "publish_date": "Publication date/year (if available)",\n'
            '  "doi": "DOI string (if available)",\n'
            '  "slides": [\n'
            "    {\n"
            '      "section": "Act (Setup / Problem / Method / Insight / Impact)",\n'
            '      "title": "Short, punchy title",\n'
            '      "goal": "What audience learns",\n'
            '      "fig_ids": ["relevant figure ids"],\n'
            '      "context_keywords": ["keywords"]\n'
            "    }\n"
            "  ]\n"
            "}\n\n"
            "Rules:\n"
            "* Start with a **hook**\n"
            "* Build tension → resolve → insight\n"
            "* Avoid flat structure\n"
            "* Each slide must feel necessary\n\n"
            "Return JSON only.\n\n"
            f"Paper frame: {json.dumps(frame)}\n"
            f"Figures: {json.dumps([{'id': f['id'], 'caption': f.get('vision', {}).get('caption_enhanced') or f.get('caption', '')} for f in catalog])}\n"
        )
        return _generate_structured_json(llm, prompt, "Storyboarding mode.", "scientific storyboarding")

    def _generate_slides(self, storyboard, enriched_catalog, full_text, mineru_summary, slide_llm, 
                         json_output, pptx_output, max_slides, max_sections, emit, paper_frame, mineru_context):
        gen = PPTXGenerator()
        gen.add_title(storyboard.get("title"), storyboard.get("sub"))
        export_data = {
            "title": storyboard.get("title"), 
            "sub": storyboard.get("sub"), 
            "authors": storyboard.get("authors"),
            "journal_name": storyboard.get("journal_name"),
            "publish_date": storyboard.get("publish_date"),
            "doi": storyboard.get("doi"),
            "slides": []
        }
        
        sections = []
        current_section = None
        for s_slide in storyboard.get("slides", []):
            s_name = s_slide.get("section", "Main")
            if not current_section or current_section["name"] != s_name:
                current_section = {"name": s_name, "slides": []}
                sections.append(current_section)
            current_section["slides"].append({
                "title": s_slide.get("title"), "claim": s_slide.get("goal"),
                "fig_ids": s_slide.get("fig_ids") or ([s_slide.get("fig_id")] if s_slide.get("fig_id") else []),
                "keywords": s_slide.get("context_keywords", [])
            })

        if max_sections: sections = sections[:max_sections]
        total_content_slides = 0
        planned_total = sum(len(s["slides"]) for s in sections)
        if max_slides: planned_total = min(planned_total, max_slides)

        candidate_figure_map = {f["id"]: f for f in enriched_catalog}
        generated_sections = []

        for s_idx, section in enumerate(sections):
            emit("section", f"Elaborating section {s_idx+1}/{len(sections)}: {section['name']}", {"current": total_content_slides, "total": planned_total})

            # Parallel slide generation for speed
            def process_slide(orig_slide):
                keywords = orig_slide.get("keywords", [])
                search_query = " ".join(keywords) if keywords else orig_slide["title"]
                slide_source_text = build_section_context(full_text, search_query, max_chars=8000)
                
                requested_fids = orig_slide.get("fig_ids", [])
                ordered_figures = []
                for fid in requested_fids:
                    if fid in candidate_figure_map: ordered_figures.append(_serialize_figure(candidate_figure_map[fid]))
                
                ranked = _rank_figures_for_text(f"{orig_slide['title']} {orig_slide['claim']}", enriched_catalog, limit=4)
                for r in ranked:
                    if r["id"] not in requested_fids: ordered_figures.append(_serialize_figure(r))

                prompt = (
                    "You are an elite scientific communicator and slide designer (level: top conference keynote / TED).\n\n"
                    "Your task is to convert technical content into **visually striking, cognitively efficient slides**.\n\n"
                    "## 🎯 Goals\n\n"
                    "* Each slide communicates **ONE clear idea**\n"
                    "* Audience understands in **<5 seconds**\n"
                    "* Content is **minimal but impactful**\n"
                    "* Feels like a **talk, not a document**\n\n"
                    "---\n\n"
                    "## 📐 Strict Design Rules\n\n"
                    "1. Max **3–4 bullets total**\n"
                    "2. Each bullet ≤ **8 words**\n"
                    "3. Use **strong, declarative language**\n"
                    "4. No filler words, no repetition\n"
                    "5. Prefer:\n"
                    "   * contrasts\n"
                    "   * cause → effect\n"
                    "   * problem → solution\n\n"
                    "---\n\n"
                    "## 🎨 Visual Thinking\n\n"
                    "* If a figure is provided → make it central\n"
                    "* Text should **support the figure, not repeat it**\n"
                    "* Emphasize:\n"
                    "  * trends\n"
                    "  * comparisons\n"
                    "  * anomalies\n\n"
                    "---\n\n"
                    "## 🧠 Narrative Style\n\n"
                    "Transform this:\n"
                    "BAD:\n"
                    "* \"The method improves accuracy\"\n"
                    "GOOD:\n"
                    "* \"Accuracy jumps 3× under noise\"\n\n"
                    "---\n\n"
                    "## 🧩 Structure\n\n"
                    "Return JSON:\n"
                    "{\n"
                    '  "title": "Short, punchy, curiosity-driven title",\n'
                    '  "fig_id": "best matching figure id (or null)",\n'
                    '  "points": [\n'
                    "    {\n"
                    '      "heading": "Key idea (max 4 words)",\n'
                    '      "content": [\n'
                    '        "bullet 1",\n'
                    '        "bullet 2"\n'
                    "      ]\n"
                    "    }\n"
                    "  ]\n"
                    "}\n\n"
                    "---\n\n"
                    "## ⚡ Context\n\n"
                    f"Section: {section['name']}\n"
                    f"Slide Title: {orig_slide['title']}\n"
                    f"Claim: {orig_slide['claim']}\n"
                    f"Figures: {json.dumps(ordered_figures[:4])}\n"
                    f"Text Context: {slide_source_text[:8000]}\n\n"
                    "---\n\n"
                    "## 🚫 Avoid\n\n"
                    "* Long sentences\n"
                    "* Paragraphs\n"
                    "* Rephrasing paper text\n"
                    "* Redundant bullets\n\n"
                    "---\n\n"
                    "## 🧠 Think before writing\n\n"
                    "First decide:\n"
                    "* What is the **one takeaway?**\n"
                    "* What will the audience remember?\n\n"
                    "Then write.\n\n"
                    "Return only JSON."
                )
                res = _generate_structured_json(slide_llm, prompt, "Write technical slides.", "slide generation")
                return self._normalize_slide_payload(res, orig_slide)

            with ThreadPoolExecutor(max_workers=5) as executor:
                slides_to_process = section["slides"]
                if max_slides:
                    remaining = max_slides - total_content_slides
                    if remaining <= 0: break
                    slides_to_process = slides_to_process[:remaining]
                
                generated_slides = list(executor.map(process_slide, slides_to_process))
                generated_sections.append({"name": section["name"], "slides": generated_slides})
                total_content_slides += len(generated_slides)

        flat_generated_slides = [slide for section in generated_sections for slide in section["slides"]]
        assigned = _assign_figures_to_slides(flat_generated_slides, enriched_catalog)

        flat_idx = 0
        for section in generated_sections:
            gen.add_section_slide(section["name"])
            export_data["slides"].append({"type": "section", "title": section["name"]})

            for s_data in section["slides"]:
                fids = assigned.get(flat_idx, [])
                slide_visuals = []
                for fid in fids:
                    fig = candidate_figure_map.get(fid)
                    if fig: slide_visuals.append({"id": fid, "path": fig.get("path"), "caption": fig.get("vision", {}).get("caption_enhanced") or fig.get("caption", "")})
                
                fig_paths = [v["path"] for v in slide_visuals]
                gen.add_content_slide(s_data["title"], s_data.get("points", []), fig_paths=fig_paths)
                export_data["slides"].append({
                    "type": "content", "title": s_data["title"], "points": s_data.get("points", []),
                    "visual_id": slide_visuals[0]["id"] if slide_visuals else None,
                    "visuals": slide_visuals
                })
                flat_idx += 1

        if pptx_output: gen.save(pptx_output)
        with open(json_output, "w", encoding="utf-8") as f: json.dump(export_data, f, indent=2, ensure_ascii=False)
        emit("done", "Conversion complete", {"percent": 100})
        return export_data

def main():
    parser = argparse.ArgumentParser(description="PPTMaker ↔ PDF2PPT Bridge: Convert a PDF into PPTMaker JSON")
    parser.add_argument("-i", "--input", required=True, help="Path to the input PDF")
    parser.add_argument("-o", "--output", default="presentation_export.json", help="Path for the output JSON")
    parser.add_argument("--pptx", default=None, help="Also save a traditional .pptx")
    parser.add_argument("--start", type=int, default=0, help="Start page (0-indexed)")
    parser.add_argument("--end", type=int, default=-1, help="End page (-1 = all)")
    parser.add_argument("--slides", type=int, default=0, help="Cap total content slides (0=unlimited)")
    parser.add_argument("--sections", type=int, default=0, help="Cap sections processed (0=unlimited)")
    parser.add_argument("--json-progress", action="store_true", help="Emit JSON events on stdout")
    parser.add_argument(
        "--allow-remote-llm",
        action="store_true",
        help="Allow Gemini/Groq fallback for text generation",
    )
    args = parser.parse_args()

    if not args.allow_remote_llm:
        _validate_local_models()
    
    provider = build_provider(allow_remote=args.allow_remote_llm)
    bridge = PDF2PPTxBridge(provider)
    bridge.convert_to_json(
        pdf_path=args.input,
        json_output=args.output,
        pptx_output=args.pptx,
        start=args.start,
        end=args.end,
        max_slides=args.slides,
        max_sections=args.sections,
        json_progress=args.json_progress,
    )

if __name__ == "__main__":
    main()
