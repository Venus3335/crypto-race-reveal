import { useState } from 'react';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { ethers } from 'ethers';
import { getContractAddress, CONTRACT_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';

export function LotteryDraw() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const signer = useEthersSigner();

  // Read current round
  const { data: currentRound, refetch: refetchCurrentRound } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
  });

  // Read contract owner
  const { data: owner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'owner',
  });

  // Read total tickets in current round
  const { data: totalTickets } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'totalTicketsInRound',
    args: currentRound ? [currentRound] : undefined,
  });

  // Read prize pool for current round
  const { data: prizePool } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'prizePools',
    args: currentRound ? [currentRound] : undefined,
  });

  // Check if current round is drawn
  const { data: isRoundDrawn, refetch: refetchIsRoundDrawn } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'isRoundDrawn',
    args: currentRound ? [currentRound] : undefined,
  });

  // Read winning number for current round (if drawn)
  const { data: winningNumber, refetch: refetchWinningNumber } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWinningNumber',
    args: currentRound && isRoundDrawn ? [currentRound] : undefined,
  });

  // Get winning numbers for previous rounds (last 5)
  const previousRounds = currentRound ? Array.from({ length: Math.min(Number(currentRound) - 1, 5) }, (_, i) => Number(currentRound) - 1 - i) : [];


  const handleDrawLottery = async () => {
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet' });
      return;
    }

    if (!signer) {
      setMessage({ type: 'error', text: 'Signer not available' });
      return;
    }

    if (address?.toLowerCase() !== owner?.toLowerCase()) {
      setMessage({ type: 'error', text: 'Only the contract owner can draw the lottery' });
      return;
    }

    if (isRoundDrawn) {
      setMessage({ type: 'error', text: 'Current round has already been drawn' });
      return;
    }

    if (!totalTickets || totalTickets === 0n) {
      setMessage({ type: 'error', text: 'No tickets have been sold for this round' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Draw lottery using ethers
      const ethersSigner = await signer;
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, ethersSigner);
      const tx = await contract.drawLottery();

      setMessage({ type: 'info', text: 'Transaction sent, waiting for confirmation...' });

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setMessage({ type: 'success', text: 'Lottery drawn successfully!' });
      refetchCurrentRound();
      refetchIsRoundDrawn();
      refetchWinningNumber();
      setIsLoading(false);

    } catch (err) {
      console.error('Error drawing lottery:', err);
      setMessage({ type: 'error', text: 'Failed to draw lottery' });
      setIsLoading(false);
    }
  };

  const isOwner = address?.toLowerCase() === owner?.toLowerCase();
  const canDraw = isOwner && !isRoundDrawn && totalTickets && totalTickets > 0n;

  return (
    <div className="lottery-section">
      <h2 className="section-title">Lottery Draw</h2>

      {/* Current Round Info */}
      <div className="info-grid">
        <div className="info-card">
          <div className="info-card-title">Current Round</div>
          <div className="info-card-value">{currentRound?.toString() || '0'}</div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Total Tickets Sold</div>
          <div className="info-card-value">{totalTickets?.toString() || '0'}</div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Prize Pool</div>
          <div className="info-card-value">
            {prizePool ? `${formatEther(prizePool)} ETH` : '0 ETH'}
          </div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Status</div>
          <div className="info-card-value" style={{ color: isRoundDrawn ? '#059669' : '#f59e0b' }}>
            {isRoundDrawn ? 'Drawn' : 'Active'}
          </div>
        </div>
      </div>

      {/* Owner Info */}
      {!isOwner && (
        <div className="alert alert-info">
          Only the contract owner can draw the lottery. Current owner: {owner || 'Unknown'}
        </div>
      )}

      {/* Current Round Status */}
      {isRoundDrawn && winningNumber !== undefined && (
        <div className="status-card">
          <div className="status-title">Round {currentRound?.toString()} Results</div>
          <div className="winning-number">
            Winning Number: {winningNumber}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Draw Button */}
      {isOwner && (
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={handleDrawLottery}
            disabled={!canDraw || isLoading}
            className="lottery-button"
            style={{
              width: '100%',
              background: canDraw 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : undefined
            }}
          >
            {isLoading ? (
              <div className="loading-button">
                <div className="loading-spinner"></div>
                Processing...
              </div>
            ) : isRoundDrawn ? (
              'Round Already Drawn'
            ) : totalTickets === 0n ? (
              'No Tickets Sold'
            ) : (
              'Draw Lottery'
            )}
          </button>

          {canDraw && (
            <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem', textAlign: 'center' }}>
              This will randomly select a winning number and start a new round
            </div>
          )}
        </div>
      )}

      {/* Previous Results */}
      {previousRounds.length > 0 && (
        <div className="status-card">
          <div className="status-title">Previous Results</div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {previousRounds.map((round) => (
              <PreviousRoundResult key={round} roundNumber={round} />
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="status-card">
        <div className="status-title">How Drawing Works</div>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8' }}>
          <li>Only the contract owner can initiate a lottery draw</li>
          <li>At least one ticket must be sold to draw the lottery</li>
          <li>The winning number is randomly generated on-chain</li>
          <li>After drawing, a new round automatically starts</li>
          <li>Players can then check their tickets and claim prizes</li>
        </ul>
      </div>
    </div>
  );
}

function PreviousRoundResult({ roundNumber }: { roundNumber: number }) {
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  
  const { data: winningNumber } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWinningNumber',
    args: [BigInt(roundNumber)],
  });

  const { data: prizePool } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'prizePools',
    args: [BigInt(roundNumber)],
  });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 1rem',
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.9)',
      transition: 'all 0.3s ease'
    }}>
      <span style={{ fontWeight: '600' }}>Round {roundNumber}</span>
      <span style={{ color: '#667eea', fontWeight: '500' }}>
        Number: {winningNumber?.toString() || 'N/A'}
      </span>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        Pool: {prizePool ? `${formatEther(prizePool)} ETH` : '0 ETH'}
      </span>
    </div>
  );
}