const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug: Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

console.log("🔍 Starting server...");
console.log("📁 Current directory:", __dirname);
console.log("🌐 Port:", PORT);
console.log("🔔 Discord webhook configured:", !!process.env.DISCORD_WEBHOOK);

// Configuration
const NORMAL_PASSWORD = "password123";
const DURESS_PIN = "911";
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

// Mock wallet data
const realWallet = {
  address: "zs1w8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8zz8",
  balance: 25.75,
  transactions: [
    { date: "2024-01-15", amount: 10.5, type: "received", from: "zs1abc..." },
    { date: "2024-01-10", amount: -2.25, type: "sent", to: "zs1def..." },
    { date: "2024-01-05", amount: 15.0, type: "received", from: "zs1ghi..." },
    { date: "2024-01-01", amount: 2.5, type: "received", from: "zs1jkl..." },
  ],
};

const decoyWallet = {
  address: "zs1d3c0yd3c0yd3c0yd3c0yd3c0yd3c0yd3c0yd3c0yd3c0yd3c0yd3c0y",
  balance: 0.5,
  transactions: [
    { date: "2023-12-20", amount: 0.5, type: "received", from: "zs1xyz..." },
    { date: "2023-12-15", amount: -0.1, type: "sent", to: "zs1uvw..." },
  ],
};

// Track duress attempts per session
const duressAttempts = {};

// Track statistics
let stats = {
  totalLogins: 0,
  normalLogins: 0,
  duressAttempts: 0,
  alertsSent: 0,
  recentActivity: []
};

function logActivity(type, level = null) {
  stats.totalLogins++;
  if (type === 'normal') {
    stats.normalLogins++;
  } else if (type === 'duress') {
    stats.duressAttempts++;
  }
  
  stats.recentActivity.unshift({
    type,
    level,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 50 activities
  if (stats.recentActivity.length > 50) {
    stats.recentActivity = stats.recentActivity.slice(0, 50);
  }
  
  console.log(`📊 Activity logged: ${type} (level: ${level})`);
}

// Discord alert function
async function sendDiscordAlert(attemptCount, alertLevel) {
  if (!DISCORD_WEBHOOK) {
    console.log("⚠️ Discord webhook not configured - skipping alert");
    return;
  }

  const message = {
    embeds: [
      {
        title: "🚨 DURESS ALERT - IMMEDIATE ACTION REQUIRED",
        description: `Emergency duress code entered ${attemptCount} times`,
        color: 16711680,
        fields: [
          {
            name: "Alert Level",
            value: alertLevel.toUpperCase(),
            inline: true,
          },
          {
            name: "Attempt Count",
            value: attemptCount.toString(),
            inline: true,
          },
          {
            name: "Timestamp",
            value: new Date().toISOString(),
            inline: false,
          },
        ],
      },
    ],
  };

  try {
    await axios.post(DISCORD_WEBHOOK, message);
    console.log("✅ Discord alert sent successfully");
  } catch (error) {
    console.error("❌ Failed to send Discord alert:", error.message);
  }
}

// Root endpoint
app.get("/", (req, res) => {
  console.log("📍 Root endpoint hit");
  res.sendFile(__dirname + "/public/index.html");
});

// Login endpoint
app.post("/api/login", (req, res) => {
  console.log("🔐 Login attempt received");
  console.log("📦 Request body:", req.body);
  
  const { password } = req.body;
  const sessionId = req.headers["x-session-id"] || "default";

  if (!password) {
    console.log("❌ No password provided");
    return res.status(400).json({
      success: false,
      message: "Password required"
    });
  }

  // Initialize duress counter for this session
  if (!duressAttempts[sessionId]) {
    duressAttempts[sessionId] = 0;
  }

  // Normal password
  if (password === NORMAL_PASSWORD) {
    console.log("✅ Normal login successful");
    duressAttempts[sessionId] = 0;
    logActivity('normal');
    return res.json({
      success: true,
      wallet: realWallet,
      isDuress: false,
      message: "✅ Wallet unlocked successfully",
    });
  }

  // Duress PIN
  if (password === DURESS_PIN) {
    duressAttempts[sessionId]++;
    const attemptCount = duressAttempts[sessionId];
    console.log(`🚨 Duress login - Attempt #${attemptCount}`);
    
    let alertLevel = "yellow";
    let message = "🟡 Level 1: Decoy wallet shown (silent)";

    if (attemptCount === 2) {
      alertLevel = "orange";
      message = "🟠 Level 2: Alert queued (2 hour delay)";
    } else if (attemptCount >= 3) {
      alertLevel = "red";
      message = "🔴 Level 3: IMMEDIATE ALERT SENT";
      stats.alertsSent++;
      sendDiscordAlert(attemptCount, alertLevel);
    }

    logActivity('duress', attemptCount);

    return res.json({
      success: true,
      wallet: decoyWallet,
      isDuress: true,
      attemptCount,
      alertLevel,
      message,
    });
  }

  // Invalid credentials
  console.log("❌ Invalid credentials");
  return res.status(401).json({
    success: false,
    message: "❌ Invalid credentials",
  });
});

// Stats endpoint
app.get("/api/stats", (req, res) => {
  console.log("📊 Stats requested");
  res.json(stats);
});

// Health check
app.get("/api/health", (req, res) => {
  console.log("❤️ Health check");
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    port: PORT,
    discord: !!DISCORD_WEBHOOK
  });
});

// 404 handler
app.use((req, res) => {
  console.log("❌ 404 Not Found:", req.path);
  res.status(404).json({ error: "Not found", path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`🔒 Zcash Duress Wallet running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
});
