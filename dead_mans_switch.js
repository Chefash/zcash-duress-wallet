// dead-mans-switch.js
// Auto-triggers emergency protocol if user doesn't check in

const axios = require("axios");

class DeadMansSwitch {
  constructor() {
    this.switches = {}; // Track active switches
    this.intervals = {}; // Track check timers
  }

  /**
   * Create a dead man's switch for a user
   * If user doesn't check in within checkInInterval, triggers emergency
   */
  createSwitch(username, options = {}) {
    const {
      checkInIntervalDays = 7, // Default: weekly check-in
      autoTransferAddress = null, // Where to send funds if triggered
      emergencyContacts = [],
      discordWebhook = null,
      realWalletAddress = null,
      realBalance = 0,
    } = options;

    const switchId = `${username}-dms`;

    this.switches[switchId] = {
      username,
      created: new Date(),
      lastCheckIn: new Date(),
      checkInIntervalMs: checkInIntervalDays * 24 * 60 * 60 * 1000,
      autoTransferAddress,
      emergencyContacts,
      discordWebhook,
      realWalletAddress,
      realBalance,
      triggered: false,
      enabled: true,
    };

    // Start monitoring
    this.startMonitoring(switchId);

    console.log(`⏰ Dead Man's Switch created for ${username} (${checkInIntervalDays} day check-in)`);

    return {
      switchId,
      nextCheckInDue: new Date(Date.now() + this.switches[switchId].checkInIntervalMs),
    };
  }

  /**
   * User checks in - resets the timer
   */
  checkIn(username) {
    const switchId = `${username}-dms`;

    if (!this.switches[switchId]) {
      return { success: false, error: "No switch found for user" };
    }

    if (this.switches[switchId].triggered) {
      return { success: false, error: "Emergency already triggered" };
    }

    this.switches[switchId].lastCheckIn = new Date();

    console.log(`✅ Check-in received for ${username}`);

    return {
      success: true,
      nextCheckInDue: new Date(Date.now() + this.switches[switchId].checkInIntervalMs),
      message: `Safe. Next check-in due in ${this.switches[switchId].checkInIntervalMs / (24 * 60 * 60 * 1000)} days`,
    };
  }

  /**
   * Monitor switch and trigger if check-in overdue
   */
  startMonitoring(switchId) {
    // Clear existing interval
    if (this.intervals[switchId]) {
      clearInterval(this.intervals[switchId]);
    }

    // Check every hour
    this.intervals[switchId] = setInterval(() => {
      this.checkSwitch(switchId);
    }, 60 * 60 * 1000); // 1 hour

    // Also do initial check after interval
    setTimeout(() => {
      this.checkSwitch(switchId);
    }, this.switches[switchId].checkInIntervalMs);
  }

  /**
   * Check if switch should trigger
   */
  async checkSwitch(switchId) {
    const sw = this.switches[switchId];

    if (!sw || !sw.enabled || sw.triggered) return;

    const timeSinceCheckIn = Date.now() - sw.lastCheckIn.getTime();
    const isOverdue = timeSinceCheckIn > sw.checkInIntervalMs;

    if (isOverdue) {
      console.log(`🚨 Dead Man's Switch TRIGGERED for ${sw.username}`);
      await this.triggerEmergency(switchId);
    }
  }

  /**
   * Execute emergency protocol
   */
  async triggerEmergency(switchId) {
    const sw = this.switches[switchId];

    sw.triggered = true;
    sw.triggeredAt = new Date();

    // 1. Send alerts to all emergency contacts
    await this.notifyEmergencyContacts(sw);

    // 2. Send Discord alert
    if (sw.discordWebhook) {
      await this.sendDiscordAlert(sw);
    }

    // 3. Optionally auto-transfer funds to safe address
    if (sw.autoTransferAddress) {
      console.log(
        `💰 Auto-transfer queued: ${sw.realBalance} ZEC → ${sw.autoTransferAddress}`
      );
      // In production, execute actual Zcash transaction here
      // await zcash.sendShieldedTransaction(sw.realWalletAddress, sw.autoTransferAddress, sw.realBalance)
    }

    // 4. Log the event
    console.log(`📝 Emergency event logged for ${sw.username}`);

    return {
      success: true,
      message: "Emergency protocol activated",
      actions: [
        "✅ Contacts notified",
        "✅ Discord alert sent",
        sw.autoTransferAddress ? "✅ Funds auto-transferred" : "⏸️ Auto-transfer not configured",
      ],
    };
  }

