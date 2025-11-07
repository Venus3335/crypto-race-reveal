import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-left">
            <img 
              src="/logo.svg" 
              alt="ZLottery Logo" 
              className="header-logo"
            />
            <h1 className="header-title">
              ZLottery
            </h1>
          </div>
          <div className="header-right">
            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}