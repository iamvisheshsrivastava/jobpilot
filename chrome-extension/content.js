// JobPilot content script — site-specific job extractors
// Detects which job site we're on and extracts structured data

/**
 * Determine which job site we're on based on hostname.
 */
function detectSite() {
  const host = window.location.hostname.toLowerCase()

  if (host.includes('linkedin.com') && window.location.pathname.includes('/jobs/')) {
    return 'linkedin'
  }
  if (host.includes('myworkday.com') || host.includes('workday.com')) {
    return 'workday'
  }
  if (host.includes('boards.greenhouse.io')) {
    return 'greenhouse'
  }
  if (host.includes('jobs.lever.co')) {
    return 'lever'
  }
  return 'fallback'
}

/**
 * Site-specific extractors.
 */
function extractLinkedIn() {
  const getText = (sel) => document.querySelector(sel)?.innerText?.trim() ?? ''

  return {
    jobTitle: getText('.job-details-jobs-unified-top-card__job-title'),
    company: getText('.job-details-jobs-unified-top-card__company-name'),
    url: window.location.href,
    jobDescription: getText('.jobs-description__content'),
    salary: document.querySelector('.compensation__salary')?.innerText?.trim() ?? null,
  }
}

function extractWorkday() {
  const getText = (sel) => document.querySelector(sel)?.innerText?.trim() ?? ''
  const title = getText('[data-automation-id="jobPostingHeader"]')

  // Derive company from document.title or subdomain
  let company = ''
  const titleParts = document.title.split(' - ')
  if (titleParts.length > 1) {
    company = titleParts[titleParts.length - 1].trim()
  }
  if (!company) {
    const parts = window.location.hostname.split('.')
    if (parts.length >= 2) {
      company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    }
  }

  return {
    jobTitle: title,
    company,
    url: window.location.href,
    jobDescription: getText('[data-automation-id="jobPostingDescription"]'),
    salary: document.querySelector('[data-automation-id="compensation"]')?.innerText?.trim() ?? null,
  }
}

function extractGreenhouse() {
  const getText = (sel) => document.querySelector(sel)?.innerText?.trim() ?? ''

  return {
    jobTitle: getText('.app-title'),
    company: getText('.company-name'),
    url: window.location.href,
    jobDescription: getText('#content'),
    salary: null,
  }
}

function extractLever() {
  const getText = (sel) => document.querySelector(sel)?.innerText?.trim() ?? ''

  let company = getText('.main-header-text .company-name')
  if (!company) {
    // Derive from URL: jobs.lever.co/COMPANY_NAME
    const parts = window.location.pathname.split('/').filter(Boolean)
    if (parts.length >= 1) {
      company = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).replace(/-/g, ' ')
    }
  }

  return {
    jobTitle: getText('.posting-headline h2'),
    company,
    url: window.location.href,
    jobDescription: getText('.posting-requirements'),
    salary: document.querySelector('[data-qa="salary"]')?.innerText?.trim() ?? null,
  }
}

function extractFallback() {
  // Generic extraction: use page title as job title
  const title = document.title?.trim() ?? ''
  return {
    jobTitle: title,
    company: '',
    url: window.location.href,
    jobDescription: '',
    salary: null,
  }
}

/**
 * Map site name → extractor function
 */
const EXTRACTORS = {
  linkedin: extractLinkedIn,
  workday: extractWorkday,
  greenhouse: extractGreenhouse,
  lever: extractLever,
  fallback: extractFallback,
}

/**
 * Get site display name for the badge.
 */
function getSiteDisplayName(site) {
  const names = {
    linkedin: 'LinkedIn',
    workday: 'Workday',
    greenhouse: 'Greenhouse',
    lever: 'Lever',
    fallback: 'Generic',
  }
  return names[site] ?? 'Generic'
}

// ── Listen for messages from popup ──
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ ok: true, url: location.href })
    return true
  }

  if (message?.type === 'EXTRACT_JOB') {
    const site = detectSite()
    const extractor = EXTRACTORS[site]
    const data = extractor()
    data._site = site
    data._siteName = getSiteDisplayName(site)
    sendResponse({ ok: true, data })
    return true
  }

  return true
})