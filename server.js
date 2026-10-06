const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'event.log');

// --- State Management ---
const defaultScenarios = [
  { id: 'edtech', title: 'Student Learning Support Assistant', color: '#EC4899', label: 'Education', desc: `A college wants to identify students who may need academic support before their performance drops significantly. Faculty have access to basic information such as attendance, assignment completion and recent assessment marks, but this information is often reviewed manually.

Task: Build a prototype that accepts a student's academic data and generates a clear support-oriented assessment. The system should identify potential academic concern areas and suggest practical next steps for the student or faculty member.

Mandatory requirements:
• Accept at least three academic inputs such as attendance, marks or assignment completion.
• Classify the student into a simple support level such as Normal, Needs Attention or High Attention.
• Display the factors contributing to the result.
• Provide at least one actionable recommendation.

Optional enhancements (not mandatory):
• Progress chart or dashboard
• Personalized study recommendations
• Natural-language explanation using an AI tool
• Multiple-student view` },

  { id: 'sustain', title: 'Smart Waste Reporting & Action System', color: '#10B981', label: 'Environment', desc: `A campus receives frequent reports about overflowing bins, improper waste segregation and delayed cleanup. Staff need a simple way to prioritize reported issues and identify areas requiring immediate attention.

Task: Build a prototype that allows a user to report a waste-related issue and helps the responsible staff prioritize and manage the issue.

Mandatory requirements:
• Capture a waste report with location and issue type.
• Assign a priority or severity level based on the report.
• Display reported issues in a clear list or dashboard.
• Provide an action or status such as Reported, In Progress or Resolved.

Optional enhancements (not mandatory):
• Map-based view
• Image upload/classification
• Analytics or trend view
• Automatic priority recommendation` },

  { id: 'agtech', title: 'Smart Irrigation Decision Assistant', color: '#F59E0B', label: 'Agriculture', desc: `A small-scale farmer wants to avoid both over-irrigation and under-irrigation. The farmer can provide basic information such as crop type, soil moisture, recent rainfall and temperature conditions.

Task: Build a prototype that uses the available inputs to recommend an irrigation action for the current situation.

Mandatory requirements:
• Accept relevant farm and environmental inputs.
• Provide a recommendation such as Irrigate Now, Delay Irrigation or Monitor.
• Explain at least two factors influencing the recommendation.
• Present the result in a simple farmer-friendly interface.

Optional enhancements (not mandatory):
• Weather API integration
• Historical irrigation log
• Rule/AI-based explanation
• Tamil or multilingual interface` },

  { id: 'urban', title: 'Public Transport Delay & Route Assistant', color: '#3B82F6', label: 'Transport', desc: `Students and commuters often waste time because they do not know which available public transport option is most suitable when routes are delayed or crowded. The goal is to give users a quick alternative based on available service information.

Task: Build a prototype that recommends a suitable transport option using a small provided or self-created sample dataset of routes, travel time, delays and availability.

Mandatory requirements:
• Accept origin and destination or a simplified route selection.
• Show at least two possible travel options from sample data.
• Consider at least one factor such as delay, travel time or availability.
• Present a recommended option with a clear reason.

Optional enhancements (not mandatory):
• Live map
• Real-time API integration
• Accessibility preferences
• Multi-modal route suggestion` },

  { id: 'health', title: 'Patient Care Navigation Assistant', color: '#8B5CF6', label: 'Health Care', desc: `A healthcare facility wants to reduce confusion at the point of entry. Patients may not know whether they should seek emergency attention, contact a general doctor, or use a routine appointment service.

Task: Build a prototype that helps a user navigate to an appropriate level of care using a small set of non-diagnostic symptoms and urgency indicators. The prototype must clearly state that it is not a medical diagnosis system.

Mandatory requirements:
• Collect basic symptom/urgency inputs.
• Classify the case into a simple navigation category such as Emergency, Urgent Care or Routine Consultation.
• Display the reason or indicators behind the category.
• Provide an appropriate next-step recommendation and safety notice.

Optional enhancements (not mandatory):
• Emergency contact option
• Appointment request flow
• Multilingual/voice interface
• AI-based conversational intake` }
];

let state = {
  phase: 'STANDBY', // STANDBY, LOBBY, REVEALED, LIVE, PAUSED, ENDED
  durationMs: 90 * 60 * 1000,
  endsAt: null,
  remainingMs: 90 * 60 * 1000,
  seats: {},
  scenarios: defaultScenarios
};

