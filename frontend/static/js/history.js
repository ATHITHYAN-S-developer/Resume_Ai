/**
 * history.js — Resume history page
 */

import { auth, API_BASE } from "./firebase_config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const token = await user.getIdToken(true);
    await loadHistory(token);
});

async function loadHistory(token) {
    const loadingEl = document.getElementById("history-loading");
    try {
        const res = await fetch(`${API_BASE}/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        loadingEl?.classList.add("d-none");

        if (!data.success) { showEmpty(); return; }

        const created = data.history.created || [];
        const analyzed = data.history.analyzed || [];

        document.getElementById("created-count").textContent = created.length;
        document.getElementById("analyzed-count").textContent = analyzed.length;

        renderCreated(created);
        renderAnalyzed(analyzed);
    } catch (_) {
        loadingEl?.classList.add("d-none");
        document.getElementById("created-empty").classList.remove("d-none");
        document.getElementById("analyzed-empty").classList.remove("d-none");
    }
}

function renderCreated(items) {
    const listEl = document.getElementById("created-list");
    const emptyEl = document.getElementById("created-empty");
    const cards = document.getElementById("created-cards");

    if (items.length === 0) { emptyEl.classList.remove("d-none"); return; }

    cards.innerHTML = items.map(item => `
    <div class="col-sm-6 col-lg-4">
      <div class="history-card">
        <div class="d-flex align-items-center gap-3 mb-3">
          <div class="stat-card-icon" style="--sc:#6366f1; width:44px;height:44px;font-size:1.2rem">
            <i class="bi bi-file-earmark-text"></i>
          </div>
          <div>
            <div class="fw-bold">${item.name || "Resume"}</div>
            <span class="badge bg-primary-subtle text-primary">${item.resume_type || "Fresher"}</span>
          </div>
        </div>
        <small class="text-muted"><i class="bi bi-clock me-1"></i>${_formatDate(item.created_at)}</small>
      </div>
    </div>
  `).join("");

    listEl.classList.remove("d-none");
}

function renderAnalyzed(items) {
    const listEl = document.getElementById("analyzed-list");
    const emptyEl = document.getElementById("analyzed-empty");
    const accordion = document.getElementById("analyzed-accordion");

    if (items.length === 0) { emptyEl.classList.remove("d-none"); return; }

    accordion.innerHTML = items.map((item, i) => {
        const a = item.analysis || {};
        const score = a.ats_score ?? "–";
        const scoreCls = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";
        return `
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button ${i > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#hist-${i}">
            <div class="d-flex align-items-center gap-3 w-100">
              <i class="bi bi-file-earmark-search text-info"></i>
              <span class="flex-grow-1">${item.filename || "Resume"}</span>
              <span class="badge bg-secondary me-3">ATS: <span class="${scoreCls}">${score}</span>/100</span>
            </div>
          </button>
        </h2>
        <div id="hist-${i}" class="accordion-collapse collapse ${i === 0 ? 'show' : ''}">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-md-6">
                <p class="small text-muted mb-1"><strong>Suggested Role</strong></p>
                <p>${a.job_role_suggestion || "–"}</p>
                <p class="small text-muted mb-1 mt-2"><strong>Missing Keywords</strong></p>
                <div>${(a.missing_keywords || []).slice(0, 5).map(k => `<span class="kchip kchip-missing me-1">${k}</span>`).join("") || "–"}</div>
              </div>
              <div class="col-md-6">
                <p class="small text-muted mb-1"><strong>Overall Feedback</strong></p>
                <p class="small">${a.overall_feedback || "–"}</p>
                <p class="small text-muted mb-1 mt-2"><strong>Analyzed on</strong></p>
                <p class="small">${_formatDate(item.analyzed_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join("");

    listEl.classList.remove("d-none");
}

function showEmpty() {
    document.getElementById("created-empty").classList.remove("d-none");
    document.getElementById("analyzed-empty").classList.remove("d-none");
}

function _formatDate(iso) {
    if (!iso) return "–";
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
}
