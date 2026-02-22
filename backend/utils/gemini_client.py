"""
Gemini API Client
Handles all AI analysis and resume improvement requests
"""

import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")


def analyze_resume(text: str) -> dict:
    """
    Analyze resume text using Gemini API.
    Returns structured analysis including ATS score, keywords, suggestions.
    """
    prompt = f"""
You are an expert ATS (Applicant Tracking System) and resume coach. Analyze the following resume text and return a JSON response ONLY (no markdown, no explanation):

Resume Text:
\"\"\"
{text}
\"\"\"

Return EXACTLY this JSON structure:
{{
  "ats_score": <integer 0-100>,
  "job_role_suggestion": "<best matching job role>",
  "missing_keywords": ["keyword1", "keyword2", ...],
  "present_keywords": ["keyword1", "keyword2", ...],
  "grammar_issues": ["issue1", "issue2", ...],
  "formatting_suggestions": ["suggestion1", "suggestion2", ...],
  "skill_gap_analysis": {{
    "missing_technical_skills": ["skill1", "skill2", ...],
    "missing_soft_skills": ["skill1", "skill2", ...]
  }},
  "strengths": ["strength1", "strength2", ...],
  "weaknesses": ["weakness1", "weakness2", ...],
  "improved_sections": {{
    "summary": "<rewritten professional summary>",
    "career_objective": "<improved career objective if present>",
    "improvements": ["improvement1", "improvement2", ...]
  }},
  "action_verbs_suggestions": ["verb1", "verb2", "verb3", "verb4", "verb5"],
  "overall_feedback": "<2-3 sentence overall assessment>"
}}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"```$", "", raw).strip()
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"error": "Failed to parse AI response", "raw": response.text}
    except Exception as e:
        return {"error": str(e)}


def improve_section(section_name: str, original_text: str) -> dict:
    """
    Improve a specific resume section using Gemini.
    """
    prompt = f"""
You are a professional resume writer. Improve the following resume section.
Return ONLY a JSON object with no markdown:

Section: {section_name}
Original Text:
\"\"\"
{original_text}
\"\"\"

Return:
{{
  "original": "<original text>",
  "improved": "<professional improved version>",
  "keywords_added": ["keyword1", "keyword2"],
  "explanation": "<brief explanation of changes>"
}}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"```$", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e)}


def generate_resume_content(form_data: dict, resume_type: str) -> dict:
    """
    Generate AI-enhanced resume content from raw form data.
    """
    prompt = f"""
You are an expert resume writer. Using the following user data, generate polished and professional content for each resume section.
Return ONLY a JSON object with no markdown.

Resume Type: {resume_type}
User Data: {json.dumps(form_data, indent=2)}

Return:
{{
  "summary": "<2-3 sentence professional summary or career objective>",
  "skills_grouped": {{
    "Technical Skills": ["skill1", "skill2"],
    "Soft Skills": ["skill1", "skill2"]
  }},
  "experience_bullets": ["• <action verb> ...", "• <action verb> ..."],
  "project_descriptions": ["<improved project desc 1>", "<improved project desc 2>"],
  "certifications_formatted": ["<cert 1>", "<cert 2>"],
  "keywords": ["keyword1", "keyword2", "keyword3"]
}}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```json\s*", "", raw)
        raw = re.sub(r"```$", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e)}
