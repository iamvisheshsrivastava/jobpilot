# JobPilot 🚀

> **AI-powered job application tracker built for the German job market** — track every application, get AI suitability checks, generate ATS-optimised CVs, and never lose track of a deadline again.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## 📸 Screenshots

### Landing Page
![Landing Page](public/screenshots/landing.png)

### Login
![Login](public/screenshots/login.png)

### Dashboard
![Dashboard](public/screenshots/dashboard.png)

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
- Try everything at `demo@jobpilot.app` / `demo1234` — read-only mode
- Pre-seeded with 23 realistic German job applications across 3 categories

### 🧩 Chrome Extension (Manifest V3)
- **Save Job** — one-click save of any job posting from any website
- **Check Suitability** — AI rates how well the job matches your profile
- **Enrich Job** — auto-fills title, company, and deadline from the page
- Login with your JobPilot credentials directly in the popup

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui + Radix UI |
| Auth (dashboard) | localStorage + PBKDF2 password hashing |
| Auth (extension) | NextAuth v5 (Auth.js) JWT credentials |
| Database | Prisma v5 + SQLite |
| AI / LLM | OpenAI, Anthropic, Gemini, Groq, OpenRouter |
| PDF parsing | pdfjs-dist (client-side) |
| PDF export | jsPDF |
| Word export | docx |
| Excel | xlsx (SheetJS) |
| Extension | Chrome Manifest V3 (service worker) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

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
# SQLite (local)
DATABASE_URL="file:./prisma/dev.db"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-64-char-hex-string"
```

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Quick start:** Log in with `demo@jobpilot.app` / `demo1234` to explore all features with pre-loaded data.

---

## 🧩 Chrome Extension

### Load locally (Developer Mode)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked** → select the `chrome-extension/` folder
4. Pin the JobPilot icon from the extensions toolbar

> **Note:** The extension calls `http://localhost:3000` by default. The Next.js dev server must be running.

### What it does

| Action | Description |
|---|---|
| **Login** | Authenticate with your JobPilot credentials |
| **Save Job** | Captures the current page's job details and saves to your tracker |
| **Check Suitability** | AI analyses the job against your profile and gives a suitability score |
| **Enrich Job** | Auto-fills title, company, and deadline from the page text |

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
│   │   └── dashboard/          # Analytics dashboard
│   ├── login/                  # Login page
│   ├── signup/                 # Sign-up page
│   └── api/                    # Next.js API routes (extension backend)
├── chrome-extension/           # Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup.html / popup.js
│   ├── background.js           # Service worker
│   └── content.js              # Page text extraction
├── lib/
│   ├── jobpilot-store.ts       # localStorage store + all CRUD helpers
│   ├── llm.ts                  # Multi-provider LLM routing
│   ├── auth.ts                 # NextAuth config
│   └── prisma.ts               # Prisma client
├── components/                 # Shared UI components
├── prisma/schema.prisma        # DB schema
└── .env.example                # Environment variable template
```

---

## 🔐 Security Notes

- **API keys** are encrypted with AES-256-GCM before storage in `localStorage` — never transmitted to any server
- **Passwords** are hashed with PBKDF2 (100,000 iterations, SHA-256)
- The **demo account** is read-only — no data can be mutated
- All secrets live in `.env` which is `.gitignore`d — see `.env.example` for required variables

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.

---

## 📄 License

[MIT](LICENSE)

---

*Built with ❤️ for job seekers navigating the German tech market.*
