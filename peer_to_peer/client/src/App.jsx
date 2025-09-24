import React, { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
import { io } from "socket.io-client";

// === Função para gerar labirinto ===
function generateMaze(width, height) {
  const maze = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      top: true,
      right: true,
      bottom: true,
      left: true,
    }))
  );

  const visited = Array.from({ length: height }, () => Array(width).fill(false));

  const dirs = [
    { dx: 0, dy: -1, wall: "top", opp: "bottom" },
    { dx: 1, dy: 0, wall: "right", opp: "left" },
    { dx: 0, dy: 1, wall: "bottom", opp: "top" },
    { dx: -1, dy: 0, wall: "left", opp: "right" },
  ];

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

export default function App() {
  const canvasRef = useRef(null);
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [peerId, setPeerId] = useState("");
  const [myId, setMyId] = useState("");
  const [players, setPlayers] = useState({});
  const maze = useRef(null); // Inicializa como null
  const [mazeVersion, setMazeVersion] = useState(0);
  const [isHost, setIsHost] = useState(false);
  const socket = useRef(null);
  const gameEvents = useRef([]);

  // === Inicializa Socket.IO ===
  useEffect(() => {
    socket.current = io("http://localhost:3001"); // ajuste para seu servidor
    socket.current.on("connect", () => console.log("Socket connected:", socket.current.id));
  }, []);

  // === Inicializa PeerJS ===
  useEffect(() => {
    const p = new Peer();
    setPeer(p);

    p.on("open", (id) => {
      setMyId(id);
      setPlayers({ [id]: { x: 0, y: 0, id } });
      // Se ninguém para conectar ainda, essa aba será host
      if (!peerId) {
        maze.current = generateMaze(15, 10);
        setIsHost(true);
      }
    });

    p.on("connection", (c) => {
      setupConnection(c);
    });
  }, []);

  // === Configura conexão PeerJS ===
  function setupConnection(c) {
    c.on("data", (msg) => {
      logEvent(msg); // registra o evento

      switch (msg.type) {
        case "maze":
          if (!isHost) {
            maze.current = msg.maze;
            setMazeVersion((v) => v + 1);
          }
          break;
        case "move":
          setPlayers((prev) => ({ ...prev, [msg.player.id]: msg.player }));
          break;
        case "state":
          setPlayers((prev) => {
            const merged = { ...prev };
            for (const id in msg.players) {
              if (id !== myId) merged[id] = msg.players[id];
            }
            return merged;
          });
          break;
        case "request-maze":
          if (isHost) {
            c.send({ type: "maze", maze: maze.current });
            c.send({ type: "state", players });
          }
          break;
      }
    });

    c.on("open", () => {
      setConn(c);
      if (!isHost) {
        c.send({ type: "request-maze" });
      } else {
        c.send({ type: "maze", maze: maze.current });
        c.send({ type: "state", players });
      }
    });
  }

  function connectToPeer() {
    if (!peer || !peerId) return;
    const c = peer.connect(peerId);
    setupConnection(c);
  }

  // === Função para registrar eventos e enviar ao servidor ===
  function logEvent(event) {
    const timestamp = Date.now();
    gameEvents.current.push({ ...event, timestamp });
    if (socket.current && socket.current.connected) {
      socket.current.emit("game-event", { ...event, timestamp });
    }
  }

  // === Movimentação do jogador local ===
  function move(dir) {
    setPlayers((prev) => {
      if (!myId || !prev[myId] || !maze.current) return prev;

      const me = { ...prev[myId] };
      const cell = maze.current[me.y][me.x];
      let nx = me.x;
      let ny = me.y;

      if ((dir === "up" || dir === "w") && !cell.top) ny--;
      if ((dir === "down" || dir === "s") && !cell.bottom) ny++;
      if ((dir === "left" || dir === "a") && !cell.left) nx--;
      if ((dir === "right" || dir === "d") && !cell.right) nx++;

      if (nx >= 0 && nx < 15 && ny >= 0 && ny < 10) {
        me.x = nx;
        me.y = ny;
      }

      const updated = { ...prev, [myId]: me };

      // envia para P2P
      if (conn) conn.send({ type: "move", player: me });

      // registra evento
      logEvent({ type: "move", playerId: myId, pos: me });

      return updated;
    });
  }

  // === Renderiza labirinto e jogadores ===
  useEffect(() => {
    if (!maze.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const cellSize = 40;

    function draw() {
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#fff";
      maze.current.forEach((row, y) => {
        row.forEach((cell, x) => {
          const x0 = x * cellSize;
          const y0 = y * cellSize;
          if (cell.top) ctx.strokeRect(x0, y0, cellSize, 1);
          if (cell.right) ctx.strokeRect(x0 + cellSize - 1, y0, 1, cellSize);
          if (cell.bottom) ctx.strokeRect(x0, y0 + cellSize - 1, cellSize, 1);
          if (cell.left) ctx.strokeRect(x0, y0, 1, cellSize);
        });
      });

      Object.entries(players).forEach(([id, p]) => {
        ctx.fillStyle = id === myId ? "green" : "red";
        ctx.beginPath();
        ctx.arc(p.x * cellSize + cellSize / 2, p.y * cellSize + cellSize / 2, 10, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    draw();
  }, [players, mazeVersion]);

  // === Controles de teclado ===
  useEffect(() => {
    function handleKey(e) {
      if (["ArrowUp", "w"].includes(e.key)) move("up");
      if (["ArrowDown", "s"].includes(e.key)) move("down");
      if (["ArrowLeft", "a"].includes(e.key)) move("left");
      if (["ArrowRight", "d"].includes(e.key)) move("right");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [players, conn]);

  return (
    <div style={{ textAlign: "center", padding: "1rem" }}>
      <h1>Maze P2P</h1>
      <p>Meu Peer ID: {myId}</p>
      <input
        value={peerId}
        onChange={(e) => setPeerId(e.target.value)}
        placeholder="Peer ID para conectar"
      />
      <button onClick={connectToPeer}>Conectar</button>

      <div style={{ marginTop: "1rem" }}>
        <canvas ref={canvasRef} width={15 * 40} height={10 * 40} />
      </div>
      <p>Use as setas do teclado ou W A S D para se mover. Verde é você!</p>
    </div>
  );
}
