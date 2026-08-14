import './style.css'
import { initUi, showStart, showChat, setAlias, updatePeerCount, showQr, hideQr, showScanner, hideScanner, setScannerStatus, appendMessage, clearMessages, ui } from './ui.js'
import { encodeSdp, decodeSdp, renderQr, OFFER, ANSWER } from './qr.js'
import { createPeer, makeOffer, makeAnswer, setAnswer } from './webrtc.js'
import { Html5Qrcode } from 'html5-qrcode'

const state = {
  alias: localStorage.getItem('chat-app-alias') || `User-${Math.floor(Math.random() * 1000)}`,
  peerId: localStorage.getItem('chat-app-peerId') || crypto.randomUUID(),
  peers: new Map(),
  pending: new Map(),
  unknown: new Set(),
  seen: new Set(),
  scanner: null
}

initUi()
setAlias(state.alias)
showStart()
updatePeerCount(0)

ui.createBtn.addEventListener('click', onCreate)
ui.joinBtn.addEventListener('click', onJoin)
ui.inviteBtn.addEventListener('click', onInvite)
ui.quitBtn.addEventListener('click', onQuit)
ui.sendBtn.addEventListener('click', onSend)
ui.messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSend() })
ui.startAliasInput.addEventListener('change', onAliasChange)
ui.aliasInput.addEventListener('change', onAliasChange)
ui.scannerCancelBtn.addEventListener('click', stopScanner)

function onAliasChange(e) {
  state.alias = e.target.value.trim() || state.alias
  localStorage.setItem('chat-app-alias', state.alias)
  setAlias(state.alias)
  broadcast({ type: 'alias', peerId: state.peerId, alias: state.alias })
}

function onCreate() {
  startInvite()
}

function onJoin() {
  startScanner(async (text) => {
    stopScanner()
    await handleJoinScan(text)
  })
}

function onInvite() {
  startInvite()
}

async function onQuit() {
  await closeAll()
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

async function startInvite() {
  const pc = createPeer()
  const { dc, sdp } = await makeOffer(pc, 'chat')
  const qrText = encodeSdp(OFFER, sdp)
  await renderQr(ui.qrCanvas, qrText)
  showQr('Invite peer', 'Show this QR to a new peer, then tap "Scan answer" and scan the answer QR they show.', 'Scan answer')
  attachConnection(pc, dc, null, '')
  ui.qrDoneBtn.onclick = () => {
    hideQr()
    startScanner(async (text) => {
      try {
        const { kind, sdp: answerSdp } = decodeSdp(text)
        if (kind !== ANSWER) throw new Error('Not an answer QR')
        await setAnswer(pc, answerSdp)
      } catch (err) {
        setScannerStatus(err.message)
      }
      stopScanner()
    })
  }
}

async function handleJoinScan(text) {
  try {
    const { kind, sdp } = decodeSdp(text)
    if (kind !== OFFER) throw new Error('Not an invite QR')
    const pc = createPeer()
    const dcPromise = new Promise((resolve) => { pc.ondatachannel = (e) => resolve(e.channel) })
    const answerSdp = await makeAnswer(pc, sdp)
    const qrText = encodeSdp(ANSWER, answerSdp)
    await renderQr(ui.qrCanvas, qrText)
    showQr('Your answer', 'Show this QR to the peer who invited you. You will join once they scan it.', 'Done')
    ui.qrDoneBtn.onclick = () => hideQr()
    const dc = await dcPromise
    attachConnection(pc, dc, null, '')
  } catch (err) {
    setScannerStatus(err.message)
  }
}

function attachConnection(pc, dc, knownPeerId, knownAlias) {
  const conn = { pc, dc, peerId: knownPeerId, alias: knownAlias, removed: false }
  if (knownPeerId) {
    state.pending.set(knownPeerId, conn)
  } else {
    state.unknown.add(conn)
  }

  dc.onopen = () => {
    if (!ui.chatView.classList.contains('hidden')) showChat()
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
  const conn = { pc, dc, peerId: targetId, alias: targetAlias, removed: false }
  state.pending.set(targetId, conn)
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
  try { conn.dc.close() } catch {}
  try { conn.pc.close() } catch {}
  if (conn.peerId) {
    appendMessage({ id: `sys-bye-${conn.peerId}`, kind: 'system', text: `${conn.alias || 'A peer'} left`, time: Date.now() })
    updatePeerCount(state.peers.size)
  }
}

async function closeAll() {
  stopScanner()
  hideQr()
  for (const conn of [...state.peers.values(), ...state.pending.values(), ...state.unknown]) {
    removeConnection(conn)
  }
  state.peers.clear()
  state.pending.clear()
  state.unknown.clear()
  state.seen.clear()
  clearMessages()
}

async function startScanner(onScan) {
  showScanner()
  state.scanner = new Html5Qrcode('scanner-video')
  try {
    await state.scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => { onScan(text) },
      () => {}
    )
  } catch (err) {
    setScannerStatus(`Camera error: ${err.message}`)
  }
}

async function stopScanner() {
  hideScanner()
  if (state.scanner) {
    try {
      await state.scanner.stop()
      state.scanner.clear()
    } catch {}
    state.scanner = null
  }
}
