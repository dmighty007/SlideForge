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
        for idx, line in enumerate(lines):
            match = pattern.search(line)
            if not match: continue
            img_rel_path = match.group(2)
            img_path = os.path.join(marker_out_dir, base_name, img_rel_path)
            if not os.path.exists(img_path): continue
            
            caption = match.group(1).strip()
            if not caption:
                for lookahead in range(1, min(6, len(lines) - idx)):
                    next_line = lines[idx + lookahead].strip()
                    if next_line:
                        if next_line.lower().startswith(('fig', 'table', 'scheme', 'chart')): caption = next_line
                        break
            if not caption: caption = f"Extracted visual {img_rel_path}"
            if _LOW_SIGNAL_CAPTION_RE.search(caption):
                continue

            try:
                with Image.open(img_path) as img: w, h = img.size
            except: w, h = 1000, 1000
            if w < 150 or h < 100: continue
            
            extracted.append({
                "id": f"marker_{os.path.splitext(os.path.basename(img_path))[0]}",
                "path": os.path.abspath(img_path),
                "caption": caption,
                "kind": "image",
                "page": self._guess_page_from_filename(img_rel_path)
            })
        self.visual_catalog = extracted
        return extracted

    def _guess_page_from_filename(self, filename: str) -> int:
        match = re.search(r'page_(\d+)', filename)
        return int(match.group(1)) + 1 if match else 1

    def extract_text(self, start: int = 0, end: int = -1) -> str:
        if self.marker_markdown: return self.marker_markdown
        return super().extract_text(start, end)
