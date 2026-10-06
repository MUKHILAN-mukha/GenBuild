import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Hub from './pages/Hub';
import Seat from './pages/Seat';
import SocketContext from './context/SocketContext';

// Force polling first if websockets are blocked, but generally WS works locally
const socket = io(window.location.origin, {
  reconnectionDelayMax: 10000,
});

function App() {
  const [gameState, setGameState] = useState(null);
  const [onlineSeats, setOnlineSeats] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  useEffect(() => {
    socket.on('state_update', ({ state, onlineSeats, serverTime }) => {
      setGameState(state);
      setOnlineSeats(onlineSeats);
    });

    // Time sync
    const syncTime = () => {
      const start = Date.now();
      socket.emit('ping', start, (clientStart, serverTime) => {
        const ping = Date.now() - clientStart;
        const offset = serverTime - (clientStart + ping / 2);
        setServerTimeOffset(offset);
      });
    };

    syncTime();
    const interval = setInterval(syncTime, 30000); // Sync every 30s

    return () => {
      socket.off('state_update');
      clearInterval(interval);
    };
  }, []);

  if (!gameState) {
    return <div className="flex h-screen items-center justify-center font-mono text-sm opacity-50">Connecting to Hub...</div>;
  }

  return (
    <SocketContext.Provider value={{ socket, gameState, onlineSeats, serverTimeOffset }}>
      <Routes>
        <Route path="/hub" element={<Hub />} />
        <Route path="/seat" element={<Seat />} />
        <Route path="*" element={<Navigate to="/seat" replace />} />
      </Routes>
    </SocketContext.Provider>
  );
}

export default App;
