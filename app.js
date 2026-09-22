const connect = document.getElementById('connect');
const panel = document.getElementById('panel');
const start = document.getElementById('start');
const stop = document.getElementById('stop');
const status = document.getElementById('status');
const last = document.getElementById('last');

const BACKEND_URL = 'https://presence-alert.onrender.com';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAiSPUpt0xsca4fXrdSPgjUZF6D322KMG8",
  authDomain: "presence-alert.firebaseapp.com",
  projectId: "presence-alert",
  storageBucket: "presence-alert.firebasestorage.app",
  messagingSenderId: "455704742798",
  appId: "1:455704742798:web:3a02222567464a9fedb2df",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

let timer = null;
let previous = null;

// Firebase notification setup
async function setupNotifications() {
  try {
    if (!('Notification' in window)) {
      console.log('Notifications are not supported.');
      return;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      console.log('Notification permission not granted.');
      return;
    }

    const registration =
      await navigator.serviceWorker.register(
        './firebase-messaging-sw.js'
      );

    console.log('Firebase service worker registered.');

    // Use the PUBLIC VAPID key generated in Firebase Console.
    const token = await messaging.getToken({
      vapidKey: 'BMo2kwk4kl-SCD99kSul0zxCVaM2ZMAzqeyOSLhp2_NR-rb4kDri8RSCLzW0AsGInjlGor34Xyb3XY4rTLmcetI',
      serviceWorkerRegistration: registration
    });

    console.log('FCM token:', token);

await fetch(`${BACKEND_URL}/api/push/register`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token: token
  })
});

console.log('FCM token registered with backend.');
  } catch (error) {
    console.error('Notification setup failed:', error);
  }
}

connect.onclick = async () => {
  panel.classList.remove('hidden');

  connect.textContent = 'Backend connected';
  connect.disabled = true;

  status.textContent = 'Ready';
  status.className = 'status';

  await setupNotifications();
};

start.onclick = async () => {
  clearInterval(timer);

  const checkStatus = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/status`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Backend error');
      }

      const data = await response.json();

      updatePresence(data);

    } catch (error) {
      status.textContent = 'Backend connection failed';
      status.className = 'status offline';

      last.textContent =
        'Could not connect to Presence Alert server.';
    }
  };

  status.textContent = 'Checking backend...';
  status.className = 'status';

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
      new Notification('Presence Alert', {
        body: 'The authorized Telegram contact is online.',
        icon: 'icon-192.png'
      });
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
    ? data.message +
      ' • Updated: ' +
      new Date().toLocaleString()
    : 'Updated: ' +
      new Date().toLocaleString();

  previous = availability;
}
