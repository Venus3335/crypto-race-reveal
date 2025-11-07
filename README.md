# ZLottery - Encrypted Lottery with FHE

A decentralized lottery platform with Fully Homomorphic Encryption (FHE) privacy protection. Users can buy encrypted lottery tickets, and their numbers remain private until they check for winnings.

## Features

- 🔐 **FHE Encryption**: Ticket numbers are encrypted using Zama's FHE technology
- 🎯 **Complete Privacy**: Your lottery numbers remain private on-chain
- 🔄 **Full Encryption/Decryption Cycle**: Complete MVP with data submission, viewing, and decryption
- 🎨 **Modern UI**: Beautiful, responsive design with Rainbow wallet integration
- 🌐 **Multi-Network Support**: Works on localhost and Sepolia testnet

## Project Structure

```
ZLottery-main/
├── contracts/              # Smart contract source code
│   └── ZLottery.sol        # Main lottery contract with FHE
├── test/                   # Test suites
│   ├── ZLottery.ts         # Local network tests
│   └── ZLotterySepolia.ts  # Sepolia testnet tests
├── deploy/                 # Deployment scripts
│   └── deployZLottery.ts   # ZLottery deployment script
├── scripts/                # Utility scripts
│   └── update-frontend-abi.js  # Auto-sync contract ABI to frontend
├── ui/                     # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── config/         # Configuration files
│   │   ├── hooks/          # Custom React hooks
│   │   └── styles/         # CSS styling
│   └── public/             # Static assets (logo, favicon)
└── hardhat.config.ts       # Hardhat configuration
```

## Core Business Flow (MVP)

1. **Data Submission**: Users buy tickets with encrypted numbers (11-99)
2. **Data Viewing**: Users can view their encrypted tickets and round information
3. **Data Decryption**: Users can decrypt their ticket numbers and check for winnings

All data operations are performed on-chain through the smart contract.

## Prerequisites

- Node.js >= 20
- npm >= 7.0.0
- Hardhat node (for local development)

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   cd ui && npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   INFURA_API_KEY=your_infura_api_key
   PRIVATE_KEY=your_private_key (for Sepolia deployment)
   ```

## Local Development

### 1. Start Hardhat Node

```bash
npx hardhat node
```

Keep this terminal running. The node will start on `http://localhost:8545`.

### 2. Deploy Contract to Local Network

In a new terminal:

```bash
npm run deploy:localhost:full
```

This will:
- Deploy the contract to localhost
- Automatically update the frontend configuration

### 3. Start Frontend

In another terminal:

```bash
npm run frontend:dev
```

The frontend will be available at `http://localhost:5173`.

### 4. Connect Wallet

1. Install Rainbow wallet extension
2. Add localhost network to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
3. Import a test account from Hardhat node (use the private keys shown)
4. Connect wallet in the frontend (top-right corner)

## Testing

### Local Network Tests

```bash
npm test
```

### Sepolia Testnet Tests

```bash
npm run test:sepolia
```

**Note**: Sepolia tests require the contract to be deployed first:
```bash
npm run deploy:sepolia
```

## Deployment

### Deploy to Sepolia Testnet

1. **Set up environment variables:**
   ```bash
   INFURA_API_KEY=your_infura_api_key
   PRIVATE_KEY=your_private_key
   ```

2. **Deploy contract:**
   ```bash
   npm run deploy:sepolia:full
   ```

3. **Update frontend:**
   The frontend configuration is automatically updated after deployment.

## Frontend Features

- **Rainbow Wallet Integration**: Connect wallet button in top-right corner
- **Custom Logo**: System logo and favicon
- **Modern UI**: Dark theme with glassmorphism effects
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Contract data updates automatically

## Smart Contract Functions

### User Functions

- `buyTicket(encryptedNumber, inputProof)`: Buy a lottery ticket with encrypted number
- `checkTicket(round, ticketIndex)`: Check if ticket matches winning number (returns encrypted boolean)
- `getUserTicket(round, ticketIndex)`: Get encrypted ticket number
- `getUserTicketCount(user, round)`: Get user's ticket count for a round
- `getWinningNumber(round)`: Get winning number for a round (after draw)

### Owner Functions

- `drawLottery()`: Draw the lottery for current round
- `emergencyWithdraw()`: Emergency fund withdrawal
- `transferOwnership(newOwner)`: Transfer contract ownership

## Configuration

### Frontend Configuration

- **Wagmi Config**: `ui/src/config/wagmi.ts`
- **Contract Config**: `ui/src/config/contracts.ts` (auto-updated after deployment)
- **Zama Instance**: `ui/src/hooks/useZamaInstance.ts` (supports localhost and Sepolia)

### Network Configuration

- **Localhost**: Chain ID 31337, RPC `http://localhost:8545`
- **Sepolia**: Chain ID 11155111, RPC `https://sepolia.infura.io/v3/YOUR_KEY`

## Troubleshooting

### Contract Deployment Fails

- Ensure Hardhat node is running
- Check network configuration in `hardhat.config.ts`
- Verify environment variables are set correctly

### Frontend Can't Connect

- Verify contract address in `ui/src/config/contracts.ts`
- Ensure wallet is connected to correct network
- Check browser console for errors

### FHE Initialization Fails

- Verify Zama relayer is accessible
- Check network configuration matches current chain
- Ensure wallet is connected before using FHE features

## License

MIT

## Acknowledgments

- [Zama](https://zama.ai/) for FHE technology
- [RainbowKit](https://rainbowkit.com/) for wallet integration
- [Wagmi](https://wagmi.sh/) for Ethereum React hooks
