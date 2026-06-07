# JobPilot 🚀

> **AI-powered job application tracker built for the German job market** — track every application, get AI suitability checks, generate ATS-optimised CVs, and never lose track of a deadline again.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

🌐 **Live App:** [jobpilot-lime.vercel.app](https://jobpilot-lime.vercel.app) &nbsp;|&nbsp; 🧩 **Chrome Extension:** *Under review — link coming soon*

---

## 📸 Screenshots

### Landing Page
![Landing Page](public/screenshots/landing.png)

### Login
![Login](public/screenshots/login.png)

### Dashboard
![Dashboard](public/screenshots/dashboard.png)

---

## 🧩 Chrome Extension

<img src="public/screenshots/extension-icon.png" width="80" alt="JobPilot Extension Icon" />

> 🔔 The Chrome Extension is currently **under review by Google** and will be available on the Chrome Web Store shortly. The install link will be added here as soon as it is approved.

The JobPilot Chrome Extension is what makes this tool truly powerful. Instead of manually copying job titles, companies, and links into a tracker, you browse job boards the way you normally do — and save anything with a single click directly from your browser.

### How the Extension Works Together with the Web App

```
You browse a job posting (LinkedIn, Indeed, StepStone, any site)
         ↓
Click the JobPilot extension icon in your Chrome toolbar
         ↓
┌─────────────────────────────────────────┐
│  JobPilot Extension Popup               │
│                                         │
│  [Capture Job Details]  ← reads page   │
│  [Check Suitability]    ← AI analysis  │
│  [Save to Dashboard]    ← one click    │
└─────────────────────────────────────────┘
         ↓
Job is instantly saved to your JobPilot dashboard
with title, company, URL, and deadline pre-filled
         ↓
Open the web app to track status, add notes,
generate a tailored CV, and manage your pipeline
```

### Extension Features

| Feature | What it does |
|---|---|
| **One-Click Save** | Captures the job title, company, URL from the current page and saves it to your tracker instantly |
| **AI Job Enrichment** | Reads the full job description and auto-extracts title, company name, and application deadline |
| **AI Suitability Check** | Analyses the job description against your saved profile and tells you if you are a strong, partial, or poor match — before you spend time applying |
| **Category Selection** | Choose which category to save the job into (e.g. *Germany – Backend*, *Remote – ML*) right from the popup |
| **Status & Priority** | Set the initial status and priority before saving |

### Typical Workflow

1. **Set up your profile** on the web app — add your experience, skills, education, and upload your CV
2. **Install the Chrome Extension** *(link coming soon)*
3. **Browse job boards** — LinkedIn, Indeed, StepStone, Glassdoor, or any company careers page
4. **Click the extension** on any job that catches your eye
5. Hit **"Capture Job Details"** — the extension reads the page and fills in the form automatically
6. Optionally hit **"Check Suitability"** — get an instant AI verdict on whether this role matches your profile
7. Hit **"Save Job"** — it appears in your dashboard immediately
8. Back on the **web app**, track your progress: update status, set deadlines, add notes, and when ready — use **Generate CV** to create an ATS-optimised resume tailored to that specific job description

> 📹 A full video walkthrough will be added here soon.

---

## ✨ Features

### 📋 Job Tracker (Web Portal)
- **Category management** — organise jobs into custom categories (e.g. *Germany – Backend*, *Remote – ML*)
- **Full job CRUD** — title, company, URL, status, priority, deadline, comments, notes
- **⭐ Star/Favourite** — pin high-priority applications to the top
- **Bulk selection** — select multiple jobs and delete them in one click
- **Filters & search** — search by title/company/notes, filter by status and priority
- **Sort with direction toggle** — sort by date, title, company, deadline, priority, status, or starred; toggle ↑↓
- **Duplicate detection** — URL-based and Jaccard token-similarity warns of near-duplicate jobs; colour-coded border grouping
- **Inline Notes panel** — expand a per-job notes drawer directly in the table row, auto-saved
- **Excel Export** — export current filtered view to `.xlsx` (includes all fields)
- **Excel Import** — import jobs from any spreadsheet with auto column-mapping dialog
- **Pagination** — 10 rows per page
- **Keyboard shortcuts** — `Esc` closes any open modal or exits selection mode

### 🤖 AI Features
- **ATS CV Generator** — paste a job description and let the LLM rewrite your CV to match; download as **PDF** or **Word (.docx)**
- **Suitability Check** — the Chrome extension checks any job page against your saved profile
- **Job Enrichment** — automatically extracts title, company, and deadline from any job page

### 👤 Profile Management
- Store your full professional profile: work experience, education, skills, languages, certifications
- Upload your existing CV (PDF) — text is extracted and saved
- Profile data powers the AI suitability check and CV generator

### ⚙️ API / LLM Settings
- Support for **OpenAI**, **Anthropic**, **Gemini**, **Groq**, and **OpenRouter**
- Per-provider model presets + custom model name input
- API keys are encrypted with AES-256-GCM in the browser — never sent to any server

### 🔒 Demo Account
- Try everything at `demo@jobpilot.app` / `Demo123456` — read-only mode
- Pre-seeded with 18 realistic German job applications across 3 categories

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui + Radix UI |
| Auth | NextAuth v5 (Auth.js) JWT credentials |
| Database | Prisma v5 + PostgreSQL (Neon) |
| AI / LLM | OpenAI, Anthropic, Gemini, Groq, OpenRouter |
| PDF parsing | pdfjs-dist (client-side) |
| PDF export | jsPDF |
| Word export | docx |
| Excel | xlsx (SheetJS) |
| Extension | Chrome Manifest V3 (service worker) |
| Deployment | Vercel + Neon |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (or free [Neon](https://neon.tech) account)

### 1. Clone & install

```bash
git clone https://github.com/iamvisheshsrivastava/jobpilot.git
cd jobpilot
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

# Generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-64-char-hex-string"
```

### 3. Set up the database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Quick start:** Log in with `demo@jobpilot.app` / `Demo123456` to explore all features with pre-loaded data.

---

## 🧩 Loading the Extension Locally (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Pin the JobPilot icon from the extensions toolbar
5. Log in with your JobPilot account credentials

---

## 📁 Project Structure

```
jobpilot/
├── app/                        # Next.js App Router pages
│   ├── (dashboard)/            # Authenticated dashboard layout
│   │   ├── jobs/               # Job tracker (main page)
│   │   ├── profile/            # Profile & CV management
│   │   ├── generate-cv/        # ATS CV generator
│   │   ├── settings/           # API keys & account settings
│   │   └── analytics/          # Analytics dashboard
│   ├── login/                  # Login page
│   ├── signup/                 # Sign-up page
│   ├── privacy/                # Privacy policy
│   └── api/                    # Next.js API routes
├── chrome-extension/           # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html / popup.js
│   ├── background.js           # Service worker + API calls
│   └── content.js              # Page text extraction
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── auth-ext.ts             # Bearer token auth for extension
│   ├── llm.ts                  # Multi-provider LLM routing
│   └── prisma.ts               # Prisma client singleton
├── prisma/schema.prisma        # DB schema
└── .env.example                # Environment variable template
```

---

## 🔐 Security Notes

- **API keys** are encrypted with AES-256-GCM before storage — never transmitted to any server
- **Passwords** are hashed with bcrypt (12 rounds)
- The **demo account** is read-only — no data can be mutated via any API route
- All secrets live in `.env` which is `.gitignore`d

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

[MIT](LICENSE)

---

*Built with ❤️ for job seekers navigating the German tech market.*
