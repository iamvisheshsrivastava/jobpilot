// JobPilot Extension v2.1.0 — popup.js
// Communicates with background.js for all API calls

const API_BASE = 'https://jobpilot-lime.vercel.app'

// ── Theme ─────────────────────────────────────────────────────────────────────

const THEMES = ['blue', 'purple', 'green', 'orange', 'pink', 'cyan']

async function loadTheme() {
  const { theme } = await chrome.storage.local.get('theme')
  applyTheme(theme || 'blue')
}

function applyTheme(theme) {
  if (!THEMES.includes(theme)) theme = 'blue'
  document.body.dataset.theme = theme
  document.querySelectorAll('.theme-dot').forEach((dot) => {
    dot.classList.toggle('active', dot.dataset.theme === theme)
  })
  chrome.storage.local.set({ theme })
}

document.addEventListener('DOMContentLoaded', () => {
  loadTheme()
  document.getElementById('themeSwitcher')?.addEventListener('click', (e) => {
    const dot = e.target.closest('.theme-dot')
    if (dot) applyTheme(dot.dataset.theme)
  })
})

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
const skillBtn        = document.getElementById('skillBtn')
const saveBtn         = document.getElementById('saveBtn')
const categorySelect  = document.getElementById('categorySelect')
const statusSelect    = document.getElementById('statusSelect')
const prioritySelect  = document.getElementById('prioritySelect')

const jobTitle        = document.getElementById('jobTitle')
const jobCompany      = document.getElementById('jobCompany')
const jobSalary       = document.getElementById('jobSalary')
const jobDeadline     = document.getElementById('jobDeadline')
const jobDescription  = document.getElementById('jobDescription')
const descToggle      = document.getElementById('descToggle')
const extractedBox    = document.getElementById('extractedBox')
const saveStatus      = document.getElementById('saveStatus')
const siteBadge       = document.getElementById('siteBadge')
const verdictEl       = document.getElementById('verdict')
const verdictLabel    = document.getElementById('verdictLabel')
const verdictReason   = document.getElementById('verdictReason')
const skillSummaryEl  = document.getElementById('skillSummary')
const skillMatched    = document.getElementById('skillMatchedTags')
const skillMissing    = document.getElementById('skillMissingTags')
const skillRelated    = document.getElementById('skillRelatedTags')

let capturedPageText = ''
let currentSite = ''

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
  const labels = { suitable: '\u2713 Suitable', somewhat: '\u26A0 Somewhat Suitable', 'not-suitable': '\u2717 Not Suitable' }
  verdictLabel.textContent = labels[verdict] || verdict
  verdictReason.textContent = reason || ''
  verdictEl.className = 'verdict show ' + verdict
}

function showSiteBadge(site, siteName) {
  currentSite = site
  siteBadge.textContent = 'Captured from ' + siteName
  siteBadge.className = 'site-badge ' + site
  siteBadge.style.display = 'inline-block'
}

function hideSiteBadge() {
  siteBadge.style.display = 'none'
  currentSite = ''
}

function resetCaptureUI() {
  hideSiteBadge()
  extractedBox.className = 'extracted-box'
  verdictEl.className = 'verdict'
  saveBtn.disabled = true
  capturedPageText = ''
}

// ── Description textarea expand/collapse ──

let descExpanded = false

descToggle.addEventListener('click', () => {
  descExpanded = !descExpanded
  jobDescription.rows = descExpanded ? 12 : 3
  descToggle.textContent = descExpanded ? 'collapse' : 'expand'
  if (descExpanded) {
    jobDescription.classList.add('expanded')
  } else {
    jobDescription.classList.remove('expanded')
  }
})

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

// Allow Enter key to submit login
;[loginEmail, loginPassword].forEach((el) => {
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click() })
})

loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim()
  const password = loginPassword.value
  if (!email || !password) {
    showMsg(loginError, 'Email and password are required', 'error')
    return
  }
  loginBtn.disabled = true
  loginBtn.textContent = 'Logging in\u2026'
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
    resetCaptureUI()
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
      opt.textContent = 'No categories \u2014 create one in dashboard'
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
  showMsg(saveStatus, 'Extracting job details\u2026', 'processing')
  captureBtn.disabled = true
  saveBtn.disabled = true

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    if (!tab) {
      showMsg(saveStatus, 'Could not access current tab', 'error')
      captureBtn.disabled = false
      return
    }

    // Send EXTRACT_JOB to content script for site-specific extraction
    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' }, (resp) => {
      captureBtn.disabled = false

      if (chrome.runtime.lastError || !resp?.ok) {
        // Content script may not be injected yet or EXTRACT_JOB not handled;
        // fall back to legacy approach with executeScript
        fallbackCapture(tab)
        return
      }

      const data = resp.data
      capturedPageText = data.jobDescription || ''

      // Populate form fields
      jobTitle.value = data.jobTitle || ''
      jobCompany.value = data.company || ''
      jobSalary.value = data.salary || ''
      jobDeadline.value = data.deadline || ''
      jobDescription.value = data.jobDescription || ''

      // Reset description toggle
      descExpanded = false
      jobDescription.rows = 3
      jobDescription.classList.remove('expanded')
      descToggle.textContent = 'expand'

      // Show site badge
      showSiteBadge(data._site || 'fallback', data._siteName || 'Generic')

      // Show extracted box
      extractedBox.className = 'extracted-box show'
      saveBtn.disabled = false
      hideMsg(saveStatus)

      // Also call enrichment for backward compatibility (title/company/deadline enrichment)
      if (data.jobDescription) {
        chrome.runtime.sendMessage({ type: 'ENRICH_JOB', payload: { pageText: data.jobDescription } }, (enrichResp) => {
          if (enrichResp?.ok && enrichResp.data) {
            // Only overwrite if the site-specific extraction didn't find it
            if (!jobTitle.value && enrichResp.data.title) jobTitle.value = enrichResp.data.title
            if (!jobCompany.value && enrichResp.data.company) jobCompany.value = enrichResp.data.company
            if (!jobDeadline.value && enrichResp.data.deadline) jobDeadline.value = enrichResp.data.deadline
          }
        })
      }
    })
  })
})

/**
 * Fallback capture when content script doesn't support EXTRACT_JOB.
 * Uses the legacy executeScript approach.
 */
function fallbackCapture(tab) {
  chrome.scripting.executeScript(
    { target: { tabId: tab.id, allFrames: true }, func: extractJobPostingText, args: [10000] },
    (results) => {
      if (chrome.runtime.lastError) {
        showMsg(saveStatus, 'Cannot read this page: ' + chrome.runtime.lastError.message, 'error')
        return
      }

      const frames = (results || [])
        .map((r) => r?.result)
        .filter((r) => r?.text)
        .sort((a, b) => (b.score || 0) - (a.score || 0))
      const pageText = frames[0]?.text || ''
      capturedPageText = pageText

      chrome.runtime.sendMessage({ type: 'ENRICH_JOB', payload: { pageText } }, (resp) => {
        if (chrome.runtime.lastError || !resp?.ok) {
          showMsg(saveStatus, resp?.error || 'Enrichment failed', 'error')
          return
        }
        jobTitle.value = resp.data?.title || ''
        jobCompany.value = resp.data?.company || ''
        jobDeadline.value = resp.data?.deadline || ''
        jobDescription.value = pageText
        showSiteBadge('fallback', 'Generic')
        extractedBox.className = 'extracted-box show'
        saveBtn.disabled = false
        hideMsg(saveStatus)
      })
    },
  )
}

// ── Auto-capture helper (used by Fit + Skills if not yet captured) ─────────────

function autoCaptureAndRun(callback) {
  if (capturedPageText) { callback(capturedPageText); return }

  showMsg(saveStatus, 'Reading page…', 'processing')
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    if (!tab) { showMsg(saveStatus, 'Could not access tab', 'error'); return }

    chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_JOB' }, (resp) => {
      if (!chrome.runtime.lastError && resp?.ok && resp.data?.jobDescription) {
        capturedPageText = resp.data.jobDescription
        if (!jobTitle.value) jobTitle.value = resp.data.jobTitle || ''
        if (!jobCompany.value) jobCompany.value = resp.data.company || ''
        if (!jobDeadline.value) jobDeadline.value = resp.data.deadline || ''
        if (!jobDescription.value) jobDescription.value = resp.data.jobDescription || ''
        extractedBox.className = 'extracted-box show'
        saveBtn.disabled = false
        callback(capturedPageText)
        return
      }
      chrome.scripting.executeScript(
        { target: { tabId: tab.id, allFrames: true }, func: extractJobPostingText, args: [10000] },
        (results) => {
          if (chrome.runtime.lastError) { showMsg(saveStatus, 'Cannot read this page', 'error'); return }
          const frames = (results || []).map(r => r?.result).filter(r => r?.text).sort((a, b) => (b.score || 0) - (a.score || 0))
          const text = frames[0]?.text || ''
          if (!text) { showMsg(saveStatus, 'No job text found on this page', 'error'); return }
          capturedPageText = text
          if (!jobDescription.value) jobDescription.value = text
          extractedBox.className = 'extracted-box show'
          saveBtn.disabled = false
          callback(capturedPageText)
        }
      )
    })
  })
}

// ── Suitability ───────────────────────────────────────────────────────────────

