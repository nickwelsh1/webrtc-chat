import './style.css'
import {
  initUi, showStart, showChat, setAlias, updatePeerCount,
  showQrLoading, showQrCarousel, hideQr,
  setQrTitle, setQrDots, setQrCodeInfo, setQrNav, setQrModeBtn,
  showScanner, hideScanner, setScannerStatus,
  renderScannerSlots, setScannerContinue,
  showStored, appendMessage, clearMessages, ui
} from './ui.js'
import {
  OFFER, ANSWER, MAX_CHUNKS, QR_CAPACITY, splitCode, splitToN, isChunk, isFullCode,
  assembleCode, encodeSdp, decodeSdp, renderQr
} from './qr.js'
import { createPeer, makeOffer, makeAnswer, setAnswer } from './webrtc.js'
import { Html5Qrcode } from 'html5-qrcode'

const STORE_ALIAS = 'chat-app-alias'
const STORE_PEER_ID = 'chat-app-peerId'
const STORE_INVITE = 'chat-app-stored-invite'
const STORE_ANSWER = 'chat-app-stored-answer'

const state = {
  alias: localStorage.getItem(STORE_ALIAS) || `User-${Math.floor(Math.random() * 1000)}`,
  peerId: localStorage.getItem(STORE_PEER_ID) || crypto.randomUUID(),
  peers: new Map(),
  pending: new Map(),
  unknown: new Set(),
  seen: new Set(),
  scanner: null,
  scanning: null,
  currentQr: null,
  invite: null,
  answer: null,
  activeInvite: null
}

initUi()
setAlias(state.alias)
showStart()
updatePeerCount(0)
renderStoredCodes()

ui.createBtn.addEventListener('click', onCreate)
ui.joinBtn.addEventListener('click', onJoin)
ui.inviteBtn.addEventListener('click', onInvite)
ui.quitBtn.addEventListener('click', onQuit)
ui.sendBtn.addEventListener('click', onSend)
ui.messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend() })
ui.startAliasInput.addEventListener('change', onAliasChange)
ui.aliasInput.addEventListener('change', onAliasChange)

ui.qrPrev.addEventListener('click', () => navigateQr(-1))
ui.qrNext.addEventListener('click', () => navigateQr(1))
ui.qrCopy.addEventListener('click', copyCurrentQrCode)
ui.qrCopyAll.addEventListener('click', copyAllQrCodes)
ui.qrReset.addEventListener('click', resetQrCodes)
ui.qrDoneBtn.addEventListener('click', onQrDone)
ui.qrLoadingCancel.addEventListener('click', onCancelInvite)
ui.qrModeBtn.addEventListener('click', onQrModeToggle)
ui.qrCloseBtn.addEventListener('click', onQrClose)
ui.urlQrBtn.addEventListener('click', onUrlQr)

ui.scannerCancelBtn.addEventListener('click', stopScanner)
ui.scannerCloseBtn.addEventListener('click', () => stopScanner())
ui.scannerContinueBtn.addEventListener('click', onScannerContinue)
ui.manualSubmit.addEventListener('click', onManualSubmit)
ui.manualInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onManualSubmit() })

function onAliasChange(e) {
  state.alias = e.target.value.trim() || state.alias
  localStorage.setItem(STORE_ALIAS, state.alias)
  setAlias(state.alias)
  broadcast({ type: 'alias', peerId: state.peerId, alias: state.alias })
}

function onCreate() {
  startInvite()
}

function onJoin() {
  startScanner(OFFER, (fullCode) => handleJoinCode(fullCode))
}

function onInvite() {
  startInvite()
}

async function onQuit() {
  await closeAll()
  showStart()
}

function onCancelInvite() {
  if (state.activeInvite) {
    state.activeInvite.controller.abort()
    try { state.activeInvite.pc.close() } catch { }
    state.activeInvite = null
  }
  hideQr()
  showStart()
}

function onSend() {
  const text = ui.messageInput.value.trim()
  if (!text) return
  const msg = {
    type: 'chat',
    id: crypto.randomUUID(),
    peerId: state.peerId,
    alias: state.alias,
    text,
    time: Date.now()
  }
  state.seen.add(msg.id)
  appendMessage({ ...msg, kind: 'me' })
  ui.messageInput.value = ''
  broadcast(msg)
}

function broadcast(obj) {
  const data = JSON.stringify(obj)
  for (const p of state.peers.values()) {
    if (p.dc && p.dc.readyState === 'open') {
      p.dc.send(data)
    }
  }
}

