export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function createPeer() {
  return new RTCPeerConnection(RTC_CONFIG)
}

export async function waitForIce(pc, signal = null) {
  if (pc.iceGatheringState === 'complete') return
  if (signal?.aborted) throw new Error('Invite cancelled')
  return new Promise((resolve, reject) => {
    let timeout
    const onAbort = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('Invite cancelled'))
    }
    const onGathering = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout)
        cleanup()
        resolve()
      }
    }
    const onCandidate = (ev) => {
      if (ev.candidate === null) {
        clearTimeout(timeout)
        cleanup()
        resolve()
      }
    }
    const cleanup = () => {
      pc.removeEventListener('icegatheringstatechange', onGathering)
      pc.removeEventListener('icecandidate', onCandidate)
      if (signal) signal.removeEventListener('abort', onAbort)
      clearTimeout(timeout)
    }
    if (signal) signal.addEventListener('abort', onAbort)
    pc.addEventListener('icegatheringstatechange', onGathering)
    pc.addEventListener('icecandidate', onCandidate)
    timeout = setTimeout(() => { cleanup(); resolve() }, 7000)
  })
}

export async function makeOffer(pc, label = 'chat', signal = null) {
  const dc = pc.createDataChannel(label)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await waitForIce(pc, signal)
  if (signal?.aborted) throw new Error('Invite cancelled')
  return { dc, sdp: pc.localDescription }
}

export async function makeAnswer(pc, offerSdp, signal = null) {
  await pc.setRemoteDescription(offerSdp)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  await waitForIce(pc, signal)
  if (signal?.aborted) throw new Error('Cancelled')
  return pc.localDescription
}

export async function setAnswer(pc, answerSdp) {
  await pc.setRemoteDescription(answerSdp)
}
