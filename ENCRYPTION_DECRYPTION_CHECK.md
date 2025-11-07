# Encryption/Decryption Diagnostic Guide

## Problem Overview

This guide helps diagnose and fix encryption/decryption issues in the ZLottery application.

## Common Issues

### 1. FHEVM Contracts Not Deployed

**Symptom:**
- Error: `could not decode result data (value="0x", info={ "method": "getCoprocessorSigners" })`
- Encryption service fails to initialize
- Cannot encrypt ticket numbers

**Check:**
```bash
cd ZLottery-main
npm run check:fhevm
```

**Expected Output:**
```
✅ acl (0x687820221192C5B662b25367F70076A37bc79b6c): DEPLOYED
✅ kms (0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC): DEPLOYED
✅ inputVerifier (0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4): DEPLOYED
✅ decryptionVerifier (0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1): DEPLOYED
✅ inputVerification (0x7048C39f048125eDa9d678AEbaDfB22F7900a29F): DEPLOYED
✅ Coprocessor Signers: X signers found
```

**If contracts are NOT deployed:**

The current configuration uses Zama's relayer service (`https://relayer.testnet.zama.cloud`) for FHE operations, which should work even if local FHEVM contracts are not deployed. However, if you still encounter issues:

1. **Check Hardhat Node is Running:**
   ```bash
   # Check if node is running
   Test-NetConnection -ComputerName localhost -Port 8545
   ```

2. **Restart Hardhat Node:**
   ```powershell
   # Stop all node processes
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   
   # Start Hardhat node
   cd ZLottery-main
   npx hardhat node
   ```

3. **Verify Relayer Connection:**
   - Check browser console for CORS errors
   - Verify `relayerUrl: "https://relayer.testnet.zama.cloud"` in `useZamaInstance.ts`
   - Check network tab for failed requests to relayer

### 2. Encryption Service Not Initialized

**Symptom:**
- Error: `Failed to initialize encryption service`
- Cannot purchase tickets
- Input field is disabled

**Check:**
1. **Browser Console:**
   - Look for initialization errors
   - Check for CORS errors
   - Verify SDK initialization messages

2. **Wallet Connection:**
   - Ensure wallet is connected
   - Verify correct network (Hardhat Local, Chain ID: 31337)
   - Check wallet address is available

3. **FHE Instance:**
   - Check `useZamaInstance` hook returns `isInitialized: true`
   - Verify `instance` is not null
   - Check for initialization errors in console

**Fix:**
1. **Refresh Browser:**
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache if needed

2. **Reconnect Wallet:**
   - Disconnect and reconnect wallet
   - Switch network and switch back

3. **Check Configuration:**
   - Verify `useZamaInstance.ts` configuration
   - Check `relayerUrl` is correct
   - Ensure `chainId` matches (31337 for localhost)

### 3. Encryption Fails

**Symptom:**
- Error when clicking "Buy Ticket"
- Error: `Failed to encrypt ticket number`
- Transaction never sent

**Check:**
1. **Browser Console:**
   - Look for detailed error messages
   - Check for encryption-specific errors
   - Verify `createEncryptedInput` is called

2. **FHE Instance:**
   - Verify `instance` is initialized
   - Check `instance.createEncryptedInput` exists
   - Verify contract address is correct

3. **Input Validation:**
   - Ensure number is between 11-99
   - Check input is valid integer
   - Verify round is not drawn

**Fix:**
1. **Check FHE Initialization:**
   - Ensure encryption service is initialized
   - Wait for initialization to complete
   - Check for initialization errors

2. **Verify Contract Address:**
   - Check `CONTRACT_ADDRESS` in `contracts.ts`
   - Ensure contract is deployed
   - Verify address matches deployment

3. **Check Relayer Connection:**
   - Verify relayer URL is accessible
   - Check for network errors
   - Ensure CORS is not blocking requests

### 4. Decryption Fails

**Symptom:**
- Error when clicking "Decrypt"
- Error: `Failed to decrypt ticket`
- Cannot see ticket number

**Check:**
1. **Browser Console:**
   - Look for detailed error messages
   - Check for decryption-specific errors
   - Verify `userDecrypt` is called

2. **Ticket Handle:**
   - Verify ticket handle is retrieved from contract
   - Check handle is valid bytes32
   - Ensure ticket exists for user

3. **Signature:**
   - Check if signature request appears in wallet
   - Verify signature is approved
   - Check for signature errors

4. **FHE Instance:**
   - Verify `instance` is initialized
   - Check `instance.userDecrypt` exists
   - Verify keypair generation works

**Fix:**
1. **Check Ticket Access:**
   - Verify ticket exists for selected round
   - Ensure user has tickets
   - Check ticket index is valid

2. **Verify Signature:**
   - Approve signature request in wallet
   - Check signature is not rejected
   - Verify EIP712 signing works

3. **Check Relayer Connection:**
   - Verify relayer URL is accessible
   - Check for network errors
   - Ensure CORS is not blocking requests

4. **Check FHE Initialization:**
   - Ensure encryption service is initialized
   - Wait for initialization to complete
   - Check for initialization errors

## Diagnostic Steps

### Step 1: Check FHEVM Contracts

```bash
cd ZLottery-main
npm run check:fhevm
```

### Step 2: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors related to:
   - FHE initialization
   - Encryption/decryption
   - Relayer connection
   - Contract calls

### Step 3: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Look for:
   - Failed requests to relayer
   - CORS errors
   - 403/404 errors
   - Timeout errors

### Step 4: Verify Configuration

1. **Check `useZamaInstance.ts`:**
   - Verify `relayerUrl` is set correctly
   - Check `chainId` matches network
   - Ensure contract addresses are correct

2. **Check `contracts.ts`:**
   - Verify `CONTRACT_ADDRESS` is correct
   - Check ABI is up to date
   - Ensure contract is deployed

### Step 5: Test Encryption/Decryption

1. **Test Encryption:**
   - Connect wallet
   - Wait for FHE initialization
   - Try to purchase a ticket
   - Check console for errors

2. **Test Decryption:**
   - Purchase a ticket first
   - Wait for round to be drawn
   - Try to decrypt ticket
   - Check console for errors

## Common Error Messages

### "Failed to initialize encryption service"
- **Cause:** FHEVM SDK initialization failed
- **Fix:** Check relayer connection, verify configuration, restart browser

### "Failed to encrypt ticket number"
- **Cause:** Encryption service not initialized or relayer connection failed
- **Fix:** Ensure FHE is initialized, check relayer URL, verify network connection

### "Failed to decrypt ticket"
- **Cause:** Decryption service failed or signature rejected
- **Fix:** Check FHE initialization, approve signature request, verify ticket handle

### "could not decode result data"
- **Cause:** FHEVM contracts not deployed or relayer connection failed
- **Fix:** Use relayer service (already configured), check network connection

## Solution Summary

The current configuration uses Zama's relayer service for FHE operations, which should work even if local FHEVM contracts are not deployed. If you encounter issues:

1. **Ensure Hardhat node is running** on port 8545
2. **Verify wallet is connected** to Hardhat Local network (Chain ID: 31337)
3. **Check relayer connection** is not blocked by CORS
4. **Wait for FHE initialization** to complete before using encryption/decryption
5. **Check browser console** for detailed error messages
6. **Verify contract is deployed** and address is correct

## Additional Resources

- FHEVM Documentation: https://docs.zama.ai/fhevm
- Relayer SDK: https://github.com/zama-ai/fhevm-relayer-sdk
- Hardhat Plugin: https://github.com/zama-ai/fhevm-hardhat-plugin