function sendTo(peerId, obj) {
  const p = state.peers.get(peerId)
  if (p && p.dc && p.dc.readyState === 'open') {
    p.dc.send(JSON.stringify(obj))
  }
}

function saveStored(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

function loadStored(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearStored() {
  localStorage.removeItem(STORE_INVITE)
  localStorage.removeItem(STORE_ANSWER)
}

function renderStoredCodes() {
  const invite = loadStored(STORE_INVITE)
  const answer = loadStored(STORE_ANSWER)
  showStored(Boolean(invite), Boolean(answer))
  if (!invite && !answer) return

  const inviteQr = document.getElementById('stored-invite-qr')
  const inviteCopy = document.getElementById('stored-invite-copy')
  const answerQr = document.getElementById('stored-answer-qr')
  const answerCopy = document.getElementById('stored-answer-copy')
  const reset = document.getElementById('stored-reset')

  if (inviteQr) inviteQr.onclick = () => showStoredQr(invite, 'Invite')
  if (inviteCopy) inviteCopy.onclick = () => copyChunks(invite.chunks)
  if (answerQr) answerQr.onclick = () => showStoredQr(answer, 'Answer')
  if (answerCopy) answerCopy.onclick = () => copyChunks(answer.chunks)
  if (reset) reset.onclick = () => { clearStored(); renderStoredCodes() }
}

function showStoredQr(data, title) {
  if (!data || !data.fullCode) return
  const kind = data.fullCode.startsWith(OFFER) ? OFFER : ANSWER
  const simpleChunks = splitToN(data.fullCode, MAX_CHUNKS)
  const singleChunk = data.fullCode.length <= QR_CAPACITY ? [data.fullCode] : null
  state.currentQr = { kind, fullCode: data.fullCode, chunks: simpleChunks, index: 0, mode: 'simple', singleChunk }
  showQrCarousel()
  setQrTitle(`Stored ${title}`)
  ui.qrText.textContent = title === 'Invite' ? 'Stored invite QR codes' : 'Stored answer QR codes'
  renderQrCarousel()
  updateQrNav()
}

async function startInvite() {
  showQrLoading('Creating invite', 'Gathering connection candidates, this may take a few seconds...')

  let pc, dc, sdp, controller
  try {
    pc = createPeer()
    controller = new AbortController()
    state.activeInvite = { pc, controller }
      ; ({ dc, sdp } = await makeOffer(pc, 'chat', controller.signal))
  } catch (err) {
    if (pc) { try { pc.close() } catch { } }
    state.activeInvite = null
    if (controller && controller.signal.aborted) {
      hideQr()
      showStart()
      return
    }
    setQrTitle('Invite failed')
    ui.qrLoadingText.textContent = err.message
    ui.qrLoading.classList.remove('hidden')
    ui.qrCarousel.classList.add('hidden')
    return
  }

  state.activeInvite = null
  const fullCode = encodeSdp(OFFER, sdp)

  let simpleChunks, singleChunk
  try {
    simpleChunks = splitToN(fullCode, MAX_CHUNKS)
    singleChunk = fullCode.length <= QR_CAPACITY ? [fullCode] : null
  } catch (err) {
    setQrTitle('Invite too large')
    ui.qrLoadingText.textContent = err.message
    ui.qrLoading.classList.remove('hidden')
    ui.qrCarousel.classList.add('hidden')
    return
  }

  saveStored(STORE_INVITE, { fullCode, chunks: simpleChunks, created: Date.now() })
  state.invite = { pc, dc, fullCode, simpleChunks, singleChunk }
  state.currentQr = { kind: OFFER, fullCode, chunks: simpleChunks, index: 0, mode: 'simple', singleChunk }

  attachConnection(pc, dc, null, '')
  await renderQrCarousel()
  showQrCarousel()
  setQrTitle('Invite peer')
  updateQrNav()
  renderStoredCodes()
}

async function renderQrCarousel() {
  if (!state.currentQr) return
  const { chunks, index, singleChunk } = state.currentQr
  const chunk = chunks[index]
  await renderQr(ui.qrCanvas, chunk, 384)
  setQrDots(chunks.length, index)
  setQrCodeInfo(state.currentQr.fullCode, { index, n: chunks.length })
  setQrNav(index, chunks.length)
  if (singleChunk) {
    const isSimple = state.currentQr.mode === 'simple'
    setQrModeBtn(isSimple ? 'Use 1 QR' : 'Use 4 QRs', true)
  } else {
    setQrModeBtn('', false)
  }
}

function navigateQr(delta) {
  if (!state.currentQr) return
  const n = state.currentQr.chunks.length
  let i = state.currentQr.index + delta
  if (i < 0) i = n - 1
  if (i >= n) i = 0
  state.currentQr.index = i
  renderQrCarousel()
}

function updateQrNav() {
  if (!state.currentQr) return
  setQrNav(state.currentQr.index, state.currentQr.chunks.length)
}

function onQrModeToggle() {
  if (!state.currentQr || !state.currentQr.singleChunk) return
  const nextSimple = state.currentQr.mode !== 'simple'
  state.currentQr.mode = nextSimple ? 'simple' : 'single'
  state.currentQr.chunks = nextSimple
    ? splitToN(state.currentQr.fullCode, MAX_CHUNKS)
    : state.currentQr.singleChunk
  state.currentQr.index = 0
  renderQrCarousel()
}

async function onUrlQr() {
  const url = window.location.origin || window.location.href
  state.currentQr = { kind: 'url', fullCode: url, chunks: [url], index: 0, mode: 'simple', singleChunk: null }
  await renderQrCarousel()
  showQrCarousel()
  setQrTitle('App URL')
  ui.qrText.textContent = 'Scan this QR to open the app'
}

function onQrDone() {
  if (!state.currentQr) { hideQr(); return }
  if (state.currentQr.kind === OFFER && state.invite) {
    hideQr()
    startScanner(ANSWER, (fullCode) => handleAnswerCode(fullCode))
  } else {
    hideQr()
  }
}

function onQrClose() {
  if (state.activeInvite) {
    onCancelInvite()
  } else {
    hideQr()
  }
}

async function copyCurrentQrCode() {
  if (!state.currentQr) return
  const text = state.currentQr.chunks[state.currentQr.index]
  try {
    await navigator.clipboard.writeText(text)
    ui.qrText.textContent = 'Copied to clipboard'
  } catch {
    ui.qrText.textContent = 'Could not copy automatically'
  }
}

async function copyAllQrCodes() {
  if (!state.currentQr) return
  await copyChunks(state.currentQr.chunks)
}

async function copyChunks(chunks) {
  const text = (chunks || []).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    ui.qrText.textContent = 'All codes copied to clipboard'
  } catch {
    ui.qrText.textContent = 'Could not copy automatically'
  }
}

function resetQrCodes() {
  if (!state.currentQr) { hideQr(); return }
  const key = state.currentQr.kind === OFFER ? STORE_INVITE : STORE_ANSWER
  localStorage.removeItem(key)
  if (state.currentQr.kind === OFFER) state.invite = null
  if (state.currentQr.kind === ANSWER) state.answer = null
  state.currentQr = null
  hideQr()
  renderStoredCodes()
}

async function handleJoinCode(fullCode) {
  try {
    const { kind, sdp } = decodeSdp(fullCode)
    if (kind !== OFFER) throw new Error('Not an invite code')

    const pc = createPeer()
    const dcPromise = new Promise((resolve) => { pc.ondatachannel = (e) => resolve(e.channel) })
    const answerSdp = await makeAnswer(pc, sdp)
    const answerFull = encodeSdp(ANSWER, answerSdp)
    const simpleChunks = splitToN(answerFull, MAX_CHUNKS)
    const singleChunk = answerFull.length <= QR_CAPACITY ? [answerFull] : null

    saveStored(STORE_ANSWER, { fullCode: answerFull, chunks: simpleChunks, created: Date.now() })
    state.answer = { pc, fullCode: answerFull, simpleChunks, singleChunk }
    state.currentQr = { kind: ANSWER, fullCode: answerFull, chunks: simpleChunks, index: 0, mode: 'simple', singleChunk }

    const dc = await dcPromise
    attachConnection(pc, dc, null, '')
    await renderQrCarousel()
    showQrCarousel()
    setQrTitle('Your answer')
    ui.qrText.textContent = 'Show these QR codes to the peer who invited you'
    updateQrNav()
    renderStoredCodes()
  } catch (err) {
    setScannerStatus(err.message)
  }
}

async function handleAnswerCode(fullCode) {
  try {
    const { kind, sdp } = decodeSdp(fullCode)
    if (kind !== ANSWER) throw new Error('Not an answer code')
    if (!state.invite) throw new Error('No pending invite')
    await setAnswer(state.invite.pc, sdp)
    state.currentQr = null
    state.invite = null
    hideQr()
    hideScanner()
  } catch (err) {
    setScannerStatus(err.message)
  }
}

async function startScanner(kind, onComplete) {
  showScanner(kind === OFFER ? 'Scan invite QR codes' : 'Scan answer QR codes')
  setScannerStatus('Scan any QR code in any order, or paste a chunk code below')
  renderScannerSlots(0, new Map())
  setScannerContinue(false)

  state.scanning = { kind, n: null, chunks: new Map(), onComplete }
  state.scanner = new Html5Qrcode('scanner-video')

  try {
    await state.scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => processChunkCode(text, 'camera'),
      () => { }
    )
  } catch (err) {
    setScannerStatus(`Camera error: ${err.message}`)
  }
}

