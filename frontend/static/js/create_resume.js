/**
 * create_resume.js — Multi-step resume creation wizard
 * Guides user through form, renders preview, calls backend to generate PDF
 */

import { auth, API_BASE } from "./firebase_config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let resumeType = new URLSearchParams(window.location.search).get("type") || null;
let currentStep = 0;
let resumeData = {};
let userToken = null;

// ─── Form Step Definitions ────────────────────────────────────────────────────

const FRESHER_STEPS = [
    {
        label: "Personal Info",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-person me-2 text-primary"></i>Personal Information</h5>
        <div class="row g-3">
          <div class="col-md-6"><label>Full Name *</label><input class="form-control" id="f-name" placeholder="John Doe" required /></div>
          <div class="col-md-6"><label>Email *</label><input class="form-control" type="email" id="f-email" placeholder="john@email.com" required /></div>
          <div class="col-md-6"><label>Phone *</label><input class="form-control" id="f-phone" placeholder="+1 234 567 8900" required /></div>
          <div class="col-md-6"><label>LinkedIn URL</label><input class="form-control" id="f-linkedin" placeholder="linkedin.com/in/john" /></div>
          <div class="col-md-6"><label>GitHub URL</label><input class="form-control" id="f-github" placeholder="github.com/john" /></div>
          <div class="col-md-6"><label>Location</label><input class="form-control" id="f-location" placeholder="City, Country" /></div>
        </div>
      </div>`
    },
    {
        label: "Career Objective",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-bullseye me-2 text-primary"></i>Career Objective</h5>
        <label>Career Objective *</label>
        <textarea class="form-control" id="f-objective" rows="5" placeholder="A passionate software developer seeking an entry-level role to apply my skills..."></textarea>
        <small class="text-muted mt-2 d-block">Tip: AI will enhance this when you enable "Enhance with AI" in the preview step.</small>
      </div>`
    },
    {
        label: "Education",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-mortarboard me-2 text-primary"></i>Education</h5>
        <div id="edu-blocks">
          <div class="edu-block mb-3 p-3 rounded" style="background:var(--bg3); border:1px solid var(--border)">
            <div class="row g-2">
              <div class="col-md-6"><label>Degree / Course *</label><input class="form-control edu-degree" placeholder="B.Tech Computer Science" /></div>
              <div class="col-md-6"><label>Institution *</label><input class="form-control edu-institution" placeholder="University Name" /></div>
              <div class="col-md-4"><label>Year</label><input class="form-control edu-year" placeholder="2020–2024" /></div>
              <div class="col-md-4"><label>GPA / %</label><input class="form-control edu-gpa" placeholder="8.5 / 10" /></div>
            </div>
          </div>
        </div>
        <button class="btn btn-outline-primary btn-sm" onclick="addEduBlock()"><i class="bi bi-plus me-1"></i>Add Another</button>
      </div>`
    },
    {
        label: "Skills",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-tools me-2 text-primary"></i>Skills</h5>
        <label>Technical Skills (comma-separated) *</label>
        <input class="form-control mb-3" id="f-skills-tech" placeholder="Python, JavaScript, React, SQL..." />
        <label>Soft Skills (comma-separated)</label>
        <input class="form-control" id="f-skills-soft" placeholder="Communication, Teamwork, Problem-solving..." />
      </div>`
    },
    {
        label: "Projects",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-code-slash me-2 text-primary"></i>Projects</h5>
        <div id="proj-blocks">
          <div class="proj-block mb-3 p-3 rounded" style="background:var(--bg3); border:1px solid var(--border)">
            <div class="row g-2">
              <div class="col-md-6"><label>Project Name *</label><input class="form-control proj-name" placeholder="Portfolio Website" /></div>
              <div class="col-md-6"><label>Tech Stack</label><input class="form-control proj-tech" placeholder="React, Node.js, MongoDB" /></div>
              <div class="col-12"><label>Description</label><textarea class="form-control proj-desc" rows="2" placeholder="Built a full-stack portfolio..."></textarea></div>
              <div class="col-12"><label>Link (optional)</label><input class="form-control proj-link" placeholder="https://github.com/..." /></div>
            </div>
          </div>
        </div>
        <button class="btn btn-outline-primary btn-sm" onclick="addProjBlock()"><i class="bi bi-plus me-1"></i>Add Project</button>
      </div>`
    },
    {
        label: "Certifications",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-award me-2 text-primary"></i>Certifications</h5>
        <label>Certifications (one per line)</label>
        <textarea class="form-control" id="f-certs" rows="6" placeholder="AWS Certified Developer - Associate (2024)&#10;Google Data Analytics Certificate (2023)"></textarea>
      </div>`
    }
];

