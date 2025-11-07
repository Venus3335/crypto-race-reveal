# FHEVM Coprocessor Error - Fix Guide

## Problem

Error: `could not decode result data (value="0x", info={ "method": "getCoprocessorSigners", "signature": "getCoprocessorSigners()" })`

This error occurs because FHEVM coprocessor contracts are not deployed on the local Hardhat node.

## Root Cause

The `@fhevm/hardhat-plugin` should automatically deploy FHEVM contracts when you start `npx hardhat node`, but sometimes this doesn't happen correctly on the `localhost` network.

## Solution Options

### Option 1: Use Sepolia Config for Localhost (Recommended)

Since localhost network may not fully support FHEVM, we can use Sepolia's FHEVM configuration which connects to Zama's testnet relayer.

**Update `useZamaInstance.ts`:**

```typescript
// Always use SepoliaConfig for localhost network
// The relayer will handle FHE operations even on localhost
if (chainId === 31337) {
  // Use Sepolia config but with localhost network provider
  config = {
    ...SepoliaConfig,
    network: window.ethereum || "http://localhost:8545",
  };
} else {
  config = SepoliaConfig;
}
```

### Option 2: Ensure FHEVM Plugin Initializes Correctly

1. **Stop all running nodes:**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Start Hardhat node:**
   ```bash
   cd d:\cursor\code\ZLottery-main
   npx hardhat node
   ```

3. **Look for FHEVM initialization messages** in the terminal output. You should see messages about FHEVM contracts being deployed.

4. **If FHEVM contracts are not deployed**, the plugin may not be initializing correctly. Try:
   - Restart the node
   - Check Hardhat plugin version
   - Verify `@fhevm/hardhat-plugin` is in `hardhat.config.ts`

### Option 3: Use Hardhat Network Instead of Localhost

Deploy to the built-in Hardhat network which has better FHEVM support:

1. **Deploy to Hardhat network:**
   ```bash
   npx hardhat deploy --network hardhat
   ```

2. **Update frontend config:**
   ```bash
   node scripts/update-frontend-abi.js hardhat
   ```

3. **Update wagmi config** to connect to Hardhat network (though this is more complex for frontend connection).

## Recommended Fix

I'll update the code to use SepoliaConfig for localhost network, which will use Zama's testnet relayer for FHE operations even when connected to localhost.


