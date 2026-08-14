export const RTC_CONFIG = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function createPeer() {
  return new RTCPeerConnection(RTC_CONFIG)
}

export async function waitForIce(pc) {
  if (pc.iceGatheringState === 'complete') return
  return new Promise((resolve) => {
    const onGathering = () => {
      if (pc.iceGatheringState === 'complete') {
        cleanup()
        resolve()
      }
    }
    const onCandidate = (ev) => {
      if (ev.candidate === null) {
        cleanup()
        resolve()
      }
    }
    const cleanup = () => {
      pc.removeEventListener('icegatheringstatechange', onGathering)
      pc.removeEventListener('icecandidate', onCandidate)
    }
    pc.addEventListener('icegatheringstatechange', onGathering)
    pc.addEventListener('icecandidate', onCandidate)
    setTimeout(() => { cleanup(); resolve() }, 7000)
  })
}

export async function makeOffer(pc, label = 'chat') {
  const dc = pc.createDataChannel(label)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await waitForIce(pc)
  return { dc, sdp: pc.localDescription }
}

export async function makeAnswer(pc, offerSdp) {
  await pc.setRemoteDescription(offerSdp)
  const answer = await pc.createAnswer()
  await pc.setLocalDescription(answer)
  await waitForIce(pc)
  return pc.localDescription
}

export async function setAnswer(pc, answerSdp) {
  await pc.setRemoteDescription(answerSdp)
}
