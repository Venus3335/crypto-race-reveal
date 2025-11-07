# Local Network Deployment Guide

This guide will help you deploy and test the ZLottery contract on a local Hardhat network.

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat installed globally (optional)

## Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd ui
npm install
cd ..
```

## Step 2: Start Hardhat Node

Open a terminal and run:

```bash
npx hardhat node
```

**Keep this terminal running!** You should see output like:

```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

**Important:** Save the account addresses and private keys - you'll need them to import into MetaMask.

## Step 3: Deploy Contract to Local Network

Open a **new terminal** and run:

```bash
npm run deploy:localhost:full
```

This will:
1. Deploy the ZLottery contract to localhost
2. Automatically update the frontend configuration

You should see output like:

```
deploying "ZLottery" (tx: 0x...)...
deployed at 0x... with X gas
✅ Frontend ABI updated successfully!
```

## Step 4: Run Tests

In the same terminal, run:

```bash
npm test
```

All tests should pass. This verifies the contract functionality.

## Step 5: Start Frontend

Open a **third terminal** and run:

```bash
npm run frontend:dev
```

The frontend will start at `http://localhost:5173`.

## Step 6: Configure MetaMask

1. **Install Rainbow Wallet** (or MetaMask) extension

2. **Add Localhost Network:**
   - Open Rainbow/MetaMask
   - Go to Settings → Networks → Add Network
   - Fill in:
     - **Network Name**: `Hardhat Local`
     - **RPC URL**: `http://127.0.0.1:8545`
     - **Chain ID**: `31337`
     - **Currency Symbol**: `ETH`

3. **Import Test Account:**
   - In Rainbow/MetaMask, go to Account → Import Account
   - Use one of the private keys from Step 2 (e.g., `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`)
   - The account will have 10000 ETH

4. **Connect Wallet:**
   - Open `http://localhost:5173`
   - Click "Connect Wallet" in the top-right corner
   - Select Rainbow/MetaMask
   - Switch to Hardhat Local network (Chain ID: 31337)
   - Approve connection

## Step 7: Test the Application

### Test Flow:

1. **Buy Tickets:**
   - Go to "Buy Tickets" tab
   - Enter a number between 11-99
   - Click "Buy Ticket for 0.0001 ETH"
   - Confirm transaction in wallet

2. **Draw Lottery (Owner Only):**
   - Switch to "Draw Lottery" tab
   - If you're the owner (first account), click "Draw Lottery"
   - Wait for transaction confirmation
   - Winning number will be displayed

3. **Check Winnings:**
   - Go to "Check Winnings" tab
   - Select the round
   - Click "Decrypt" on your tickets
   - If you won, click "Claim Prize!"

## Troubleshooting

### Contract Deployment Fails

- Ensure Hardhat node is running
- Wait 5-10 seconds after starting the node before deploying
- Check that port 8545 is not in use

### Frontend Can't Connect

- Verify contract address in `ui/src/config/contracts.ts`
- Ensure wallet is connected to Hardhat Local network (Chain ID: 31337)
- Check browser console for errors

### FHE Initialization Fails

- Ensure wallet is connected
- Check network is Hardhat Local (Chain ID: 31337)
- Verify Zama relayer is accessible

### Tests Fail

- Ensure Hardhat node is running
- Run `npm run compile` first
- Check that all dependencies are installed

## Next Steps

After successful local testing:

1. **Deploy to Sepolia Testnet:**
   ```bash
   npm run deploy:sepolia:full
   ```

2. **Run Sepolia Tests:**
   ```bash
   npm run test:sepolia
   ```

## Quick Reference

```bash
# Start Hardhat node
npx hardhat node

# Deploy to localhost
npm run deploy:localhost:full

# Run tests
npm test

# Start frontend
npm run frontend:dev

# Update frontend ABI manually
npm run sync:abi:localhost
```

## Notes

- All three terminals need to stay running:
  - Terminal 1: Hardhat node
  - Terminal 2: For deployment commands
  - Terminal 3: Frontend dev server

- Test accounts have 10000 ETH, enough for all testing

- Contract address is automatically synced to frontend after deployment


