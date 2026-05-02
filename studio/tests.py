import json
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from PIL import Image

from bridge.pptx_exporter import PPTXExporter


class PresentationApiRegressionTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = get_user_model().objects.create_user(username="tester", password="strong-password-123")
        self.client.force_login(self.user)

    def test_pptx_export_empty_deck_returns_pptx_response(self):
        response = self.client.post(
            "/api/presentations/export/pptx/",
            data=json.dumps({"state": {"pageSetup": "standard-4-3", "slides": []}, "filename": "test deck.pptx"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
        self.assertIn('filename="test_deck.pptx"', response["Content-Disposition"])

    def test_presentation_create_malformed_json_returns_400(self):
        response = self.client.post(
            "/api/presentations/",
            data="{bad json",
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)


class PPTXExporterRegressionTests(TestCase):
    def test_image_stream_uses_configurable_project_root(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_root = Path(tmpdir)
            media_dir = project_root / "media"
            media_dir.mkdir()
            image_path = media_dir / "sample.png"
            Image.new("RGB", (1, 1), color=(255, 0, 0)).save(image_path)

            exporter = PPTXExporter({"slides": []}, project_root=project_root)
            stream = exporter._get_image_stream("/media/sample.png")

            self.assertIsNotNone(stream)
            self.assertGreater(len(stream.getvalue()), 0)


class FrontendExportRegressionTests(TestCase):
    def setUp(self):
        self.export_js = (Path(__file__).resolve().parent.parent / "js" / "export.js").read_text(encoding="utf-8")
        self.editor_export_block = "\n".join(self.export_js.splitlines()[:150])

    def test_pdf_and_png_exports_use_page_setup_dimensions_not_hardcoded_4_3(self):
        self.assertIn("getPresentationPageSetupConfig", self.editor_export_block)
        self.assertNotIn("format: [1024, 768]", self.editor_export_block)
        self.assertNotIn("width: 1024,", self.editor_export_block)
        self.assertNotIn("height: 768", self.editor_export_block)
        self.assertNotIn("pdf.addPage([1024, 768]", self.editor_export_block)
        self.assertNotIn('pdf.addImage(imgData, "JPEG", 0, 0, 1024, 768)', self.editor_export_block)

    def test_pdf_and_png_capture_active_slide_with_finally_restore(self):
        self.assertIn("getActiveExportSlideElement", self.export_js)
        self.assertIn("try {", self.export_js)
        self.assertIn("finally {", self.export_js)
        self.assertNotIn('document.getElementById("slides-container")', self.export_js)
