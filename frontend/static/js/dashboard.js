/**
 * dashboard.js — Dashboard page logic
 * Loads profile stats and recent history from backend API
 */

import { auth } from "./firebase_config.js";
import { API_BASE } from "./firebase_config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) return; // auth.js handles redirect

    // Get fresh token
    const token = await user.getIdToken(true);
    await loadStats(token);
    await loadRecentActivity(token);
});

async function loadStats(token) {
    try {
        const res = await fetch(`${API_BASE}/profile-stats`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            const s = data.stats;
            document.getElementById("stat-created-num").textContent = s.resumes_created;
            document.getElementById("stat-analyzed-num").textContent = s.resumes_analyzed;
        }
    } catch (_) { /* Silently fail — backend may not be running */ }
}

async function loadRecentActivity(token) {
    const container = document.getElementById("recent-activity");
    try {
        const res = await fetch(`${API_BASE}/history`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.success) return;

        const { created = [], analyzed = [] } = data.history;
        const combined = [
            ...created.map(r => ({ ...r, kind: "created" })),
            ...analyzed.map(r => ({ ...r, kind: "analyzed" }))
        ].sort((a, b) => {
            const ta = a.created_at || a.analyzed_at || "";
            const tb = b.created_at || b.analyzed_at || "";
            return tb.localeCompare(ta);
        }).slice(0, 6);

        if (combined.length === 0) return;

        container.innerHTML = combined.map(item => `
      <div class="d-flex align-items-center gap-3 py-2 border-bottom border-secondary-subtle">
        <div class="flex-shrink-0">
          <span class="badge ${item.kind === 'created' ? 'bg-primary' : 'bg-info'}">
            ${item.kind === 'created' ? 'Created' : 'Analyzed'}
          </span>
        </div>
        <div class="flex-grow-1">
          <div class="fw-semibold small">${item.name || item.filename || 'Resume'}</div>
          <div class="text-muted" style="font-size:0.78rem">${_formatDate(item.created_at || item.analyzed_at)}</div>
        </div>
        ${item.kind === 'analyzed' && item.analysis?.ats_score != null
                ? `<span class="badge bg-success-subtle text-success">${item.analysis.ats_score}/100</span>`
                : ''}
      </div>
    `).join('');

        // Update best ATS score
        const scores = analyzed.map(r => r.analysis?.ats_score).filter(Boolean);
        if (scores.length) {
            document.getElementById("stat-ats-num").textContent = Math.max(...scores);
        }
    } catch (_) { /* backend offline */ }
}

function _formatDate(iso) {
    if (!iso) return "–";
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
}
