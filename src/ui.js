export const ui = {}

export function initUi() {
  const app = document.querySelector('#app')
  app.innerHTML = `
    <div class="chat-app">
      <header class="chat-app__header">
        <h1 class="chat-app__title">Chat App</h1>
        <div class="chat-app__alias">
          <span class="chat-app__alias-label">Alias</span>
          <input class="chat-app__alias-input" id="alias" type="text" maxlength="20" value="" />
          <span class="chat-app__peer-count" id="peer-count">0 peers</span>
        </div>
      </header>
      <main class="chat-app__main" id="main">
        <section class="chat-app__start" id="start-view">
          <h2 class="chat-app__start-title">P2P Chat</h2>
          <form class="chat-app__form" onsubmit="return false">
            <label class="chat-app__label" for="start-alias">Choose your alias</label>
            <input class="chat-app__input" id="start-alias" type="text" maxlength="20" placeholder="Alias" />
            <button class="chat-app__btn chat-app__btn--primary" id="create-btn" type="button">Create chat</button>
            <button class="chat-app__btn" id="join-btn" type="button">Join with QR</button>
          </form>
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
      <h3 id="qr-title">Your QR</h3>
      <canvas class="chat-app__qr-canvas" id="qr-canvas"></canvas>
      <p class="chat-app__qr-text" id="qr-text"></p>
      <button class="chat-app__btn chat-app__btn--primary" id="qr-done-btn" type="button">Done</button>
    </div>
    <div class="chat-app__scanner" id="scanner-section">
      <h3>Scan QR code</h3>
      <div class="chat-app__scanner-video" id="scanner-video"></div>
      <p class="chat-app__status" id="scanner-status">Point camera at a QR code</p>
      <button class="chat-app__btn" id="scanner-cancel-btn" type="button">Cancel</button>
    </div>
  `
  ui.app = app
  ui.startView = document.getElementById('start-view')
  ui.chatView = document.getElementById('chat-view')
  ui.messages = document.getElementById('messages')
  ui.messageInput = document.getElementById('message-input')
  ui.aliasInput = document.getElementById('alias')
  ui.peerCount = document.getElementById('peer-count')
  ui.qrSection = document.getElementById('qr-section')
  ui.qrCanvas = document.getElementById('qr-canvas')
  ui.qrText = document.getElementById('qr-text')
  ui.qrTitle = document.getElementById('qr-title')
  ui.qrDoneBtn = document.getElementById('qr-done-btn')
  ui.scannerSection = document.getElementById('scanner-section')
  ui.scannerContainer = document.getElementById('scanner-video')
  ui.scannerStatus = document.getElementById('scanner-status')
  ui.createBtn = document.getElementById('create-btn')
  ui.joinBtn = document.getElementById('join-btn')
  ui.inviteBtn = document.getElementById('invite-more-btn')
  ui.quitBtn = document.getElementById('quit-btn')
  ui.sendBtn = document.getElementById('send-btn')
  ui.startAliasInput = document.getElementById('start-alias')
  ui.scannerCancelBtn = document.getElementById('scanner-cancel-btn')
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

export function showQr(title, text, doneLabel = 'Done') {
  ui.qrTitle.textContent = title
  ui.qrText.textContent = text
  ui.qrDoneBtn.textContent = doneLabel
  ui.qrSection.classList.add('chat-app__qr-section--visible')
}

export function hideQr() {
  ui.qrSection.classList.remove('chat-app__qr-section--visible')
}

export function showScanner() {
  ui.scannerSection.classList.add('chat-app__scanner--visible')
  ui.scannerStatus.textContent = 'Point camera at a QR code'
}

export function hideScanner() {
  ui.scannerSection.classList.remove('chat-app__scanner--visible')
}

export function setScannerStatus(text) {
  ui.scannerStatus.textContent = text
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
