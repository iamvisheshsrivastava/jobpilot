// JobPilot Extension v2.0.0 — background.js (service worker)
// All API calls go through the Next.js backend (authenticated)

let API_BASE = 'https://jobpilot-lime.vercel.app'

// ── Token management ──────────────────────────────────────────────────────────

async function getToken() {
  const { token } = await chrome.storage.local.get('token')
  return token || null
}

async function authHeaders() {
  const token = await getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  }
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const headers = await authHeaders()
  const resp = await fetch(API_BASE + path, { headers })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`GET ${path} → ${resp.status}: ${err}`)
  }
  return resp.json()
}

async function apiPost(path, body) {
  const headers = await authHeaders()
  const resp = await fetch(API_BASE + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }))
    throw new Error(err.error || `POST ${path} failed: ${resp.status}`)
  }
  return resp.json()
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  ;(async () => {
    if (!message?.type) {
      sendResponse({ ok: false, error: 'Invalid message' })
      return
    }

    // LOGIN — authenticate via dedicated token endpoint
    if (message.type === 'LOGIN') {
      try {
        const { email, password } = message.payload || {}
        const resp = await fetch(API_BASE + '/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await resp.json()
        if (!resp.ok) {
          sendResponse({ ok: false, error: data.error || 'Invalid email or password' })
          return
        }
        await chrome.storage.local.set({ token: data.token, userEmail: data.email })
        sendResponse({ ok: true })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    // LOGOUT
    if (message.type === 'LOGOUT') {
      await chrome.storage.local.remove(['token', 'userEmail'])
      sendResponse({ ok: true })
      return
    }

    // GET_CATEGORIES
    if (message.type === 'GET_CATEGORIES') {
      try {
        const categories = await apiGet('/api/categories')
        sendResponse({ ok: true, categories })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    // ENRICH_JOB — extract title/company/deadline via backend LLM
    if (message.type === 'ENRICH_JOB') {
      try {
        const { pageText } = message.payload || {}
        const data = await apiPost('/api/enrich', { pageText })
        sendResponse({ ok: true, data })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    // SKILL_ANALYSIS — AI skill extraction and gap analysis
    if (message.type === 'SKILL_ANALYSIS') {
      try {
        const { pageText } = message.payload || {}
        const data = await apiPost('/api/skill-analysis', { pageText })
        sendResponse({ ok: true, data })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    // CHECK_SUITABILITY — AI suitability verdict via backend
    if (message.type === 'CHECK_SUITABILITY') {
      try {
        const { pageText } = message.payload || {}
        const data = await apiPost('/api/suitability', { pageText })
        sendResponse({ ok: true, data })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    // SAVE_JOB — persist job to DB via backend
    if (message.type === 'SAVE_JOB') {
      try {
        const data = await apiPost('/api/jobs', message.payload)
        sendResponse({ ok: true, data })
      } catch (err) {
        sendResponse({ ok: false, error: err.message })
      }
      return
    }

    sendResponse({ ok: false, error: 'Unknown message type: ' + message.type })
  })()

  return true // keep channel open for async sendResponse
})
