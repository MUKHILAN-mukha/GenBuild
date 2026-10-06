# Rapid Prototype Championship – Hub Control System

A complete, offline-first mission control system for a 60-seat hacking competition.

## Getting Started

1. **Install Dependencies** (only needed once):
   ```bash
   npm install
   ```

2. **Start the System**:
   ```bash
   npm start
   ```

This spins up the Node.js Socket.IO server and serves the built React frontend on port `3000`.

## URLs & Access
When you run `npm start`, the console will print out your Hub PC's IP address (e.g. `192.168.1.55`).
- **Admin Hub**: `http://localhost:3000/hub` (or your IP)
- **Participant Seats**: `http://<YOUR_IP>:3000/seat?seat=C-XX`

### Generating Seat Links
Run the following script to generate a CSV file containing the exact URL and Chrome Kiosk launch command for all 60 seats:
```bash
npm run generate-urls
```
This outputs `seat_urls.csv` in the root folder, which looks like:
`chrome.exe --kiosk "http://192.168.1.55:3000/seat?seat=C-07"`

## Event Flow

1. **STANDBY**: Hub starts here. Click individual seats to open/close them, or use the bulk actions on the right.
2. **OPEN LOBBY**: Moves to LOBBY state. Participants sitting at `AVAILABLE` PCs can type their name and lock in.
3. **START REVEAL**: Triggers the cinematic scenario reveal on all screens simultaneously. Assignments are perfectly balanced across themes.
4. **START TIMER**: Begins the synced 90-minute countdown across all screens.
5. **LATE ARRIVALS**: If a participant locks in *after* the timer starts, they immediately receive a balanced scenario and see only the time remaining on the global clock.

## Features
- **Absolute Clock Sync**: Instead of relying on client-side JS timers that drift, the server dictates an absolute `endsAt` Unix timestamp. Clients ping the server to calculate their latency offset, guaranteeing sub-100ms sync across all 60 screens.
- **State Persistence**: The entire event state is saved to `data.json` in real-time. If the Node server crashes or a PC restarts, it instantly recovers the exact state upon reconnect.
- **Event Log**: Critical events (lock-ins, reveals, timer pauses) are appended to `event.log`.
