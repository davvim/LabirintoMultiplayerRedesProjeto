const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Signaling Server Running'));

io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Encaminha offer para outro peer
  socket.on('offer', data => {
    io.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
  });

  // Encaminha answer para peer
  socket.on('answer', data => {
    io.to(data.to).emit('answer', { from: socket.id, answer: data.answer });
  });

  // Encaminha ICE candidates
  socket.on('ice-candidate', data => {
    io.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate });
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
