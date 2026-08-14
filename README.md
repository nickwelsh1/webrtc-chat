# webrtc-chat

A browser-based, peer-to-peer chat app that uses WebRTC data channels and QR codes to connect devices without a signaling server.

## How it works
1. One person taps **Create chat** to generate an **invite** QR code.
2. Another taps **Join with QR** and scans all invite QR chunks (in any order) or pastes the chunks manually.
3. The joiner then shows **answer** QR codes, which the creator scans.
4. Once connected, chat over a WebRTC data channel.
5. Additional peers can be introduced through mesh relay via existing peers.

## Tech stack
- Vite 5
- Vanilla JavaScript (ES modules)
- `html5-qrcode` for QR scanning
- `qrcode` for QR rendering
- `lz-string` for SDP compression
- Public STUN server (`stun:stun.l.google.com:19302`)

## Getting started

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. On mobile, use the `--host` server and load the page over HTTPS or on the same local network (camera access requires a secure context).

## Scripts
- `npm run dev` — development server on `0.0.0.0:5173`
- `npm run build` — build for production to `dist/`
- `npm run preview` — preview the built app

## Usage tips
- Allow camera permissions when scanning QR codes.
- Codes can be copied and pasted manually if scanning is not available.
- Aliases and last generated codes are stored in browser `localStorage`.

## Notes
- No backend or signaling server is required.
- STUN is used for NAT traversal; symmetric NATs may not work without a TURN server.
