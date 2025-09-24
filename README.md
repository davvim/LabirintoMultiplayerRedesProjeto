# Multiplayer Web Maze Game with Network Traffic Inspection

A university networking project: Multiplayer Web Maze Game with built-in network traffic inspection, real-time dashboard, and chat.

---

## Features
- Multiplayer maze game (Node.js + Express + Socket.io + React)
- Real-time player movement and chat
- Built-in network traffic logger and dashboard (`/dashboard`)
- Easy deployment (local or cloud VPS)
- Clean setup: only server + client needed

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
- Open multiple browser tabs/windows at [http://localhost:5173](http://localhost:5173)
- Each client is assigned a unique ID and can move/chat in the shared maze

---

## Network Traffic Capture

### Option 1: Built-in Logger & Dashboard
- All WebSocket events (connect, move, chat, disconnect) are logged in memory and visible at [http://localhost:3001/dashboard](http://localhost:3001/dashboard)
- Table and D3.js chart auto-update in real time
- For exporting, you can extend the `/packets` endpoint to download logs as JSON/CSV

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

## Notes
- This repository is cleaned to the essentials: Node/Express Socket.io server and React client.
- Experimental tools (e.g., external sniffers, Replit, WebRTC prototypes) have been removed. Future additions can be reintroduced as needed.

---

## Project Structure
```
V3MazingGameServer/
├── client/             # React + Vite frontend
│   ├── src/
│   ├── public/
│   ├── index.html
│   └── ...
├── client/server/     # Node.js backend (Express + Socket.io)
│   ├── index.js
│   ├── dashboard.html
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
