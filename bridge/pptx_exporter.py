import io
import json
import base64
import re
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from PIL import Image
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

class DesignSystem:
    # Default design constants inspired by the reference script
    DEFAULT_FONT = "Arial"
    ACCENT_COLOR = RGBColor(0, 51, 102)  # Dark Blue
    TEXT_COLOR = RGBColor(44, 62, 80)
    BG_COLOR = RGBColor(255, 255, 255)

class PPTXExporter:
    def __init__(self, state: Dict[str, Any]):
        self.state = state
        self.prs = Presentation()
        
        # Mapping from SlideForge page setup to PPTX dimensions
        setup = state.get("pageSetup", "standard-4-3")
        if setup == "widescreen-16-9":
            self.prs.slide_width = Inches(13.333)
            self.prs.slide_height = Inches(7.5)
            self.base_w, self.base_h = 1280, 720
        elif setup == "widescreen-16-10":
            self.prs.slide_width = Inches(12.8)
            self.prs.slide_height = Inches(8.0)
            self.base_w, self.base_h = 1280, 800
        else: # standard-4-3
            self.prs.slide_width = Inches(10.666)
            self.prs.slide_height = Inches(8.0)
            self.base_w, self.base_h = 1024, 768

    def _px_to_inches_w(self, px: float) -> Inches:
        # Scale pixels relative to the logical canvas width
        return Inches((px / self.base_w) * (self.prs.slide_width / Inches(1)))

    def _px_to_inches_h(self, px: float) -> Inches:
        # Scale pixels relative to the logical canvas height
        return Inches((px / self.base_h) * (self.prs.slide_height / Inches(1)))

    def _parse_color(self, color_str: Optional[str], default: RGBColor = DesignSystem.TEXT_COLOR) -> RGBColor:
        if not color_str:
            return default
        try:
            if color_str.startswith("#"):
                h = color_str.lstrip("#")
                if len(h) == 3:
                    h = "".join([c*2 for c in h])
                return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
            elif color_str.startswith("rgb"):
                # Simple rgb(r, g, b) parser
                matches = re.findall(r"\d+", color_str)
                if len(matches) >= 3:
                    return RGBColor(int(matches[0]), int(matches[1]), int(matches[2]))
        except Exception:
            pass
        return default

    def _get_image_stream(self, content: str) -> Optional[io.BytesIO]:
        if content.startswith("data:"):
            try:
                base64_data = content.split(",")[1]
                return io.BytesIO(base64.b64decode(base64_data))
            except Exception:
                return None
        elif content.startswith("/") or content.startswith("http"):
            # If it's a local path, try to read it
            # In a production Django app, we'd handle MEDIA_ROOT here
            try:
                # Basic local path resolution (very simplified)
                # We expect the frontend to have migrated assets to data URLs or we handle them via absolute paths
                if content.startswith("/"):
                    # Assuming the workspace is the root for local paths starting with /
                    # In SlideForge, /media/ and /extracted_figures/ are common
                    full_path = Path(content.lstrip("/"))
                    if full_path.exists():
                        with open(full_path, "rb") as f:
                            return io.BytesIO(f.read())
            except Exception:
                pass
        return None

    def export(self) -> io.BytesIO:
        slides = self.state.get("slides", [])
        for slide_data in slides:
            self._add_slide(slide_data)
        
        output = io.BytesIO()
        self.prs.save(output)
        output.seek(0)
        return output

    def _add_slide(self, slide_data: Dict[str, Any]):
        # Use a blank layout (index 6 is usually blank)
        slide_layout = self.prs.slide_layouts[6]
        slide = self.prs.slides.add_slide(slide_layout)
        
        # 1. Background
        bg = slide_data.get("background")
        if bg and bg.get("content"):
            if bg.get("type") == "color":
                fill = slide.background.fill
                fill.solid()
                fill.fore_color.rgb = self._parse_color(bg["content"], DesignSystem.BG_COLOR)
            elif bg.get("type") == "image":
                img_stream = self._get_image_stream(bg["content"])
                if img_stream:
                    slide.shapes.add_picture(img_stream, 0, 0, width=self.prs.slide_width, height=self.prs.slide_height)
        
        # 2. Global Accent Bar (Reference Script Aesthetic)
        accent_bar_height = int(self.prs.slide_height * 0.012)
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, self.prs.slide_width, accent_bar_height)
        bar.fill.solid()
        bar.fill.fore_color.rgb = DesignSystem.ACCENT_COLOR
        bar.line.fill.background()

        # 3. Elements
        elements = slide_data.get("elements", [])
        # Sort by zIndex
        sorted_elements = sorted(elements, key=lambda e: e.get("styles", {}).get("zIndex", 0))
        
        for el in sorted_elements:
            self._add_element(slide, el)

    def _add_element(self, slide: Any, el: Dict[str, Any]):
        try:
            x = self._px_to_inches_w(float(el.get("x", 0)))
            y = self._px_to_inches_h(float(el.get("y", 0)))
            
            # Width and height can be "auto" or strings like "400px"
            w_raw = el.get("width", "100")
            h_raw = el.get("height", "100")
            
            w = self._px_to_inches_w(float(re.sub(r"[^\d.]", "", str(w_raw)) or 100))
            h = self._px_to_inches_h(float(re.sub(r"[^\d.]", "", str(h_raw)) or 100))

            el_type = el.get("type")
            if el_type == "text":
                self._add_text_element(slide, el, x, y, w, h)
            elif el_type == "image":
                self._add_image_element(slide, el, x, y, w, h)
            elif el_type == "shape":
                self._add_shape_element(slide, el, x, y, w, h)
        except Exception as e:
            print(f"Error adding element {el.get('id')}: {e}")

    def _add_text_element(self, slide: Any, el: Dict[str, Any], x: Inches, y: Inches, w: Inches, h: Inches):
        styles = el.get("styles", {})
        content = el.get("content", "")
        
        # Create textbox
        shape = slide.shapes.add_textbox(x, y, w, h)
        tf = shape.text_frame
        tf.word_wrap = True
        
        # Default styles
        font_size = int(re.sub(r"[^\d.]", "", str(styles.get("fontSize", "18"))) or 18)
        font_color = self._parse_color(styles.get("color"))
        font_name = styles.get("fontFamily", DesignSystem.DEFAULT_FONT).split(",")[0].replace('"', '').strip()
        bold = styles.get("fontWeight") == "bold" or int(styles.get("fontWeight") or 400) >= 600
        italic = styles.get("fontStyle") == "italic"
        
        # Handle structured bullet points or raw HTML
        if isinstance(content, list):
            # It's a list of bullet points
            tf.clear()
            for item in content:
                p = tf.add_paragraph()
                p.text = item.get("text", "")
                p.level = item.get("level", 0)
                p.font.size = Pt(font_size)
                p.font.color.rgb = font_color
                p.font.name = font_name
                p.font.bold = bold
                p.font.italic = italic
        else:
            # It's a string (potentially with HTML tags)
            # Strip simple HTML tags for basic text export
            clean_text = re.sub(r"<br\s*/?>", "\n", content)
            clean_text = re.sub(r"<[^>]+>", "", clean_text)
            
            p = tf.paragraphs[0]
            p.text = clean_text
            p.font.size = Pt(font_size)
            p.font.color.rgb = font_color
            p.font.name = font_name
            p.font.bold = bold
            p.font.italic = italic
        
        # Alignment
        align = styles.get("textAlign", "left").lower()
        if align == "center":
            tf.paragraphs[0].alignment = PP_ALIGN.CENTER
        elif align == "right":
            tf.paragraphs[0].alignment = PP_ALIGN.RIGHT
        elif align == "justify":
            tf.paragraphs[0].alignment = PP_ALIGN.JUSTIFY

    def _add_image_element(self, slide: Any, el: Dict[str, Any], x: Inches, y: Inches, w: Inches, h: Inches):
        content = el.get("content", "")
        img_stream = self._get_image_stream(content)
        if not img_stream:
            return

        # Add picture
        pic = slide.shapes.add_picture(img_stream, x, y, width=w, height=h)
        
        # Handle cropping if transform exists
        crop = el.get("cropTransform")
        if crop:
            # SlideForge crop transform: leftPercent, topPercent, widthPercent, heightPercent
            # python-pptx crop properties: crop_left, crop_right, crop_top, crop_bottom (fractions 0-1)
            try:
                # These percentages are relative to the original image dimensions
                # SlideForge often uses these to define the viewable area
                # We might need to adjust based on how SlideForge handles the wrapper
                l_pct = float(crop.get("leftPercent", 0)) / 100.0
                t_pct = float(crop.get("topPercent", 0)) / 100.0
                w_pct = float(crop.get("widthPercent", 100)) / 100.0
                h_pct = float(crop.get("heightPercent", 100)) / 100.0
                
                # In SlideForge, sometimes left/top are negative to shift the image inside a wrapper
                # If they are positive, they might be defining the crop box
                if l_pct < 0: pic.crop_left = -l_pct
                if t_pct < 0: pic.crop_top = -t_pct
                # This is a simplified mapping; SlideForge cropping can be complex
            except Exception:
                pass

    def _add_shape_element(self, slide: Any, el: Dict[str, Any], x: Inches, y: Inches, w: Inches, h: Inches):
        shape_type_str = el.get("shapeType", "rectangle")
        
        mapping = {
            "rectangle": MSO_SHAPE.RECTANGLE,
            "circle": MSO_SHAPE.OVAL,
            "ellipse": MSO_SHAPE.OVAL,
            "triangle": MSO_SHAPE.ISOSCELES_TRIANGLE,
            "diamond": MSO_SHAPE.DIAMOND,
            "hexagon": MSO_SHAPE.HEXAGON,
            "parallelogram": MSO_SHAPE.PARALLELOGRAM,
            "arrow-right": MSO_SHAPE.RIGHT_ARROW,
            "arrow-left": MSO_SHAPE.LEFT_ARROW,
            "arrow-up": MSO_SHAPE.UP_ARROW,
            "arrow-down": MSO_SHAPE.DOWN_ARROW,
        }
        
        mso_type = mapping.get(shape_type_str, MSO_SHAPE.RECTANGLE)
        shape = slide.shapes.add_shape(mso_type, x, y, w, h)
        
        styles = el.get("styles", {})
        bg_color = self._parse_color(styles.get("backgroundColor"), DesignSystem.ACCENT_COLOR)
        
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        
        # Border
        border = styles.get("border")
        if border:
            # Simplified border parser (e.g., "2px solid #000")
            match = re.search(r"(\d+)px", border)
            if match:
                shape.line.width = Pt(int(match.group(1)))
            color_match = re.search(r"#[0-9a-fA-F]{3,6}", border)
            if color_match:
                shape.line.color.rgb = self._parse_color(color_match.group(0))
        else:
            shape.line.fill.background()
