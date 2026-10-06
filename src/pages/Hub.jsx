import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Monitor, Unlock, Lock, Users, Clock, Edit, CheckSquare, Settings, Key, Play, Pause, XCircle, RotateCcw, MonitorUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hub() {
  const { socket, gameState, onlineSeats, serverTimeOffset } = useSocket();
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(() => localStorage.getItem('hub_authed') === 'true');

  useEffect(() => {
    if (authed) {
      localStorage.setItem('hub_authed', 'true');
      socket.emit('register_admin', pin);
      
      const onConnect = () => socket.emit('register_admin', pin);
      socket.on('connect', onConnect);
      return () => socket.off('connect', onConnect);
    }
  }, [authed, socket, pin]);

  if (!authed) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07070D]">
        <div className="glass-panel p-8 w-96 text-center">
          <Key className="w-12 h-12 mx-auto mb-4 text-theme-blue opacity-80" />
          <h2 className="text-2xl font-space font-bold mb-6">Hub Authentication</h2>
          <form onSubmit={(e) => { e.preventDefault(); setAuthed(true); }} className="flex flex-col gap-4">
            <input type="password" value={pin} onChange={e=>setPin(e.target.value)} autoFocus placeholder="Enter Admin PIN (try 1234)" className="w-full bg-black/40 border border-border rounded-lg py-3 px-4 text-center tracking-[0.5em] focus:border-theme-blue focus:outline-none" />
            <button type="submit" className="bg-theme-blue hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors">LOGIN</button>
          </form>
        </div>
      </div>
    );
  }

  // Derived stats
  const seatsArr = Object.values(gameState.seats);
  const onlineCount = onlineSeats.length;
  const assignedCount = seatsArr.filter(s => s.status === 'ASSIGNED').length;
  const emptyCount = 60 - seatsArr.filter(s => s.status !== 'CLOSED' && s.status !== 'AVAILABLE').length;

  const themeCounts = gameState.scenarios.map(sc => ({
    ...sc,
    count: seatsArr.filter(s => s.themeId === sc.id).length
  }));

  const act = (type, payload) => socket.emit('admin_action', { type, payload });

  return (
    <div className="h-screen w-full bg-[#07070D] flex flex-col overflow-hidden text-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/5 via-background to-background pointer-events-none" />
      
      {/* Top Bar */}
      <header className="flex justify-between items-center px-6 py-4 border-b border-border bg-black/40 backdrop-blur-md z-10 relative">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-theme-blue rounded-full shadow-[0_0_10px_#3B82F6]"></div>
          <h1 className="font-space font-bold tracking-widest text-white/80 uppercase">Rapid Prototype Championship · Hub Control</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="px-4 py-1.5 rounded-full border border-border bg-surface font-bold text-xs tracking-widest text-theme-amber">{gameState.phase}</div>
          <div className="font-mono text-white/50"><span className="text-white font-bold">{onlineCount}</span> / 60 connected</div>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="grid grid-cols-8 border-b border-border bg-surface/50 z-10 relative">
        <StatBox label="Online" value={onlineCount} color="#10B981" />
        <StatBox label="Assigned" value={assignedCount} />
        <StatBox label="Empty Seats" value={emptyCount} color="rgba(255,255,255,0.4)" />
        {themeCounts.map(tc => (
          <StatBox key={tc.id} label={tc.label} value={tc.count} color={tc.color} />
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden z-10 relative p-6 gap-6">
        {/* Seat Grid */}
        <div className="flex-1 grid grid-cols-10 grid-rows-6 gap-2 h-full">
          {seatsArr.map(seat => (
            <SeatTile key={seat.id} seat={seat} isOnline={onlineSeats.includes(seat.id)} scenarios={gameState.scenarios} onToggle={() => act('TOGGLE_SEAT', { seatId: seat.id })} onRelease={() => act('RELEASE_SEAT', { seatId: seat.id })} />
          ))}
        </div>

        {/* Legend / Actions */}
        <div className="w-64 flex flex-col gap-6">
          <div className="glass-panel p-4 flex flex-col gap-2">
            <h3 className="font-space font-bold text-white/60 mb-2 text-xs tracking-widest uppercase">Seat Bulk Actions</h3>
            <button onClick={() => act('OPEN_ALL')} className="w-full py-2 bg-surface hover:bg-surfaceHover rounded border border-border text-left px-3 text-xs flex items-center gap-2"><Unlock className="w-3 h-3"/> Open All Seats</button>
            <button onClick={() => act('CLOSE_ALL')} className="w-full py-2 bg-surface hover:bg-surfaceHover rounded border border-border text-left px-3 text-xs flex items-center gap-2"><Lock className="w-3 h-3"/> Close All Seats</button>
          </div>

          <div className="glass-panel p-4 flex-1">
            <h3 className="font-space font-bold text-white/60 mb-4 text-xs tracking-widest uppercase">Themes Legend</h3>
            <div className="flex flex-col gap-3">
              {gameState.scenarios.map(sc => (
                <div key={sc.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border" style={{ borderColor: `${sc.color}30`, backgroundColor: `${sc.color}10` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: sc.color, boxShadow: `0 0 8px ${sc.color}` }}></div>
                  <span className="font-bold text-xs tracking-wide" style={{ color: sc.color }}>{sc.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Command Dock */}
      <div className="h-24 border-t border-border bg-black/80 backdrop-blur-xl z-20 flex items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-3">
          <LiveTimer gameState={gameState} offset={serverTimeOffset} />
        </div>

        <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border">
          {gameState.phase === 'STANDBY' && <CommandBtn icon={Users} label="Open Lobby" onClick={() => act('SET_PHASE_LOBBY')} color="blue" />}
          
          {(gameState.phase === 'LOBBY' || gameState.phase === 'STANDBY') && <CommandBtn icon={MonitorUp} label="Start Reveal" onClick={() => act('REVEAL')} color="pink" />}
          
          {gameState.phase === 'REVEALED' && <CommandBtn icon={Play} label="Start Timer" onClick={() => act('START_TIMER')} color="green" />}
          
          {gameState.phase === 'LIVE' && <CommandBtn icon={Pause} label="Pause" onClick={() => act('PAUSE_TIMER')} color="amber" />}
          
          {gameState.phase === 'PAUSED' && <CommandBtn icon={Play} label="Resume" onClick={() => act('RESUME_TIMER')} color="green" />}

          <div className="w-px h-8 bg-border mx-2"></div>
          
          <CommandBtn icon={Clock} label="+5 Min" onClick={() => act('ADD_TIME', { minutes: 5 })} />
          <CommandBtn icon={RotateCcw} label="Reset Event" onClick={() => { if(confirm("Are you sure? This kicks everyone.")) act('RESET_EVENT'); }} color="red" />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color = '#fff' }) {
  return (
    <div className="px-4 py-3 border-r border-border last:border-0 flex flex-col justify-center items-center">
      <div className="font-mono text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-white/40 mt-1">{label}</div>
    </div>
  );
}

function SeatTile({ seat, isOnline, scenarios, onToggle, onRelease }) {
  let bg = 'bg-surface';
  let border = 'border-border';
  let iconCol = 'text-white/20';
  let glow = 'none';

  if (seat.status === 'CLOSED') {
    bg = 'bg-red-900/10'; border = 'border-red-500/20'; iconCol = 'text-red-500/40';
  } else if (seat.status === 'AVAILABLE') {
    border = 'border-green-500/30'; iconCol = 'text-green-500/50';
  } else if (seat.status === 'LOCKED_IN') {
    border = 'border-white/30'; bg = 'bg-white/5'; iconCol = 'text-white/80';
  } else if (seat.status === 'ASSIGNED') {
    const sc = scenarios.find(s => s.id === seat.themeId);
    if (sc) {
      bg = `bg-[${sc.color}]/10`; // Approximate with inline styles instead
      border = `border-[${sc.color}]/50`;
      iconCol = `text-[${sc.color}]`;
      glow = `0 0 15px ${sc.color}30`;
    }
  }

  const sc = seat.themeId ? scenarios.find(s => s.id === seat.themeId) : null;

  return (
    <div 
      onClick={onToggle}
      className={`relative rounded-md border flex flex-col p-2 cursor-pointer transition-all hover:brightness-125 overflow-hidden`}
      style={{ 
        backgroundColor: sc ? `${sc.color}15` : undefined, 
        borderColor: sc ? `${sc.color}60` : undefined,
        boxShadow: glow 
      }}
    >
      <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse shadow-[0_0_5px_#10B981]' : 'bg-white/10'}`}></div>
      
      <Monitor className={`w-4 h-4 mb-1 ${iconCol}`} style={{ color: sc ? sc.color : undefined }} />
      <div className="font-mono text-xs font-bold text-white/50">{seat.id}</div>
      
      <div className="flex-1 flex flex-col justify-end mt-1">
        {seat.name ? (
          <div className="font-bold text-[0.7rem] leading-tight truncate">{seat.name}</div>
        ) : (
          <div className="text-[0.6rem] font-bold tracking-widest text-white/20 uppercase">{seat.status}</div>
        )}
        {sc && <div className="text-[0.55rem] font-bold tracking-widest uppercase mt-0.5" style={{ color: sc.color }}>{sc.label}</div>}
      </div>
      
      {seat.lateMinutes > 0 && (
        <div className="absolute top-1 left-1 text-[0.5rem] bg-red-500 text-white px-1 rounded font-bold">LATE</div>
      )}
      
      {seat.status === 'CLOSED' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="text-[0.55rem] font-bold tracking-[0.2em] text-red-500/70 -rotate-45 border border-red-500/30 px-2 py-0.5 rounded">CLOSED</div>
        </div>
      )}
    </div>
  );
}

function CommandBtn({ icon: Icon, label, onClick, color }) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-500',
    green: 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] border-green-500',
    amber: 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(217,119,6,0.4)] border-amber-500',
    pink: 'bg-pink-600 hover:bg-pink-500 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] border-pink-500',
    red: 'bg-transparent hover:bg-red-900/50 text-red-500 border border-red-500/50 hover:border-red-500',
    default: 'bg-surface hover:bg-surfaceHover text-white border-border'
  };
  const c = colorClasses[color] || colorClasses.default;
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-sm transition-all border ${c}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function LiveTimer({ gameState, offset }) {
  const [timeLeft, setTimeLeft] = useState(gameState.remainingMs);
  
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

  const h = Math.floor(timeLeft / 3600000);
  const m = Math.floor((timeLeft % 3600000) / 60000);
  const s = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="font-mono text-4xl font-bold tracking-tighter w-48 text-center bg-black/50 py-2 rounded-xl border border-white/10">
      {h > 0 && `${h}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </div>
  );
}
