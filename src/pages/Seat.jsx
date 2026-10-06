import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Monitor, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function Seat() {
  const [params, setParams] = useSearchParams();
  const seatId = params.get('seat');
  const { socket, gameState, onlineSeats, serverTimeOffset } = useSocket();
  const [toast, setToast] = useState('');

  // Join seat
  useEffect(() => {
    if (!seatId) return;
    socket.emit('join_seat', seatId);
    return () => {
      socket.emit('leave_seat', seatId);
    };
  }, [seatId, socket]);

  // Toast notifications
  useEffect(() => {
    const handler = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 5000); };
    socket.on('toast', handler);
    return () => socket.off('toast', handler);
  }, [socket]);

  const goBack = () => setParams({});

  if (!seatId) return <SeatPicker onSelect={(s) => setParams({ seat: s })} gameState={gameState} onlineSeats={onlineSeats} />;

  const seat = gameState.seats[seatId];
  if (!seat) return <div className="text-center mt-20 text-red-500">Invalid Seat ID</div>;

  return (
    <div className="relative w-full h-screen bg-[#07070D] flex flex-col items-center justify-center overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-50 pointer-events-none" />
      
      <div className="z-10 w-full h-full flex flex-col items-center justify-center">
        <AnimatePresence>
          {seat.status === 'CLOSED' && <ClosedState key="closed" seatId={seatId} onBack={goBack} />}
          {seat.status === 'AVAILABLE' && <AvailableState key="avail" seatId={seatId} socket={socket} onBack={goBack} />}
          {seat.status === 'LOCKED_IN' && <WaitingState key="wait" seat={seat} gameState={gameState} />}
          {(seat.status === 'ASSIGNED' && gameState.phase !== 'REVEALED') && <LiveState key="live" seat={seat} gameState={gameState} offset={serverTimeOffset} />}
          {gameState.phase === 'REVEALED' && seat.status === 'ASSIGNED' && <RevealAnimation key="reveal" seat={seat} gameState={gameState} />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-0 z-50 glass-panel px-6 py-3 font-semibold shadow-lg text-theme-amber border-theme-amber/30">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeatPicker({ onSelect, gameState, onlineSeats }) {
  const seats = Object.values(gameState.seats);
  const mySeat = localStorage.getItem('my_seat');
  const { socket } = useSocket();

  return (
    <div className="p-8 max-w-5xl mx-auto h-screen flex flex-col">
      <h1 className="text-3xl font-space font-bold mb-4 text-center">Select Your Seat</h1>
      
      {mySeat && gameState.seats[mySeat] && (
        <div className="flex justify-center gap-4 mb-8">
          <button onClick={() => onSelect(mySeat)} className="bg-theme-blue/20 border border-theme-blue hover:bg-theme-blue/40 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            Return to my seat ({mySeat})
          </button>
          <button onClick={() => {
            if(confirm("Are you sure you want to give up your seat? You will lose your lock-in.")) {
              socket.emit('release_seat', mySeat);
              localStorage.removeItem('my_seat');
            }
          }} className="bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-500 font-bold py-3 px-6 rounded-lg transition-colors">
            Release Seat
          </button>
        </div>
      )}

      <div className="grid grid-cols-10 gap-3 overflow-y-auto pb-10 flex-1">
        {seats.map(s => {
          const isMySeat = mySeat === s.id;
          // Disallow if:
          // 1. It's not my seat AND I already have a seat
          // 2. Someone else is online on it
          // 3. It's locked in / assigned to someone else
          const isTaken = !isMySeat && (!!mySeat || onlineSeats.includes(s.id) || s.status === 'LOCKED_IN' || s.status === 'ASSIGNED');
          
          return (
            <button key={s.id} disabled={isTaken || s.status === 'CLOSED'} onClick={() => onSelect(s.id)}
              className={`p-3 rounded-lg border text-center transition-all ${isTaken ? 'opacity-30 border-red-500/30 bg-red-900/10 cursor-not-allowed' : s.status === 'CLOSED' ? 'opacity-30 border-border bg-surface cursor-not-allowed' : 'border-theme-blue/50 bg-theme-blue/10 hover:bg-theme-blue/20 hover:scale-105 cursor-pointer'} ${isMySeat ? 'ring-2 ring-theme-blue cursor-pointer opacity-100 bg-theme-blue/20' : ''}`}>
              <Monitor className="w-5 h-5 mx-auto mb-1 opacity-50" />
              <div className="font-mono text-xs">{s.id}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClosedState({ seatId, onBack }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center z-10 flex flex-col items-center text-white absolute">
      <Lock className="w-16 h-16 mb-4 text-red-500" />
      <h2 className="text-2xl font-space font-bold text-red-500">Seat {seatId} is closed</h2>
      <p className="mt-2 text-sm text-white/60 mb-6">This seat has been locked by the organizer.</p>
      <button onClick={onBack} className="px-6 py-2 bg-surface hover:bg-surfaceHover border border-border rounded-lg text-sm font-bold transition-colors">
        Go Back to Seat Selector
      </button>
    </motion.div>
  );
}

function AvailableState({ seatId, socket, onBack }) {
  const [name, setName] = useState('');
  const lockIn = (e) => {
    e.preventDefault();
    if(name.trim()) {
      localStorage.setItem('my_seat', seatId);
      socket.emit('lock_in', { seatId, name });
    }
  };
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-panel p-8 w-full max-w-md z-10 text-center absolute overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-theme-blue"></div>
      
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white transition-colors uppercase tracking-widest border border-border px-2 py-1 rounded">← Back</button>
        <div className="font-mono text-theme-blue font-bold text-xl tracking-widest">{seatId}</div>
      </div>

      <h2 className="text-3xl font-space font-bold mb-2">Welcome</h2>
      <p className="text-white/60 mb-8 text-sm">Enter your name or team name to lock in.</p>
      
      <form onSubmit={lockIn} className="flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} maxLength={40} className="w-full bg-black/40 border border-border rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-theme-blue transition-colors" placeholder="Team Name..." />
        </div>
        <button disabled={!name.trim()} type="submit" className="w-full py-3 bg-theme-blue hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-theme-blue text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
          LOCK IN
        </button>
      </form>
    </motion.div>
  );
}

function WaitingState({ seat, gameState }) {
  const count = Object.values(gameState.seats).filter(s => s.status === 'LOCKED_IN' || s.status==='ASSIGNED').length;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center z-10 flex flex-col items-center absolute">
      <div className="w-24 h-24 rounded-full border-4 border-theme-blue/30 border-t-theme-blue animate-spin mb-8"></div>
      <h2 className="text-4xl font-space font-bold mb-3">You're in, {seat.name}.</h2>
      <p className="text-white/60 text-lg mb-8">Waiting for the organizer to start…</p>
      <div className="px-4 py-2 rounded-full glass-panel font-mono text-sm border-theme-blue/30 text-theme-blue">
        {count} / 60 participants locked in
      </div>
    </motion.div>
  );
}

function RevealAnimation({ seat, gameState }) {
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowResult(true), 3500); // 3.5s dramatic wait
    return () => clearTimeout(t);
  }, []);

  const scenario = gameState.scenarios.find(s => s.id === seat.themeId);
  if (!scenario) return null;

  return (
    <div className="z-10 flex items-center justify-center">
      {!showResult ? (
        <motion.div className="text-6xl font-space font-bold tracking-tighter animate-pulse text-white/50">
          ASSIGNING SCENARIO...
        </motion.div>
      ) : (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" style={{ color: scenario.color, textShadow: `0 0 40px ${scenario.color}80` }}>
          <h3 className="font-mono text-xl mb-4 tracking-widest uppercase opacity-80">{scenario.label}</h3>
          <h1 className="text-5xl md:text-7xl font-space font-bold leading-tight max-w-4xl mx-auto text-white">{scenario.title}</h1>
        </motion.div>
      )}
    </div>
  );
}

function LiveState({ seat, gameState, offset }) {
  const scenario = gameState.scenarios.find(s => s.id === seat.themeId);
  const [timeLeft, setTimeLeft] = useState(gameState.remainingMs);
  const [showDesc, setShowDesc] = useState(true);
  
  useEffect(() => {
    if (gameState.phase !== 'LIVE' && gameState.phase !== 'ENDED') {
      setTimeLeft(gameState.remainingMs);
      return;
    }
    const interval = setInterval(() => {
      const serverNow = Date.now() + offset;
      if (gameState.phase === 'ENDED' || !gameState.endsAt) {
        setTimeLeft(0);
      } else {
        setTimeLeft(Math.max(0, gameState.endsAt - serverNow));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gameState.phase, gameState.endsAt, gameState.remainingMs, offset]);

  if (gameState.phase === 'ENDED' || timeLeft === 0) {
    return (
      <div className="z-50 fixed inset-0 bg-black/90 flex flex-col items-center justify-center backdrop-blur-md">
        <Lock className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-7xl font-space font-bold text-red-500 tracking-tighter">TIME'S UP</h1>
        <p className="mt-4 text-xl text-white/60">Step away from the keyboard.</p>
      </div>
    );
  }

  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);
  const ms = Math.floor((timeLeft % 1000) / 100); // Deciseconds

  const isUrgent = timeLeft < 5 * 60 * 1000;
  const isWarning = timeLeft < 15 * 60 * 1000;

  return (
    <div className="w-full h-full flex flex-col p-6 z-10">
      {/* Top Bar */}
      <div className="flex justify-between items-center glass-panel p-4 mb-6" style={{ borderColor: `${scenario?.color}40` }}>
        <div className="flex items-center gap-4">
          <div className="font-mono text-lg font-bold px-3 py-1 bg-black/50 rounded-md border border-white/10">{seat.id}</div>
          <div className="font-bold text-xl">{seat.name}</div>
        </div>
        
        {/* Big Timer */}
        <div className={`font-mono text-5xl font-bold tracking-tight ${isUrgent ? 'text-red-500 animate-pulse' : isWarning ? 'text-theme-amber' : 'text-white'}`}>
          {h > 0 && `${h}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}<span className="text-2xl opacity-50">.{ms}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: scenario?.color, boxShadow: `0 0 10px ${scenario?.color}` }}></div>
          <div className="font-bold font-space uppercase tracking-widest text-sm" style={{ color: scenario?.color }}>{scenario?.label}</div>
        </div>
      </div>

      {gameState.phase === 'PAUSED' && (
        <div className="w-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 p-3 text-center font-bold tracking-widest mb-6 rounded-lg animate-pulse">
          PAUSED BY ORGANIZER
        </div>
      )}

      {/* Scenario Card */}
      <motion.div layout className="glass-panel w-full max-w-4xl mx-auto overflow-hidden" style={{ borderTop: `4px solid ${scenario?.color}` }}>
        <button onClick={() => setShowDesc(!showDesc)} className="w-full p-6 flex justify-between items-center hover:bg-white/5 transition-colors text-left">
          <h2 className="text-3xl font-space font-bold">{scenario?.title}</h2>
          {showDesc ? <ChevronUp /> : <ChevronDown />}
        </button>
        <AnimatePresence>
          {showDesc && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 text-lg text-white/80 leading-relaxed border-t border-border pt-6 whitespace-pre-wrap">
              {scenario?.desc}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
