
const express = require("express");
const { TelegramClient } = require("teleproto");
const { StringSession } = require("teleproto/sessions");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://kudex7kd.github.io"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* Firebase Admin */

let firebaseReady = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    firebaseReady = true;
    console.log("Firebase Admin connected.");
  } else {
    console.log("Firebase credentials not configured.");
  }
} catch (error) {
  console.error("Firebase setup failed:", error.message);
}

/* Telegram configuration */

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION || "";
const targetPhone = process.env.TARGET_PHONE || "";

let client = null;
let telegramReady = false;

/* Push notification state */

let pushToken = "";
let monitoringInitialized = false;
let previousAvailability = null;

/* Normalize Telegram status */

function getStatusName(status) {
  if (!status) return "";

  return (
    status.className ||
    status.constructor?.name ||
    ""
  );
}

/* Map Telegram status to readable availability */

function mapAvailability(statusName) {
  switch (statusName) {
    case "UserStatusOnline":
    case "userStatusOnline":
      return "online";

    case "UserStatusOffline":
    case "userStatusOffline":
      return "offline";

    case "UserStatusRecently":
    case "userStatusRecently":
      return "recently";

    case "UserStatusLastWeek":
    case "userStatusLastWeek":
      return "within_a_week";

    case "UserStatusLastMonth":
    case "userStatusLastMonth":
      return "within_a_month";

    default:
      return "unavailable";
  }
}

/* Human-readable message */

function getStatusMessage(availability) {
  switch (availability) {
    case "online":
      return "Contact is online";

    case "offline":
      return "Contact is offline";

    case "recently":
      return "Last seen recently";

    case "within_a_week":
      return "Last seen within a week";

    case "within_a_month":
      return "Last seen within a month";

    default:
      return "Contact status is unavailable";
  }
}

/* Connect Telegram */

async function connectTelegram() {
  try {
    if (!apiId || !apiHash || !sessionString) {
      console.error(
        "Missing TELEGRAM_API_ID, TELEGRAM_API_HASH, or TELEGRAM_SESSION."
      );
      return;
    }

    client = new TelegramClient(
      new StringSession(sessionString),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    );

    await client.connect();
    await client.getMe();

    telegramReady = true;
    console.log("Telegram connected successfully.");
  } catch (error) {
    telegramReady = false;
    console.error("Telegram connection failed:", error.message);
  }
}

/* Get contact status */

async function getAvailability() {
  if (!telegramReady || !client || !targetPhone) {
    return "unavailable";
  }

  const user = await client.getEntity(targetPhone);
  const statusName = getStatusName(user?.status);

  return mapAvailability(statusName);
}

/* Send online notification */

async function sendOnlineNotification() {
  if (!firebaseReady || !pushToken) {
    console.log("Notification skipped: Firebase or token unavailable.");
    return;
  }

  try {
    await admin.messaging().send({
      token: pushToken,
      notification: {
        title: "Presence Alert",
        body: "The configured Telegram contact is online."
      }
    });

    console.log("Online notification sent.");
  } catch (error) {
    console.error("Notification failed:", error.message);
  }
}

/* Background monitoring */

async function monitorPresence() {
  try {
    const availability = await getAvailability();

    console.log("Presence:", availability);

    if (!monitoringInitialized) {
      previousAvailability = availability;
      monitoringInitialized = true;
      return;
    }

    if (
      availability === "online" &&
      previousAvailability !== "online"
    ) {
      await sendOnlineNotification();
    }

    previousAvailability = availability;
  } catch (error) {
    console.error("Monitoring error:", error.message);
  }
}

/* Home endpoint */

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running",
    firebase: firebaseReady,
    telegram: telegramReady
  });
});

/* Telegram status endpoint */

app.get("/api/status", async (req, res) => {
  try {
    if (!telegramReady || !client) {
      return res.json({
        connected: false,
        online: false,
        availability: "unavailable",
        message: "Telegram account is not connected"
      });
    }

    if (!targetPhone) {
      return res.status(400).json({
        connected: true,
        online: false,
        availability: "unavailable",
        message: "Target contact is not configured"
      });
    }

    const user = await client.getEntity(targetPhone);
    const statusName = getStatusName(user?.status);
    const availability = mapAvailability(statusName);

    res.json({
      connected: true,
      online: availability === "online",
      status: statusName || "unknown",
      availability,
      message: getStatusMessage(availability)
    });
  } catch (error) {
    console.error("Status check failed:", error.message);

    res.status(500).json({
      connected: telegramReady,
      online: false,
      availability: "unavailable",
      message: "Could not retrieve contact status"
    });
  }
});

/* Register push notification device */

app.post("/api/push/register", (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "FCM token is missing"
      });
    }

    pushToken = token;

    console.log("Push device registered.");

    res.json({
      ok: true,
      message: "Push device registered"
    });
  } catch (error) {
    console.error("Push registration failed:", error.message);

    res.status(500).json({
      ok: false,
      message: "Could not register push device"
    });
  }
});

/* Start server */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  connectTelegram().then(() => {
    monitorPresence();

    setInterval(monitorPresence, 5000);
  });
});
