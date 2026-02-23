# AI Resume Analyzer

A full-stack AI-powered resume builder and analyzer built with **Flask + Firebase + Google Gemini API + Bootstrap**.

---

## 📁 Project Structure

```
NewPro/
├── .gitignore
├── README.md                  ← Setup + Deployment guide
├── index.html                 ← Landing page
├── analyze.html               ← Upload page
├── create_resume.html         ← Wizard page
├── dashboard.html             ← User dashboard
├── history.html               ← Resume history
├── login.html                 ← Auth pages
├── profile.html
├── signup.html
├── static/                    ← CSS and JS files
│   ├── css/style.css
│   └── js/
│       ├── firebase_config.js
│       ├── auth.js
│       ├── dashboard.js
│       ├── create_resume.js
│       ├── analyze.js
│       ├── profile.js
│       ├── history.js
│       └── particles.js
├── backend/
│   ├── app.py                 ← Flask app (Serves API + Frontend)
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   └── resume.py          ← API logic
│   ├── utils/
│   │   ├── gemini_client.py
│   │   ├── file_parser.py
│   │   └── pdf_generator.py   ← xhtml2pdf engine
│   └── templates/
│       └── resume_template.html
```

---

## ⚙️ Setup & Configuration

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) → Create a project
2. Enable **Authentication** → Sign-in methods → **Email/Password** + **Google**
3. Enable **Firestore Database** → Start in test mode
4. Go to **Project Settings** → **Service Accounts** → Generate new private key → Save as `backend/serviceAccountKey.json`
5. Go to **Project Settings** → **General** → **Your Apps** → Add a Web App
6. Copy the Firebase config and paste it into `static/js/firebase_config.js`:

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

```bash
cd backend
pip install -r requirements.txt
python app.py
```
App runs at: `http://localhost:5000` (Now serves both Frontend and API)

---

## ☁️ Deployment (Render Monolith)

1. Push code to GitHub.
2. Go to [Render](https://render.com) → **New Web Service**.
3. Set **Root Directory** to `backend`
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `waitress-serve --port=$PORT --call app:create_app`
6. Add Environment Variables in Render:
   - `GEMINI_API_KEY`: Your key.
   - `FLASK_ENV`: `production`
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: Content of your `serviceAccountKey.json`.
7. Your app is now live on a single URL! (e.g., `https://your-app.onrender.com`)

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


resume-ai-lwu4.vercel.app