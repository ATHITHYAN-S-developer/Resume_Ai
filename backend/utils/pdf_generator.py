"""
PDF Generator Utility
Converts resume data to PDF using xhtml2pdf + Jinja2 HTML templates.
xhtml2pdf is pure-Python and works on Windows without any system libraries.
"""

import io
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from xhtml2pdf import pisa

# Resolve templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")


def generate_resume_pdf(resume_data: dict, template_name: str = "resume_template.html") -> bytes:
    """
    Render resume data into an HTML template and convert to PDF bytes.
    Returns raw PDF bytes.
    """
    try:
        env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(["html"])
        )
        template = env.get_template(template_name)
        html_content = template.render(**resume_data)

        # Convert HTML to PDF using xhtml2pdf
        pdf_buffer = io.BytesIO()
        result = pisa.CreatePDF(
            src=html_content,
            dest=pdf_buffer,
            encoding="utf-8"
        )
        if result.err:
            raise RuntimeError(f"xhtml2pdf error code: {result.err}")

        return pdf_buffer.getvalue()
    except Exception as e:
        raise RuntimeError(f"PDF generation failed: {str(e)}")
