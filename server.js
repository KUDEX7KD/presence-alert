const express = require("express");
const { TelegramClient } = require("teleproto");
const { StringSession } = require("teleproto/sessions");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://kudex7kd.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION || "";

let client = null;
let telegramReady = false;

async function connectTelegram() {
  try {
    if (!apiId || !apiHash || !sessionString) {
      console.error("Telegram environment variables are missing.");
      return;
    }

    const session = new StringSession(sessionString);

    client = new TelegramClient(
      session,
      apiId,
      apiHash,
      {
        connectionRetries: 5
      }
    );

    await client.connect();

    const me = await client.getMe();

    telegramReady = true;

    console.log("Telegram connected.");
    console.log("Logged in as:", me.username || me.firstName || "User");
  } catch (error) {
    telegramReady = false;
    console.error("Telegram connection failed:", error.message);
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running"
  });
});

app.get("/api/status", async (req, res) => {
  try {
    if (!telegramReady || !client) {
      return res.json({
        connected: false,
        online: false,
        message: "Telegram account is not connected"
      });
    }

    const username = String(req.query.username || "").trim();

    if (!username) {
      return res.status(400).json({
        connected: true,
        online: false,
        message: "Username is required"
      });
    }

    const user = await client.getEntity(username);

    const status = user.status;
    const statusName =
      status?.className ||
      status?.constructor?.name ||
      "";

    const online =
      statusName === "UserStatusOnline" ||
      statusName === "userStatusOnline";

    res.json({
      connected: true,
      username: username,
      online: online,
      status: statusName,
      message: online
        ? "User is online"
        : "User is offline or status is unavailable"
    });

  } catch (error) {
    console.error("Status check error:", error.message);

    res.status(500).json({
      connected: telegramReady,
      online: false,
      message: "Could not check Telegram status"
    });
  }
});

connectTelegram().finally(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
