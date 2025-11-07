# ZLottery Deployment Status

## Current Deployment Status

### ✅ Contract Deployment

- **Contract Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Network**: localhost (Chain ID: 31337)
- **Deployment File**: `deployments/localhost/ZLottery.json`
- **Frontend Config**: `ui/src/config/contracts.ts` (auto-updated)

### ✅ Tests

- **Local Tests**: 22 passing ✅
- **Sepolia Tests**: 5 pending (requires Sepolia deployment)

### ⚠️ Services Status

**Hardhat Node:**
- Status: Starting/Checking...
- Port: 8545
- **Action Required**: Ensure Hardhat node is running before deploying

**Frontend:**
- Status: Starting...
- Port: 5173
- URL: `http://localhost:5173`

## Quick Start Commands

### 1. Start Hardhat Node

```bash
cd d:\cursor\code\ZLottery-main
npx hardhat node
```

**Keep this terminal running!**

### 2. Deploy Contract (in new terminal)

```bash
cd d:\cursor\code\ZLottery-main
npm run deploy:localhost:full
```

Or manually:
```bash
npx hardhat deploy --network localhost --tags ZLottery
node scripts/update-frontend-abi.js localhost
```

### 3. Run Tests

```bash
npm test
```

### 4. Start Frontend (in new terminal)

```bash
cd d:\cursor\code\ZLottery-main\ui
npm run dev
```

## Current Configuration

### Contract Address
```
0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### Network Configuration
- **Network Name**: Hardhat Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency**: ETH

### Test Accounts
Use the private keys displayed when starting Hardhat node:
- Account #0: Usually the deployer/owner
- All accounts have 10000 ETH

## Troubleshooting

### Cannot Connect to Network

If you see "Error HH108: Cannot connect to the network localhost":

1. **Check Hardhat Node:**
   ```bash
   # Check if port 8545 is in use
   Get-NetTCPConnection -LocalPort 8545
   ```

2. **Restart Hardhat Node:**
   ```bash
   npx hardhat node
   ```

3. **Wait 10-15 seconds** after starting node before deploying

4. **Verify Node is Running:**
   - Check terminal output for "Started HTTP and WebSocket JSON-RPC server"
   - Verify accounts are displayed

### Frontend Not Starting

1. **Check if port 5173 is in use:**
   ```bash
   Get-NetTCPConnection -LocalPort 5173
   ```

2. **Install dependencies:**
   ```bash
   cd ui
   npm install
   ```

3. **Start frontend:**
   ```bash
   npm run dev
   ```

## Next Steps

1. **Verify Hardhat Node is Running**
   - Check terminal for node output
   - Verify port 8545 is listening

2. **Deploy Contract** (if not already deployed)
   - Wait for node to fully start
   - Run deployment command

3. **Start Frontend**
   - Navigate to `ui` directory
   - Run `npm run dev`

4. **Connect Wallet**
   - Add localhost network to MetaMask/Rainbow
   - Import test account
   - Connect to frontend

## Service Status Check

Run these commands to check service status:

```powershell
# Check Hardhat node
Get-NetTCPConnection -LocalPort 8545

# Check Frontend
Get-NetTCPConnection -LocalPort 5173

# Check Node processes
Get-Process node -ErrorAction SilentlyContinue
```


