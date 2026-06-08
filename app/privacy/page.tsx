export const metadata = { title: 'Privacy Policy – JobPilot' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-slate-500">Last updated: June 8, 2026</p>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">1. What we collect</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          JobPilot collects only the data you provide directly: your name, email address,
          and password (stored as a secure hash). We also store the job application data
          you choose to save (job titles, companies, notes, statuses).
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">2. How we use your data</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Your data is used solely to provide the JobPilot service — authenticating your
          account and storing your job applications. We do not use your data for advertising,
          profiling, or any purpose unrelated to job tracking.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">3. Chrome Extension</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          The JobPilot Chrome extension reads the title and URL of the active browser tab
          only when you explicitly click the extension to save a job. It does not monitor
          your browsing history or collect data in the background.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">4. AI features</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          If you use AI features (CV generation, suitability check), your profile data and
          job description are sent to a third-party AI provider (e.g. OpenAI, Anthropic)
          using your own API key. JobPilot does not store or log AI requests.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">5. Data sharing</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          We do not sell, trade, or transfer your data to third parties. Your data is stored
          securely in our database and is never shared without your consent.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">6. Data deletion</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          You can delete your account and all associated data at any time by contacting us
          at srivastava.vishesh9@gmail.com.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">7. Contact</h2>
        <p className="text-sm leading-relaxed text-slate-600">
          For any privacy-related questions, contact: srivastava.vishesh9@gmail.com
        </p>
      </section>
    </main>
  )
}
