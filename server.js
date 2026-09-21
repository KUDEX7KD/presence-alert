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

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;

let client = null;
let loginState = {
  phone: null,
  codeResolver: null,
  passwordResolver: null,
  error: null
};

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    connected: !!client?.connected,
    online: false,
    message: client?.connected
      ? "Telegram account connected"
      : "Telegram account is not connected"
  });
});

app.post("/api/auth/start", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required"
      });
    }

    if (!apiId || !apiHash) {
      return res.status(500).json({
        success: false,
        message: "Telegram API credentials are missing"
      });
    }

    if (client?.connected) {
      return res.json({
        success: true,
        message: "Telegram account is already connected"
      });
    }

    client = new TelegramClient(
      new StringSession(""),
      apiId,
      apiHash,
      {
        connectionRetries: 5
      }
    );

    loginState.phone = phone;
    loginState.error = null;

    client.start({
      phoneNumber: async () => phone,

      phoneCode: async () => {
        return await new Promise((resolve, reject) => {
          loginState.codeResolver = resolve;
          loginState.error = reject;
        });
      },

      password: async () => {
        return await new Promise((resolve, reject) => {
          loginState.passwordResolver = resolve;
          loginState.error = reject;
        });
      },

      onError: (err) => {
        console.error("Telegram login error:", err.message);
      }
    }).then(() => {
      console.log("Telegram account connected.");
    }).catch((err) => {
      console.error("Telegram login failed:", err.message);
      loginState.error = err;
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    res.json({
      success: true,
      message: "Telegram login started. Enter the OTP."
    });

  } catch (error) {
    console.error(error.message);

    res.status(500).json({
      success: false,
      message: "Could not start Telegram login"
    });
  }
});

app.post("/api/auth/code", (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "OTP is required"
    });
  }

  if (!loginState.codeResolver) {
    return res.status(400).json({
      success: false,
      message: "No OTP is currently requested"
    });
  }

  const resolve = loginState.codeResolver;
  loginState.codeResolver = null;

  resolve(code);

  res.json({
    success: true,
    message: "OTP submitted"
  });
});

app.post("/api/auth/password", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "2-Step Verification password is required"
    });
  }

  if (!loginState.passwordResolver) {
    return res.status(400).json({
      success: false,
      message: "2-Step Verification password is not currently requested"
    });
  }

  const resolve = loginState.passwordResolver;
  loginState.passwordResolver = null;

  resolve(password);

  res.json({
    success: true,
    message: "2-Step Verification password submitted"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
