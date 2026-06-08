// JobPilot Extension v2.0.0 — popup.js
// Communicates with background.js for all API calls

const API_BASE = 'http://localhost:3000' // dev; background.js also uses this

// ── DOM refs ──────────────────────────────────────────────────────────────────
const loginView       = document.getElementById('loginView')
const mainView        = document.getElementById('mainView')
const loginEmail      = document.getElementById('loginEmail')
const loginPassword   = document.getElementById('loginPassword')
const loginBtn        = document.getElementById('loginBtn')
const loginError      = document.getElementById('loginError')
const logoutBtn       = document.getElementById('logoutBtn')
const userEmailEl     = document.getElementById('userEmail')
const signupLink      = document.getElementById('signupLink')
const openDashboard   = document.getElementById('openDashboard')

const captureBtn      = document.getElementById('captureBtn')
const suitBtn         = document.getElementById('suitBtn')
const saveBtn         = document.getElementById('saveBtn')
const categorySelect  = document.getElementById('categorySelect')
const statusSelect    = document.getElementById('statusSelect')
const prioritySelect  = document.getElementById('prioritySelect')

const jobTitle        = document.getElementById('jobTitle')
const jobCompany      = document.getElementById('jobCompany')
const jobDeadline     = document.getElementById('jobDeadline')
const extractedBox    = document.getElementById('extractedBox')
const saveStatus      = document.getElementById('saveStatus')
const verdictEl       = document.getElementById('verdict')
const verdictLabel    = document.getElementById('verdictLabel')
const verdictReason   = document.getElementById('verdictReason')
const skillSummaryEl  = document.getElementById('skillSummary')
const skillMatched    = document.getElementById('skillMatchedTags')
const skillMissing    = document.getElementById('skillMissingTags')
const skillRelated    = document.getElementById('skillRelatedTags')

let capturedPageText = ''

// ── Helpers ───────────────────────────────────────────────────────────────────

function showMsg(el, msg, type) {
  el.textContent = msg
  el.className = 'status-msg show ' + (type || '')
}

function hideMsg(el) {
  el.className = 'status-msg'
  el.textContent = ''
}

function showVerdict(verdict, reason) {
  const labels = { suitable: '✓ Suitable', somewhat: '⚠ Somewhat Suitable', 'not-suitable': '✗ Not Suitable' }
  verdictLabel.textContent = labels[verdict] || verdict
  verdictReason.textContent = reason || ''
  verdictEl.className = 'verdict show ' + verdict
}

// ── Auth flow ─────────────────────────────────────────────────────────────────

async function checkAuth() {
  const { token, userEmail } = await chrome.storage.local.get(['token', 'userEmail'])
  if (token) {
    showMain(userEmail)
  } else {
    showLogin()
  }
}

function showLogin() {
  loginView.style.display = 'block'
  mainView.style.display = 'none'
}

function showMain(email) {
  loginView.style.display = 'none'
  mainView.style.display = 'block'
  if (email) userEmailEl.textContent = email
  loadCategories()
}

loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim()
  const password = loginPassword.value
  if (!email || !password) {
    showMsg(loginError, 'Email and password are required', 'error')
    return
  }
  loginBtn.disabled = true
  loginBtn.textContent = 'Logging in…'
  hideMsg(loginError)

  chrome.runtime.sendMessage({ type: 'LOGIN', payload: { email, password } }, (resp) => {
    loginBtn.disabled = false
    loginBtn.textContent = 'Log In'
    if (chrome.runtime.lastError || !resp?.ok) {
      showMsg(loginError, resp?.error || 'Login failed. Check your credentials.', 'error')
      return
    }
    showMain(email)
  })
})

logoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => {
    showLogin()
    loginEmail.value = ''
    loginPassword.value = ''
    extractedBox.className = 'extracted-box'
    verdictEl.className = 'verdict'
    saveBtn.disabled = true
    capturedPageText = ''
  })
})

signupLink.addEventListener('click', () => {
  chrome.tabs.create({ url: API_BASE + '/signup' })
})

openDashboard.addEventListener('click', () => {
  chrome.tabs.create({ url: API_BASE + '/jobs' })
})

// ── Categories ────────────────────────────────────────────────────────────────

