const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;
const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

console.log("🔍 Starting server...");
console.log("📁 Current directory:", __dirname);
console.log("🌐 Port:", PORT);
console.log("🔔 Discord webhook configured:", !!DISCORD_WEBHOOK);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Statistics
let stats = {
  totalLogins: 0,
  normalLogins: 0,
  duressAttempts: 0,
  alertsSent: 0,
  recentActivity: []
};

const duressAttempts = {};

function logActivity(type, level = null) {
  stats.totalLogins++;
  if (type === "normal") {
    stats.normalLogins++;
  } else if (type === "duress") {
    stats.duressAttempts++;
  }
  stats.recentActivity.push({
    timestamp: new Date().toISOString(),
    type,
    level
  });
  if (stats.recentActivity.length > 50) {
    stats.recentActivity.shift();
  }
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Get stats
app.get("/api/stats", (req, res) => {
  res.json(stats);
});

// Load demo stats
app.post("/api/stats/demo", (req, res) => {
  stats = {
    totalLogins: 15,
    normalLogins: 10,
    duressAttempts: 5,
    alertsSent: 2,
    recentActivity: [
      { timestamp: new Date(Date.now() - 600000).toISOString(), type: "normal", level: null },
      { timestamp: new Date(Date.now() - 480000).toISOString(), type: "duress", level: 1 },
      { timestamp: new Date(Date.now() - 360000).toISOString(), type: "normal", level: null },
      { timestamp: new Date(Date.now() - 240000).toISOString(), type: "duress", level: 2 },
      { timestamp: new Date(Date.now() - 120000).toISOString(), type: "duress", level: 3 }
    ]
  };
  res.json({ message: "Demo stats loaded", stats });
});

// Main login endpoint
app.post("/api/login", (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Password required" });
  }

  console.log(`🔐 Login attempt with: ${password.substring(0, 2)}***`);

  const normalPassword = "password123";
  const duressPin = "911";

  // Count duress attempts
  const ip = req.ip || "unknown";
  duressAttempts[ip] = (duressAttempts[ip] || 0) + (password === duressPin ? 1 : 0);
  const attemptCount = duressAttempts[ip] || 0;

  // Normal login
  if (password === normalPassword) {
    logActivity("normal");
    console.log("✅ Normal login successful");
    return res.json({
      success: true,
      type: "normal",
      wallet: {
        address: "t1U7mGREEqnRG6e3vwfkZWKDxZfVYtxJ8Kx",
        balance: 25.75,
        usdValue: 1290.39,
        transactions: [
          { id: "tx1", amount: 10.5, date: "2025-11-28", status: "confirmed" },
          { id: "tx2", amount: 5.25, date: "2025-11-27", status: "confirmed" }
        ]
      }
    });
  }

  // Duress PIN
  if (password === duressPin) {
    logActivity("duress", attemptCount);
    console.log(`⚠️ Duress attempt #${attemptCount}`);

    let response = {
      success: true,
      type: "duress",
      level: attemptCount,
      wallet: {
        address: "t1DecoyWalletAddressForEmergency1234567890",
        balance: 0.5,
        usdValue: 25.06,
        transactions: []
      }
    };

    // Level 2: Queue alert for 2 hours
    if (attemptCount === 2) {
      response.alertStatus = "queued_in_2_hours";
      console.log("📧 Alert queued for 2 hours");
    }

    // Level 3: Send alert immediately
    if (attemptCount >= 3) {
      stats.alertsSent++;
      sendDiscordAlert(attemptCount);
      response.alertStatus = "alert_sent_immediately";
    }

    return res.json(response);
  }

  // Invalid password
  console.log("❌ Invalid password");
  return res.status(401).json({ error: "Invalid credentials" });
});

// Send Discord alert
async function sendDiscordAlert(level) {
  if (!DISCORD_WEBHOOK) {
    console.log("⚠️ Discord webhook not configured, skipping alert");
    return;
  }

  try {
    const levelText = level === 1 ? "Silent" : level === 2 ? "Delayed (2h)" : "IMMEDIATE";
    const embed = {
      title: "🚨 ZCASH DURESS ALERT",
      description: `Duress mode triggered - Level ${level} (${levelText})`,
      color: level === 3 ? 0xff0000 : 0xffaa00,
      fields: [
        { name: "Alert Level", value: `${level}`, inline: true },
        { name: "Type", value: levelText, inline: true },
        { name: "Timestamp", value: new Date().toISOString(), inline: false }
      ]
    };

    await axios.post(DISCORD_WEBHOOK, {
      content: `🚨 **ZCASH DURESS ALERT - LEVEL ${level}**`,
      embeds: [embed]
    });

    console.log(`✅ Discord alert sent - Level ${level}`);
  } catch (error) {
    console.error("❌ Failed to send Discord alert:", error.message);
  }
}

// 404 handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.path}`);
  res.status(404).json({ error: "Not found" });
});

// Start server
app.listen(PORT, () => {
  console.log("🔒 Zcash Duress Wallet running on port", PORT);
  console.log("🌐 Visit: http://localhost:" + PORT);
  console.log("📊 Stats: http://localhost:" + PORT + "/api/stats");
  console.log("❤️  Health: http://localhost:" + PORT + "/api/health");
});
