# Roadmap

This is a snapshot of where JobPilot actually is, based on what's merged into `testing` vs. what's still open as issues. It's not a promise of dates — just an honest "what's real today / what's next / what's further out" view, kept in sync as issues open and close.

For environment/branch details see the README; for dev setup and the PR workflow see `CONTRIBUTING.md`.

## Now — shipped and working on `testing`

What's actually built, not aspirational:

- **Job tracking core** — categories, jobs (list + Kanban views), status/priority, deadlines, job history, per-job notes. Job-number assignment is race-safe (serializable tx + retry, `app/api/jobs/route.ts`).
- **Chrome extension** (`chrome-extension/`, live on the Chrome Web Store) — capture a job posting from any job board in one click, AI-powered enrichment (title/company/deadline extraction), AI suitability check, and save straight into a category from the popup. Extension auth uses short-lived, revocable Bearer tokens (`lib/auth-ext.ts`, issue #15).
- **AI features** — suitability scoring persisted on the job (`Job.matchScore`/`matchVerdict`, issue #21), skill-match analysis, and CV/resume generation tailored to a job description.
- **Resume versions** — upload and tag resumes per job, stored via R2 (`lib/r2.ts`), with analytics on which resume version performs best (interview rate by resume, `app/api/analytics/route.ts`).
- **Gmail integration** — OAuth-connected inbox sync that classifies incoming mail into rejection/interview/offer/confirmation notifications, tokens encrypted at rest (`lib/crypto.ts`, issue #2), paginated sync (issue #6), per-user-scoped dedup (issue #23).
- **Telegram integration** — link your account, get push notifications, and a weekly pipeline digest (issue #22).
- **Interview scheduling + reminders** — set an interview date/type/location on a job, automated 24h-ahead reminder cron (`app/api/cron/interview-reminders/route.ts`, issue #20).
- **Analytics & insights dashboards** — applications over time, pipeline funnel, top companies, resume performance.
- **Demo account** (`demo@jobpilot.app`) — read-only guarded across write routes, used for the screenshots in the README and for letting people poke at the app without signing up.
- **Security/correctness hardening** — this has had real, sustained attention: encrypted OAuth tokens, IDOR fixes on jobs/resume versions, CSRF-safe OAuth state, demo-account write guards, input validation, rate limiting on auth endpoints, generic (non-leaky) error responses. See the closed issues for the full list — this wasn't done once, it's an ongoing practice.

## Next — open and actionable

Issues already filed and scoped against the current code:

- **#29 — Login broken on the live (production) deployment** (NextAuth `Configuration` error). This is the most urgent open item since it affects the actual production app, not just `testing`.
- **#30 — Jobs page: "Clear filters" button** (good first issue).
- **#31 — Resumes page: no download link for files uploaded to R2** (good first issue) — resumes can be uploaded but not retrieved from the UI.
- **#32 — Implement duplicate-job detection.** `Job.duplicateGroupId` and the duplicate-highlighting UI already exist in `app/(dashboard)/jobs/page.tsx`, but nothing ever populates the field — it's dead data today.
- **#33 — Deadline-approaching reminder cron.** `Job.deadline` is tracked and shown, but only `interviewDate` gets a reminder cron right now; deadlines can pass silently.
- **#34 — Drag-and-drop category reordering.** `Category.displayOrder` and the PATCH endpoint to set it already exist; there's just no UI that uses it yet, even though `@dnd-kit/sortable` is already a dependency (used in the Kanban board).

## Later — larger, less-scoped ideas

Directional, not committed — would need their own design/issue before work starts:

- **Batch category reorder endpoint** — if #34 lands with N sequential PATCH calls, a single transactional `/api/categories/reorder` would be the natural follow-up for users with many categories.
- **Broader ATS/job-board coverage for the extension** — the extension works generically via page scraping (`chrome-extension/content.js`); site-specific parsers for the highest-traffic boards could improve capture accuracy.
- **Retiring the legacy `extension/` + root `manifest.json` + `portal/` capture tool** — there's an older, separate "Job Data Capture" extension (writing to `portal/JobApplication.html`) still sitting in the repo alongside the real, published `chrome-extension/`. Worth a decision on whether to delete it or document why it's kept.
- **Notification center polish** — notifications exist (`Notification` model, Gmail-sourced + interview reminders) but there's room for richer in-app read/unread management beyond what's there today.
