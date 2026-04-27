import os
import re
import sys
import json
import time
import subprocess
import requests
from PIL import Image

# Ensure local imports work when running as a script
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from standalone_pdf2ppt import PDFProcessor
    from llm_utils import _unload_ollama_models
except (ImportError, ModuleNotFoundError):
    from .standalone_pdf2ppt import PDFProcessor
    from .llm_utils import _unload_ollama_models

_MINERU_VISUAL_TYPES = {"image", "figure", "chart", "diagram", "plot", "table", "picture"}
_LOW_SIGNAL_CAPTION_RE = re.compile(
    r"\b(aip publishing|all rights reserved|copyright|journal|publisher|view article online|downloaded from|graphical abstract|table of contents)\b",
    re.I,
)
_MIN_VISUAL_WIDTH = 40
_MIN_VISUAL_HEIGHT = 40
_MIN_VISUAL_AREA = 4000
_FIGURE_CAPTION_RE = re.compile(r"^\*?\*?\s*(fig(?:ure)?|table|scheme|chart)\b", re.I)

class LocalVisionPDFProcessor(PDFProcessor):
    def __init__(self, filepath: str, llm_provider=None, status_callback=None):
        super().__init__(filepath, llm_provider)
        self.status_callback = status_callback
        self.marker_markdown = ""

    def _emit_status(self, event: str, message: str, data: dict | None = None):
        if self.status_callback:
            try: self.status_callback(event, message, data)
            except: self.status_callback(event, message)

    def extract_visuals_hybrid(self):
        return self._extract_visuals_marker()

    def _extract_visuals_marker(self):
        base_name = os.path.splitext(os.path.basename(self.filepath))[0]
        marker_out_dir = os.path.join(self.figures_dir, "marker_output")
        md_file = os.path.join(marker_out_dir, base_name, f"{base_name}.md")

        if not os.path.exists(md_file):
            self._emit_status("vision", f"Running Marker layout parsing on {base_name}")
            _unload_ollama_models()
            time.sleep(5) 
            marker_bin = os.path.join(os.path.dirname(sys.executable), "marker_single")
            if not os.path.exists(marker_bin): marker_bin = "marker_single"

            cmd = [marker_bin, self.filepath, "--output_dir", marker_out_dir, "--output_format", "markdown", "--PageExtractor_extraction_page_chunk_size", "1"]
            env = os.environ.copy()
            env["PYTORCH_ALLOC_CONF"] = "expandable_segments:True"
            try:
                subprocess.run(cmd, check=True, env=env)
            except:
                self._emit_status("vision", "Marker GPU call failed, attempting CPU fallback...")
                env["CUDA_VISIBLE_DEVICES"] = ""
                try: subprocess.run(cmd, check=True, env=env)
                except: return []

        if not os.path.exists(md_file): return []
        with open(md_file, "r", encoding="utf-8") as f: self.marker_markdown = f.read()

        extracted = []
        pattern = re.compile(r'!\[(.*?)\]\((.*?\.jpeg|.*?\.png)\)')
        lines = self.marker_markdown.split('\n')
        idx = 0
        while idx < len(lines):
            line = lines[idx]
            match = pattern.search(line)
            if not match:
                idx += 1
                continue

            block = []
            block_start = idx
            while idx < len(lines):
                current_line = lines[idx].strip()
                current = pattern.search(lines[idx])
                if current:
                    block.append((current.group(1).strip(), current.group(2)))
                    idx += 1
                    continue
                if not current_line:
                    idx += 1
                    continue
                break

            caption = self._infer_marker_caption(lines, block_start, idx, block)
            if caption and _LOW_SIGNAL_CAPTION_RE.search(caption):
                continue

            valid_items = []
            for _, img_rel_path in block:
                img_path = os.path.join(marker_out_dir, base_name, img_rel_path)
                if not os.path.exists(img_path):
                    continue
                try:
                    with Image.open(img_path) as img:
                        w, h = img.size
                except Exception:
                    w, h = 1000, 1000
                if w < _MIN_VISUAL_WIDTH or h < _MIN_VISUAL_HEIGHT or (w * h) < _MIN_VISUAL_AREA:
                    continue
                valid_items.append({
                    "rel_path": img_rel_path,
                    "path": img_path,
                    "width": w,
                    "height": h,
                })

            if not valid_items:
                continue

            if len(valid_items) > 1 and caption and _FIGURE_CAPTION_RE.search(caption):
                merged = self._merge_marker_panels(marker_out_dir, base_name, valid_items)
                if merged:
                    extracted.append({
                        "id": merged["id"],
                        "path": merged["path"],
                        "caption": caption,
                        "kind": "image",
                        "page": self._guess_page_from_filename(valid_items[0]["rel_path"]),
                        "width": merged["width"],
                        "height": merged["height"],
                        "panel_count": len(valid_items),
                        "source_paths": [os.path.abspath(item["path"]) for item in valid_items],
                    })
                    continue

            for item in valid_items:
                extracted.append({
                    "id": f"marker_{os.path.splitext(os.path.basename(item['path']))[0]}",
                    "path": os.path.abspath(item["path"]),
                    "caption": caption or f"Extracted visual {item['rel_path']}",
                    "kind": "image",
                    "page": self._guess_page_from_filename(item["rel_path"]),
                    "width": item["width"],
                    "height": item["height"],
                })
        self.visual_catalog = extracted
        return extracted

    def _infer_marker_caption(self, lines, block_start, block_end, block):
        inline = next((caption for caption, _ in block if caption), "")
        if inline:
            return inline

        for lookahead in range(block_end, min(len(lines), block_end + 8)):
            candidate = lines[lookahead].strip()
            if not candidate:
                continue
            if pattern := re.search(r'!\[.*?\]\((.*?\.jpeg|.*?\.png)\)', candidate):
                break
            if candidate.startswith("#") and lookahead > block_end:
                break
            if _FIGURE_CAPTION_RE.search(candidate):
                return candidate
        return ""

    def _merge_marker_panels(self, marker_out_dir, base_name, items):
        gap = 16
        total_width = sum(item["width"] for item in items) + gap * (len(items) - 1)
        max_height = max(item["height"] for item in items)
        canvas = Image.new("RGB", (total_width, max_height), color=(255, 255, 255))
        x_offset = 0
        for item in items:
            try:
                with Image.open(item["path"]) as img:
                    panel = img.convert("RGB")
                y_offset = max(0, (max_height - panel.height) // 2)
                canvas.paste(panel, (x_offset, y_offset))
                x_offset += panel.width + gap
            except Exception:
                return None

        merged_name = "_merged_" + "_".join(os.path.splitext(os.path.basename(item["path"]))[0] for item in items) + ".jpeg"
        merged_path = os.path.join(marker_out_dir, base_name, merged_name)
        canvas.save(merged_path, format="JPEG", quality=92)
        return {
            "id": f"marker_{os.path.splitext(merged_name)[0]}",
            "path": os.path.abspath(merged_path),
            "width": canvas.width,
            "height": canvas.height,
        }

    def _guess_page_from_filename(self, filename: str) -> int:
        match = re.search(r'page_(\d+)', filename)
        return int(match.group(1)) + 1 if match else 1

    def extract_text(self, start: int = 0, end: int = -1) -> str:
        if self.marker_markdown: return self.marker_markdown
        return super().extract_text(start, end)
