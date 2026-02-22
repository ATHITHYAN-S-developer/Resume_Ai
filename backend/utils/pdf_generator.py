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
        pisa_status = pisa.CreatePDF(
            src=html_content,
            dest=pdf_buffer,
            encoding="utf-8"
        )
        
        if pisa_status.err:
            print(f"ERROR: xhtml2pdf failed: {pisa_status.err}")
            # Log first 500 chars of HTML to debug if it's a template error
            print(f"DEBUG HTML SNIPPET: {html_content[:500]}...")
            raise RuntimeError(f"xhtml2pdf error code: {pisa_status.err}")

        return pdf_buffer.getvalue()
    except Exception as e:
        print(f"ERROR in generate_resume_pdf: {str(e)}")
        raise RuntimeError(f"PDF generation failed: {str(e)}")
