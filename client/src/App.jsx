import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Use Vite env var for the signaling server URL. If not set, use same-origin.
// Same-origin enables using Vite's proxy (/socket.io -> http://localhost:3001) so you only need ONE ngrok (frontend).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
// Socket.io is used ONLY for signaling in P2P mode (offer/answer/ICE). No game data flows through it.
// Force transports to improve compatibility through proxies/tunnels; add timeouts and new connection instance.
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  forceNew: true,
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

// Chat UI component remains below

function ChatPanel({ chat, onSend, selfId, canSend }) {
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
      <form className="chat-form" onSubmit={e => { e.preventDefault(); if (msg.trim() && canSend) { onSend(msg); setMsg(""); } }}>
        <input
          className="chat-input"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Type a message..."
          maxLength={200}
          disabled={!canSend}
        />
        <button className="chat-send" type="submit" disabled={!canSend}>Send</button>
      </form>
      {!canSend && <div style={{ marginTop: 6, color: '#888' }}>Waiting for P2P DataChannel to open...</div>}
    </div>
  );
}

function App() {
  const [selfId, setSelfId] = useState(null);
  const [chat, setChat] = useState([]);
  const [status, setStatus] = useState(''); // tutorial-style status messages
  // WebRTC state
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const pendingRemoteCandidatesRef = useRef([]);
  // Diagnostics state
  const [pcConnectionState, setPcConnectionState] = useState('new');
  const [pcIceConnectionState, setPcIceConnectionState] = useState('new');
  const [pcIceGatheringState, setPcIceGatheringState] = useState('new');
  const [dcReadyState, setDcReadyState] = useState('closed');
  const [turnEnabled, setTurnEnabled] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketError, setSocketError] = useState('');
  // Auto P2P setup on mount: no rooms, auto-pair via peerJoined broadcast
  useEffect(() => {
    // 1) Prepare RTCPeerConnection
    // STUN only by default. Optionally add TURN via environment variables for strict NATs.
    // To enable TURN, set in client/.env.local and restart dev server:
    // VITE_TURN_URL=turn:your-turn.example.org:3478
    // VITE_TURN_USERNAME=yourUser
    // VITE_TURN_CREDENTIAL=yourPass
    const stunServers = [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun2.l.google.com:19302',
    ];
    const iceServers = [{ urls: stunServers }];
    const turnUrl = import.meta.env.VITE_TURN_URL;
    const turnUser = import.meta.env.VITE_TURN_USERNAME;
    const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;
    if (turnUrl && turnUser && turnCred) {
      iceServers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
      setTurnEnabled(true);
      console.log('[TURN] Enabled with URL:', turnUrl);
    } else {
      setTurnEnabled(false);
    }
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      console.log('[PC] connectionState =', pc.connectionState);
      setPcConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') setStatus('Peer connection failed (check NAT/TURN)');
    };
    pc.oniceconnectionstatechange = () => {
      console.log('[PC] iceConnectionState =', pc.iceConnectionState);
      setPcIceConnectionState(pc.iceConnectionState);
    };
    pc.onicegatheringstatechange = () => {
      console.log('[PC] iceGatheringState =', pc.iceGatheringState);
      setPcIceGatheringState(pc.iceGatheringState);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('[ICE] local candidate -> signaling', e.candidate);
        socket.emit('iceCandidate', { candidate: e.candidate });
      }
    };
    pc.ondatachannel = (ev) => {
      // We are the answering peer (Peer B)
      const ch = ev.channel;
      dataChannelRef.current = ch;
      wireDataChannel(ch);
    };

    // 2) Identify self when signaling connects
    socket.on('connect', () => {
      setSocketConnected(true);
      setSocketError('');
      setSelfId(socket.id);
      setStatus('Connected to signaling. Waiting for a peer...');
      console.log('[Signaling] connected, id=', socket.id);
    });
    socket.on('connect_error', (err) => {
      setSocketConnected(false);
      setSocketError(`connect_error: ${err?.message || err}`);
      console.warn('[Signaling] connect_error', err);
    });
    socket.on('reconnect_attempt', (n) => {
      console.log('[Signaling] reconnect_attempt', n);
    });
    socket.on('reconnect', (n) => {
      console.log('[Signaling] reconnect success after attempts', n);
    });
    socket.on('error', (err) => {
      console.warn('[Signaling] socket error', err);
    });

    // 3) If another peer joins, act as caller: create DataChannel and send offer
    socket.on('peerJoined', async () => {
      setStatus('Peer joined. Creating offer...');
      console.log('[Signaling] peerJoined -> creating offer');
      const dc = pc.createDataChannel('game-data');
      dataChannelRef.current = dc;
      wireDataChannel(dc);
      setDcReadyState(dc.readyState);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { sdp: offer });
      console.log('[Signaling] offer sent');
    });

    // 4) Handle offer (we are callee)
    socket.on('offer', async ({ sdp }) => {
      setStatus('Offer received. Sending answer...');
      console.log('[Signaling] offer received');
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { sdp: answer });
      console.log('[Signaling] answer sent');
      // Drain any ICE candidates received before remote description was set
      if (pendingRemoteCandidatesRef.current.length) {
        console.log('[ICE] adding queued remote candidates:', pendingRemoteCandidatesRef.current.length);
        for (const c of pendingRemoteCandidatesRef.current) {
          try { await pc.addIceCandidate(c); } catch (e) { console.warn('addIceCandidate (queued) failed', e); }
        }
        pendingRemoteCandidatesRef.current = [];
      }
    });

    // 5) Handle answer (we are caller)
    socket.on('answer', async ({ sdp }) => {
      setStatus('Answer received. Finalizing connection...');
      console.log('[Signaling] answer received');
      await pc.setRemoteDescription(sdp);
      // Drain any ICE candidates received before remote description was set
      if (pendingRemoteCandidatesRef.current.length) {
        console.log('[ICE] adding queued remote candidates:', pendingRemoteCandidatesRef.current.length);
        for (const c of pendingRemoteCandidatesRef.current) {
          try { await pc.addIceCandidate(c); } catch (e) { console.warn('addIceCandidate (queued) failed', e); }
        }
        pendingRemoteCandidatesRef.current = [];
      }
    });

    // 6) Handle ICE candidates (both sides)
    socket.on('iceCandidate', async ({ candidate }) => {
      console.log('[ICE] remote candidate received');
      try {
        if (!pc.currentRemoteDescription && !pc.remoteDescription) {
          // Queue until remote description is set
          pendingRemoteCandidatesRef.current.push(candidate);
          console.log('[ICE] queued (no remoteDescription yet)');
        } else {
          await pc.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('peerJoined');
      socket.off('offer');
      socket.off('answer');
      socket.off('iceCandidate');
      pc.close();
    };
  }, []);

  function handleSendChat(message) {
    if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({ type: 'chat', text: message }));
      setChat(prev => [...prev, { id: selfId || 'me', text: message, time: Date.now() }]);
    }
  }

  function wireDataChannel(ch) {
    ch.onopen = () => { setStatus('P2P DataChannel open'); setDcReadyState(ch.readyState); };
    ch.onclose = () => { setStatus('P2P DataChannel closed'); setDcReadyState(ch.readyState); };
    ch.onmessage = onP2PMessage;
  }


  // Handle incoming DataChannel messages in P2P mode
  function onP2PMessage(ev) {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'chat') {
        setChat(prev => [...prev, { id: 'peer', text: msg.text, time: Date.now() }]);
      }
    } catch (err) {
      console.warn('Received non-JSON message on DataChannel', ev.data);
    }
  }

  return (
    <div className="App">
      <h1>P2P Chat (WebRTC)</h1>
      <p style={{ maxWidth: 680 }}>
        This demo auto-connects peers via the signaling server set in <code>VITE_SOCKET_URL</code>. When a peer connects,
        the existing peer creates an offer and a DataChannel named <code>game-data</code> for chat messages.
      </p>
      {/* Diagnostics Panel */}
      <div style={{
        margin: '12px 0', padding: '10px', background: '#0b0f14', color: '#cde', border: '1px solid #123', borderRadius: 6,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 13
      }}>
        <div><strong>Connection Diagnostics</strong></div>
        <div>Socket: {socketConnected ? 'connected' : 'disconnected'} {socketError && `(err: ${socketError})`}</div>
        <div>Socket ID: {selfId || '(connecting...)'}</div>
        <div>PC connectionState: {pcConnectionState}</div>
        <div>ICE connection: {pcIceConnectionState}</div>
        <div>ICE gathering: {pcIceGatheringState}</div>
        <div>DataChannel: {dcReadyState}</div>
        <div>TURN enabled: {turnEnabled ? 'yes' : 'no'}</div>
      </div>
      {status && <div style={{ color: '#0af', marginTop: 6 }}>{status}</div>}
      <ChatPanel chat={chat} onSend={handleSendChat} selfId={selfId} canSend={dataChannelRef.current?.readyState === 'open'} />
    </div>
  );
}

export default App;