suitBtn.addEventListener('click', () => {
  suitBtn.disabled = true
  autoCaptureAndRun((pageText) => {
    showMsg(saveStatus, 'Analysing job fit…', 'processing')
    chrome.runtime.sendMessage({ type: 'CHECK_SUITABILITY', payload: { pageText } }, (resp) => {
      suitBtn.disabled = false
      hideMsg(saveStatus)
      if (chrome.runtime.lastError || !resp?.ok) {
        showMsg(saveStatus, resp?.error || 'Suitability check failed', 'error')
        return
      }
      showVerdict(resp.data?.verdict, resp.data?.reason ?? resp.data?.recommendation)
    })
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
  showMsg(saveStatus, 'Saving\u2026', 'processing')

  // Use the captured job description or fall back to page text extraction
  let pageNote = capturedPageText || jobDescription.value
  const doSave = (note, tabUrl) => {
    chrome.runtime.sendMessage(
      {
        type: 'SAVE_JOB',
        payload: {
          title,
          company: jobCompany.value.trim() || null,
          link: tabUrl || null,
          categoryId,
          status: statusSelect.value,
          priority: prioritySelect.value,
          deadline: jobDeadline.value || null,
          salary: jobSalary.value.trim() || null,
          pageNote: note || null,
        },
      },
      (resp) => {
        saveBtn.disabled = false
        if (chrome.runtime.lastError || !resp?.ok) {
          showMsg(saveStatus, resp?.error || 'Save failed', 'error')
          return
        }
        showMsg(saveStatus, 'Saved to "' + (categorySelect.options[categorySelect.selectedIndex]?.text || '') + '"!', 'success')
        // Reset form
        resetCaptureUI()
        jobTitle.value = ''
        jobCompany.value = ''
        jobSalary.value = ''
        jobDeadline.value = ''
        jobDescription.value = ''
      },
    )
  }

  // Get current tab URL for the link field
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    const tabUrl = tab?.url || null
    if (!pageNote && tab) {
      // Fallback: extract full page text for note
      chrome.scripting.executeScript(
        { target: { tabId: tab.id, allFrames: true }, func: extractJobPostingText, args: [50000] },
        (results) => {
          const frames = (results || []).map((r) => r?.result).filter((r) => r?.text).sort((a, b) => (b.score || 0) - (a.score || 0))
          doSave(frames[0]?.text || '', tabUrl)
        },
      )
    } else {
      doSave(pageNote, tabUrl)
    }
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
      .replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n')
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

// ── Skill Match ───────────────────────────────────────────────────────────────
const skillMatchResults = document.getElementById('skillMatchResults')
const skillChips = document.getElementById('skillChips')
const skillSummaryText = document.getElementById('skillSummaryText')

skillBtn.addEventListener('click', () => {
  skillBtn.disabled = true
  autoCaptureAndRun((pageText) => {
  showMsg(saveStatus, 'Analyzing skills\u2026', 'processing')

  chrome.runtime.sendMessage({ type: 'CHECK_SKILLS', payload: { pageText } }, (resp) => {
    skillBtn.disabled = false
    hideMsg(saveStatus)
    if (chrome.runtime.lastError || !resp?.ok) {
      showMsg(saveStatus, resp?.error || 'Skill analysis failed', 'error')
      return
    }

    const data = resp.data
    skillMatchResults.style.display = 'block'
    skillChips.innerHTML = ''

    // Matched skills (green)
    ;(data.matched || []).forEach((skill) => {
      const chip = document.createElement('span')
      chip.className = 'skill-chip matched'
      chip.textContent = '\u2713 ' + skill
      skillChips.appendChild(chip)
    })

    // Missing skills (red)
    ;(data.missing || []).forEach((skill) => {
      const chip = document.createElement('span')
      chip.className = 'skill-chip missing'
      chip.textContent = '\u2717 ' + skill
      skillChips.appendChild(chip)
    })

    // Nice-to-have matched (green)
    ;(data.matchedNice || []).forEach((skill) => {
      const chip = document.createElement('span')
      chip.className = 'skill-chip nice-matched'
      chip.textContent = '\u2713 ' + skill
      skillChips.appendChild(chip)
    })

    // Nice-to-have missing (muted gray)
    const unmatchedNice = (data.niceToHave || []).filter((s) => !(data.matchedNice || []).includes(s))
    unmatchedNice.forEach((skill) => {
      const chip = document.createElement('span')
      chip.className = 'skill-chip nice-missing'
      chip.textContent = skill
      skillChips.appendChild(chip)
    })

    // Summary text
    const totalRequired = (data.matched?.length || 0) + (data.missing?.length || 0)
    if (totalRequired > 0) {
      skillSummaryText.textContent = 'Match ' + (data.matched?.length || 0) + ' of ' + totalRequired + ' required skills. Missing: ' + (data.missing?.join(', ') || 'none') + '.'
    } else {
      skillSummaryText.textContent = ''
    }
  })
  }) // end autoCaptureAndRun
})

// ── Init ──────────────────────────────────────────────────────────────────────
checkAuth()
