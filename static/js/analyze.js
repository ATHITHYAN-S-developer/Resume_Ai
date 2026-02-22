/**
 * analyze.js — Resume upload and AI analysis page
 */

import { auth, API_BASE } from "./firebase_config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let userToken = null;
let selectedFile = null;

// ─── Auth ─────────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    userToken = await user.getIdToken(true);
});

// ─── Drag & Drop ──────────────────────────────────────────────────────────────
const dropArea = document.getElementById("upload-drop-area");
const fileInput = document.getElementById("file-input");

if (dropArea) {
    dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        document.getElementById("upload-zone").classList.add("drag-over");
    });
    dropArea.addEventListener("dragleave", () => {
        document.getElementById("upload-zone").classList.remove("drag-over");
    });
    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        document.getElementById("upload-zone").classList.remove("drag-over");
        handleFile(e.dataTransfer.files[0]);
    });
}

fileInput?.addEventListener("change", (e) => handleFile(e.target.files[0]));

function handleFile(file) {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
        alert("Please upload a PDF or DOCX file only.");
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert("File too large. Maximum 10MB allowed.");
        return;
    }
    selectedFile = file;
    document.getElementById("upload-drop-area").classList.add("d-none");
    document.getElementById("file-selected").classList.remove("d-none");
    document.getElementById("selected-filename").textContent = file.name;
    document.getElementById("selected-filesize").textContent = `${(file.size / 1024).toFixed(1)} KB`;
}

window.clearFile = function () {
    selectedFile = null;
    fileInput.value = "";
    document.getElementById("upload-drop-area").classList.remove("d-none");
    document.getElementById("file-selected").classList.add("d-none");
};

// ─── Submit Analyze ───────────────────────────────────────────────────────────
window.submitAnalyze = async function () {
    if (!selectedFile) { alert("Please select a file first."); return; }

    document.getElementById("upload-section").classList.add("d-none");
    document.getElementById("analyze-loading").classList.remove("d-none");

    // Animate analysis steps
    const stepIds = ["astep-1", "astep-2", "astep-3", "astep-4"];
    for (let i = 0; i < stepIds.length; i++) {
        await delay(900 * (i + 1));
        document.getElementById(stepIds[i])?.classList.add("done");
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const res = await fetch(`${API_BASE}/analyze`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${userToken}` },
            body: formData
        });
        const data = await res.json();

        document.getElementById("analyze-loading").classList.add("d-none");

        if (!data.success || !data.analysis) {
            alert("Analysis failed: " + (data.error || "Unknown error"));
            resetAnalyzer();
            return;
        }
        renderResults(data.analysis);
    } catch (err) {
        document.getElementById("analyze-loading").classList.add("d-none");
        alert("Could not reach backend. Make sure it's running.\n" + err.message);
        resetAnalyzer();
    }
};

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(a) {
    document.getElementById("results-section").classList.remove("d-none");

    // ATS Score ring animation
    const score = a.ats_score || 0;
    const circumference = 326.7;
    const offset = circumference - (score / 100) * circumference;
    const circle = document.getElementById("score-circle");
    if (circle) {
        circle.style.transition = "stroke-dashoffset 1.5s ease";
        circle.style.strokeDashoffset = offset;
    }
    const numEl = document.getElementById("ats-score-num");
    if (numEl) animateCount(numEl, 0, score, 1500);

    // Score badge
    const badge = document.getElementById("score-badge");
    if (badge) {
        if (score >= 80) { badge.textContent = "⭐ Excellent"; badge.style = "background:rgba(16,185,129,0.15);color:#10b981;border-radius:50px;padding:4px 12px;font-size:.8rem;font-weight:700"; }
        else if (score >= 60) { badge.textContent = "✅ Good"; badge.style = "background:rgba(245,158,11,0.15);color:#f59e0b;border-radius:50px;padding:4px 12px;font-size:.8rem;font-weight:700"; }
        else { badge.textContent = "⚠️ Needs Work"; badge.style = "background:rgba(239,68,68,0.12);color:#ef4444;border-radius:50px;padding:4px 12px;font-size:.8rem;font-weight:700"; }
    }

    // Job role
    _setText("suggested-role", a.job_role_suggestion || "–");

    // Strengths / Weaknesses
    _renderList("strengths-list", a.strengths || []);
    _renderList("weaknesses-list", a.weaknesses || []);
    _setText("overall-feedback", a.overall_feedback || "–");

    // Keywords
    _renderChips("present-keywords", a.present_keywords || [], "kchip-present");
    _renderChips("missing-keywords", a.missing_keywords || [], "kchip-missing");

    // Skill gaps
    _renderChips("missing-tech-skills", a.skill_gap_analysis?.missing_technical_skills || [], "kchip-missing");
    _renderChips("missing-soft-skills", a.skill_gap_analysis?.missing_soft_skills || [], "kchip-neutral");

    // Grammar & Formatting
    _renderList("grammar-list", a.grammar_issues || []);
    _renderList("formatting-list", a.formatting_suggestions || []);

    // AI Improvements
    _setText("improved-summary", a.improved_sections?.summary || "–");
    _renderChips("action-verbs", a.action_verbs_suggestions || [], "kchip-neutral");
    _renderList("improvement-tips", a.improved_sections?.improvements || []);
}

function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function _renderList(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.length
        ? items.map(i => `<li>${i}</li>`).join("")
        : "<li>None detected</li>";
}

function _renderChips(id, items, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.length
        ? items.map(k => `<span class="kchip ${cls}">${k}</span>`).join("")
        : `<span class="kchip kchip-neutral">None</span>`;
}

function animateCount(el, from, to, duration) {
    const start = performance.now();
    const step = (ts) => {
        const progress = Math.min((ts - start) / duration, 1);
        el.textContent = Math.round(from + (to - from) * progress);
        if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

window.resetAnalyzer = function () {
    selectedFile = null;
    fileInput.value = "";
    document.querySelectorAll(".analyze-step").forEach(s => s.classList.remove("done"));
    document.getElementById("upload-section").classList.remove("d-none");
    document.getElementById("analyze-loading").classList.add("d-none");
    document.getElementById("results-section").classList.add("d-none");
    document.getElementById("upload-drop-area").classList.remove("d-none");
    document.getElementById("file-selected").classList.add("d-none");
};
