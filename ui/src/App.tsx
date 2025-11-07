import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from './config/wagmi';
import { ZLotteryApp } from './components/ZLotteryApp';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="en">
            <div style={{
              minHeight: '100vh',
              backgroundColor: '#0f0f0f',
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(102, 126, 234, 0.15) 0%, #0f0f0f 50%), radial-gradient(circle at 80% 70%, rgba(118, 75, 162, 0.15) 0%, #0f0f0f 50%)',
              color: '#ffffff'
            }}>
              <ZLotteryApp />
            </div>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App
