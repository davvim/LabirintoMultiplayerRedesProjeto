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
  const keyDownRef = useRef(false);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (keyDownRef.current) return;
      let dir = null;
      if (e.key === 'ArrowUp' || e.key === 'w') dir = 'up';
      if (e.key === 'ArrowDown' || e.key === 's') dir = 'down';
      if (e.key === 'ArrowLeft' || e.key === 'a') dir = 'left';
      if (e.key === 'ArrowRight' || e.key === 'd') dir = 'right';
      if (dir) {
        socket.emit('move', { dir, sentAt: Date.now() });
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
  }, []);

  function handleSendChat(message) {
    socket.emit('chat', message);
  }

  return (
    <div className="App">
      <h1>Multiplayer Web Maze Game</h1>
      {maze ? (
        <Maze maze={maze} width={mazeSize.width} height={mazeSize.height} players={players} selfId={selfId} />
      ) : (
        <p>Loading maze...</p>
      )}
      <p>Use arrow keys or WASD to move. Green is you!</p>
      <ChatPanel chat={chat} onSend={handleSendChat} selfId={selfId} />
      <NetworkTrafficPanel logs={logs} selfId={selfId} />
    </div>
  );
}

export default App;
