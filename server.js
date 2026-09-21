const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://kudex7kd.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Presence Alert backend is running"
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    online: false,
    message: "Telegram presence connection is not configured yet"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
