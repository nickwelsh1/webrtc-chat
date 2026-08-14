export const ui = {}

export function initUi() {
  const app = document.querySelector('#app')
  app.innerHTML = `
    <div class="chat-app">
      <header class="chat-app__header">
        <h1 class="chat-app__title">Chat App</h1>
        <button class="chat-app__url-qr" id="url-qr-btn" type="button" title="Show app URL QR">URL</button>
        <div class="chat-app__alias">
          <span class="chat-app__alias-label">Alias</span>
          <input class="chat-app__alias-input" id="alias" type="text" maxlength="20" value="" />
          <span class="chat-app__peer-count" id="peer-count">0 peers</span>
        </div>
      </header>
      <main class="chat-app__main" id="main">
        <section class="chat-app__start" id="start-view">
          <h2 class="chat-app__start-title">P2P Chat</h2>
          <ol class="chat-app__steps">
            <li>One person taps <strong>Create chat</strong> and waits for the invite QR codes.</li>
            <li>The other taps <strong>Join with QR</strong> and scans <em>all</em> invite QR codes in any order, or pastes the invite codes below.</li>
            <li>Once the invite is assembled, the joiner gets answer QR codes; the creator scans all of them.</li>
            <li>The chat opens automatically as soon as the connection is established.</li>
          </ol>
          <form class="chat-app__form" onsubmit="return false">
            <label class="chat-app__label" for="start-alias">Choose your alias</label>
            <input class="chat-app__input" id="start-alias" type="text" maxlength="20" placeholder="Alias" />
            <button class="chat-app__btn chat-app__btn--primary" id="create-btn" type="button">Create chat</button>
            <button class="chat-app__btn" id="join-btn" type="button">Join with QR</button>
          </form>
          <div class="chat-app__stored hidden" id="stored-codes"></div>
        </section>
        <section class="chat-app__chat hidden" id="chat-view">
          <div class="chat-app__messages" id="messages"></div>
          <div class="chat-app__compose">
            <input class="chat-app__input chat-app__input--message" id="message-input" type="text" placeholder="Type a message..." autocomplete="off" />
            <button class="chat-app__btn chat-app__btn--primary" id="send-btn" type="button">Send</button>
          </div>
        </section>
      </main>
      <div class="chat-app__actions" id="actions">
        <button class="chat-app__btn" id="invite-more-btn" type="button" disabled>Invite peer</button>
        <button class="chat-app__btn chat-app__btn--danger" id="quit-btn" type="button" disabled>Quit chat</button>
      </div>
    </div>
    <div class="chat-app__qr-section" id="qr-section">
      <button class="chat-app__overlay-close" id="qr-close-btn" type="button" title="Close">X</button>
      <h3 id="qr-title">Your QR</h3>
      <div class="chat-app__qr-loading hidden" id="qr-loading">
        <div class="chat-app__qr-spinner"></div>
        <p id="qr-loading-text">Creating invite, please wait...</p>
        <button class="chat-app__btn chat-app__btn--danger" id="qr-loading-cancel" type="button">Cancel</button>
      </div>
      <div class="chat-app__qr-carousel" id="qr-carousel">
        <canvas class="chat-app__qr-canvas" id="qr-canvas" width="384" height="384"></canvas>
        <div class="chat-app__qr-dots" id="qr-dots"></div>
        <div class="chat-app__qr-nav" id="qr-nav">
          <button class="chat-app__btn" id="qr-prev" type="button" disabled>Previous</button>
          <button class="chat-app__btn" id="qr-next" type="button" disabled>Next</button>
        </div>
        <p class="chat-app__qr-text" id="qr-text"></p>
        <pre class="chat-app__qr-code" id="qr-code"></pre>
        <div class="chat-app__qr-actions">
          <button class="chat-app__btn chat-app__btn--primary" id="qr-copy" type="button">Copy this code</button>
          <button class="chat-app__btn" id="qr-mode-btn" type="button">Use 1 QR</button>
          <button class="chat-app__btn" id="qr-copy-all" type="button">Copy all</button>
          <button class="chat-app__btn chat-app__btn--danger" id="qr-reset" type="button">Reset codes</button>
          <button class="chat-app__btn chat-app__btn--primary" id="qr-done-btn" type="button">Done</button>
        </div>
      </div>
    </div>
    <div class="chat-app__scanner" id="scanner-section">
      <button class="chat-app__overlay-close" id="scanner-close-btn" type="button" title="Close">X</button>
      <h3 id="scanner-title">Scan QR code</h3>
      <p class="chat-app__status" id="scanner-status">Scan all chunks in any order</p>
      <div class="chat-app__scanner-chunks" id="scanner-chunks"></div>
      <div class="chat-app__manual-input">
        <input class="chat-app__input chat-app__input--full" id="manual-code" type="text" placeholder="Paste a chunk code here" autocomplete="off" />
        <button class="chat-app__btn" id="manual-submit" type="button">Use code</button>
      </div>
      <div class="chat-app__scanner-video" id="scanner-video"></div>
      <div class="chat-app__scanner-actions">
        <button class="chat-app__btn" id="scanner-cancel-btn" type="button">Cancel</button>
        <button class="chat-app__btn chat-app__btn--primary" id="scanner-continue" type="button" disabled>Continue</button>
      </div>
    </div>
  `

  ui.app = app
  ui.startView = document.getElementById('start-view')
  ui.chatView = document.getElementById('chat-view')
  ui.messages = document.getElementById('messages')
  ui.messageInput = document.getElementById('message-input')
  ui.aliasInput = document.getElementById('alias')
  ui.peerCount = document.getElementById('peer-count')
  ui.storedSection = document.getElementById('stored-codes')

  ui.qrSection = document.getElementById('qr-section')
  ui.qrLoading = document.getElementById('qr-loading')
  ui.qrLoadingText = document.getElementById('qr-loading-text')
  ui.qrLoadingCancel = document.getElementById('qr-loading-cancel')
  ui.qrCarousel = document.getElementById('qr-carousel')
  ui.qrCanvas = document.getElementById('qr-canvas')
  ui.qrDots = document.getElementById('qr-dots')
  ui.qrTitle = document.getElementById('qr-title')
  ui.qrText = document.getElementById('qr-text')
  ui.qrCodePre = document.getElementById('qr-code')
  ui.qrPrev = document.getElementById('qr-prev')
  ui.qrNext = document.getElementById('qr-next')
  ui.qrNav = document.getElementById('qr-nav')
  ui.qrCopy = document.getElementById('qr-copy')
  ui.qrCopyAll = document.getElementById('qr-copy-all')
  ui.qrReset = document.getElementById('qr-reset')
  ui.qrDoneBtn = document.getElementById('qr-done-btn')
  ui.qrModeBtn = document.getElementById('qr-mode-btn')
  ui.qrCloseBtn = document.getElementById('qr-close-btn')

  ui.scannerSection = document.getElementById('scanner-section')
  ui.scannerCloseBtn = document.getElementById('scanner-close-btn')
  ui.scannerTitle = document.getElementById('scanner-title')
  ui.scannerStatus = document.getElementById('scanner-status')
  ui.scannerChunks = document.getElementById('scanner-chunks')
  ui.scannerVideo = document.getElementById('scanner-video')
  ui.scannerCancelBtn = document.getElementById('scanner-cancel-btn')
  ui.scannerContinueBtn = document.getElementById('scanner-continue')
  ui.manualInput = document.getElementById('manual-code')
  ui.manualSubmit = document.getElementById('manual-submit')

  ui.createBtn = document.getElementById('create-btn')
  ui.joinBtn = document.getElementById('join-btn')
  ui.inviteBtn = document.getElementById('invite-more-btn')
  ui.quitBtn = document.getElementById('quit-btn')
  ui.sendBtn = document.getElementById('send-btn')
  ui.startAliasInput = document.getElementById('start-alias')
  ui.urlQrBtn = document.getElementById('url-qr-btn')
}

