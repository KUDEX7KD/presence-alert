const express = require("express");
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://kudex7kd.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

if (!apiId || !apiHash) {
  console.log("Telegram API credentials are missing.");
}

const stringSession = new StringSession(
  process.env.TELEGRAM_SESSION || ""
);

const client = new TelegramClient(
  stringSession,
  apiId,
  apiHash,
  {
    connectionRetries: 5
  }
);

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running"
  });
});

app.get("/api/status", async (req, res) => {
  if (!client.connected) {
    return res.json({
      online: false,
      connected: false,
      message: "Telegram account is not connected yet"
    });
  }

  res.json({
    online: false,
    connected: true,
    message: "Telegram connection is active"
  });
});

async function startTelegram() {
  try {
    if (!apiId || !apiHash) return;

    await client.connect();

    console.log("Telegram client connected.");
  } catch (error) {
    console.error("Telegram connection error:", error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startTelegram();
});