function onScanResult(text) {
  processChunkCode(text, 'camera')
}

function processChunkCode(text, source) {
  if (!state.scanning) return
  text = text.trim()
  if (!text) return

  const chunk = isChunk(text)
  if (chunk) {
    if (chunk.kind !== state.scanning.kind) {
      setScannerStatus(`This is an ${chunk.kind === OFFER ? 'invite' : 'answer'} chunk, expected ${state.scanning.kind === OFFER ? 'invite' : 'answer'}`)
      return
    }
    if (state.scanning.n !== null && chunk.n !== state.scanning.n) {
      state.scanning.chunks.clear()
    }
    state.scanning.n = chunk.n
    state.scanning.chunks.set(chunk.index, text)
    renderScannerSlots(chunk.n, state.scanning.chunks)
    setScannerContinue(state.scanning.chunks.size === chunk.n)
    setScannerStatus(`Got chunk ${chunk.index + 1} of ${chunk.n}. Scan or paste the rest.`)
    if (source === 'manual') ui.manualInput.value = ''
    return
  }

  const full = isFullCode(text)
  if (full) {
    if (full.kind !== state.scanning.kind) {
      setScannerStatus(`This is an ${full.kind === OFFER ? 'invite' : 'answer'} code, expected ${state.scanning.kind === OFFER ? 'invite' : 'answer'}`)
      return
    }
    const cb = state.scanning.onComplete
    state.scanning = null
    stopScanner()
    cb(text)
    return
  }

  setScannerStatus('Unrecognized code. Make sure it is a valid invite or answer chunk.')
}

