"""
Resume API Routes
Handles: file upload & analysis, PDF generation, resume save, history retrieval
"""

import os
import io
import json
from flask import Blueprint, request, jsonify, send_file
from functools import wraps

from utils.file_parser import extract_text
from utils.gemini_client import analyze_resume, improve_section, generate_resume_content
from utils.pdf_generator import generate_resume_pdf

resume_bp = Blueprint("resume", __name__)


# ─── Firebase Init Helper ────────────────────────────────────────────────────

def _init_firebase():
    """
    Initialize Firebase Admin SDK once.
    Strategy:
      1. If FIREBASE_SERVICE_ACCOUNT_KEY_JSON env var is set → parse it as JSON
         (used on Render/Netlify where you can't upload files)
      2. Otherwise fall back to the local file at FIREBASE_SERVICE_ACCOUNT_KEY path
         (used in local development with serviceAccountKey.json)
    """
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        return  # Already initialized

    json_str = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY_JSON")
    if json_str:
        # Production: credential from env var JSON string
        service_account_info = json.loads(json_str)
        cred = credentials.Certificate(service_account_info)
    else:
        # Development: credential from local file
        key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "serviceAccountKey.json")
        cred = credentials.Certificate(key_path)

    firebase_admin.initialize_app(cred)


# ─── Firebase Auth Middleware ─────────────────────────────────────────────────

def token_required(f):
    """Decorator to verify Firebase ID token on protected routes."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        id_token = auth_header.split("Bearer ")[1]

        try:
            from firebase_admin import auth as fb_auth
            _init_firebase()
            decoded_token = fb_auth.verify_id_token(id_token)
            request.uid = decoded_token["uid"]
            request.user_email = decoded_token.get("email", "")
        except Exception as e:
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated


# ─── Routes ──────────────────────────────────────────────────────────────────

@resume_bp.route("/analyze", methods=["POST"])
@token_required
def analyze():
    """
    Upload a PDF/DOCX resume file and get Gemini AI analysis.
    Form Data: file (PDF or DOCX)
    Returns: JSON analysis result
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Use key 'file'."}), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    allowed_extensions = {".pdf", ".docx"}
    ext = os.path.splitext(uploaded_file.filename.lower())[1]
    if ext not in allowed_extensions:
        return jsonify({"error": "Only PDF and DOCX files are supported"}), 400

    try:
        file_bytes = uploaded_file.read()
        resume_text = extract_text(file_bytes, uploaded_file.filename)

        if len(resume_text.strip()) < 50:
            return jsonify({"error": "Could not extract meaningful text from the file"}), 422

        analysis = analyze_resume(resume_text)

        # Optionally save to Firestore
        _save_analysis_to_firestore(request.uid, uploaded_file.filename, analysis)

        return jsonify({"success": True, "analysis": analysis}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resume_bp.route("/improve-section", methods=["POST"])
@token_required
def improve():
    """
    Improve a specific resume section.
    JSON Body: { "section_name": "...", "original_text": "..." }
    """
    data = request.get_json()
    if not data or "section_name" not in data or "original_text" not in data:
        return jsonify({"error": "Provide 'section_name' and 'original_text'"}), 400

    result = improve_section(data["section_name"], data["original_text"])
    return jsonify({"success": True, "result": result}), 200


@resume_bp.route("/generate-pdf", methods=["POST"])
@token_required
def generate_pdf():
    """
    Generate a PDF resume from form data.
    JSON Body: { "resume_data": {...}, "resume_type": "fresher|experienced" }
    Returns: PDF file download
    """
    data = request.get_json()
    if not data or "resume_data" not in data:
        return jsonify({"error": "Provide 'resume_data'"}), 400

    resume_data = data["resume_data"]
    resume_type = data.get("resume_type", "fresher")

    # Optionally enhance content with Gemini
    if data.get("enhance_with_ai", False):
        ai_content = generate_resume_content(resume_data, resume_type)
        if "error" not in ai_content:
            resume_data["ai_enhanced"] = ai_content

    try:
        pdf_bytes = generate_resume_pdf(resume_data, template_name="resume_template.html")

        # Save record to Firestore
        _save_created_resume_to_firestore(request.uid, resume_data, resume_type)

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{resume_data.get('full_name', 'resume').replace(' ', '_')}_Resume.pdf"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resume_bp.route("/history", methods=["GET"])
@token_required
def get_history():
    """
    Fetch user's resume history from Firestore.
    Returns: { created: [...], analyzed: [...] }
    """
    try:
        history = _get_history_from_firestore(request.uid)
        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@resume_bp.route("/profile-stats", methods=["GET"])
@token_required
def profile_stats():
    """
    Get user profile stats: count of created and analyzed resumes.
    """
    try:
        history = _get_history_from_firestore(request.uid)
        return jsonify({
            "success": True,
            "stats": {
                "resumes_created": len(history.get("created", [])),
                "resumes_analyzed": len(history.get("analyzed", []))
            }
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Firestore Helpers ────────────────────────────────────────────────────────

def _get_firestore_db():
    """Get Firestore client. Calls _init_firebase() which handles both dev and prod."""
    from firebase_admin import firestore
    _init_firebase()
    return firestore.client()


def _save_analysis_to_firestore(uid: str, filename: str, analysis: dict):
    """Save resume analysis result to Firestore."""
    try:
        db = _get_firestore_db()
        from datetime import datetime
        db.collection("users").document(uid).collection("analyzed_resumes").add({
            "filename": filename,
            "analysis": analysis,
            "analyzed_at": datetime.utcnow().isoformat()
        })
    except Exception:
        pass  # Non-critical – don't fail the main request


def _save_created_resume_to_firestore(uid: str, resume_data: dict, resume_type: str):
    """Save created resume record to Firestore."""
    try:
        db = _get_firestore_db()
        from datetime import datetime
        db.collection("users").document(uid).collection("created_resumes").add({
            "name": resume_data.get("full_name", ""),
            "resume_type": resume_type,
            "created_at": datetime.utcnow().isoformat()
        })
    except Exception:
        pass


def _get_history_from_firestore(uid: str) -> dict:
    """Retrieve user's resume history from Firestore."""
    db = _get_firestore_db()

    created_docs = db.collection("users").document(uid).collection("created_resumes")\
        .order_by("created_at", direction="DESCENDING").limit(20).stream()

    analyzed_docs = db.collection("users").document(uid).collection("analyzed_resumes")\
        .order_by("analyzed_at", direction="DESCENDING").limit(20).stream()

    created = [{"id": doc.id, **doc.to_dict()} for doc in created_docs]
    analyzed = [{"id": doc.id, **doc.to_dict()} for doc in analyzed_docs]

    return {"created": created, "analyzed": analyzed}
