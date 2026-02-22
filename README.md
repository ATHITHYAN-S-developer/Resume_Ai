# AI Resume Analyzer

A full-stack AI-powered resume builder and analyzer built with **Flask + Firebase + Google Gemini API + Bootstrap**.

---

## 📁 Project Structure

```
NewPro/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── __init__.py
│   │   └── resume.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── gemini_client.py
│   │   ├── file_parser.py
│   │   └── pdf_generator.py
│   └── templates/
│       └── resume_template.html
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── create_resume.html
│   ├── analyze.html
│   ├── profile.html
│   ├── history.html
│   └── static/
│       ├── css/style.css
│       └── js/
│           ├── firebase_config.js
│           ├── auth.js
│           ├── dashboard.js
│           ├── create_resume.js
│           ├── analyze.js
│           ├── profile.js
│           ├── history.js
│           └── particles.js
└── .gitignore
```

---

## ⚙️ Setup & Configuration

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a project
2. Enable **Authentication** → Sign-in methods → **Email/Password** + **Google**
3. Enable **Firestore Database** → Start in test mode
4. Go to **Project Settings** → **Service Accounts** → Generate new private key → Save as `backend/serviceAccountKey.json`
5. Go to **Project Settings** → **General** → **Your Apps** → Add a Web App
6. Copy the Firebase config and paste it into `frontend/static/js/firebase_config.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API Key
2. Copy the key

### 3. Backend Environment Variables

Create `backend/.env` (copy from `.env.example`):

```env
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVICE_ACCOUNT_KEY=serviceAccountKey.json
FLASK_ENV=development
FLASK_SECRET_KEY=any_random_secret
FRONTEND_URL=http://localhost:8080
```

---

## 🚀 Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend runs at: `http://localhost:5000`

### Frontend

```bash
cd frontend
python -m http.server 8080
```
Open: `http://localhost:8080`

> **Note:** `API_BASE` in `firebase_config.js` is set to `http://localhost:5000/api` by default.

---

## ☁️ Deployment

### Backend → Render.com

1. Push code to GitHub
2. Go to [Render](https://render.com) → New Web Service → Connect GitHub repo
3. Set **Root Directory** to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `waitress-serve --port=5000 --call app:create_app`
6. Add environment variables in Render dashboard (same as `.env`)
7. Upload `serviceAccountKey.json` content as env var `FIREBASE_SERVICE_ACCOUNT_KEY_JSON` and adjust `app.py` to read from it

### Frontend → Netlify

1. Go to [Netlify](https://netlify.com) → New Site → Deploy from GitHub
2. Set **Publish directory** to `frontend`
3. No build command needed (static files)
4. Update `API_BASE` in `firebase_config.js` to your Render backend URL
5. Add `frontend/netlify.toml` for SPA routing if needed

### Environment Variables on Netlify

No server-side env vars needed for frontend — Firebase config is embedded in `firebase_config.js`.

---

## 🔒 Firebase Firestore Rules (for production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 📦 GitHub Push

```bash
git init
git add .
git commit -m "Initial commit: AI Resume Analyzer"
git remote add origin https://github.com/YOUR_USERNAME/ai-resume-analyzer.git
git push -u origin main
```

---

## 🔑 Key Features

| Feature | Description |
|---|---|
| 🔐 Firebase Auth | Email/Password + Google OAuth |
| 📝 Resume Builder | Multi-step wizard for Fresher & Experienced |
| 🤖 Gemini AI | ATS score, keyword analysis, rewritten sections |
| 📄 PDF Download | WeasyPrint HTML→PDF generation |
| 📊 ATS Score Ring | Animated SVG score visualization |
| 🗂️ History | All resumes & reports saved to Firestore |
| 👤 User Profile | Edit name, change password, view stats |
