# FHEVM Localhost Fix - Deploy Coprocessor Contracts

## Problem

Error: `could not decode result data (value="0x", info={ "method": "getCoprocessorSigners", "signature": "getCoprocessorSigners()" })`

This error occurs because FHEVM coprocessor contracts are not deployed on the local Hardhat node.

## Root Cause

The `@fhevm/hardhat-plugin` should automatically deploy FHEVM contracts when you start `npx hardhat node`, but this may not happen correctly. The coprocessor contracts need to be deployed at specific addresses.

## Solution

We need to ensure FHEVM contracts are deployed on the localhost network. The `@fhevm/hardhat-plugin` should handle this automatically.

### Step 1: Stop All Running Nodes

```powershell
taskkill /F /IM node.exe
```

### Step 2: Start Hardhat Node with FHEVM Support

The FHEVM plugin should automatically deploy coprocessor contracts when the node starts:

```bash
cd d:\cursor\code\ZLottery-main
npx hardhat node
```

**Important:** Look for messages about FHEVM contracts being deployed in the terminal output. You should see messages like:
- "Deploying FHEVM contracts..."
- "FHEVM coprocessor deployed at..."
- Or similar FHEVM-related messages

### Step 3: Verify FHEVM Contracts Are Deployed

After starting the node, check if the coprocessor contracts are deployed at the expected addresses:

- ACL Contract: `0x687820221192C5B662b25367F70076A37bc79b6c`
- KMS Contract: `0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC`
- Input Verifier: `0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4`
- Decryption Verifier: `0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1`
- Input Verification: `0x7048C39f048125eDa9d678AEbaDfB22F7900a29F`

### Step 4: If Contracts Are Not Deployed

If the FHEVM plugin doesn't automatically deploy contracts, you may need to:

1. **Check Hardhat Plugin Version:**
   ```bash
   npm list @fhevm/hardhat-plugin
   ```

2. **Verify Plugin is in hardhat.config.ts:**
   ```typescript
   import "@fhevm/hardhat-plugin";
   ```

3. **Try Manual Initialization:**
   The plugin should handle this automatically, but if not, check the plugin documentation.

### Step 5: Deploy Your Contracts

Once FHEVM contracts are deployed:

```bash
# In a new terminal
cd d:\cursor\code\ZLottery-main
npx hardhat deploy --network localhost
```

### Step 6: Test Frontend

1. Refresh browser page
2. Connect wallet to localhost network
3. Check browser console for initialization logs
4. Test ticket purchase

## Alternative: Use Sepolia Network for FHE

If FHEVM contracts cannot be deployed on localhost, you can:

1. **Deploy to Sepolia testnet:**
   ```bash
   npx hardhat deploy --network sepolia
   ```

2. **Update frontend to use Sepolia network:**
   - Change wagmi config to use Sepolia
   - Use SepoliaConfig directly
   - Connect wallet to Sepolia network

## Troubleshooting

### If FHEVM Plugin Doesn't Deploy Contracts

1. **Check Hardhat version:**
   ```bash
   npx hardhat --version
   ```

2. **Check plugin version:**
   ```bash
   npm list @fhevm/hardhat-plugin
   ```

3. **Try updating the plugin:**
   ```bash
   npm install @fhevm/hardhat-plugin@latest
   ```

4. **Check Hardhat config:**
   - Ensure `@fhevm/hardhat-plugin` is imported
   - Check network configuration

### If Error Persists

1. **Check node output** for FHEVM-related messages
2. **Verify contracts are deployed** by checking addresses
3. **Try restarting the node** multiple times
4. **Check plugin documentation** for manual deployment steps

## Expected Behavior

When Hardhat node starts with FHEVM support:
- ✅ FHEVM contracts are automatically deployed
- ✅ Coprocessor addresses are available
- ✅ `getCoprocessorSigners()` returns valid data
- ✅ FHE operations work correctly

## Next Steps

After fixing FHEVM deployment:
1. Restart Hardhat node
2. Verify contracts are deployed
3. Deploy your contracts
4. Test frontend functionality


