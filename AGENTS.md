# webrtc-chat — Project Notes for Agents

## Overview
Browser-only peer-to-peer chat built with WebRTC data channels. Uses QR codes (camera or manual paste) to bootstrap connections. Vite is the build tool.

## Stack
- Vite 5, vanilla JS, ES modules
- npm
- `html5-qrcode` for QR scanning
- `qrcode` for rendering QR
- `lz-string` to compress SDP payloads
- Public Google STUN server (`stun:stun.l.google.com:19302`)

## Project structure
- `index.html` — app entry point
- `vite.config.js` — dev server on `0.0.0.0:5173`
- `src/main.js` — application orchestration, state, and event wiring
- `src/webrtc.js` — RTCPeerConnection helpers
- `src/qr.js` — SDP encoding/decoding, chunking, and QR rendering
- `src/ui.js` — DOM templates and UI helpers
- `src/style.css` — styles
- `dist/` — build output (gitignored, generated)

## Commands
- `npm install`
- `npm run dev` — start dev server (`--host` by default)
- `npm run build` — production build into `dist/`
- `npm run preview` — preview built app

## Conventions
- ES modules, no framework
- Browser `localStorage` stores alias, peer id, and last stored invite/answer codes
- `crypto.randomUUID()` is used for ids
- No tests or lint config currently exist

## Notes for modifications
- Wire new features through `src/main.js`
- UI updates go in `src/ui.js`
- WebRTC logic lives in `src/webrtc.js`
- QR code size and chunking limits are in `src/qr.js` (`MAX_CHUNKS = 4`, `QR_CAPACITY = 2300`)
