/**
 * profile.js — User profile page
 */

import { auth, db, API_BASE } from "./firebase_config.js";
import { onAuthStateChanged, updateProfile, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // Populate profile info
    document.getElementById("profile-name").textContent = user.displayName || "–";
    document.getElementById("profile-email").textContent = user.email;
    document.getElementById("edit-name").value = user.displayName || "";
    document.getElementById("edit-email").value = user.email;

    // Avatar
    if (user.photoURL) {
        const photos = document.querySelectorAll(".profile-avatar, #topbar-avatar");
        photos.forEach(img => img.src = user.photoURL);
    }

    // Join date from Firebase metadata
    try {
        const createdAt = user.metadata?.creationTime;
        if (createdAt) {
            document.getElementById("profile-joined").textContent =
                "Joined: " + new Date(createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        }
    } catch (_) { }

    // Load stats from backend
    try {
        const token = await user.getIdToken(true);
        const res = await fetch(`${API_BASE}/profile-stats`, { headers: { "Authorization": `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
            document.getElementById("ps-created").textContent = data.stats.resumes_created;
            document.getElementById("ps-analyzed").textContent = data.stats.resumes_analyzed;
        }
    } catch (_) {
        document.getElementById("ps-created").textContent = "–";
        document.getElementById("ps-analyzed").textContent = "–";
    }
});

// ─── Edit Profile ─────────────────────────────────────────────────────────────
document.getElementById("edit-profile-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = document.getElementById("edit-name").value.trim();
    const user = auth.currentUser;
    if (!user || !newName) return;

    const btn = document.getElementById("save-profile-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

    try {
        await updateProfile(user, { displayName: newName });
        await updateDoc(doc(db, "users", user.uid), { name: newName });
        document.getElementById("profile-name").textContent = newName;
        showAlert("profile-alert", "Profile updated successfully!", "success");
    } catch (err) {
        showAlert("profile-alert", "Failed to update profile: " + err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-check-lg me-1"></i>Save Changes`;
    }
});

// ─── Change Password ──────────────────────────────────────────────────────────
document.getElementById("change-pwd-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd1 = document.getElementById("new-password").value;
    const pwd2 = document.getElementById("confirm-new-password").value;

    if (pwd1 !== pwd2) { showAlert("pwd-alert", "Passwords do not match.", "danger"); return; }
    if (pwd1.length < 6) { showAlert("pwd-alert", "Password must be at least 6 characters.", "warning"); return; }

    const btn = document.getElementById("change-pwd-btn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Updating...`;

    try {
        await updatePassword(auth.currentUser, pwd1);
        showAlert("pwd-alert", "Password updated successfully!", "success");
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-new-password").value = "";
    } catch (err) {
        showAlert("pwd-alert", "Failed: " + err.message, "danger");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-key me-1"></i>Update Password`;
    }
});

// ─── Photo Upload (UI only – uses URL.createObjectURL preview) ────────────────
document.getElementById("photo-upload")?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    document.querySelectorAll(".profile-avatar, #topbar-avatar").forEach(img => img.src = url);
    // Note: To persist photo, integrate Firebase Storage upload here.
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function showAlert(id, msg, type = "danger") {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.textContent = msg;
    el.classList.remove("d-none");
    setTimeout(() => el.classList.add("d-none"), 4000);
}
