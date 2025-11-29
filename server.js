const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// In-memory storage (use DB in production)
let users = {};
let duressLog = [];

// ============ SETUP ENDPOINT ============
app.post("/api/setup", (req, res) => {
  const { username, password, duressPin, emergencyContacts, realWalletBalance, decoyWalletBalance } = req.body;

  if (!username || !password || !duressPin) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  users[username] = {
    password,
    duressPin,
    emergencyContacts: emergencyContacts || ["emergency@example.com"],
    realWalletBalance: realWalletBalance || 10.5,
    decoyWalletBalance: decoyWalletBalance || 0.25,
    decoyTransactions: generateFakeTransactions(5),
    realTransactions: generateRealTransactions(8),
    createdAt: new Date(),
    duressTriggered: false,
    duressTriggerCount: 0,
    lastLoginTime: null,
  };

  res.json({ 
    success: true, 
    message: "Wallet setup complete",
    walletId: username 
  });
});

// ============ LOGIN ENDPOINT ============
app.post("/api/login", (req, res) => {
  const { username, password, passwordAttempt } = req.body;

  if (!users[username]) {
    return res.status(401).json({ error: "User not found" });
  }

  const user = users[username];

  // Check if this is a duress trigger (wrong password = duress attempt)
  const isDuress = passwordAttempt !== user.password;

  if (isDuress && passwordAttempt === user.duressPin) {
    // Duress code entered
    user.duressTriggerCount += 1;
    user.lastLoginTime = new Date();

    const triggerLevel = user.duressTriggerCount;
    let responseType = "yellow"; // Level 1
    let message = "Duress mode activated - Level 1 (Silent)";

    if (triggerLevel === 2) {
      responseType = "orange"; // Level 2
      message = "Duress mode activated - Level 2 (Soft Alert - 2 hour delay)";
      // Queue alert for 2 hours from now
      setTimeout(() => sendAlert(user, "soft"), 2 * 60 * 60 * 1000);
    } else if (triggerLevel >= 3) {
      responseType = "red"; // Level 3+
      message = "Duress mode activated - Level 3 (IMMEDIATE ALERT)";
      // Send alert immediately
      sendAlert(user, "immediate");
    }

    // Log the duress trigger
    duressLog.push({
      username,
      timestamp: new Date(),
      triggerLevel,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Return decoy wallet
    return res.json({
      success: true,
      mode: "duress",
      responseType,
      message,
      triggerLevel,
      wallet: {
        balance: user.decoyWalletBalance,
        address: "t1...decoy" + Math.random().toString(36).substring(7),
        transactions: user.decoyTransactions,
      },
      alert: {
        sent: triggerLevel >= 3,
        level: triggerLevel,
        message: `Duress trigger level ${triggerLevel} - ${responseType.toUpperCase()}`,
      },
    });
  }

  // Normal login
  if (passwordAttempt === user.password) {
    user.lastLoginTime = new Date();
    user.duressTriggerCount = 0; // Reset counter on successful login

    return res.json({
      success: true,
      mode: "normal",
      message: "Login successful",
      wallet: {
        balance: user.realWalletBalance,
        address: "t1...real" + Math.random().toString(36).substring(7),
        transactions: user.realTransactions,
        shielded: true,
      },
    });
  }

  // Wrong password and not duress pin
  return res.status(401).json({ error: "Invalid credentials" });
});

// ============ ALERT SYSTEM ============
function sendAlert(user, severity) {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;

  const embed = {
    title: `🚨 Duress Alert - ${severity.toUpperCase()}`,
    description: `User ${user.username || "Unknown"} has triggered duress protocol`,
    color: severity === "immediate" ? 16711680 : 16776960, // Red or Orange
    fields: [
      {
        name: "Trigger Time",
        value: new Date().toISOString(),
        inline: true,
      },
      {
        name: "Decoy Balance Exposed",
        value: `${user.decoyWalletBalance} ZEC`,
        inline: true,
      },
      {
        name: "Real Balance Status",
        value: "🔒 Shielded - Secure",
        inline: true,
      },
      {
        name: "Action Required",
        value: severity === "immediate" ? "⚡ IMMEDIATE RESPONSE NEEDED" : "⏰ Response needed within 2 hours",
        inline: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  axios
    .post(webhookUrl, { embeds: [embed] })
    .catch((err) => console.log("Alert send failed:", err.message));

  // Also log to console for demo
  console.log(`[DURESS ALERT] ${severity.toUpperCase()} - ${user.username}`);
}

// ============ DEMO DATA ============
function generateFakeTransactions(count) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    txs.push({
      hash: "t1...fake" + Math.random().toString(36).substring(7),
      amount: (Math.random() * 0.2).toFixed(4),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: "confirmed",
      to: "t1...recipient" + i,
    });
  }
  return txs;
}

function generateRealTransactions(count) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    txs.push({
      hash: "t1...real" + Math.random().toString(36).substring(7),
      amount: (Math.random() * 2 + 0.5).toFixed(4),
      timestamp: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      status: "confirmed",
      to: "t1...shielded" + i,
      shielded: true,
    });
  }
  return txs;
}

// ============ STATS ENDPOINT ============
app.get("/api/stats", (req, res) => {
  res.json({
    totalUsers: Object.keys(users).length,
    duressTriggers: duressLog.length,
    lastTrigger: duressLog[duressLog.length - 1] || null,
    recentActivity: duressLog.slice(-5),
  });
});

// ============ DEMO DATA ENDPOINT ============
app.post("/api/demo-setup", (req, res) => {
  users["demo"] = {
    username: "demo",
    password: "password123",
    duressPin: "911",
    emergencyContacts: ["wife@example.com", "lawyer@example.com"],
    realWalletBalance: 25.75,
    decoyWalletBalance: 0.5,
    decoyTransactions: generateFakeTransactions(5),
    realTransactions: generateRealTransactions(8),
    createdAt: new Date(),
    duressTriggered: false,
    duressTriggerCount: 0,
    lastLoginTime: null,
  };

  res.json({ success: true, message: "Demo account created", username: "demo", password: "password123", duressPin: "911" });
});

// ============ ERROR HANDLER ============
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🔒 Zcash Duress Wallet running on http://localhost:${PORT}`);
  console.log(`📧 Discord alerts: ${process.env.DISCORD_WEBHOOK ? "✅ Configured" : "❌ Not configured"}`);
});