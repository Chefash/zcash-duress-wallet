// zcash-integration.js
// Real Zcash Testnet Integration using Zcash RPC

const axios = require("axios");
require("dotenv").config();

// Zcash testnet RPC configuration
const ZCASH_RPC = {
  host: process.env.ZCASH_RPC_HOST || "127.0.0.1",
  port: process.env.ZCASH_RPC_PORT || 18232,
  user: process.env.ZCASH_RPC_USER || "zcashuser",
  pass: process.env.ZCASH_RPC_PASS || "zcashpass",
};

const zcashRpcUrl = `http://${ZCASH_RPC.user}:${ZCASH_RPC.pass}@${ZCASH_RPC.host}:${ZCASH_RPC.port}`;

// ============ REAL TESTNET OPERATIONS ============

/**
 * Get actual balance from Zcash testnet
 * Uses shielded address for privacy
 */
async function getShieldedBalance(address) {
  try {
    const response = await rpcCall("z_getbalance", [address]);
    return parseFloat(response) || 0;
  } catch (err) {
    console.error("Balance fetch failed:", err.message);
    return null;
  }
}

/**
 * Get shielded transactions for an address
 */
async function getShieldedTransactions(address, limit = 10) {
  try {
    const response = await rpcCall("z_listreceivedbyaddress", [address]);
    if (!response || !response.length) return [];

    return response.slice(0, limit).map((tx) => ({
      hash: tx.txid.substring(0, 20) + "...",
      amount: tx.amount.toFixed(4),
      timestamp: new Date(tx.blocktime * 1000).toISOString(),
      status: tx.change ? "received" : "sent",
      address: tx.address.substring(0, 20) + "...",
    }));
  } catch (err) {
    console.error("Transaction fetch failed:", err.message);
    return [];
  }
}

/**
 * Create a shielded transaction (send funds privately)
 */
async function sendShieldedTransaction(fromAddress, toAddress, amount) {
  try {
    // Create operation
    const operationId = await rpcCall("z_sendmany", [
      fromAddress,
      [
        {
          address: toAddress,
          amount: amount,
        },
      ],
    ]);

    // Wait for operation to complete
    const result = await waitForOperation(operationId);

    return {
      success: result.status === "success",
      txid: result.result?.txid || null,
      operationId,
      error: result.error,
    };
  } catch (err) {
    console.error("Send transaction failed:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Create a new shielded address
 */
async function createShieldedAddress() {
  try {
    const address = await rpcCall("z_getnewaddress", ["sapling"]);
    return address;
  } catch (err) {
    console.error("Address creation failed:", err.message);
    return null;
  }
}

/**
 * Get blockchain info (for verification)
 */
async function getBlockchainInfo() {
  try {
    const info = await rpcCall("getblockchaininfo", []);
    return {
      blocks: info.blocks,
      chain: info.chain,
      bestblockhash: info.bestblockhash,
      difficulty: info.difficulty,
    };
  } catch (err) {
    console.error("Blockchain info fetch failed:", err.message);
    return null;
  }
}

/**
 * Export viewing key (for auditing without spending)
 */
async function exportViewingKey(address) {
  try {
    const key = await rpcCall("z_exportviewingkey", [address]);
    return key;
  } catch (err) {
    console.error("Viewing key export failed:", err.message);
    return null;
  }
}

// ============ HELPER FUNCTIONS ============

/**
 * Generic RPC call to Zcash node
 */
async function rpcCall(method, params = []) {
  try {
    const response = await axios.post(zcashRpcUrl, {
      jsonrpc: "2.0",
      id: Math.random().toString(36).substring(7),
      method,
      params,
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    return response.data.result;
  } catch (err) {
    throw err;
  }
}

/**
 * Wait for async operation to complete
 */
async function waitForOperation(operationId, maxWait = 30000) {
  const startTime = Date.now();
  const pollInterval = 1000;

  while (Date.now() - startTime < maxWait) {
    try {
      const statuses = await rpcCall("z_getoperationstatus", [[operationId]]);
      if (statuses.length === 0) continue;

      const status = statuses[0];
      if (status.status === "success" || status.status === "failed") {
        return status;
      }
    } catch (err) {
      console.error("Operation status check failed:", err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Operation timeout");
}

/**
 * Verify connection to Zcash node
 */
async function verifyConnection() {
  try {
    const info = await getBlockchainInfo();
    return info !== null;
  } catch (err) {
    console.error("Zcash connection failed:", err.message);
    return false;
  }
}

// ============ SETUP FUNCTIONS ============

/**
 * Initialize wallet accounts for user (real + decoy)
 */
async function initializeUserWallets() {
  try {
    console.log("🔐 Creating shielded wallets on testnet...");

    // Create real wallet address
    const realAddress = await createShieldedAddress();
    if (!realAddress) throw new Error("Failed to create real address");

    // Create decoy wallet address
    const decoyAddress = await createShieldedAddress();
    if (!decoyAddress) throw new Error("Failed to create decoy address");

    // Export viewing keys for auditing
    const realViewingKey = await exportViewingKey(realAddress);
    const decoyViewingKey = await exportViewingKey(decoyAddress);

    console.log("✅ Wallets created successfully");

    return {
      realAddress,
      decoyAddress,
      realViewingKey,
      decoyViewingKey,
    };
  } catch (err) {
    console.error("Wallet initialization failed:", err.message);
    return null;
  }
}

/**
 * Fund testnet wallet (for demo purposes)
 * In real use, users would fund from exchange
 */
async function fundTestnetWallet(address, amount) {
  try {
    // This would typically be done via faucet or external funding
    console.log(`Funding ${address} with ${amount} ZEC on testnet...`);
    // In production: integrate with Zcash testnet faucet
    return true;
  } catch (err) {
    console.error("Funding failed:", err.message);
    return false;
  }
}

module.exports = {
  getShieldedBalance,
  getShieldedTransactions,
  sendShieldedTransaction,
  createShieldedAddress,
  getBlockchainInfo,
  exportViewingKey,
  verifyConnection,
  initializeUserWallets,
  fundTestnetWallet,
  rpcCall,
};