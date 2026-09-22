const connect = document.getElementById('connect');
const panel = document.getElementById('panel');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const status = document.getElementById('status');
const last = document.getElementById('last');

const BACKEND_URL = 'https://presence-alert.onrender.com';

let timer = null;
let previous = null;

connect.onclick = () => {
  panel.classList.remove('hidden');
  connect.textContent = 'Backend connected';
  connect.disabled = true;
  status.textContent = 'Ready';
};

start.onclick = async () => {
  const contact = document.getElementById('contact').value.trim();

  if (!contact) {
    alert('Enter the authorized contact.');
    return;
  }

  clearInterval(timer);

  const checkStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`);

      if (!response.ok) {
        throw new Error('Backend error');
      }

      const data = await response.json();

      updatePresence(data);

    } catch (error) {
      status.textContent = 'Backend connection failed';
      status.className = 'status offline';
      last.textContent = 'Could not connect to Presence Alert server.';
    }
  };

  status.textContent = 'Checking backend...';
  await checkStatus();

  timer = setInterval(checkStatus, 5000);
};

stop.onclick = () => {
  clearInterval(timer);
  timer = null;
  status.textContent = 'Monitoring stopped';
  status.className = 'status';
};

function updatePresence(data) {
  const availability = data.availability;

  if (availability === 'online') {
    status.textContent = '🟢 Online';
    status.className = 'status online';

    if (
      previous !== 'online' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('Telegram contact is online');
    }

  } else if (availability === 'recently') {
    status.textContent = '🟡 Recently active';
    status.className = 'status recently';

  } else if (availability === 'offline') {
    status.textContent = '⚪ Offline';
    status.className = 'status offline';

  } else {
    status.textContent = '⚫ Status unavailable';
    status.className = 'status unavailable';
  }

  last.textContent = data.message
    ? data.message + ' • Updated: ' + new Date().toLocaleString()
    : 'Updated: ' + new Date().toLocaleString();

  previous = availability;
      }