function loadCategories() {
  chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' }, (resp) => {
    if (chrome.runtime.lastError || !resp?.ok) return
    categorySelect.innerHTML = ''
    if (!resp.categories?.length) {
      const opt = document.createElement('option')
      opt.value = ''
      opt.textContent = 'No categories — create one in dashboard'
      categorySelect.appendChild(opt)
      return
    }
    resp.categories.forEach((cat) => {
      const opt = document.createElement('option')
      opt.value = cat.id
      opt.textContent = cat.name
      categorySelect.appendChild(opt)
    })
  })
}

// ── Capture ───────────────────────────────────────────────────────────────────

captureBtn.addEventListener('click', () => {
  hideMsg(saveStatus)
  verdictEl.className = 'verdict'
  showMsg(saveStatus, 'Extracting job details with AI…', 'processing')
  captureBtn.disabled = true
  saveBtn.disabled = true

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    if (!tab) {
      showMsg(saveStatus, 'Could not access current tab', 'error')
      captureBtn.disabled = false
      return
    }

    chrome.scripting.executeScript(
      { target: { tabId: tab.id, allFrames: true }, func: extractJobPostingText, args: [10000] },
      (results) => {
        if (chrome.runtime.lastError) {
          showMsg(saveStatus, 'Cannot read this page: ' + chrome.runtime.lastError.message, 'error')
          captureBtn.disabled = false
          return
        }

        const frames = (results || [])
          .map((r) => r?.result)
          .filter((r) => r?.text)
          .sort((a, b) => (b.score || 0) - (a.score || 0))
        const pageText = frames[0]?.text || ''
        capturedPageText = pageText

        chrome.runtime.sendMessage({ type: 'ENRICH_JOB', payload: { pageText } }, (resp) => {
          captureBtn.disabled = false
          if (chrome.runtime.lastError || !resp?.ok) {
            showMsg(saveStatus, resp?.error || 'Enrichment failed', 'error')
            return
          }
          jobTitle.value = resp.data?.title || ''
          jobCompany.value = resp.data?.company || ''
          jobDeadline.value = resp.data?.deadline || ''
          extractedBox.className = 'extracted-box show'
          saveBtn.disabled = false
          hideMsg(saveStatus)
        })
      },
    )
  })
})

// ── Suitability ───────────────────────────────────────────────────────────────

suitBtn.addEventListener('click', () => {
  if (!capturedPageText) {
    showMsg(saveStatus, 'Capture the job first before checking fit', 'error')
    return
  }
  suitBtn.disabled = true
  showMsg(saveStatus, 'Analysing job fit…', 'processing')

  chrome.runtime.sendMessage({ type: 'CHECK_SUITABILITY', payload: { pageText: capturedPageText } }, (resp) => {
    suitBtn.disabled = false
    hideMsg(saveStatus)
    if (chrome.runtime.lastError || !resp?.ok) {
      showMsg(saveStatus, resp?.error || 'Suitability check failed', 'error')
      return
    }
    showVerdict(resp.data?.verdict, resp.data?.reason)
  })
})

// ── Save ──────────────────────────────────────────────────────────────────────

saveBtn.addEventListener('click', () => {
  const categoryId = categorySelect.value
  if (!categoryId) {
    showMsg(saveStatus, 'Please select a category', 'error')
    return
  }
  const title = jobTitle.value.trim()
  if (!title) {
    showMsg(saveStatus, 'Job title is required', 'error')
    return
  }

  saveBtn.disabled = true
  showMsg(saveStatus, 'Saving…', 'processing')

  // Also capture full page text for note storage
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    chrome.scripting.executeScript(
      { target: { tabId: tab.id, allFrames: true }, func: extractJobPostingText, args: [50000] },
      (results) => {
        const frames = (results || []).map((r) => r?.result).filter((r) => r?.text).sort((a, b) => (b.score || 0) - (a.score || 0))
        const fullPageText = frames[0]?.text || ''

        chrome.runtime.sendMessage(
          {
            type: 'SAVE_JOB',
            payload: {
              title,
              company: jobCompany.value.trim() || null,
              link: tab?.url || null,
              categoryId,
              status: statusSelect.value,
              priority: prioritySelect.value,
              deadline: jobDeadline.value || null,
              pageNote: fullPageText || null,
            },
          },
          (resp) => {
            saveBtn.disabled = false
            if (chrome.runtime.lastError || !resp?.ok) {
              showMsg(saveStatus, resp?.error || 'Save failed', 'error')
              return
            }
            showMsg(saveStatus, `Saved to "${categorySelect.options[categorySelect.selectedIndex]?.text}"!`, 'success')
            // Reset form
            extractedBox.className = 'extracted-box'
            verdictEl.className = 'verdict'
            capturedPageText = ''
            saveBtn.disabled = true
            jobTitle.value = ''
            jobCompany.value = ''
            jobDeadline.value = ''
          },
        )
      },
    )
  })
})

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active')
  })
})

