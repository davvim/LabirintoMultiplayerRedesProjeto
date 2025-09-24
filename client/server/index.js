const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Maze generation (DFS)
function generateMaze(width, height) {
  const maze = Array.from({ length: height }, () => Array(width).fill({ top: true, right: true, bottom: true, left: true }));
  const visited = Array.from({ length: height }, () => Array(width).fill(false));
  const stack = [];
  const dirs = [
    { dx: 0, dy: -1, wall: 'top', opp: 'bottom' },
    { dx: 1, dy: 0, wall: 'right', opp: 'left' },
    { dx: 0, dy: 1, wall: 'bottom', opp: 'top' },
    { dx: -1, dy: 0, wall: 'left', opp: 'right' },
  ];
  // Deep copy for each cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      maze[y][x] = { top: true, right: true, bottom: true, left: true };
    }
  }
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function dfs(x, y) {
    visited[y][x] = true;
    const neighbors = shuffle(dirs.slice());
    for (const { dx, dy, wall, opp } of neighbors) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx]) {
        maze[y][x][wall] = false;
        maze[ny][nx][opp] = false;
        dfs(nx, ny);
      }
    }
  }
  dfs(0, 0);
  return maze;
}

const MAZE_WIDTH = 15;
const MAZE_HEIGHT = 10;

app.get('/', (req, res) => {
  res.send('Maze Game Server is running!');
});

// --- Socket.io: Minimal WebRTC signaling (no rooms, auto-pair) ---
// On connect, notify existing peers so one of them can initiate the offer.
// Relay offer/answer/iceCandidate by broadcasting to all other sockets.
io.on('connection', (socket) => {
  // Let the already-connected peer(s) know someone joined
  socket.broadcast.emit('peerJoined', { peerId: socket.id });

  // Relay SDP offer/answer and ICE candidates to the other peer(s)
  socket.on('offer', ({ sdp }) => {
    socket.broadcast.emit('offer', { from: socket.id, sdp });
  });
  socket.on('answer', ({ sdp }) => {
    socket.broadcast.emit('answer', { from: socket.id, sdp });
  });
  socket.on('iceCandidate', ({ candidate }) => {
    socket.broadcast.emit('iceCandidate', { from: socket.id, candidate });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
