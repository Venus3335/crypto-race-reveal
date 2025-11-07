import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { defineChain } from 'viem';
import { http } from 'wagmi';

// Define localhost chain with correct Chain ID for Hardhat (31337)
const localhost = defineChain({
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545', 'http://localhost:8545'],
    },
  },
  testnet: true,
});

// WalletConnect projectId - optional for localhost development
// Get a free projectId from https://cloud.walletconnect.com/
// For localhost development, you can use a placeholder (warnings may appear but won't affect functionality)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'ZLottery - Encrypted Lottery',
  projectId,
  chains: [sepolia, localhost],
  ssr: false,
  transports: {
    [sepolia.id]: http(),
    [localhost.id]: http('http://localhost:8545'),
  },
});