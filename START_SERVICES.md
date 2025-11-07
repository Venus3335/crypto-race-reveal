# ZLottery - Start Services Guide

## Current Status

✅ **Contract Deployed**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
✅ **Tests Passed**: 22 passing
✅ **Frontend Config**: Auto-updated

## Services Started

I've started the following services in separate PowerShell windows:

1. **Hardhat Node** - Running in minimized PowerShell window
   - Port: 8545
   - URL: `http://localhost:8545`

2. **Frontend Dev Server** - Running in minimized PowerShell window
   - Port: 5173
   - URL: `http://localhost:5173`

## Verify Services

### Check Hardhat Node

```powershell
# Check if port 8545 is listening
Test-NetConnection -ComputerName localhost -Port 8545

# Or check processes
Get-Process node | Where-Object {$_.Path -like "*hardhat*"}
```

### Check Frontend

```powershell
# Check if port 5173 is listening
Test-NetConnection -ComputerName localhost -Port 5173

# Or open browser
Start-Process "http://localhost:5173"
```

## Manual Start (If Services Didn't Start)

### Terminal 1: Hardhat Node

```bash
cd d:\cursor\code\ZLottery-main
npx hardhat node
```

**Keep this terminal running!** You should see:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

### Terminal 2: Deploy Contract

```bash
cd d:\cursor\code\ZLottery-main
npm run deploy:localhost:full
```

### Terminal 3: Frontend

```bash
cd d:\cursor\code\ZLottery-main\ui
npm run dev
```

## Access the Application

1. **Open Browser**: `http://localhost:5173`

2. **Connect Wallet**:
   - Install Rainbow wallet extension
   - Add localhost network (Chain ID: 31337)
   - Import test account from Hardhat node
   - Click "Connect Wallet" in top-right corner

## Contract Information

- **Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Network**: localhost (Chain ID: 31337)
- **RPC**: `http://localhost:8545`

## Troubleshooting

### Hardhat Node Not Running

1. Check minimized PowerShell windows
2. Or manually start in a new terminal:
   ```bash
   cd d:\cursor\code\ZLottery-main
   npx hardhat node
   ```

### Frontend Not Starting

1. Check minimized PowerShell windows
2. Or manually start in a new terminal:
   ```bash
   cd d:\cursor\code\ZLottery-main\ui
   npm run dev
   ```

### Cannot Connect to Contract

1. Verify contract is deployed:
   ```bash
   cat deployments/localhost/ZLottery.json
   ```

2. Check frontend config:
   ```bash
   cat ui/src/config/contracts.ts
   ```

3. Ensure Hardhat node is running on port 8545

## Quick Commands

```bash
# Check services
Test-NetConnection -ComputerName localhost -Port 8545
Test-NetConnection -ComputerName localhost -Port 5173

# Restart Hardhat node
npx hardhat node

# Restart frontend
cd ui && npm run dev

# Redeploy contract
npm run deploy:localhost:full
```


