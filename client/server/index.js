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
let maze = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);

// Player state
const players = {};

// In-memory packet log for dashboard
const PACKET_LOG = [];

app.get('/', (req, res) => {
  res.send('Maze Game Server is running!');
});

// Add a function to emit packet logs to all clients
function emitPacketLog(type, data, socketId) {
  const log = {
    timestamp: Date.now(),
    type,
    data,
    socketId,
    protocol: 'WebSocket', // For in-app events, protocol is WebSocket
    src: socketId,
    dst: 'server',
    size: JSON.stringify(data).length
  };
  io.emit('packet', log);
  PACKET_LOG.push(log);
  if (PACKET_LOG.length > 500) PACKET_LOG.shift(); // keep last 500
}

// Serve dashboard HTML
app.get('/dashboard', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'dashboard.html'));
});

// Serve packets as JSON
app.get('/packets', (req, res) => {
  res.json(PACKET_LOG);
});

io.on('connection', (socket) => {
  // Assign player to start position (0,0)
  players[socket.id] = { x: 0, y: 0, id: socket.id };
  // Send maze and all player positions
  socket.emit('maze', { maze, width: MAZE_WIDTH, height: MAZE_HEIGHT });
  io.emit('players', players);
  emitPacketLog('connect', { player: players[socket.id] }, socket.id);

  socket.on('move', (dir) => {
    const player = players[socket.id];
    if (!player) return;
    const { x, y } = player;
    const cell = maze[y][x];
    let nx = x, ny = y;
    if (dir === 'up' && !cell.top) ny--;
    if (dir === 'down' && !cell.bottom) ny++;
    if (dir === 'left' && !cell.left) nx--;
    if (dir === 'right' && !cell.right) nx++;
    // Stay in bounds
    if (nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT) {
      player.x = nx;
      player.y = ny;
      io.emit('players', players);
      emitPacketLog('move', { dir, player: { ...player } }, socket.id);
    }
  });

  socket.on('chat', (msg) => {
    const chatMsg = {
      id: socket.id,
      text: msg,
      time: Date.now(),
    };
    io.emit('chat', chatMsg);
    emitPacketLog('chat', chatMsg, socket.id);
  });

  socket.on('disconnect', () => {
    emitPacketLog('disconnect', { player: players[socket.id] }, socket.id);
    delete players[socket.id];
    io.emit('players', players);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