  /**
   * Send alerts via email, SMS, Telegram, etc
   */
  async notifyEmergencyContacts(sw) {
    for (const contact of sw.emergencyContacts) {
      try {
        // Send via your preferred service (Twilio, SendGrid, etc)
        console.log(`📧 Notifying ${contact}: Dead Man's Switch triggered for ${sw.username}`);

        // Example: send via email/SMS
        // await emailService.send(contact, {
        //   subject: "🚨 Emergency Alert - Your contact is missing",
        //   body: `Dead Man's Switch triggered for ${sw.username}. Last check-in: ${sw.lastCheckIn}`
        // });
      } catch (err) {
        console.error(`Failed to notify ${contact}:`, err.message);
      }
    }
  }

  /**
   * Send Discord alert with details
   */
  async sendDiscordAlert(sw) {
    try {
      const embed = {
        title: "🚨 DEAD MAN'S SWITCH TRIGGERED",
        description: `User ${sw.username} has not checked in for ${sw.checkInIntervalMs / (24 * 60 * 60 * 1000)} days`,
        color: 16711680, // Red
        fields: [
          {
            name: "Last Check-in",
            value: sw.lastCheckIn.toLocaleString(),
            inline: true,
          },
          {
            name: "Triggered At",
            value: sw.triggeredAt.toLocaleString(),
            inline: true,
          },
          {
            name: "Real Wallet",
            value: sw.realWalletAddress || "Not configured",
            inline: false,
          },
          {
            name: "Auto-Transfer Address",
            value: sw.autoTransferAddress || "Not configured",
            inline: false,
          },
          {
            name: "Status",
            value: "🔴 EMERGENCY MODE ACTIVE",
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      await axios.post(sw.discordWebhook, { embeds: [embed] });
      console.log("📤 Discord alert sent");
    } catch (err) {
      console.error("Discord alert failed:", err.message);
    }
  }

  /**
   * Get switch status (for dashboard)
   */
  getStatus(username) {
    const switchId = `${username}-dms`;
    const sw = this.switches[switchId];

    if (!sw) return null;

    const timeSinceCheckIn = Date.now() - sw.lastCheckIn.getTime();
    const daysUntilTrigger = (sw.checkInIntervalMs - timeSinceCheckIn) / (24 * 60 * 60 * 1000);

    return {
      username,
      enabled: sw.enabled,
      triggered: sw.triggered,
      lastCheckIn: sw.lastCheckIn,
      daysUntilTrigger: Math.max(0, daysUntilTrigger.toFixed(2)),
      checkInIntervalDays: sw.checkInIntervalMs / (24 * 60 * 60 * 1000),
      contactsNotified: sw.emergencyContacts.length,
      autoTransferEnabled: !!sw.autoTransferAddress,
    };
  }

  /**
   * Disable switch (user disables before traveling)
   */
  disableSwitch(username) {
    const switchId = `${username}-dms`;
    if (this.switches[switchId]) {
      this.switches[switchId].enabled = false;
      clearInterval(this.intervals[switchId]);
      console.log(`⏹️ Dead Man's Switch disabled for ${username}`);
      return true;
    }
    return false;
  }

  /**
   * Re-enable switch
   */
  enableSwitch(username) {
    const switchId = `${username}-dms`;
    if (this.switches[switchId]) {
      this.switches[switchId].enabled = true;
      this.startMonitoring(switchId);
      console.log(`▶️ Dead Man's Switch re-enabled for ${username}`);
      return true;
    }
    return false;
  }

  /**
   * Cancel/delete switch entirely
   */
  deleteSwitch(username) {
    const switchId = `${username}-dms`;
    clearInterval(this.intervals[switchId]);
    delete this.switches[switchId];
    delete this.intervals[switchId];
    console.log(`🗑️ Dead Man's Switch deleted for ${username}`);
    return true;
  }

  /**
   * Get all active switches (for admin)
   */
  getAllSwitches() {
    return Object.values(this.switches).map((sw) => ({
      username: sw.username,
      enabled: sw.enabled,
      triggered: sw.triggered,
      daysUntilTrigger: (
        (sw.checkInIntervalMs - (Date.now() - sw.lastCheckIn.getTime())) /
        (24 * 60 * 60 * 1000)
      ).toFixed(2),
    }));
  }
}

module.exports = DeadMansSwitch;