// Initialize seats 1 to 60
for (let i = 1; i <= 60; i++) {
  const id = `C-${String(i).padStart(2, '0')}`;
  state.seats[id] = { id, status: 'CLOSED', name: '', themeId: null, lockedInAt: null, lateMinutes: 0 };
}

// Load from disk if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    state = { ...state, ...loaded };
  } catch (e) {
    console.error('Failed to parse data.json, using defaults.');
  }
}

function saveState() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

function logEvent(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

// Map of seatId -> Set(socket.id) to track online status
const onlineSeats = new Map();
const adminSockets = new Set();

function getOnlineCount() {
  let count = 0;
  for (const [seatId, sockets] of onlineSeats.entries()) {
    if (sockets.size > 0) count++;
  }
  return count;
}

function broadcastState() {
  io.emit('state_update', {
    state,
    onlineSeats: Array.from(onlineSeats.entries()).filter(([_, s]) => s.size > 0).map(([id]) => id),
    serverTime: Date.now()
  });
  saveState();
}

// --- Server API ---

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Socket Logic ---

io.on('connection', socket => {
  let currentSeat = null;

  // Emit initial state so React can render routes
  socket.emit('state_update', {
    state,
    onlineSeats: Array.from(onlineSeats.entries()).filter(([_, s]) => s.size > 0).map(([id]) => id),
    serverTime: Date.now()
  });

  socket.on('register_admin', (pin) => {
    // PIN check omitted for brevity in prototype, could verify against env here
    adminSockets.add(socket.id);
    socket.emit('state_update', {
      state,
      onlineSeats: Array.from(onlineSeats.entries()).filter(([_, s]) => s.size > 0).map(([id]) => id),
      serverTime: Date.now()
    });
  });

  // Clock sync ping
  socket.on('ping', (clientTime, callback) => {
    callback(clientTime, Date.now());
  });

  socket.on('join_seat', (seatId) => {
    if (currentSeat && onlineSeats.has(currentSeat)) {
      onlineSeats.get(currentSeat).delete(socket.id);
    }
    currentSeat = seatId;
    if (!onlineSeats.has(seatId)) onlineSeats.set(seatId, new Set());
    onlineSeats.get(seatId).add(socket.id);
    
    // Broadcast immediately so hub sees ONLINE
    broadcastState();
  });

  socket.on('leave_seat', (seatId) => {
    if (currentSeat === seatId) {
      if (onlineSeats.has(seatId)) {
        onlineSeats.get(seatId).delete(socket.id);
      }
      currentSeat = null;
      broadcastState();
    }
  });

  socket.on('lock_in', ({ seatId, name }) => {
    const seat = state.seats[seatId];
    if (!seat || seat.status !== 'AVAILABLE') {
      socket.emit('error', 'Seat is not available.');
      return;
    }
    
    // Trim and sanitize
    const cleanName = String(name).trim().slice(0, 40);

    // Free up any other seats this user might have claimed
    Object.values(state.seats).forEach(s => {
      if (s.name.toLowerCase() === cleanName.toLowerCase() && s.id !== seatId) {
        s.status = 'AVAILABLE';
        s.name = '';
        s.themeId = null;
        s.lockedInAt = null;
        s.lateMinutes = 0;
      }
    });

    seat.name = cleanName;
    seat.lockedInAt = Date.now();
    
    if (state.phase === 'STANDBY' || state.phase === 'LOBBY') {
      seat.status = 'LOCKED_IN';
      logEvent(`Seat ${seatId} locked in by ${cleanName}`);
    } else {
      // Late arrival!
      seat.status = 'ASSIGNED';
      const availableThemes = state.scenarios.map(s => s.id);
      seat.themeId = availableThemes[Math.floor(Math.random() * availableThemes.length)]; // Simple random for late
      
      const eventStart = state.endsAt ? (state.endsAt - state.durationMs) : Date.now();
      seat.lateMinutes = Math.floor((Date.now() - eventStart) / 60000);
      logEvent(`LATE ARRIVAL: Seat ${seatId} locked in by ${cleanName} (${seat.lateMinutes} mins late). Assigned ${seat.themeId}`);
    }
    broadcastState();
  });

  socket.on('release_seat', (seatId) => {
    const seat = state.seats[seatId];
    if (seat && (seat.status === 'LOCKED_IN' || seat.status === 'ASSIGNED')) {
      seat.status = 'AVAILABLE';
      seat.name = '';
      seat.themeId = null;
      seat.lockedInAt = null;
      seat.lateMinutes = 0;
      logEvent(`Seat ${seatId} explicitly released by participant`);
      broadcastState();
    }
  });

  // Admin Actions
  socket.on('admin_action', (action) => {
    if (!adminSockets.has(socket.id)) return;
    
    const { type, payload } = action;
    logEvent(`Admin action: ${type} ${JSON.stringify(payload||{})}`);

    if (type === 'TOGGLE_SEAT') {
      const seat = state.seats[payload.seatId];
      if (seat.status === 'CLOSED') {
        seat.status = 'AVAILABLE';
      } else {
        // If AVAILABLE, LOCKED_IN, or ASSIGNED, force close it
        seat.status = 'CLOSED';
        seat.name = '';
        seat.themeId = null;
        seat.lockedInAt = null;
        seat.lateMinutes = 0;
      }
    } 
    else if (type === 'OPEN_ALL') {
      Object.values(state.seats).forEach(s => { if(s.status === 'CLOSED') s.status = 'AVAILABLE'; });
    }
    else if (type === 'CLOSE_ALL') {
      Object.values(state.seats).forEach(s => { if(s.status === 'AVAILABLE') s.status = 'CLOSED'; });
    }
    else if (type === 'RELEASE_SEAT') {
      const seat = state.seats[payload.seatId];
      seat.status = 'AVAILABLE';
      seat.name = '';
      seat.themeId = null;
      seat.lockedInAt = null;
      seat.lateMinutes = 0;
    }
    else if (type === 'SET_PHASE_LOBBY') {
      state.phase = 'LOBBY';
    }
    else if (type === 'REVEAL') {
      state.phase = 'REVEALED';
      // Balanced distribution
      const lockedInSeats = Object.values(state.seats).filter(s => s.status === 'LOCKED_IN');
      const themes = state.scenarios.map(s => s.id);
      
      // Shuffle array helper
      const shuffle = arr => arr.sort(() => Math.random() - 0.5);
      
      let themePool = [];
      const times = Math.ceil(lockedInSeats.length / themes.length);
      for(let i=0; i<times; i++) themePool.push(...themes);
      themePool = shuffle(themePool);

      lockedInSeats.forEach((seat, idx) => {
        seat.status = 'ASSIGNED';
        seat.themeId = themePool[idx];
      });
    }
    else if (type === 'START_TIMER') {
      state.phase = 'LIVE';
      state.endsAt = Date.now() + state.remainingMs;
    }
    else if (type === 'PAUSE_TIMER') {
      if (state.phase === 'LIVE') {
        state.phase = 'PAUSED';
        state.remainingMs = Math.max(0, state.endsAt - Date.now());
        state.endsAt = null;
      }
    }
    else if (type === 'RESUME_TIMER') {
      if (state.phase === 'PAUSED') {
        state.phase = 'LIVE';
        state.endsAt = Date.now() + state.remainingMs;
      }
    }
    else if (type === 'ADD_TIME') {
      const ms = payload.minutes * 60 * 1000;
      if (state.phase === 'LIVE') {
        state.endsAt += ms;
      } else {
        state.remainingMs += ms;
      }
      state.durationMs += ms;
    }
    else if (type === 'RESET_EVENT') {
      state.phase = 'STANDBY';
      state.endsAt = null;
      state.remainingMs = state.durationMs = 90 * 60 * 1000;
      Object.values(state.seats).forEach(s => {
        s.status = 'CLOSED';
        s.name = '';
        s.themeId = null;
        s.lockedInAt = null;
        s.lateMinutes = 0;
      });
    }
    else if (type === 'BROADCAST_MSG') {
      io.emit('toast', payload.message);
    }
    else if (type === 'UPDATE_DURATION') {
      state.durationMs = payload.minutes * 60 * 1000;
      state.remainingMs = state.durationMs;
    }

    broadcastState();
  });

  socket.on('disconnect', () => {
    if (adminSockets.has(socket.id)) {
      adminSockets.delete(socket.id);
    }
    if (currentSeat && onlineSeats.has(currentSeat)) {
      onlineSeats.get(currentSeat).delete(socket.id);
      broadcastState();
    }
  });
});

// Periodic heartbeat to clean up and broadcast
setInterval(() => {
  if (state.phase === 'LIVE' && state.endsAt && Date.now() >= state.endsAt) {
    state.phase = 'ENDED';
    state.remainingMs = 0;
    state.endsAt = null;
    logEvent("TIME UP");
    broadcastState();
  }
}, 1000);

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  RAPID PROTOTYPE CHAMPIONSHIP SERVER`);
  console.log(`  ────────────────────────────`);
  console.log(`  Hub / Admin  : http://localhost:${PORT}/hub`);
  console.log(`  Participants : http://${ip}:${PORT}/seat`);
  console.log(`  ────────────────────────────\n`);
});