export function showStart() {
  ui.startView.classList.remove('hidden')
  ui.chatView.classList.add('hidden')
  ui.inviteBtn.disabled = true
  ui.quitBtn.disabled = true
}

export function showChat() {
  ui.startView.classList.add('hidden')
  ui.chatView.classList.remove('hidden')
  ui.inviteBtn.disabled = false
  ui.quitBtn.disabled = false
}

export function setAlias(value) {
  if (ui.aliasInput) ui.aliasInput.value = value
  if (ui.startAliasInput) ui.startAliasInput.value = value
}

export function updatePeerCount(n) {
  ui.peerCount.textContent = `${n} peer${n === 1 ? '' : 's'}`
}

export function showQrLoading(title, message) {
  ui.qrTitle.textContent = title
  ui.qrLoading.classList.remove('hidden')
  ui.qrCarousel.classList.add('hidden')
  ui.qrLoadingText.textContent = message
  ui.qrSection.classList.add('chat-app__qr-section--visible')
}

export function showQrCarousel() {
  ui.qrSection.classList.add('chat-app__qr-section--visible')
  ui.qrLoading.classList.add('hidden')
  ui.qrCarousel.classList.remove('hidden')
}

export function hideQr() {
  ui.qrSection.classList.remove('chat-app__qr-section--visible')
}

