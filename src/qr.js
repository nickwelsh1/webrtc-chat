import QRCode from 'qrcode'
import LZString from 'lz-string'

export const OFFER = 'o'
export const ANSWER = 'a'
export const MAX_CHUNKS = 4
const QR_CAPACITY = 2300 // safe byte capacity for QR with errorCorrectionLevel L

export function encodeSdp(kind, sdp) {
  const json = JSON.stringify(sdp)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return `${kind}|${compressed}`
}

export function splitCode(fullCode, maxChunks = MAX_CHUNKS) {
  const pipe = fullCode.indexOf('|')
  if (pipe === -1) throw new Error('Invalid code')
  const kind = fullCode.slice(0, pipe)
  const data = fullCode.slice(pipe + 1)

  for (let n = 1; n <= maxChunks; n++) {
    const chunks = []
    const size = Math.ceil(data.length / n)
    for (let i = 0; i < n; i++) {
      const chunk = data.slice(i * size, (i + 1) * size)
      chunks.push(`${kind}|${i}/${n}|${chunk}`)
    }
    const fits = chunks.every((c) => c.length <= QR_CAPACITY)
    if (fits) return chunks
  }

  throw new Error(`Code too large to fit in ${maxChunks} QR codes`)
}

export function isChunk(text) {
  const m = text.match(/^([oa])\|(\d+)\/(\d+)\|(.*)$/)
  if (!m) return null
  return {
    kind: m[1],
    index: parseInt(m[2], 10),
    n: parseInt(m[3], 10),
    data: m[4]
  }
}

export function isFullCode(text) {
  if (isChunk(text)) return false
  const m = text.match(/^([oa])\|([^/].*)$/)
  if (!m) return false
  return { kind: m[1], data: m[2] }
}

export function assembleCode(chunks) {
  const parsed = chunks.map((c) => (typeof c === 'string' ? isChunk(c) : c)).filter(Boolean)
  if (!parsed.length) throw new Error('No chunks to assemble')
  const n = parsed[0].n
  const kind = parsed[0].kind
  const sorted = new Array(n).fill('')
  for (const c of parsed) {
    sorted[c.index] = c.data
  }
  const data = sorted.join('')
  return `${kind}|${data}`
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

export async function renderQr(canvas, text, width = 384) {
  await QRCode.toCanvas(canvas, text, {
    width,
    margin: 2,
    color: { dark: '#000', light: '#fff' },
    errorCorrectionLevel: 'L'
  })
}
