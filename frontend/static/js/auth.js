/**
 * auth.js — Firebase Authentication Logic
 * Handles: login, signup, google sign-in, logout, route guard, profile save
 */

import { auth, db } from "./firebase_config.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    updateProfile,
    updatePassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

// ─── Route Guard ──────────────────────────────────────────────────────────────
// Pages that require auth: dashboard, create_resume, analyze, profile, history
const PROTECTED_PAGES = ["dashboard.html", "create_resume.html", "analyze.html", "profile.html", "history.html"];
const PUBLIC_PAGES = ["index.html", "login.html", "signup.html", "", "/"];

const currentPage = window.location.pathname.split("/").pop();

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Logged in
        if (PUBLIC_PAGES.includes(currentPage) && currentPage !== "") {
            window.location.href = "dashboard.html";
        }
        // Update avatar/name in topbar
        _updateTopbar(user);
    } else {
        // Not logged in
        if (PROTECTED_PAGES.includes(currentPage)) {
            window.location.href = "login.html";
        }
    }
});

function _updateTopbar(user) {
    const nameEl = document.getElementById("user-display-name");
    const avatarEl = document.getElementById("topbar-avatar");
    if (nameEl) nameEl.textContent = user.displayName || user.email.split("@")[0];
    if (avatarEl) {
        avatarEl.src = user.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=6366f1&color=fff`;
    }
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/** Get current user's Bearer token for API calls */
export async function getIdToken() {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(true);
}

/** Show alert message on auth/profile pages */
function showAlert(elementId, message, type = "danger") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.innerHTML = `<i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'} me-2"></i>${message}`;
    el.classList.remove("d-none");
    setTimeout(() => el.classList.add("d-none"), 5000);
}

/** Save/update user data in Firestore */
async function saveUserToFirestore(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            uid: user.uid,
            name: user.displayName || "",
            email: user.email,
            photo_url: user.photoURL || "",
            created_at: serverTimestamp()
        });
    }
}

/** Set loading state on submit button */
function setLoading(btnId, spinnerId, textId, loading) {
    const btn = document.getElementById(btnId);
    const spinner = document.getElementById(spinnerId);
    const text = document.getElementById(textId);
    if (!btn) return;
    btn.disabled = loading;
    if (spinner) spinner.classList.toggle("d-none", !loading);
    if (text) text.classList.toggle("d-none", loading);
}

// ─── Login Form ───────────────────────────────────────────────────────────────
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value;
        setLoading("login-btn", "login-spinner", "login-btn-text", true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = "dashboard.html";
        } catch (err) {
            showAlert("auth-alert", _friendlyError(err.code));
        } finally {
            setLoading("login-btn", "login-spinner", "login-btn-text", false);
        }
    });
}

// ─── Signup Form ──────────────────────────────────────────────────────────────
const signupForm = document.getElementById("signup-form");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("signup-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value;
        const confirm = document.getElementById("signup-confirm-password").value;

        if (password !== confirm) {
            return showAlert("auth-alert", "Passwords do not match.");
        }
        setLoading("signup-btn", "signup-spinner", "signup-btn-text", true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            await saveUserToFirestore(cred.user);
            window.location.href = "dashboard.html";
        } catch (err) {
            showAlert("auth-alert", _friendlyError(err.code));
        } finally {
            setLoading("signup-btn", "signup-spinner", "signup-btn-text", false);
        }
    });

    // Password strength meter
    const pwdInput = document.getElementById("signup-password");
    if (pwdInput) {
        pwdInput.addEventListener("input", () => {
            const strength = _calcStrength(pwdInput.value);
            const fill = document.getElementById("strength-fill");
            const label = document.getElementById("strength-label");
            const colors = ["#ef4444", "#f59e0b", "#eab308", "#10b981", "#10b981"];
            const labels = ["Too weak", "Weak", "Fair", "Strong", "Very strong"];
            if (fill) { fill.style.width = `${(strength + 1) * 20}%`; fill.style.background = colors[strength]; }
            if (label) { label.textContent = labels[strength]; label.style.color = colors[strength]; }
        });
    }
}

function _calcStrength(pwd) {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
}

// ─── Google Sign In ───────────────────────────────────────────────────────────
["google-login-btn", "google-signup-btn"].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await saveUserToFirestore(result.user);
            window.location.href = "dashboard.html";
        } catch (err) {
            showAlert("auth-alert", _friendlyError(err.code));
        }
    });
});

// ─── Password Toggle ──────────────────────────────────────────────────────────
document.getElementById("toggle-pwd")?.addEventListener("click", () => {
    const pwdEl = document.getElementById("login-password") || document.getElementById("signup-password");
    const icon = document.querySelector("#toggle-pwd i");
    if (!pwdEl) return;
    if (pwdEl.type === "password") { pwdEl.type = "text"; icon.className = "bi bi-eye-slash"; }
    else { pwdEl.type = "password"; icon.className = "bi bi-eye"; }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────
document.getElementById("forgot-pwd-link")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value?.trim();
    if (!email) return showAlert("auth-alert", "Please enter your email address first.", "warning");
    try {
        await sendPasswordResetEmail(auth, email);
        showAlert("auth-alert", "Password reset email sent! Check your inbox.", "success");
    } catch (err) {
        showAlert("auth-alert", _friendlyError(err.code));
    }
});

// ─── Logout ──────────────────────────────────────────────────────────────────
["logout-btn", "logout-btn-profile"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "index.html";
    });
});

// ─── Sidebar Toggle ──────────────────────────────────────────────────────────
document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
});

// ─── Error Messages ──────────────────────────────────────────────────────────
function _friendlyError(code) {
    const map = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/email-already-in-use": "This email is already registered. Try logging in.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
    };
    return map[code] || "Something went wrong. Please try again.";
}

// Export auth state helper for other modules
export { auth };
