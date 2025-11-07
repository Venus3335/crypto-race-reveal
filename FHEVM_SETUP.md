# FHEVM Setup Guide - Fixing Coprocessor Error

## Problem

Error: `could not decode result data (value="0x", info={ "method": "getCoprocessorSigners", "signature": "getCoprocessorSigners()" })`

This error indicates that FHEVM coprocessor contracts are not deployed on the local Hardhat node.

## Solution

FHEVM requires special initialization on Hardhat localhost network. The `@fhevm/hardhat-plugin` should handle this automatically, but we need to ensure it's properly configured.

### Step 1: Stop Current Hardhat Node

If you have a Hardhat node running, stop it first:

```powershell
# Stop all Node processes
taskkill /F /IM node.exe
```

### Step 2: Start Hardhat Node with FHEVM Support

The FHEVM plugin should automatically initialize when you start the node. Start it with:

```bash
cd d:\cursor\code\ZLottery-main
npx hardhat node
```

**Important:** The FHEVM plugin should automatically deploy the coprocessor contracts when the node starts. Look for messages about FHEVM initialization in the terminal output.

### Step 3: Verify FHEVM Contracts Are Deployed

After starting the node, you should see FHEVM-related contracts being deployed. If not, you may need to manually initialize FHEVM.

### Step 4: Deploy Your Contracts

Once the Hardhat node is running with FHEVM support:

```bash
# In a new terminal
cd d:\cursor\code\ZLottery-main
npx hardhat deploy --network localhost
```

### Alternative: Use Hardhat Network Instead of Localhost

If the localhost network continues to have issues, try using the built-in Hardhat network:

1. **Deploy to Hardhat network:**
   ```bash
   npx hardhat deploy --network hardhat
   ```

2. **Update frontend config:**
   ```bash
   node scripts/update-frontend-abi.js hardhat
   ```

3. **Update wagmi config** to use Hardhat network instead of localhost.

## Troubleshooting

### If FHEVM Contracts Still Not Deployed

1. **Check Hardhat Plugin Configuration:**
   - Ensure `@fhevm/hardhat-plugin` is in `hardhat.config.ts`
   - The plugin should be imported at the top: `import "@fhevm/hardhat-plugin";`

2. **Check Node Output:**
   - Look for FHEVM initialization messages
   - Check for any errors during node startup

3. **Try Manual FHEVM Initialization:**
   ```bash
   npx hardhat fhevm install-solidity --network localhost
   ```

### If Error Persists

The issue might be that the FHEVM plugin doesn't automatically initialize on `localhost` network. Try:

1. **Use Hardhat network instead:**
   - Deploy to `hardhat` network (built-in)
   - Update frontend to connect to Hardhat network

2. **Check FHEVM Plugin Documentation:**
   - Review `@fhevm/hardhat-plugin` documentation
   - Check if there's a specific initialization command

3. **Verify Plugin Version:**
   ```bash
   npm list @fhevm/hardhat-plugin
   ```

## Expected Behavior

When Hardhat node starts with FHEVM support, you should see:
- FHEVM contracts being deployed automatically
- Coprocessor addresses in the output
- No errors about missing contracts

## Next Steps

After fixing the FHEVM initialization:
1. Restart Hardhat node
2. Deploy contracts
3. Refresh frontend
4. Test encryption/decryption functionality