export function setQrTitle(title) {
  ui.qrTitle.textContent = title
}

export function setQrDots(n, current) {
  ui.qrDots.innerHTML = ''
  for (let i = 0; i < n; i++) {
    const dot = document.createElement('span')
    dot.className = `chat-app__qr-dot ${i === current ? 'chat-app__qr-dot--active' : ''}`
    dot.textContent = i + 1
    dot.title = `QR code ${i + 1} of ${n}`
    ui.qrDots.appendChild(dot)
  }
}

export function setQrModeBtn(label, enabled = true) {
  ui.qrModeBtn.textContent = label
  ui.qrModeBtn.disabled = !enabled
  ui.qrModeBtn.classList.toggle('hidden', !enabled)
}

export function setQrUrlMode(isUrl) {
  ui.qrDots.classList.toggle('hidden', isUrl)
  ui.qrNav.classList.toggle('hidden', isUrl)
  ui.qrCopyAll.classList.toggle('hidden', isUrl)
  ui.qrReset.classList.toggle('hidden', isUrl)
  ui.qrCopy.textContent = isUrl ? 'Copy URL' : 'Copy this code'
}

export function setQrCodeInfo(fullCode, chunk) {
  ui.qrText.textContent = `QR ${chunk.index + 1} of ${chunk.n}`
  ui.qrCodePre.textContent = fullCode
}

export function setQrNav(current, n) {
  ui.qrPrev.disabled = current === 0
  ui.qrNext.disabled = current >= n - 1
}

export function showScanner(title) {
  ui.scannerTitle.textContent = title
  ui.scannerSection.classList.add('chat-app__scanner--visible')
  ui.scannerContinueBtn.disabled = true
}

export function hideScanner() {
  ui.scannerSection.classList.remove('chat-app__scanner--visible')
}

export function setScannerStatus(text) {
  ui.scannerStatus.textContent = text
}

export function renderScannerSlots(n, collected) {
  ui.scannerChunks.innerHTML = ''
  for (let i = 0; i < n; i++) {
    const slot = document.createElement('div')
    const got = collected.has(i)
    slot.className = `chat-app__scanner-slot ${got ? 'chat-app__scanner-slot--got' : ''}`
    slot.textContent = `${i + 1}`
    slot.title = got ? `Chunk ${i + 1} scanned` : `Chunk ${i + 1} missing`
    ui.scannerChunks.appendChild(slot)
  }
}

export function setScannerContinue(enabled) {
  ui.scannerContinueBtn.disabled = !enabled
}

export function showStored(hasInvite, hasAnswer) {
  if (!hasInvite && !hasAnswer) {
    ui.storedSection.classList.add('hidden')
    return
  }
  ui.storedSection.classList.remove('hidden')
  ui.storedSection.innerHTML = `
    <h3 class="chat-app__stored-title">Stored codes</h3>
    ${hasInvite ? `
      <div class="chat-app__stored-row">
        <span class="chat-app__stored-label">Invite</span>
        <button class="chat-app__btn" id="stored-invite-qr" type="button">Show QR</button>
        <button class="chat-app__btn" id="stored-invite-copy" type="button">Copy all</button>
      </div>
    ` : ''}
    ${hasAnswer ? `
      <div class="chat-app__stored-row">
        <span class="chat-app__stored-label">Answer</span>
        <button class="chat-app__btn" id="stored-answer-qr" type="button">Show QR</button>
        <button class="chat-app__btn" id="stored-answer-copy" type="button">Copy all</button>
      </div>
    ` : ''}
    <button class="chat-app__btn chat-app__btn--danger" id="stored-reset" type="button">Reset stored codes</button>
  `
}

export function appendMessage({ id, alias, text, kind, time }) {
  const el = document.createElement('div')
  el.className = `chat-app__message chat-app__message--${kind}`
  el.dataset.id = id
  const timeStr = time
    ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
  if (kind === 'system') {
    el.textContent = text
  } else {
    el.innerHTML = `
      <div class="chat-app__message-header">
        <span class="chat-app__message-alias">${escapeHtml(alias)}</span>
        <span class="chat-app__message-time">${timeStr}</span>
      </div>
      <div class="chat-app__message-text">${escapeHtml(text)}</div>
    `
  }
  ui.messages.appendChild(el)
  scrollToBottom()
  return el
}

export function scrollToBottom() {
  if (ui.messages) ui.messages.scrollTop = ui.messages.scrollHeight
}

export function clearMessages() {
  if (ui.messages) ui.messages.innerHTML = ''
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
