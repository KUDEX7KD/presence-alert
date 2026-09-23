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

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

/* ---------------- Firebase Admin ---------------- */

let firebaseReady = false;

try {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  firebaseReady = true;
  console.log("Firebase Admin connected successfully.");
} catch (error) {
  console.error(
    "Firebase Admin setup failed:",
    error.message
  );
}

/* ---------------- Telegram ---------------- */

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION || "";
const targetPhone = process.env.TARGET_PHONE || "";

let client = null;
let telegramReady = false;

/* ---------------- Push token ---------------- */

let pushToken = "";
let monitoringInitialized = false;
let previousAvailability = null;

/* ---------------- Telegram connection ---------------- */

async function connectTelegram() {
  try {
    if (!apiId || !apiHash || !sessionString) {
      console.error(
        "Telegram environment variables are missing."
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

    console.log(
      "Telegram connected successfully."
    );
  } catch (error) {
    telegramReady = false;

    console.error(
      "Telegram connection failed:",
      error.message
    );
  }
}

/* ---------------- Get Telegram availability ---------------- */

async function getAvailability() {
  if (!telegramReady || !client || !targetPhone) {
    return "unavailable";
  }

  const user = await client.getEntity(targetPhone);
  const status = user?.status;

  const statusName =
    status?.className ||
    status?.constructor?.name ||
    "";

  if (
    statusName === "UserStatusOnline" ||
    statusName === "userStatusOnline"
  ) {
    return "online";
  }

  if (
    statusName === "UserStatusOffline" ||
    statusName === "userStatusOffline"
  ) {
    return "offline";
  }

  if (
    statusName === "UserStatusRecently" ||
    statusName === "userStatusRecently"
  ) {
    return "recently";
  }

  return "unavailable";
}

/* ---------------- Send push notification ---------------- */

async function sendOnlineNotification() {
  if (!firebaseReady || !pushToken) {
    console.log(
      "Push notification skipped: Firebase or token unavailable."
    );
    return;
  }

  try {
    await admin.messaging().send({
      token: pushToken,
      notification: {
        title: "Presence Alert",
        body: "The authorized Telegram contact is online."
      }
    });

    console.log(
      "Online notification sent successfully."
    );
  } catch (error) {
    console.error(
      "FCM notification failed:",
      error.message
    );
  }
}

/* ---------------- Background monitoring ---------------- */

async function monitorPresence() {
  try {
    const availability = await getAvailability();

    console.log(
      "Presence:",
      availability
    );

    // First check only initializes the previous state.
    // It will NOT send a notification immediately.
    if (!monitoringInitialized) {
      previousAvailability = availability;
      monitoringInitialized = true;
      return;
    }

    // Notification only when status changes TO online.
    if (
      availability === "online" &&
      previousAvailability !== "online"
    ) {
      await sendOnlineNotification();
    }

    previousAvailability = availability;

  } catch (error) {
    console.error(
      "Background monitoring error:",
      error.message
    );
  }
}

/* ---------------- Home ---------------- */

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running",
    firebase: firebaseReady,
    telegram: telegramReady
  });
});

/* ---------------- Telegram status API ---------------- */

app.get("/api/status", async (req, res) => {
  try {
    if (!telegramReady || !client) {
      return res.json({
        connected: false,
        online: false,
        availability: "unavailable",
        message:
          "Telegram account is not connected"
      });
    }

    if (!targetPhone) {
      return res.status(400).json({
        connected: true,
        online: false,
        availability: "unavailable",
        message:
          "Target contact is not configured"
      });
    }

    const user = await client.getEntity(
      targetPhone
    );

    const status = user?.status;

    const statusName =
      status?.className ||
      status?.constructor?.name ||
      "";

    const online =
      statusName === "UserStatusOnline" ||
      statusName === "userStatusOnline";

    let availability = "unavailable";

    if (online) {
      availability = "online";
    } else if (
      statusName === "UserStatusOffline" ||
      statusName === "userStatusOffline"
    ) {
      availability = "offline";
    } else if (
      statusName === "UserStatusRecently" ||
      statusName === "userStatusRecently"
    ) {
      availability = "recently";
    }

    res.json({
      connected: true,
      online,
      status: statusName,
      availability,
      message:
        availability === "online"
          ? "Contact is online"
          : availability === "offline"
          ? "Contact is offline"
          : availability === "recently"
          ? "Contact was recently active"
          : "Contact status is unavailable"
    });

  } catch (error) {
    console.error(
      "Status check error:",
      error.message
    );

    res.status(500).json({
      connected: telegramReady,
      online: false,
      availability: "unavailable",
      message:
        "Could not find or check the contact"
    });
  }
});
/* ---------------- Temporary bot status test ---------------- */

app.get("/api/test-bot-status", async (req, res) => {
  try {
    if (!telegramReady || !client) {
      return res.json({
        connected: false,
        message: "Telegram account is not connected"
      });
    }

    const user = await client.getEntity("@dogs3xxbots");
    const status = user?.status;

    const statusName =
      status?.className ||
      status?.constructor?.name ||
      "";

    res.json({
      username: "@dogs3xxbots",
      status: statusName
    });

  } catch (error) {
    console.error("Bot status test error:", error.message);

    res.status(500).json({
      username: "@dogs3xxbots",
      error: error.message
    });
  }
});
/* ---------------- Register FCM device ---------------- */

app.post("/api/push/register", (req, res) => {
  try {
    const token = String(
      req.body?.token || ""
    ).trim();

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: "FCM token is missing"
      });
    }

    pushToken = token;

    console.log(
      "FCM device registered successfully."
    );

    res.json({
      ok: true,
      message: "Push device registered"
    });

  } catch (error) {
    console.error(
      "Push registration error:",
      error.message
    );

    res.status(500).json({
      ok: false,
      message: "Could not register push device"
    });
  }
});

/* ---------------- Start server ---------------- */

connectTelegram().finally(() => {

  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );

    // Check Telegram presence every 5 seconds.
    setInterval(
      monitorPresence,
      5000
    );
  });

});
