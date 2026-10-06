const os = require('os');
const fs = require('fs');

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

const ip = getLocalIP();
const port = 3000;

let csv = "Seat,URL,Kiosk Command\n";
for (let i = 1; i <= 60; i++) {
  const id = `C-${String(i).padStart(2, '0')}`;
  const url = `http://${ip}:${port}/seat?seat=${id}`;
  const cmd = `chrome.exe --kiosk "${url}"`;
  csv += `${id},${url},${cmd}\n`;
}

fs.writeFileSync('seat_urls.csv', csv);
console.log(`Generated seat_urls.csv for IP ${ip}`);
