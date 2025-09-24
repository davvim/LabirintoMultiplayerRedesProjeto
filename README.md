# P2P Chat over WebRTC (Signaling via Socket.io)

A minimal, chat-only, peer-to-peer app using WebRTC DataChannel. Socket.io is used only for signaling. No rooms, no maze gameplay. The UI includes a diagnostics panel that shows connection status in real time.

---

## Quick Start (Local)
1) Install
```
cd client/server && npm install
cd ../ && npm install
```
2) Run signaling server
```
cd client/server
node index.js
```
3) Run frontend
```
cd ../
npm run dev -- --host 0.0.0.0
```
4) Open two tabs at http://localhost:5173 and wait for “P2P DataChannel open”. Use the chat.

---

## Share with a Friend (Single ngrok)
1) Keep the signaling server running locally (step 2 above).
2) Ensure Vite proxy is configured (already set in `client/vite.config.js`):
   - Proxies `/socket.io` → `http://localhost:3001` with `ws: true`
3) Do NOT set `VITE_SOCKET_URL` (same-origin will be used and proxied).
4) Start the frontend and expose it:
```
cd client
npm run dev -- --host 0.0.0.0
ngrok http 5173
```
5) Add your frontend ngrok domain to `server.allowedHosts` in `client/vite.config.js` if prompted ("host not allowed"), then restart `npm run dev`.
6) Share ONLY the frontend ngrok URL with your friend. When they open it, auto-pairing completes and chat works over P2P.

---

## Optional: TURN for Strict NATs
Set in `client/.env.local` and restart `npm run dev`:
```
# Enable only if you have a TURN server
VITE_TURN_URL=turn:your-turn.example.org:3478
VITE_TURN_USERNAME=yourUser
VITE_TURN_CREDENTIAL=yourPass
```
The diagnostics panel shows whether TURN is enabled.

---

## Diagnostics Panel (in App)
Shows live:
- Socket: connected/disconnected and ID
- PeerConnection: `connectionState`
- ICE: `iceConnectionState`, `iceGatheringState`
- DataChannel: `readyState`
- TURN enabled: yes/no

---

## Troubleshooting
- Socket won’t connect
  - Use a single ngrok tunnel (frontend only).
  - Ensure `client/server/index.js` is running (visit http://localhost:3001 → “Maze Game Server is running!”).
  - Do NOT set `VITE_SOCKET_URL` (same-origin proxy handles Socket.io).
  - Add your frontend ngrok host to `server allowedHosts` in `client/vite.config.js`.
- ICE stuck at "checking"
  - Likely NAT traversal; configure TURN in `client/.env.local`.
- DataChannel not open but ICE connected
  - Check console logs. Caller must create DataChannel before offer; callee gets it via `pc.ondatachannel`. This app already does that.

---

## Key Files
- `client/src/App.jsx`: WebRTC + Socket.io logic, diagnostics panel, TURN support
- `client/server/index.js`: Signaling server (broadcast peerJoined/offer/answer/iceCandidate)
- `client/vite.config.js`: Vite proxy `/socket.io` → `http://localhost:3001`, `allowedHosts`

---

## License
UFPB
