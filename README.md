# Multiplayer Web Maze Game with Network Traffic Inspection

A university networking project: Multiplayer Web Maze Game with built-in network traffic inspection, real-time dashboard, and chat.

---

## Features
- Multiplayer maze game (Node.js + Express + Socket.io + React)
- Real-time player movement and chat
- Built-in network traffic logger and dashboard (`/dashboard`)
- Python-based packet sniffer for deep inspection (Wireshark-compatible)
- Easy deployment (local or cloud VPS)
- (Optional) WebRTC mode for peer-to-peer networking

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
cd ../
npm install
```

### 3. Run the Server
```
cd client/server
node index.js
```
- The backend runs on [http://localhost:3001](http://localhost:3001)
- The dashboard is at [http://localhost:3001/dashboard](http://localhost:3001/dashboard)

### 4. Run the Frontend
```
cd ../
npm run dev
```
- The frontend runs on [http://localhost:5173](http://localhost:5173)

### 5. Connect Clients
- Open multiple browser tabs/windows at [http://localhost:5173](http://localhost:5173)
- Each client is assigned a unique ID and can move/chat in the shared maze

---

## Network Traffic Capture

### Option 1: Built-in Logger & Dashboard
- All WebSocket events (connect, move, chat, disconnect) are logged in memory and visible at [http://localhost:3001/dashboard](http://localhost:3001/dashboard)
- Table and D3.js chart auto-update in real time
- For exporting, you can extend the `/packets` endpoint to download logs as JSON/CSV

### Option 2: Python Packet Sniffer (Wireshark-Compatible)
- Use `network_sniffer.py` (requires Python + Scapy + Npcap)
- Captures all TCP/UDP/WebSocket packets on port 3001
- Exports logs to `packets.json` and `packets.csv` for Wireshark or analysis

#### How to Use (Windows)
1. Install Python and Scapy:
   ```sh
   pip install scapy
   ```
2. Install Npcap: [https://nmap.org/npcap/](https://nmap.org/npcap/)
   - Run installer as Administrator
   - Check "Install Npcap in WinPcap API-compatible Mode"
   - Restart your computer
3. Run sniffer as Administrator:
   ```sh
   python network_sniffer.py
   ```
4. Press Ctrl+C to stop and export logs

#### Troubleshooting
- If you see errors about WinPcap/Npcap or "Sniffing and sending packets is not available at layer 2":
  - Ensure Npcap is installed
  - Run terminal as Administrator
  - Restart your computer

---

## Deployment

### Local/Private Server
- Run the backend (`node index.js`) on any machine in your LAN
- Update the frontend to point to the server's IP (edit `socket = io('http://<server-ip>:3001')` in `client/src/App.jsx`)
- Open firewall port 3001 (TCP)
- Clients on the same network can connect via browser

### Cloud VPS (e.g., DigitalOcean, AWS, Azure)
- Deploy the backend to your VPS (copy files, install Node.js, run `npm install`)
- Open port 3001 in your VPS firewall/security group
- Update frontend to use your VPS public IP or domain
- (Optional) Use a process manager like PM2 for production
- For HTTPS, use a reverse proxy (Nginx, Caddy, etc.)

---

## Switching Between WebSocket and WebRTC Modes

### WebSocket Mode (Default)
- The server and client use Socket.io for all real-time communication
- No changes needed; this is the default setup

### WebRTC Mode (Optional/Advanced)
- To enable peer-to-peer networking, you must:
  1. Implement WebRTC signaling (using Socket.io or a separate signaling server)
  2. Update the frontend to use WebRTC DataChannels for player movement/chat
  3. (Optional) Add a toggle in the UI to switch between WebSocket and WebRTC
- **Note:** WebRTC mode is not implemented by default in this scaffold, but the codebase is modular and ready for extension. See [Simple WebRTC Signaling Example](https://github.com/webrtc/samples) for reference.

---

## Project Structure
```
V3MazingGameServer/
├── client/         # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── ...
├── server/         # Node.js backend (inside client/server)
│   ├── index.js
│   ├── dashboard.html
│   ├── package.json
│   └── ...
├── network_sniffer.py  # Python packet sniffer (optional)
└── README.md
```

---

## Credits
- Maze generation: DFS algorithm
- Real-time networking: Socket.io
- Packet capture: Scapy, Npcap, D3.js
- UI: React, Vite, D3.js

---

For questions or contributions, open an issue or pull request!