function onManualSubmit() {
  const text = ui.manualInput.value
  if (text) processChunkCode(text, 'manual')
}

function onScannerContinue() {
  if (!state.scanning) return
  if (!state.scanning.n || state.scanning.chunks.size !== state.scanning.n) return
  const fullCode = assembleCode([...state.scanning.chunks.values()])
  const cb = state.scanning.onComplete
  state.scanning = null
  stopScanner()
  cb(fullCode)
}

async function stopScanner() {
  hideScanner()
  if (state.scanning) state.scanning = null
  if (state.scanner) {
    try {
      await state.scanner.stop()
      state.scanner.clear()
    } catch { }
    state.scanner = null
  }
  ui.manualInput.value = ''
}

function attachConnection(pc, dc, knownPeerId, knownAlias) {
  const conn = { pc, dc, peerId: knownPeerId, alias: knownAlias, removed: false }
  if (knownPeerId) {
    state.pending.set(knownPeerId, conn)
  } else {
    state.unknown.add(conn)
  }

  dc.onopen = () => {
    hideQr()
    showChat()
    sendHello(conn)
  }
  dc.onmessage = (e) => handleDcMessage(conn, e.data)
  dc.onclose = () => removeConnection(conn)
  dc.onerror = () => removeConnection(conn)

  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      removeConnection(conn)
    }
  }
}

function sendHello(conn) {
  if (conn.dc && conn.dc.readyState === 'open') {
    conn.dc.send(JSON.stringify({ type: 'hello', peerId: state.peerId, alias: state.alias }))
  }
}

function handleDcMessage(conn, data) {
  try {
    const msg = JSON.parse(data)
    switch (msg.type) {
      case 'hello':
        handleHello(conn, msg)
        break
      case 'peer-list':
        handlePeerList(conn, msg)
        break
      case 'relay':
        handleRelay(conn, msg)
        break
      case 'chat':
        handleChat(msg)
        break
      case 'alias':
        handleAlias(conn, msg)
        break
      case 'bye':
        removeConnection(conn)
        break
    }
  } catch (err) {
    console.error('message error', err)
  }
}

function handleHello(conn, msg) {
  if (conn.peerId && conn.peerId !== msg.peerId) return
  conn.peerId = msg.peerId
  conn.alias = msg.alias

  state.unknown.delete(conn)
  state.pending.delete(msg.peerId)

  if (!state.peers.has(msg.peerId)) {
    state.peers.set(msg.peerId, conn)
    appendMessage({ id: `sys-${msg.peerId}`, kind: 'system', text: `${msg.alias} joined`, time: Date.now() })
    updatePeerCount(state.peers.size)
    showChat()
    sendHello(conn)
    sendPeerList(conn)
  } else {
    state.peers.get(msg.peerId).alias = msg.alias
  }
}

