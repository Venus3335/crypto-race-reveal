import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { sepolia } from "wagmi/chains";
import { createConfig, http } from "wagmi";

export const localhost = {
  id: 31337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  testnet: true,
} as const;

const DEFAULT_PROJECT_ID = "00000000000000000000000000000000";
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "";

if (!projectId || projectId === "demo-project-id") {
  console.warn("WalletConnect project id is missing. Set VITE_WALLETCONNECT_PROJECT_ID in .env.local to remove this warning.");
}

const resolvedProjectId = projectId && projectId !== "demo-project-id" ? projectId : DEFAULT_PROJECT_ID;

const chains = [localhost, sepolia] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet],
    },
  ],
  {
    appName: "Draw Lottery",
    projectId: resolvedProjectId,
  },
);

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [localhost.id]: http(localhost.rpcUrls.default.http[0]),
    [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
  },
  ssr: false,
});

