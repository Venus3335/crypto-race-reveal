# FHE Encryption Service Diagnosis Guide

## Problem
Encryption service initialization fails with error: "Failed to initialize encryption service"

## Solution Steps

### 1. Check Wallet Connection
- ✅ Ensure wallet (Rainbow/MetaMask) is connected
- ✅ Verify you're on the correct network: **Hardhat Local** (Chain ID: 31337)
- ✅ Check that the wallet address is displayed in the top-right corner

### 2. Check Hardhat Node
- ✅ Verify Hardhat node is running on port 8545
- ✅ Check terminal output for any errors
- ✅ Ensure node is fully started (wait 10-15 seconds after starting)

### 3. Check Browser Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for error messages starting with:
   - "Failed to initialize Zama instance"
   - "Error details:"
   - Any network-related errors

### 4. Common Error Messages and Solutions

#### Error: "Failed to initialize encryption service"
**Possible causes:**
- Wallet not connected
- Wrong network selected
- Hardhat node not running
- Network configuration mismatch

**Solutions:**
1. Disconnect and reconnect wallet
2. Switch to Hardhat Local network (Chain ID: 31337)
3. Restart Hardhat node
4. Refresh the page

#### Error: "Network error" or "Connection refused"
**Possible causes:**
- Hardhat node not running
- Wrong RPC URL
- Port 8545 not accessible

**Solutions:**
1. Check if Hardhat node is running:
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 8545
   ```
2. Restart Hardhat node:
   ```bash
   cd ZLottery-main
   npx hardhat node
   ```
3. Verify RPC URL in wallet: `http://localhost:8545`

#### Error: "window.ethereum is undefined"
**Possible causes:**
- Wallet extension not installed
- Wallet extension disabled
- Browser compatibility issue

**Solutions:**
1. Install Rainbow wallet or MetaMask extension
2. Enable the extension
3. Refresh the page

### 5. Verification Steps

#### Step 1: Verify Services Are Running
```powershell
# Check Hardhat node
Get-NetTCPConnection -LocalPort 8545

# Check Frontend
Get-NetTCPConnection -LocalPort 5173
```

#### Step 2: Verify Wallet Connection
1. Open browser console (F12)
2. Run: `window.ethereum`
3. Should return an object (not `undefined`)
4. Check connected network: Should be Chain ID 31337

#### Step 3: Verify Network Configuration
1. Open browser console
2. Look for log messages:
   - "Initializing Zama SDK..."
   - "Chain ID: 31337"
   - "Wallet connected: true"
   - "SDK initialized successfully"
   - "Zama instance created successfully: true"

### 6. Manual Testing

#### Test 1: Check Hardhat Node
```bash
# In terminal
curl http://localhost:8545 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# Should return: {"jsonrpc":"2.0","id":1,"result":"0x7a69"} (31337 in hex)
```

#### Test 2: Check Wallet Connection
1. Open browser console
2. Run:
   ```javascript
   window.ethereum.request({ method: 'eth_chainId' }).then(console.log)
   ```
3. Should return: "0x7a69" (31337)

#### Test 3: Check FHE Initialization
1. Open browser console
2. Look for initialization logs
3. Check for any error messages

### 7. Complete Reset Procedure

If nothing works, try a complete reset:

1. **Stop all services:**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Restart Hardhat node:**
   ```bash
   cd ZLottery-main
   npx hardhat node
   ```

3. **Wait 15 seconds** for node to fully start

4. **Restart frontend:**
   ```bash
   cd ZLottery-main/ui
   npm run dev
   ```

5. **Refresh browser** (Ctrl+Shift+R for hard refresh)

6. **Reconnect wallet:**
   - Disconnect wallet
   - Clear browser cache (optional)
   - Reconnect wallet
   - Switch to Hardhat Local network

### 8. Expected Behavior

When everything is working correctly:

1. ✅ Wallet is connected
2. ✅ Network shows "Hardhat Local" (31337)
3. ✅ No error messages in UI
4. ✅ Input field is enabled (not grayed out)
5. ✅ Console shows:
   - "SDK initialized successfully"
   - "Zama instance created successfully: true"

### 9. Debug Information to Collect

If the problem persists, collect the following information:

1. **Browser Console Output:**
   - Copy all error messages
   - Copy initialization logs

2. **Network Tab:**
   - Check for failed requests
   - Check response codes

3. **Hardhat Node Output:**
   - Copy terminal output
   - Check for any errors

4. **Wallet Information:**
   - Wallet type (Rainbow/MetaMask)
   - Network name
   - Chain ID
   - Connected address

### 10. Contact Information

If the issue persists after trying all steps:
- Check Zama documentation: https://docs.zama.ai/
- Check FHEVM documentation: https://docs.zama.ai/fhevm
- Review error messages in browser console for specific error codes

## Updated Code Changes

The code has been updated to:
1. ✅ Only initialize FHE when wallet is connected
2. ✅ Show detailed error messages
3. ✅ Add comprehensive logging
4. ✅ Handle wallet disconnection gracefully
5. ✅ Provide troubleshooting tips in UI

## Next Steps

After fixing the issue:
1. Refresh the page
2. Connect wallet
3. Verify FHE initialization succeeds
4. Test ticket purchase functionality