function sendPeerList(conn) {
  if (!conn.dc || conn.dc.readyState !== 'open') return
  const peers = [...state.peers.values()]
    .filter((p) => p.peerId !== state.peerId)
    .map((p) => ({ peerId: p.peerId, alias: p.alias }))
  conn.dc.send(JSON.stringify({ type: 'peer-list', from: state.peerId, peers }))
}

async function handlePeerList(conn, msg) {
  const list = (msg.peers || []).filter((p) => p.peerId !== state.peerId && p.peerId !== conn.peerId)
  await Promise.all(
    list.map((p) => createMeshOffer(p.peerId, p.alias, conn))
  )
}

async function createMeshOffer(targetId, targetAlias, viaConn) {
  if (state.peers.has(targetId) || state.pending.has(targetId)) return
  const pc = createPeer()
  const { dc, sdp } = await makeOffer(pc, `mesh-${targetId}`)
  attachConnection(pc, dc, targetId, targetAlias)
  const payload = { type: 'mesh-offer', from: state.peerId, to: targetId, alias: state.alias, sdp }
  viaConn.dc.send(JSON.stringify({ type: 'relay', to: targetId, payload }))
}

async function handleMeshOffer(conn, msg) {
  if (state.peers.has(msg.from) || state.pending.has(msg.from)) return
  const pc = createPeer()
  const dcPromise = new Promise((resolve) => { pc.ondatachannel = (e) => resolve(e.channel) })
  const answerSdp = await makeAnswer(pc, msg.sdp)
  const dc = await dcPromise
  attachConnection(pc, dc, msg.from, msg.alias || '')
  const payload = { type: 'mesh-answer', from: state.peerId, to: msg.from, sdp: answerSdp }
  conn.dc.send(JSON.stringify({ type: 'relay', to: msg.from, payload }))
}

async function handleMeshAnswer(conn, msg) {
  const p = state.pending.get(msg.from)
  if (!p) return
  await setAnswer(p.pc, msg.sdp)
}

function handleRelay(conn, msg) {
  if (msg.to === state.peerId) {
    handlePayload(conn, msg.payload)
  } else {
    const target = state.peers.get(msg.to)
    if (target && target.dc && target.dc.readyState === 'open') {
      target.dc.send(JSON.stringify({ type: 'relay', to: msg.to, payload: msg.payload }))
    }
  }
}

function handlePayload(conn, p) {
  if (!p || !p.type) return
  if (p.type === 'mesh-offer') handleMeshOffer(conn, p)
  else if (p.type === 'mesh-answer') handleMeshAnswer(conn, p)
}

function handleChat(msg) {
  if (state.seen.has(msg.id)) return
  state.seen.add(msg.id)
  const isMe = msg.peerId === state.peerId
  const alias = isMe ? state.alias : (state.peers.get(msg.peerId)?.alias || msg.alias || 'Unknown')
  appendMessage({ id: msg.id, alias, text: msg.text, kind: isMe ? 'me' : 'peer', time: msg.time })
}

function handleAlias(conn, msg) {
  if (!conn || msg.peerId === state.peerId) return
  conn.alias = msg.alias
  if (state.peers.has(msg.peerId)) {
    state.peers.get(msg.peerId).alias = msg.alias
  }
  appendMessage({ id: `sys-alias-${msg.peerId}`, kind: 'system', text: `${conn.alias || msg.alias} changed alias to ${msg.alias}`, time: Date.now() })
}

function removeConnection(conn) {
  if (conn.removed) return
  conn.removed = true
  state.peers.delete(conn.peerId)
  state.pending.delete(conn.peerId)
  state.unknown.delete(conn)
  try { conn.dc.close() } catch { }
  try { conn.pc.close() } catch { }
  if (conn.peerId) {
    appendMessage({ id: `sys-bye-${conn.peerId}`, kind: 'system', text: `${conn.alias || 'A peer'} left`, time: Date.now() })
    updatePeerCount(state.peers.size)
  }
}

async function closeAll() {
  hideQr()
  await stopScanner()
  for (const conn of [...state.peers.values(), ...state.pending.values(), ...state.unknown]) {
    removeConnection(conn)
  }
  state.peers.clear()
  state.pending.clear()
  state.unknown.clear()
  state.seen.clear()
  state.invite = null
  state.answer = null
  state.currentQr = null
  clearMessages()
}