// ── Page text extractor (injected into page) ──────────────────────────────────
// This function runs IN the page context via executeScript — keep it self-contained

function extractJobPostingText(limit) {
  const maxChars = Number(limit) || 10000
  const host = location.hostname.toLowerCase()
  const isFindAPhD = /(^|\.)findaphd\.com$/.test(host)

  const DROP_SELECTOR = [
    'script','style','noscript','template','iframe','canvas','svg',
    'form','input','textarea','select','option','button',
    'nav','header','footer','aside',
    '[hidden]','[aria-hidden="true"]','[aria-modal="true"]',
    '[role="dialog"]','[role="navigation"]','[role="banner"]','[role="contentinfo"]',
    '[class*="modal" i]','[id*="modal" i]',
    '[class*="cookie" i]','[id*="cookie" i]',
    '[class*="consent" i]','[id*="consent" i]',
  ].join(',')

  const BLOCK_TAGS = new Set(['ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','BR','DD','DIV','DL','DT',
    'FIGCAPTION','FIGURE','H1','H2','H3','H4','H5','H6','HR','LI','MAIN','P','PRE',
    'SECTION','TABLE','TBODY','TD','TFOOT','TH','THEAD','TR','UL','OL'])

  function isHidden(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return true
    const s = getComputedStyle(el)
    return s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0'
  }

  function cleanClone(source) {
    const clone = source.cloneNode(true)
    const pairs = [[source, clone]]
    while (pairs.length) {
      const [src, dst] = pairs.pop()
      if (!dst || dst.nodeType !== Node.ELEMENT_NODE) continue
      if (src !== source && isHidden(src)) { dst.remove(); continue }
      const sc = Array.from(src.children)
      const dc = Array.from(dst.children)
      for (let i = 0; i < sc.length; i++) pairs.push([sc[i], dc[i]])
    }
    clone.querySelectorAll(DROP_SELECTOR).forEach(el => el.remove())
    return clone
  }

  function nodeToText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/[ \t\r\f\v]+/g, ' ')
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = node.tagName
    if (tag === 'BR') return '\n'
    const pad = BLOCK_TAGS.has(tag) ? '\n' : ''
    let text = tag === 'LI' ? '- ' : ''
    node.childNodes.forEach(c => { text += nodeToText(c) })
    return pad + text + pad
  }

  function normalize(text) {
    return String(text || '')
      .replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n')
      .split('\n').map(l => l.trim()).filter(Boolean).join('\n').trim()
  }

  function textFromElement(el) { return normalize(nodeToText(cleanClone(el))) }

  const selectors = isFindAPhD
    ? ['main article','article','main','[role="main"]','[id*="project" i]','[class*="project" i]']
    : ['main article','article','main','[role="main"]','[class*="job" i]','[id*="job" i]','[class*="description" i]','[class*="content" i]']

  const seen = new Set()
  const elements = []
  selectors.forEach(s => document.querySelectorAll(s).forEach(el => { if (!seen.has(el)) { seen.add(el); elements.push(el) } }))
  if (document.body && !seen.has(document.body)) elements.push(document.body)

  const candidates = elements
    .map(el => {
      const text = textFromElement(el)
      const lower = text.toLowerCase()
      let score = Math.min(text.length, 20000)
      if (el !== document.body) score += 2500
      if (/job description|requirements|about the (role|company|project)/.test(lower)) score += 3500
      return { text, score }
    })
    .filter(c => c.text.length >= 200)
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]?.text || textFromElement(document.body) || ''
  return { text: best.slice(0, maxChars), score: candidates[0]?.score || 0, length: best.length, url: location.href }
}

// ── Init ──────────────────────────────────────────────────────────────────────
checkAuth()
