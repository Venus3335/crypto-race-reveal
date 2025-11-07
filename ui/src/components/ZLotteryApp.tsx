import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { TicketPurchase } from './TicketPurchase';
import { LotteryDraw } from './LotteryDraw';
import { WinningCheck } from './WinningCheck';
import '../styles/ZLotteryApp.css';

export function ZLotteryApp() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'purchase' | 'draw' | 'check'>('purchase');

  return (
    <div className="zlottery-app">
      <Header />

      <main className="main-content">
        {!isConnected ? (
          <div className="connect-wallet-container">
            <h2 className="connect-wallet-title">
              Connect Your Wallet
            </h2>
            <p className="connect-wallet-description">
              Please connect your wallet to access the ZLottery platform
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div>
            <div className="tab-navigation">
              <nav className="tab-nav">
                <button
                  onClick={() => setActiveTab('purchase')}
                  className={`tab-button ${activeTab === 'purchase' ? 'active' : 'inactive'}`}
                >
                  Buy Tickets
                </button>
                <button
                  onClick={() => setActiveTab('draw')}
                  className={`tab-button ${activeTab === 'draw' ? 'active' : 'inactive'}`}
                >
                  Draw Lottery
                </button>
                <button
                  onClick={() => setActiveTab('check')}
                  className={`tab-button ${activeTab === 'check' ? 'active' : 'inactive'}`}
                >
                  Check Winnings
                </button>
              </nav>
            </div>

            {activeTab === 'purchase' && <TicketPurchase />}
            {activeTab === 'draw' && <LotteryDraw />}
            {activeTab === 'check' && <WinningCheck />}
          </div>
        )}
      </main>
    </div>
  );
}