const EXPERIENCED_STEPS = [
    FRESHER_STEPS[0], // Personal Info
    {
        label: "Summary",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-person-lines-fill me-2 text-primary"></i>Professional Summary</h5>
        <label>Professional Summary *</label>
        <textarea class="form-control" id="f-objective" rows="5" placeholder="Experienced software engineer with 5+ years building scalable web applications..."></textarea>
      </div>`
    },
    {
        label: "Experience",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-briefcase me-2 text-primary"></i>Work Experience</h5>
        <div id="exp-blocks">
          <div class="exp-block mb-3 p-3 rounded" style="background:var(--bg3);border:1px solid var(--border)">
            <div class="row g-2">
              <div class="col-md-6"><label>Company *</label><input class="form-control exp-company" placeholder="Google Inc." /></div>
              <div class="col-md-6"><label>Job Role *</label><input class="form-control exp-role" placeholder="Software Engineer" /></div>
              <div class="col-md-6"><label>Duration</label><input class="form-control exp-duration" placeholder="Jan 2020 – Dec 2022" /></div>
              <div class="col-12"><label>Responsibilities (one per line)</label><textarea class="form-control exp-resp" rows="3" placeholder="Developed REST APIs using Python Flask&#10;Reduced page load time by 40%"></textarea></div>
            </div>
          </div>
        </div>
        <button class="btn btn-outline-primary btn-sm" onclick="addExpBlock()"><i class="bi bi-plus me-1"></i>Add Experience</button>
      </div>`
    },
    FRESHER_STEPS[2], // Education
    FRESHER_STEPS[3], // Skills
    FRESHER_STEPS[4], // Projects
    {
        label: "Achievements",
        render: () => `
      <div class="wizard-form-step">
        <h5 class="fw-bold mb-4"><i class="bi bi-trophy me-2 text-primary"></i>Achievements &amp; Certifications</h5>
        <label>Achievements (one per line)</label>
        <textarea class="form-control mb-3" id="f-achievements" rows="4" placeholder="Led a team of 8 engineers to deliver a $2M project&#10;Received 'Employee of the Year' award"></textarea>
        <label>Certifications (one per line)</label>
        <textarea class="form-control" id="f-certs" rows="3" placeholder="AWS Solutions Architect - Professional (2023)"></textarea>
      </div>`
    }
];

// ─── Init ────────────────────────────────────────────────────────────────────

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    userToken = await user.getIdToken(true);
    if (resumeType) selectType(resumeType);
});

// ─── Type Selection ──────────────────────────────────────────────────────────

window.selectType = function (type) {
    resumeType = type;
    document.querySelectorAll(".type-card").forEach(c => c.classList.remove("selected"));
    document.getElementById(`choose-${type}`)?.classList.add("selected");

    setTimeout(() => {
        document.getElementById("step-choose").classList.remove("active-step");
        document.getElementById("step-choose").classList.add("d-none");
        document.getElementById("step-form").classList.remove("d-none");
        renderStep(0);
    }, 250);
};

function getSteps() {
    return resumeType === "experienced" ? EXPERIENCED_STEPS : FRESHER_STEPS;
}

