"""
PDF Generator Utility
Converts resume data to PDF using xhtml2pdf + Jinja2 HTML templates.
Supports 6 professional resume templates for different career paths.
xhtml2pdf is pure-Python and works on Windows without any system libraries.
"""

import io
import os
from jinja2 import Environment, FileSystemLoader, select_autoescape
from xhtml2pdf import pisa

# Resolve templates directory
TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

# Available resume templates
AVAILABLE_TEMPLATES = {
    "modern": {
        "name": "Modern Minimal",
        "file": "resume_modern.html",
        "description": "Clean, professional, minimalist design",
        "best_for": "Tech professionals, designers, product managers"
    },
    "creative": {
        "name": "Creative Bold",
        "file": "resume_creative.html",
        "description": "Vibrant, eye-catching, colorful design",
        "best_for": "Designers, creatives, artists"
    },
    "executive": {
        "name": "Executive Pro",
        "file": "resume_executive.html",
        "description": "Premium, sophisticated, professional design",
        "best_for": "CEOs, executives, managers"
    },
    "developer": {
        "name": "Tech Developer",
        "file": "resume_developer.html",
        "description": "Dark theme, code-inspired, technical design",
        "best_for": "Developers, engineers, DevOps specialists"
    },
    "startup": {
        "name": "Startup Founder",
        "file": "resume_startup.html",
        "description": "Modern, energetic, innovative design",
        "best_for": "Entrepreneurs, founders, innovators"
    },
    "academic": {
        "name": "Academic Scholar",
        "file": "resume_academic.html",
        "description": "Formal, research-focused, traditional design",
        "best_for": "Professors, researchers, academics"
    }
}


def get_available_templates() -> dict:
    """Return all available resume templates."""
    return AVAILABLE_TEMPLATES


def validate_template(template_id: str) -> bool:
    """Check if template ID is valid."""
    return template_id in AVAILABLE_TEMPLATES


def get_template_file(template_id: str) -> str:
    """Get template filename for given template ID."""
    if not validate_template(template_id):
        return AVAILABLE_TEMPLATES["modern"]["file"]  # Default fallback
    return AVAILABLE_TEMPLATES[template_id]["file"]


def generate_resume_pdf(resume_data: dict, template_id: str = "modern") -> bytes:
    """
    Render resume data into an HTML template and convert to PDF bytes.
    
    Args:
        resume_data: Dictionary containing resume information
        template_id: Template identifier (modern, creative, executive, developer, startup, academic)
    
    Returns:
        Raw PDF bytes
    
    Raises:
        RuntimeError: If PDF generation fails
    """
    try:
        # Get template file based on ID
        template_file = get_template_file(template_id)
        
        env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(["html"])
        )
        
        template = env.get_template(template_file)
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
            print(f"DEBUG HTML SNIPPET: {html_content[:500]}...")
            raise RuntimeError(f"xhtml2pdf error code: {pisa_status.err}")

        return pdf_buffer.getvalue()
    except Exception as e:
        print(f"ERROR in generate_resume_pdf: {str(e)}")
        raise RuntimeError(f"PDF generation failed: {str(e)}")


def generate_resume_html(resume_data: dict, template_id: str = "modern") -> str:
    """
    Render resume data into HTML (for preview without PDF).
    
    Args:
        resume_data: Dictionary containing resume information
        template_id: Template identifier
    
    Returns:
        HTML string
    """
    try:
        template_file = get_template_file(template_id)
        
        env = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR),
            autoescape=select_autoescape(["html"])
        )
        
        template = env.get_template(template_file)
        html_content = template.render(**resume_data)
        
        return html_content
    except Exception as e:
        print(f"ERROR in generate_resume_html: {str(e)}")
        raise RuntimeError(f"HTML generation failed: {str(e)}")
