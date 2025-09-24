import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:3001');

const CELL_SIZE = 32;
const PLAYER_COLORS = [
  '#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#a8dadc', '#ffb703', '#b5179e', '#06d6a0', '#118ab2', '#ef476f'
];

function Maze({ maze, width, height, players, selfId }) {
  return (
    <div
      style={{
        display: 'inline-block',
        position: 'relative',
        background: '#222',
        margin: '1rem',
        boxShadow: '0 0 8px #000',
      }}
    >
      <svg
        width={width * CELL_SIZE}
        height={height * CELL_SIZE}
        style={{ display: 'block' }}
      >
        {/* Draw maze walls */}
        {maze.map((row, y) =>
          row.map((cell, x) => {
            const walls = [];
            const px = x * CELL_SIZE;
            const py = y * CELL_SIZE;
            if (cell.top) walls.push(<line key="t" x1={px} y1={py} x2={px + CELL_SIZE} y2={py} stroke="#fff" strokeWidth="2" />);
            if (cell.left) walls.push(<line key="l" x1={px} y1={py} x2={px} y2={py + CELL_SIZE} stroke="#fff" strokeWidth="2" />);
            if (cell.right) walls.push(<line key="r" x1={px + CELL_SIZE} y1={py} x2={px + CELL_SIZE} y2={py + CELL_SIZE} stroke="#fff" strokeWidth="2" />);
            if (cell.bottom) walls.push(<line key="b" x1={px} y1={py + CELL_SIZE} x2={px + CELL_SIZE} y2={py + CELL_SIZE} stroke="#fff" strokeWidth="2" />);
            return <g key={x + '-' + y}>{walls}</g>;
          })
        )}
        {/* Draw players */}
        {Object.values(players).map((p, idx) => (
          <circle
            key={p.id}
            cx={p.x * CELL_SIZE + CELL_SIZE / 2}
            cy={p.y * CELL_SIZE + CELL_SIZE / 2}
            r={CELL_SIZE / 3}
            fill={p.id === selfId ? '#38b000' : PLAYER_COLORS[idx % PLAYER_COLORS.length]}
            stroke="#111"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

function NetworkTrafficPanel({ logs, selfId }) {
  return (
    <div className="network-traffic-panel">
      <h2>Network Traffic</h2>
      <div className="network-traffic-log">
        {logs.length === 0 && <div className="network-traffic-empty">No network events yet.</div>}
        {logs.map((log, idx) => (
          <div key={idx} className={`network-traffic-row network-traffic-${log.type}`}>
            <span className="network-traffic-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="network-traffic-type">[{log.type.toUpperCase()}]</span>
            <span className="network-traffic-id">{log.socketId === selfId ? 'You' : log.socketId.slice(0, 6)}</span>
            <span className="network-traffic-data">{JSON.stringify(log.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPanel({ chat, onSend, selfId }) {
  const [msg, setMsg] = useState("");
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat]);
  return (
    <div className="chat-panel">
      <h2>Chat</h2>
      <div className="chat-log">
        {chat.length === 0 && <div className="chat-empty">No messages yet.</div>}
        {chat.map((c, idx) => (
          <div key={idx} className={"chat-row" + (c.id === selfId ? " chat-self" : "") }>
            <span className="chat-id">{c.id === selfId ? "You" : c.id.slice(0, 6)}</span>
            <span className="chat-text">{c.text}</span>
            <span className="chat-time">{new Date(c.time).toLocaleTimeString()}</span>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form className="chat-form" onSubmit={e => { e.preventDefault(); if (msg.trim()) { onSend(msg); setMsg(""); } }}>
        <input
          className="chat-input"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
        />
        <button className="chat-send" type="submit">Send</button>
      </form>
    </div>
  );
}

function App() {
  const [maze, setMaze] = useState(null);
  const [mazeSize, setMazeSize] = useState({ width: 0, height: 0 });
  const [players, setPlayers] = useState({});
  const [selfId, setSelfId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [chat, setChat] = useState([]);
  // Mode state: 'server' (Socket.io authoritative) or 'p2p' (WebRTC DataChannel)
  const [mode, setMode] = useState(null);
  const [roomId, setRoomId] = useState('room1');
  // WebRTC state
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const keyDownRef = useRef(false);

  // --- Socket.io server mode wiring ---
  useEffect(() => {
    if (mode !== 'server') return;
    socket.on('connect', () => {
      setSelfId(socket.id);
    });
    socket.on('maze', ({ maze, width, height }) => {
      setMaze(maze);
      setMazeSize({ width, height });
    });
    socket.on('players', (players) => {
      setPlayers(players);
    });
    socket.on('packet', (log) => {
      setLogs((prev) => [...prev.slice(-99), log]); // keep last 100 logs
    });
    socket.on('chat', (msg) => {
      setChat((prev) => [...prev.slice(-99), msg]);
    });
    return () => {
      socket.off('connect');
      socket.off('maze');
      socket.off('players');
      socket.off('packet');
      socket.off('chat');
    };
  }, [mode]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e) {
      if (keyDownRef.current) return;
      let dir = null;
      if (e.key === 'ArrowUp' || e.key === 'w') dir = 'up';
      if (e.key === 'ArrowDown' || e.key === 's') dir = 'down';
      if (e.key === 'ArrowLeft' || e.key === 'a') dir = 'left';
      if (e.key === 'ArrowRight' || e.key === 'd') dir = 'right';
      if (dir) {
        if (mode === 'server') {
          socket.emit('move', { dir, sentAt: Date.now() });
        } else if (mode === 'p2p' && dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          // In P2P mode, send movement over the DataChannel
          dataChannelRef.current.send(JSON.stringify({ type: 'move', dir }));
          // Apply locally as well for instant feedback
          setPlayers(prev => {
            const me = prev[selfId] || { id: selfId, x: 0, y: 0 };
            return { ...prev, [selfId]: me };
          });
        }
        keyDownRef.current = true;
      }
    }
    function handleKeyUp(e) {
      keyDownRef.current = false;
    }
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, selfId]);

  function handleSendChat(message) {
    if (mode === 'server') {
      socket.emit('chat', message);
    } else if (mode === 'p2p' && dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'chat', text: message }));
      setChat(prev => [...prev, { id: selfId || 'me', text: message, time: Date.now() }]);
    }
  }

  // --- P2P Mode: WebRTC Signaling + DataChannel ---
  // This uses Socket.io only for signaling: join a room, exchange SDP (offer/answer) and ICE.
  // Once the connection is established, game messages flow directly over the DataChannel.
  async function startP2P() {
    setMode('p2p');
    // 1) Fetch maze from server (read-only)
    const res = await fetch('http://localhost:3001/maze');
    const { maze: mz, width, height } = await res.json();
    setMaze(mz);
    setMazeSize({ width, height });
    // Initialize own player
    const myId = socket.id || Math.random().toString(36).slice(2, 8);
    setSelfId(myId);
    setPlayers(prev => ({ ...prev, [myId]: { id: myId, x: 0, y: 0 } }));

    // 2) Create RTCPeerConnection and DataChannel
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtc-ice', { roomId, candidate: e.candidate });
      }
    };
    pc.ondatachannel = (ev) => {
      // Receiving side
      const ch = ev.channel;
      dataChannelRef.current = ch;
      ch.onmessage = onP2PMessage;
      ch.onopen = () => console.log('P2P DataChannel open');
      ch.onclose = () => console.log('P2P DataChannel closed');
    };

    // Create a channel proactively (caller side)
    const dc = pc.createDataChannel('game');
    dataChannelRef.current = dc;
    dc.onmessage = onP2PMessage;
    dc.onopen = () => console.log('P2P DataChannel open');
    dc.onclose = () => console.log('P2P DataChannel closed');

    // 3) Join a signaling room
    socket.emit('join_room', roomId);

    // 4) Handle signaling messages
    socket.on('peer_joined', async ({ peerId }) => {
      // We are the first; create and send an offer to the new peer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { roomId, sdp: offer });
    });
    socket.on('webrtc-offer', async ({ from, sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc-answer', { roomId, sdp: answer });
    });
    socket.on('webrtc-answer', async ({ from, sdp }) => {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });
    socket.on('webrtc-ice', async ({ from, candidate }) => {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
    });
  }

  // Handle incoming DataChannel messages in P2P mode
  function onP2PMessage(ev) {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'move') {
      // Apply simple movement rules in the maze for the remote player
      setPlayers(prev => {
        const otherId = msg.id || 'peer';
        const p = prev[otherId] || { id: otherId, x: 0, y: 0 };
        const { x, y } = p;
        if (!maze) return prev;
        const cell = maze[y]?.[x];
        if (!cell) return prev;
        let nx = x, ny = y;
        if (msg.dir === 'up' && !cell.top) ny--;
        if (msg.dir === 'down' && !cell.bottom) ny++;
        if (msg.dir === 'left' && !cell.left) nx--;
        if (msg.dir === 'right' && !cell.right) nx++;
        const updated = { ...prev, [otherId]: { ...p, x: nx, y: ny } };
        return updated;
      });
    }
    if (msg.type === 'chat') {
      setChat(prev => [...prev, { id: 'peer', text: msg.text, time: Date.now() }]);
    }
    if (msg.type === 'state') {
      // Full state sync (optional)
      if (msg.players) setPlayers(msg.players);
      if (msg.maze) setMaze(msg.maze);
    }
  }

  async function startServerMode() {
    setMode('server');
  }

  return (
    <div className="App">
      <h1>Multiplayer Web Maze Game</h1>
      {!mode && (
        <div style={{ marginBottom: 12 }}>
          <h3>Select Mode</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={startServerMode}>Server Mode (Socket.io)</button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={roomId} onChange={e => setRoomId(e.target.value)} placeholder="room id" />
              <button onClick={startP2P}>P2P Mode (WebRTC)</button>
            </div>
          </div>
          <p style={{ maxWidth: 680 }}>
            In P2P mode, the server is used only for signaling (SDP/ICE). Once connected, peers exchange
            movement/chat directly via a WebRTC DataChannel.
          </p>
        </div>
      )}
      {maze ? (
        <Maze maze={maze} width={mazeSize.width} height={mazeSize.height} players={players} selfId={selfId} />
      ) : (
        <p>Loading maze...</p>
      )}
      <p>Use arrow keys or WASD to move. Green is you! {mode === 'p2p' ? 'P2P mode active.' : ''}</p>
      <ChatPanel chat={chat} onSend={handleSendChat} selfId={selfId} />
      <NetworkTrafficPanel logs={logs} selfId={selfId} />
    </div>
  );
}

export default App;
