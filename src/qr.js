import QRCode from 'qrcode'
import LZString from 'lz-string'

export const OFFER = 'o'
export const ANSWER = 'a'

export function encodeSdp(kind, sdp) {
  const json = JSON.stringify(sdp)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return `${kind}|${compressed}`
}

export function decodeSdp(text) {
  const pipe = text.indexOf('|')
  if (pipe === -1) throw new Error('Invalid QR payload')
  const kind = text.slice(0, pipe)
  const compressed = text.slice(pipe + 1)
  const json = LZString.decompressFromEncodedURIComponent(compressed)
  if (!json) throw new Error('Failed to decompress QR payload')
  return { kind, sdp: JSON.parse(json) }
}

export async function renderQr(canvas, text) {
  await QRCode.toCanvas(canvas, text, {
    width: 512,
    margin: 2,
    color: { dark: '#000', light: '#fff' },
    errorCorrectionLevel: 'L'
  })
}
