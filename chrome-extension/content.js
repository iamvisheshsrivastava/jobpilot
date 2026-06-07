// JobPilot content script — minimal, just listens for GET_PAGE_TEXT messages
// The actual extraction runs via executeScript in popup.js, so this file is kept minimal

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'PING') {
    sendResponse({ ok: true, url: location.href })
  }
  return true
})
