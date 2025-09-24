# Multiplayer Web Maze Game (P2P WebRTC)

A university networking project: Multiplayer Web Maze Game using pure Peer-to-Peer networking over WebRTC DataChannels, with Socket.io used only for signaling.

---

## Features
- P2P-only maze game (Node.js + Express + Socket.io signaling + React)
- Real-time player movement and chat via WebRTC DataChannels
- Server is signaling-only (no game state, no packet logging, no dashboard)
- Clean setup: signaling server + client

---

## Getting Started

### 1. Clone the Repository
```
git clone <your-repo-url>
cd V3MazingGameServer
```

### 2. Install Dependencies
#### Backend (Express + Socket.io)
```
cd client/server
npm install
```
#### Frontend (React + Vite)
```
cd client
npm install
```

### 3. Run the Signaling Server
```
cd client/server
node index.js
```
- The signaling server runs on [http://localhost:3001](http://localhost:3001)

### 4. Run the Frontend
```
cd ../
npm run dev
```
- The frontend runs on [http://localhost:5173](http://localhost:5173)
- Open two browser tabs/windows at [http://localhost:5173](http://localhost:5173)
- Ensure both browsers use the same `room id` (e.g., `room1`).

### 5. Configure Signaling URL (optional)
The frontend reads the Socket.io signaling URL from `VITE_SOCKET_URL`. If not set, it defaults to `http://localhost:3001`.

Create `client/.env.local` to override:

```
VITE_SOCKET_URL=http://localhost:3001
```

Examples:
- Local default: `VITE_SOCKET_URL=http://localhost:3001`
- Public IP (port-forwarded): `VITE_SOCKET_URL=http://YOUR_PUBLIC_IP:3001`
- ngrok HTTPS: `VITE_SOCKET_URL=https://YOUR-NGROK-SUBDOMAIN.ngrok.io`

Restart `npm run dev` after changing the env file.

---

## Deployment

### Local/Private Server
- Run the signaling server (`node index.js`) on any machine in your LAN
- Update the frontend to point to the server's IP using `VITE_SOCKET_URL`
- Open firewall port 3001 (TCP)
- Clients on the same network can connect via browser

### Cloud VPS (e.g., DigitalOcean, AWS, Azure)
- Deploy the backend to your VPS (copy files, install Node.js, run `npm install`)
- Open port 3001 in your VPS firewall/security group
- Update frontend to use your VPS public IP or domain
- (Optional) Use a process manager like PM2 for production
- For HTTPS, use a reverse proxy (Nginx, Caddy, etc.)

---

## P2P Mode Tutorial (WebRTC)

In this project, gameplay is fully P2P. The server is used only for signaling (no game state on the server).

### Signaling events
- `joinRoom`: peers join the same room id
- `offer` / `answer`: exchange SDP session descriptions
- `iceCandidate`: exchange ICE candidates

After signaling completes, the DataChannel `game-data` opens and all messages are exchanged directly between peers.

### Try it locally
1. Start the signaling server: `cd client/server && node index.js`
2. Start the frontend: `cd client && npm run dev`
3. Open two browser tabs at `http://localhost:5173`
4. Enter the same `room id` in both tabs (e.g., `room1`)
5. In tab A, click `Create Room (Peer A)`; in tab B, click `Join Room (Peer B)`
6. Watch the status messages:
   - Peer A: "Room created. Waiting for Peer to join..." → "Peer joined. Sending offer..." → "P2P DataChannel open"
   - Peer B: "Joined room. Waiting for offer..." → "Sent answer. Establishing connection..." → "P2P DataChannel open"
7. Use arrow keys/WASD and chat — updates flow peer-to-peer over the DataChannel.

If peers are on different networks, set `client/.env.local` to point `VITE_SOCKET_URL` to a reachable signaling server (public IP or ngrok HTTPS URL) and restart `npm run dev`.

---

## Invite a Friend (No Local Files on Friend)

You can share your running development frontend via ngrok so your friend only needs a browser. This project auto-connects peers (no rooms). One peer will create an offer when a second peer opens the page.

### Step-by-step
1. Start the signaling server locally
   - Terminal A
   - `cd client/server && node index.js`

2. Expose the signaling server with ngrok (HTTPS)
   - Terminal B
   - `ngrok http 3001`
   - Copy the HTTPS URL shown by ngrok, e.g. `https://YOUR-SIGNALING.ngrok-free.dev`

3. Point the frontend to that signaling URL
   - File: `client/.env.local`
   - Set:
     ```dotenv
     VITE_SOCKET_URL=https://YOUR-SIGNALING.ngrok-free.dev
     ```
   - Restart dev server whenever you change this file.

4. Allow your frontend ngrok host in Vite and bind host
   - File: `client/vite.config.js`
     ```js
     export default defineConfig({
       plugins: [react()],
       server: {
         host: true,
         allowedHosts: [
           'YOUR-SIGNALING.ngrok-free.dev',   // signaling tunnel
           'YOUR-FRONTEND.ngrok-free.app',    // add after you get the frontend tunnel URL
         ],
         port: 5173,
       },
     })
     ```

5. Run the frontend and expose it with ngrok
   - Terminal C (frontend)
   - `cd client && npm run dev -- --host 0.0.0.0`
   - Terminal D (frontend tunnel)
   - `ngrok http 5173`
   - Copy the HTTPS URL shown by ngrok, e.g. `https://YOUR-FRONTEND.ngrok-free.app`
   - Add this host to `allowedHosts` (step 4) if you see "host not allowed", then restart `npm run dev`.

6. Send your friend ONLY the frontend ngrok URL
   - Example: `https://YOUR-FRONTEND.ngrok-free.app`
   - Keep both ngrok windows (signaling + frontend) running.

### What your friend does
- Open the frontend URL you sent.
- The app auto-connects. When the friend opens the page, your browser receives `peerJoined` and sends the WebRTC offer.
- Status will show "P2P DataChannel open" on both sides when connected.
- Use the chat box to exchange messages peer-to-peer.

### Tips
- If you see "Blocked request. This host is not allowed", add the frontend ngrok domain to `server.allowedHosts` in `client/vite.config.js` and restart `npm run dev`.
- If ngrok rotates URLs, update `VITE_SOCKET_URL` and `allowedHosts`, restart `npm run dev`, and share the new frontend URL.
- HTTPS frontend requires HTTPS signaling (ngrok provides this).

---

## Project Structure
```
V3MazingGameServer/
├── client/             # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── ...
├── client/server/     # Node.js signaling server (Express + Socket.io)
│   ├── index.js
│   ├── package.json
│   └── ...
└── README.md
```

---

## Credits
- Maze generation: DFS algorithm
- Real-time networking: Socket.io
- Dashboard charts: D3.js
- UI: React, Vite

---

For questions or contributions, open an issue or pull request!
