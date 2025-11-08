// Firefighter Dashboard Script
// Replace firebaseConfig with your own project values
const firebaseConfig = {
  apiKey: "AIzaSyCIvEEVjs2EomkZLm5DeZMnBA_S1hrEAgg",
  authDomain: "firefighter-robot-1f66f.firebaseapp.com",
  databaseURL: "https://firefighter-robot-1f66f-default-rtdb.firebaseio.com",
  projectId: "firefighter-robot-1f66f",
  storageBucket: "firefighter-robot-1f66f.firebasestorage.app",
  messagingSenderId: "810431873689",
  appId: "1:810431873689:web:44eeea2958efeecf6c6e08"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const overallStatus = document.getElementById('overallStatus');
const opMode = document.getElementById('opMode');
const fireDetected = document.getElementById('fireDetected');
const pumpActive = document.getElementById('pumpActive');
const batteryLevel = document.getElementById('batteryLevel');
const lastUpdate = document.getElementById('lastUpdate');
const cloudStatus = document.getElementById('cloudStatus');

const notifList = document.getElementById('notifList');
const clearNotifsBtn = document.getElementById('clearNotifs');

// Buttons
document.getElementById('autoBtn').addEventListener('click', () => writeRobot('mode', 'auto'));
document.getElementById('manualBtn').addEventListener('click', () => writeRobot('mode', 'manual'));
document.getElementById('pumpOn').addEventListener('click', () => writeRobot('pump', true));
document.getElementById('pumpOff').addEventListener('click', () => writeRobot('pump', false));
document.getElementById('forward').addEventListener('click', () => writeRobot('command', 'forward'));
document.getElementById('left').addEventListener('click', () => writeRobot('command', 'left'));
document.getElementById('right').addEventListener('click', () => writeRobot('command', 'right'));
document.getElementById('back').addEventListener('click', () => writeRobot('command', 'backward'));
document.getElementById('stop').addEventListener('click', () => writeRobot('command', 'stop'));
clearNotifsBtn.addEventListener('click', clearNotifications);

function writeRobot(field, value) {
  db.ref('/robot/' + field).set(value);
  pushNotification('Command: ' + field + ' -> ' + value);
}

// Listen robot object
db.ref('/robot').on('value', snap => {
  const r = snap.val() || {};
  overallStatus.textContent = (r.status === 'online') ? 'ONLINE' : 'OFFLINE';
  overallStatus.className = 'pill ' + ((r.status === 'online') ? 'online' : 'offline');
  opMode.textContent = r.mode || '-';
  fireDetected.textContent = (r.fire_detected) ? 'YES' : 'NO';
  pumpActive.textContent = (r.pump) ? 'YES' : 'NO';
  batteryLevel.textContent = (r.battery !== undefined) ? r.battery + ' V' : '-';
  lastUpdate.textContent = r.last_update ? new Date(r.last_update).toLocaleString() : '-';

  // cloud status small panel
  if (r.status === 'online') {
    cloudStatus.textContent = '🟢 Connected to cloud';
  } else {
    cloudStatus.textContent = '🔴 Offline';
  }

  // fire alert quick push
  if (r.fire_detected) pushNotification('🔥 FIRE DETECTED!');
});

// Notifications list
db.ref('/notifications').on('value', snap => {
  const data = snap.val() || {};
  notifList.innerHTML = '';
  const keys = Object.keys(data || {});
  if (keys.length === 0) {
    const e = document.createElement('div'); e.className = 'notif empty'; e.textContent = 'No notifications';
    notifList.appendChild(e); return;
  }
  // show newest first
  keys.reverse().forEach(k => {
    const item = data[k];
    const d = document.createElement('div'); d.className = 'notif';
    const time = item.ts ? new Date(item.ts).toLocaleTimeString() : '';
    d.innerHTML = '<div style="font-weight:700">' + (item.text || '') + '</div><div style="font-size:12px;color:#6b7280;margin-top:6px">' + time + '</div>';
    notifList.appendChild(d);
  });
});

function pushNotification(text) {
  const nref = db.ref('/notifications').push();
  nref.set({ text, ts: Date.now() });
}

// clear
function clearNotifications() {
  db.ref('/notifications').remove();
  notifList.innerHTML = '<div class="notif empty">No notifications</div>';
  pushNotification('Notifications cleared');
}

/* Radar drawing logic */
const canvas = document.getElementById('radarCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const centerX = W / 2;
const centerY = H;
const R = Math.min(W / 2 - 40, H - 40); // radius

function drawBase() {
  ctx.clearRect(0, 0, W, H);
  // semicircle rings
  ctx.strokeStyle = 'rgba(11,19,32,0.08)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, R * (i / 4), Math.PI, 0);
    ctx.stroke();
  }
  // center line
  ctx.beginPath();
  ctx.moveTo(20, centerY);
  ctx.lineTo(W - 20, centerY);
  ctx.stroke();
}

function drawPoints(scanData) {
  drawBase();
  if (!scanData) return;
  ctx.fillStyle = '#06b6d4';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#06b6d4';
  const maxDist = 150; // cm scaled
  Object.keys(scanData).forEach(a => {
    const ang = parseFloat(a);
    const dist = Math.min(parseFloat(scanData[a]) || 0, maxDist);
    const rad = ang * Math.PI / 180;
    const r = (dist / maxDist) * R;
    const x = centerX + r * Math.cos(rad);
    const y = centerY - r * Math.sin(rad);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    // small label
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px Inter';
    ctx.fillText(Math.round(dist) + 'cm', x + 8, y - 6);
    ctx.fillStyle = '#06b6d4';
  });
}

// listen for scan map
db.ref('/scan').on('value', snap => {
  const data = snap.val();
  drawPoints(data);
});

// initial draw
drawBase();

// mark dashboard connected (local)
pushNotification('Dashboard started');
