importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyAiSPUpt0xsca4fXrdSPgjUZF6D322KMG8",
  authDomain:"presence-alert.firebaseapp.com",
  projectId: "presence-alert",
  storageBucket: "presence-alert.firebasestorage.app",
  messagingSenderId: "455704742798",
  appId: "1:455704742798:web:3a02222567464a9fedb2df",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Presence Alert";

  const options = {
    body: payload.notification?.body ||
      "The authorized Telegram contact is online.",
    icon: "/presence-alert/icon-192.png",
    badge: "/presence-alert/icon-192.png"
  };

  self.registration.showNotification(title, options);
});
