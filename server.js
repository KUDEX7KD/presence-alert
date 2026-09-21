const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