function renderStep(idx) {
    const steps = getSteps();
    currentStep = idx;

    // Progress bar
    const pct = Math.round((idx / (steps.length - 1)) * 100);
    document.getElementById("form-progress-bar").style.width = pct + "%";

    // Labels
    document.getElementById("progress-labels").innerHTML = steps.map((s, i) =>
        `<span class="pl-item${i === idx ? " active" : ""}">${s.label}</span>`
    ).join("");

    // Render form
    document.getElementById("form-steps-container").innerHTML = steps[idx].render();

    // Nav buttons
    document.getElementById("prev-step-btn").style.visibility = idx === 0 ? "hidden" : "visible";
    const nextBtn = document.getElementById("next-step-btn");
    nextBtn.innerHTML = idx === steps.length - 1
        ? `Preview <i class="bi bi-eye ms-1"></i>`
        : `Next <i class="bi bi-arrow-right ms-1"></i>`;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

window.nextStep = function () {
    collectCurrentStep();
    const steps = getSteps();
    if (currentStep < steps.length - 1) {
        renderStep(currentStep + 1);
    } else {
        showPreview();
    }
};

window.prevStep = function () {
    collectCurrentStep();
    if (currentStep > 0) renderStep(currentStep - 1);
};

// ─── Collect Form Data ───────────────────────────────────────────────────────

function collectCurrentStep() {
    const steps = getSteps();
    const label = steps[currentStep].label;

    // Personal Info
    if (label === "Personal Info") {
        resumeData.full_name = document.getElementById("f-name")?.value?.trim();
        resumeData.email = document.getElementById("f-email")?.value?.trim();
        resumeData.phone = document.getElementById("f-phone")?.value?.trim();
        resumeData.linkedin = document.getElementById("f-linkedin")?.value?.trim();
        resumeData.github = document.getElementById("f-github")?.value?.trim();
        resumeData.location = document.getElementById("f-location")?.value?.trim();
    }
    // Summary / Objective
    if (label === "Career Objective" || label === "Summary") {
        const val = document.getElementById("f-objective")?.value?.trim();
        resumeData.career_objective = val;
        resumeData.summary = val;
    }
    // Education
    if (label === "Education") {
        resumeData.education = [...document.querySelectorAll(".edu-block")].map(b => ({
            degree: b.querySelector(".edu-degree")?.value?.trim(),
            institution: b.querySelector(".edu-institution")?.value?.trim(),
            year: b.querySelector(".edu-year")?.value?.trim(),
            gpa: b.querySelector(".edu-gpa")?.value?.trim()
        })).filter(e => e.degree || e.institution);
    }
    // Skills
    if (label === "Skills") {
        const tech = document.getElementById("f-skills-tech")?.value || "";
        const soft = document.getElementById("f-skills-soft")?.value || "";
        resumeData.skills = {
            "Technical Skills": tech.split(",").map(s => s.trim()).filter(Boolean),
            "Soft Skills": soft.split(",").map(s => s.trim()).filter(Boolean)
        };
    }
    // Projects
    if (label === "Projects") {
        resumeData.projects = [...document.querySelectorAll(".proj-block")].map(b => ({
            name: b.querySelector(".proj-name")?.value?.trim(),
            tech: b.querySelector(".proj-tech")?.value?.trim(),
            description: b.querySelector(".proj-desc")?.value?.trim(),
            link: b.querySelector(".proj-link")?.value?.trim()
        })).filter(p => p.name);
    }
    // Certifications
    if (label === "Certifications") {
        resumeData.certifications = (document.getElementById("f-certs")?.value || "")
            .split("\n").map(s => s.trim()).filter(Boolean);
    }
    // Experience
    if (label === "Experience") {
        resumeData.experience = [...document.querySelectorAll(".exp-block")].map(b => ({
            company: b.querySelector(".exp-company")?.value?.trim(),
            role: b.querySelector(".exp-role")?.value?.trim(),
            duration: b.querySelector(".exp-duration")?.value?.trim(),
            responsibilities: (b.querySelector(".exp-resp")?.value || "").split("\n").map(s => s.trim()).filter(Boolean)
        })).filter(e => e.company);
    }
    // Achievements
    if (label === "Achievements & Certifications") {
        resumeData.achievements = (document.getElementById("f-achievements")?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
        resumeData.certifications = (document.getElementById("f-certs")?.value || "").split("\n").map(s => s.trim()).filter(Boolean);
    }
}

// ─── Add Block helpers ───────────────────────────────────────────────────────

window.addEduBlock = function () {
    document.getElementById("edu-blocks").insertAdjacentHTML("beforeend", `
    <div class="edu-block mb-3 p-3 rounded" style="background:var(--bg3);border:1px solid var(--border)">
      <div class="row g-2">
        <div class="col-md-6"><label>Degree / Course</label><input class="form-control edu-degree" placeholder="B.Tech Computer Science" /></div>
        <div class="col-md-6"><label>Institution</label><input class="form-control edu-institution" placeholder="University Name" /></div>
        <div class="col-md-4"><label>Year</label><input class="form-control edu-year" placeholder="2020–2024" /></div>
        <div class="col-md-4"><label>GPA / %</label><input class="form-control edu-gpa" placeholder="8.5 / 10" /></div>
      </div>
    </div>`);
};

window.addProjBlock = function () {
    document.getElementById("proj-blocks").insertAdjacentHTML("beforeend", `
    <div class="proj-block mb-3 p-3 rounded" style="background:var(--bg3);border:1px solid var(--border)">
      <div class="row g-2">
        <div class="col-md-6"><label>Project Name</label><input class="form-control proj-name" placeholder="Project Name" /></div>
        <div class="col-md-6"><label>Tech Stack</label><input class="form-control proj-tech" placeholder="React, Node.js" /></div>
        <div class="col-12"><label>Description</label><textarea class="form-control proj-desc" rows="2" placeholder="Description..."></textarea></div>
        <div class="col-12"><label>Link</label><input class="form-control proj-link" placeholder="GitHub URL" /></div>
      </div>
    </div>`);
};

window.addExpBlock = function () {
    document.getElementById("exp-blocks").insertAdjacentHTML("beforeend", `
    <div class="exp-block mb-3 p-3 rounded" style="background:var(--bg3);border:1px solid var(--border)">
      <div class="row g-2">
        <div class="col-md-6"><label>Company</label><input class="form-control exp-company" placeholder="Company Name" /></div>
        <div class="col-md-6"><label>Job Role</label><input class="form-control exp-role" placeholder="Role Title" /></div>
        <div class="col-md-6"><label>Duration</label><input class="form-control exp-duration" placeholder="Jan 2020 – Dec 2022" /></div>
        <div class="col-12"><label>Responsibilities</label><textarea class="form-control exp-resp" rows="3" placeholder="One per line..."></textarea></div>
      </div>
    </div>`);
};

// ─── Preview ─────────────────────────────────────────────────────────────────

function showPreview() {
    document.getElementById("step-form").classList.add("d-none");
    document.getElementById("step-preview").classList.remove("d-none");

    const d = resumeData;
    const skillsHTML = d.skills
        ? Object.entries(d.skills).map(([g, s]) => `<strong>${g}:</strong> ${s.join(", ")}`).join(" | ")
        : "";

    document.getElementById("resume-preview-card").innerHTML = `
    <div style="border-bottom:3px solid #1a56db;padding-bottom:12px;margin-bottom:16px">
      <h2 style="color:#1a56db;font-size:22pt;margin-bottom:6px">${d.full_name || "Your Name"}</h2>
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:10pt;color:#555">
        ${d.email ? `<span>✉ ${d.email}</span>` : ""}
        ${d.phone ? `<span>☎ ${d.phone}</span>` : ""}
        ${d.linkedin ? `<span>🔗 ${d.linkedin}</span>` : ""}
        ${d.github ? `<span>💻 ${d.github}</span>` : ""}
      </div>
    </div>
    ${(d.career_objective || d.summary) ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">${resumeType === 'experienced' ? 'Professional Summary' : 'Career Objective'}</h4><p style="color:#333;line-height:1.6">${d.career_objective || d.summary}</p></div>` : ''}
    ${d.experience?.length ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">Work Experience</h4>${d.experience.map(e => `<div style="margin-bottom:10px"><b>${e.company}</b> · <i>${e.role}</i> <span style="float:right;color:#777;font-size:10pt">${e.duration}</span><ul style="margin:6px 0 0 16px">${e.responsibilities?.map(r => `<li style="color:#333;margin-bottom:3px">${r}</li>`).join('') || ''}</ul></div>`).join('')}</div>` : ''}
    ${d.education?.length ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">Education</h4>${d.education.map(e => `<div style="display:flex;justify-content:space-between;margin-bottom:6px"><div><b>${e.degree}</b> — ${e.institution}${e.gpa ? ` (${e.gpa})` : ''}  </div><span style="color:#777">${e.year || ''}</span></div>`).join('')}</div>` : ''}
    ${skillsHTML ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">Skills</h4><p>${skillsHTML}</p></div>` : ''}
    ${d.projects?.length ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">Projects</h4>${d.projects.map(p => `<div style="margin-bottom:10px"><b>${p.name}</b>${p.tech ? ` <i style="color:#1a56db">(${p.tech})</i>` : ''}<p style="color:#333;margin-top:4px">${p.description || ''}</p></div>`).join('')}</div>` : ''}
    ${d.certifications?.length ? `<div style="margin-bottom:14px"><h4 style="color:#1a56db;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px">Certifications</h4><ul>${d.certifications.map(c => `<li style="margin-bottom:4px;color:#333">${c}</li>`).join('')}</ul></div>` : ''}
  `;
}

// ─── AI Enhance ──────────────────────────────────────────────────────────────

window.enhanceWithAI = async function () {
    const btn = document.getElementById("enhance-ai-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Enhancing...`;
    // Enhancement happens server-side during PDF download; show success message
    setTimeout(() => {
        document.getElementById("ai-enhance-alert").classList.remove("d-none");
        btn.innerHTML = `<i class="bi bi-stars me-1"></i> Enhanced ✓`;
    }, 1200);
};

// ─── Download PDF ─────────────────────────────────────────────────────────────

window.downloadResume = async function () {
    const loadingEl = document.getElementById("pdf-loading");
    const previewEl = document.getElementById("resume-preview-card");
    loadingEl.classList.remove("d-none");
    previewEl.classList.add("d-none");

    try {
        const res = await fetch(`${API_BASE}/generate-pdf`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${userToken}`
            },
            body: JSON.stringify({
                resume_data: resumeData,
                resume_type: resumeType,
                enhance_with_ai: true
            })
        });

        if (!res.ok) throw new Error("PDF generation failed");

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(resumeData.full_name || "Resume").replace(/ /g, "_")}_Resume.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert("Could not generate PDF. Make sure the backend is running.\n" + err.message);
    } finally {
        loadingEl.classList.add("d-none");
        previewEl.classList.remove("d-none");
    }
};

window.restartWizard = function () {
    resumeData = {};
    currentStep = 0;
    resumeType = null;
    document.getElementById("step-preview").classList.add("d-none");
    document.getElementById("step-choose").classList.remove("d-none", "d-none");
    document.getElementById("step-choose").classList.add("active-step");
    document.getElementById("ai-enhance-alert").classList.add("d-none");
    document.getElementById("enhance-ai-btn").disabled = false;
    document.getElementById("enhance-ai-btn").innerHTML = `<i class="bi bi-stars me-1"></i> Enhance with AI`;
};
