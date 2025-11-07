import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { ethers } from 'ethers';
import { getContractAddress, CONTRACT_ABI } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { encryptTicketNumber, validateEncryptionService } from '../services/encryptionService';

const TICKET_PRICE = '0.0001';
const MIN_NUMBER = 11;
const MAX_NUMBER = 99;

interface PurchaseHistory {
  round: bigint;
  ticketNumber: number;
  timestamp: number;
  txHash: string;
}

// Serialized version for localStorage (BigInt as string)
interface SerializedPurchaseHistory {
  round: string;
  ticketNumber: number;
  timestamp: number;
  txHash: string;
}

export function TicketPurchase() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const [ticketNumber, setTicketNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{ number: number; quantity: number } | null>(null);

  const { instance, isInitialized, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();
  const signer = useEthersSigner();

  // Read current round
  const { data: currentRound, refetch: refetchCurrentRound } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
  });

  // Read user's ticket count for current round
  const { data: userTicketCount, refetch: refetchUserTicketCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getUserTicketCount',
    args: address && currentRound ? [address, currentRound] : undefined,
  });

  // Read prize pool for current round
  const { data: prizePool } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'prizePools',
    args: currentRound ? [currentRound] : undefined,
  });

  // Read total tickets in current round
  const { data: totalTickets } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'totalTicketsInRound',
    args: currentRound ? [currentRound] : undefined,
  });

  // Check if round is drawn
  const { data: isRoundDrawn } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'isRoundDrawn',
    args: currentRound ? [currentRound] : undefined,
  });

  // Wait for transaction confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  // Load purchase history from localStorage
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`purchaseHistory_${address}`);
      if (stored) {
        try {
          const serialized: SerializedPurchaseHistory[] = JSON.parse(stored);
          // Convert serialized data back to PurchaseHistory (BigInt from string)
          const parsed: PurchaseHistory[] = serialized.map(item => ({
            ...item,
            round: BigInt(item.round),
          }));
          setPurchaseHistory(parsed);
        } catch (e) {
          console.error('Failed to load purchase history:', e);
        }
      }
    }
  }, [address]);

  // Save purchase history to localStorage
  const savePurchaseHistory = useCallback((purchase: PurchaseHistory) => {
    if (address) {
      const updated = [purchase, ...purchaseHistory].slice(0, 10); // Keep last 10
      setPurchaseHistory(updated);
      
      // Convert BigInt to string for JSON serialization
      const serialized: SerializedPurchaseHistory[] = updated.map(item => ({
        ...item,
        round: item.round.toString(),
      }));
      
      localStorage.setItem(`purchaseHistory_${address}`, JSON.stringify(serialized));
    }
  }, [address, purchaseHistory]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash && pendingPurchase) {
      setMessage({ 
        type: 'success', 
        text: `Successfully purchased ${pendingPurchase.quantity} ticket(s) with number ${pendingPurchase.number}!` 
      });
      setTxHash(null);
      setPendingPurchase(null);
      setTicketNumber('');
      setQuantity(1);
      refetchCurrentRound();
      refetchUserTicketCount();
      
      // Save to history
      savePurchaseHistory({
        round: currentRound || 1n,
        ticketNumber: pendingPurchase.number,
        timestamp: Date.now(),
        txHash: txHash,
      });
    }
  }, [isConfirmed, txHash, pendingPurchase, currentRound, refetchCurrentRound, refetchUserTicketCount, savePurchaseHistory]);

  const handlePurchaseTicket = async () => {
    if (!instance || !isInitialized || !signer || !address) {
      setMessage({ type: 'error', text: 'Please ensure wallet is connected and FHE is initialized' });
      return;
    }

    const number = parseInt(ticketNumber);
    if (isNaN(number) || number < MIN_NUMBER || number > MAX_NUMBER) {
      setMessage({ type: 'error', text: `Please enter a valid number between ${MIN_NUMBER} and ${MAX_NUMBER}` });
      return;
    }

    if (quantity < 1 || quantity > 10) {
      setMessage({ type: 'error', text: 'Quantity must be between 1 and 10' });
      return;
    }

    if (isRoundDrawn) {
      setMessage({ type: 'error', text: 'Current round has already been drawn. Please wait for the next round.' });
      return;
    }

    // Show confirmation dialog
    setPendingPurchase({ number, quantity });
    setShowConfirmDialog(true);
  };

  const confirmPurchase = async () => {
    if (!pendingPurchase || !instance || !isInitialized || !signer || !address) return;

    setShowConfirmDialog(false);
    setIsLoading(true);
    setMessage(null);

    try {
      // Validate encryption service
      const validation = validateEncryptionService(instance, isInitialized);
      if (!validation.valid) {
        throw new Error(validation.error || 'Encryption service validation failed');
      }

      // Purchase tickets one by one (for simplicity, can be optimized to batch)
      const ethersSigner = await signer;
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, ethersSigner);
      
      const transactions = [];
      for (let i = 0; i < pendingPurchase.quantity; i++) {
        // Encrypt ticket number using service
        const encryptedInput = await encryptTicketNumber(
          instance,
          contractAddress,
          address,
          pendingPurchase.number
        );

        // Purchase ticket
        const tx = await contract.buyTicket(
          encryptedInput.handle,
          encryptedInput.inputProof,
          {
            value: parseEther(TICKET_PRICE)
          }
        );
        transactions.push(tx);
      }

      // Wait for the last transaction
      const lastTx = transactions[transactions.length - 1];
      setTxHash(lastTx.hash);
      setMessage({ type: 'info', text: `Transaction sent! Purchasing ${pendingPurchase.quantity} ticket(s)...` });

      // Wait for confirmation
      const receipt = await lastTx.wait();
      console.log('Transaction confirmed:', receipt);

    } catch (err: any) {
      console.error('Error purchasing ticket:', err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      let userMessage = 'Failed to purchase ticket';
      if (errorMessage.includes('encrypt') || errorMessage.includes('EncryptedInput')) {
        userMessage = 'Failed to encrypt ticket number. Please check FHE initialization.';
      } else if (errorMessage.includes('user rejected')) {
        userMessage = 'Transaction was rejected by user.';
      } else if (errorMessage.includes('insufficient funds')) {
        userMessage = 'Insufficient funds. Please ensure you have enough ETH.';
      } else if (errorMessage.includes('revert')) {
        userMessage = `Transaction failed: ${errorMessage}`;
      } else {
        userMessage = `Error: ${errorMessage}`;
      }
      
      setMessage({ type: 'error', text: userMessage });
      setPendingPurchase(null);
      setIsLoading(false);
    }
  };

  const handleNumberChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized.length <= 2) {
      setTicketNumber(sanitized);
    }
  };

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setQuantity(num);
    } else if (value === '') {
      setQuantity(1);
    }
  };

  const totalCost = parseFloat(TICKET_PRICE) * quantity;
  // Button should be disabled if:
  // - Loading or confirming transaction
  // - No ticket number entered
  // - FHE not initialized
  // - Round is already drawn
  // - No wallet connected
  // - No signer available
  const isButtonDisabled = isLoading || isConfirming || !ticketNumber || !isInitialized || isRoundDrawn || !address || !signer;
  const isInputDisabled = isLoading || isConfirming || !isInitialized || isRoundDrawn;

  return (
    <div className="lottery-section">
      <h2 className="section-title">Buy Lottery Tickets</h2>

      {/* FHE Initialization Status */}
      {isZamaLoading && (
        <div className="alert alert-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
            <span>Initializing encryption service... Please wait.</span>
          </div>
        </div>
      )}
      {zamaError && (
        <div className="alert alert-error">
          <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
            ❌ Encryption Service Error
          </div>
          <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            {zamaError}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
            <strong>Troubleshooting:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', lineHeight: '1.6' }}>
              <li>Ensure wallet is connected</li>
              <li>Check network connection</li>
              <li>Verify you're on the correct network</li>
              <li>Try refreshing the page</li>
            </ul>
          </div>
        </div>
      )}

      {/* Game Info */}
      <div className="info-grid">
        <div className="info-card">
          <div className="info-card-title">Current Round</div>
          <div className="info-card-value">{currentRound?.toString() || '0'}</div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Ticket Price</div>
          <div className="info-card-value">{TICKET_PRICE} ETH</div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Your Tickets</div>
          <div className="info-card-value">{userTicketCount?.toString() || '0'}</div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Total Tickets</div>
          <div className="info-card-value">{totalTickets?.toString() || '0'}</div>
        </div>
      </div>

      {/* Prize Pool */}
      {prizePool && prizePool > 0n && (
        <div className="status-card">
          <div className="status-title">Current Prize Pool</div>
          <div className="status-value" style={{ fontSize: '1.5rem', fontWeight: '700' }}>
            {formatEther(prizePool)} ETH
          </div>
        </div>
      )}

      {/* Round Status */}
      {isRoundDrawn && (
        <div className="alert alert-info">
          ⚠️ Current round has been drawn. Please wait for the next round to start.
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Transaction Status */}
      {isConfirming && (
        <div className="alert alert-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
            <span>Waiting for transaction confirmation...</span>
          </div>
          {txHash && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
              TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </div>
          )}
        </div>
      )}

      {/* Purchase Form */}
      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="ticket-number-input">
            Lottery Number ({MIN_NUMBER}-{MAX_NUMBER})
          </label>
          <input
            id="ticket-number-input"
            type="text"
            inputMode="numeric"
            value={ticketNumber}
            onChange={(e) => handleNumberChange(e.target.value)}
            onKeyDown={(e) => {
              if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true) ||
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
              }
              if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
              }
            }}
            placeholder={`Enter number between ${MIN_NUMBER} and ${MAX_NUMBER}`}
            className="form-input"
            maxLength={2}
            disabled={isInputDisabled}
            style={{
              cursor: isInputDisabled ? 'not-allowed' : 'text',
              opacity: isInputDisabled ? 0.6 : 1,
              pointerEvents: isInputDisabled ? 'none' : 'auto'
            }}
          />
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
            🔒 Your number will be encrypted and kept private until you check for winnings.
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="quantity-input">
            Quantity (1-10)
          </label>
          <input
            id="quantity-input"
            type="number"
            min="1"
            max="10"
            value={quantity}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="form-input"
            disabled={isInputDisabled}
          />
          <div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
            Total Cost: <strong>{totalCost.toFixed(4)} ETH</strong>
          </div>
        </div>
      </div>

      <button
        onClick={handlePurchaseTicket}
        disabled={isButtonDisabled}
        className="lottery-button"
        style={{ width: '100%', marginTop: '1rem' }}
      >
        {isLoading || isConfirming ? (
          <div className="loading-button">
            <div className="loading-spinner"></div>
            {isConfirming ? 'Confirming...' : 'Processing...'}
          </div>
        ) : (
          `Buy ${quantity} Ticket${quantity > 1 ? 's' : ''} for ${totalCost.toFixed(4)} ETH`
        )}
      </button>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingPurchase && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Confirm Purchase</h3>
            <div style={{ marginBottom: '1.5rem', lineHeight: '1.8' }}>
              <p>You are about to purchase:</p>
              <ul style={{ paddingLeft: '1.5rem' }}>
                <li><strong>{pendingPurchase.quantity}</strong> ticket(s)</li>
                <li>Number: <strong>{pendingPurchase.number}</strong></li>
                <li>Total Cost: <strong>{totalCost.toFixed(4)} ETH</strong></li>
                <li>Round: <strong>{currentRound?.toString() || 'N/A'}</strong></li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingPurchase(null);
                }}
                className="lottery-button"
                style={{ flex: 1, background: 'rgba(107, 114, 128, 0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmPurchase}
                className="lottery-button"
                style={{ flex: 1 }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History */}
      {purchaseHistory.length > 0 && (
        <div className="status-card" style={{ marginTop: '2rem' }}>
          <div className="status-title">Recent Purchases</div>
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
            {purchaseHistory.slice(0, 5).map((purchase, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  fontSize: '0.875rem'
                }}
              >
                <span>Round {purchase.round.toString()}</span>
                <span style={{ color: '#667eea', fontWeight: '600' }}>#{purchase.ticketNumber}</span>
                <span style={{ opacity: 0.7 }}>
                  {new Date(purchase.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div className="status-card" style={{ marginTop: '2rem' }}>
        <div className="status-title">Game Rules</div>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8' }}>
          <li>Choose a number between {MIN_NUMBER} and {MAX_NUMBER}</li>
          <li>Each ticket costs {TICKET_PRICE} ETH</li>
          <li>You can purchase up to 10 tickets at once</li>
          <li>Your number is encrypted and kept private</li>
          <li>When the lottery is drawn, you can check if you won</li>
          <li>Winners get the entire prize pool for that round</li>
        </ul>
      </div>
    </div>
  );
}
