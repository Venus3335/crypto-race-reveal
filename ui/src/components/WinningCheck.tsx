import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { ethers } from 'ethers';
import { getContractAddress, CONTRACT_ABI } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { decryptTicket, batchDecryptTickets, validateEncryptionService } from '../services/encryptionService';

interface DecryptionState {
  value: number | null;
  isDecrypting: boolean;
  error: string | null;
  retryCount: number;
}

export function WinningCheck() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptionStates, setDecryptionStates] = useState<Map<number, DecryptionState>>(new Map());
  const [claimTxHash, setClaimTxHash] = useState<string | null>(null);
  const signer = useEthersSigner();
  const { instance, isInitialized, isLoading: isZamaLoading, error: zamaError } = useZamaInstance();

  // Read current round
  const { data: currentRound } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'currentRound',
  });

  // Read user ticket count for selected round
  const { data: userTicketCount, refetch: refetchUserTicketCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getUserTicketCount',
    args: address && selectedRound ? [address, BigInt(selectedRound)] : undefined,
  });

  // Check if selected round is drawn
  const { data: isRoundDrawn } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'isRoundDrawn',
    args: selectedRound ? [BigInt(selectedRound)] : undefined,
  });

  // Get winning number for selected round (if drawn)
  const { data: winningNumber } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getWinningNumber',
    args: selectedRound && isRoundDrawn ? [BigInt(selectedRound)] : undefined,
  });

  // Get prize pool for selected round
  const { data: prizePool } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'prizePools',
    args: selectedRound ? [BigInt(selectedRound)] : undefined,
  });

  // Check if user has claimed for selected round
  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'hasClaimed',
    args: address && selectedRound ? [BigInt(selectedRound), address] : undefined,
  });

  // Wait for claim transaction confirmation
  const { isLoading: isConfirmingClaim, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimTxHash as `0x${string}` | undefined,
  });

  // Handle claim confirmation
  useEffect(() => {
    if (isClaimConfirmed && claimTxHash) {
      setMessage({ type: 'success', text: 'Prize claimed successfully! 🎉' });
      setClaimTxHash(null);
      refetchHasClaimed();
      refetchUserTicketCount();
    }
  }, [isClaimConfirmed, claimTxHash, refetchHasClaimed, refetchUserTicketCount]);

  // Reset decryption states when round changes
  useEffect(() => {
    setDecryptionStates(new Map());
    setMessage(null);
  }, [selectedRound]);

  // Decrypt ticket using service
  const handleDecryptTicket = useCallback(async (ticketIndex: number): Promise<void> => {
    if (!instance || !isInitialized || !address || !signer) {
      setMessage({ type: 'error', text: 'Please ensure wallet is connected and FHE is initialized' });
      return;
    }

    // Validate encryption service
    const validation = validateEncryptionService(instance, isInitialized);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Encryption service validation failed' });
      return;
    }

    // Update state to show decrypting
    setDecryptionStates(prev => new Map(prev.set(ticketIndex, {
      value: null,
      isDecrypting: true,
      error: null,
      retryCount: 0
    })));

    try {
      const signerInstance = await signer;
      const result = await decryptTicket(
        instance,
        contractAddress,
        address,
        signerInstance,
        selectedRound,
        ticketIndex,
        {
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 30000
        }
      );

      if (result.success) {
        // Update state with success
        setDecryptionStates(prev => new Map(prev.set(ticketIndex, {
          value: result.value,
          isDecrypting: false,
          error: null,
          retryCount: 0
        })));

        setMessage({ type: 'success', text: `Ticket #${ticketIndex + 1} decrypted: ${result.value}` });
      } else {
        // Update state with error
        setDecryptionStates(prev => new Map(prev.set(ticketIndex, {
          value: null,
          isDecrypting: false,
          error: result.error || 'Decryption failed',
          retryCount: 3
        })));

        let userMessage = 'Failed to decrypt ticket';
        if (result.error?.includes('signature')) {
          userMessage = 'Failed to sign decryption request. Please approve the signature request.';
        } else if (result.error?.includes('user rejected')) {
          userMessage = 'Decryption request was rejected by user.';
        } else if (result.error?.includes('network') || result.error?.includes('timeout')) {
          userMessage = 'Network error. Please check your connection and try again.';
        } else {
          userMessage = `Decryption error: ${result.error}`;
        }
        
        setMessage({ type: 'error', text: userMessage });
      }
    } catch (err: any) {
      console.error('Error decrypting ticket:', err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      // Update state with error
      setDecryptionStates(prev => new Map(prev.set(ticketIndex, {
        value: null,
        isDecrypting: false,
        error: errorMessage,
        retryCount: 3
      })));

      setMessage({ type: 'error', text: `Decryption error: ${errorMessage}` });
    }
  }, [instance, isInitialized, address, signer, selectedRound]);

  // Batch decrypt all tickets
  const decryptAllTickets = useCallback(async () => {
    if (!userTicketCount || Number(userTicketCount) === 0 || !instance || !isInitialized || !address || !signer) {
      setMessage({ type: 'error', text: 'Please ensure wallet is connected and FHE is initialized' });
      return;
    }

    // Validate encryption service
    const validation = validateEncryptionService(instance, isInitialized);
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.error || 'Encryption service validation failed' });
      return;
    }

    setMessage({ type: 'info', text: 'Decrypting all tickets...' });
    
    const ticketIndices = Array.from({ length: Number(userTicketCount) }, (_, i) => i);
    
    // Update all states to decrypting
    ticketIndices.forEach(index => {
      setDecryptionStates(prev => new Map(prev.set(index, {
        value: null,
        isDecrypting: true,
        error: null,
        retryCount: 0
      })));
    });

    try {
      const signerInstance = await signer;
      const results = await batchDecryptTickets(
        instance,
        contractAddress,
        address,
        signerInstance,
        selectedRound,
        ticketIndices,
        {
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 30000
        }
      );

      // Update states with results
      results.forEach((result, index) => {
        setDecryptionStates(prev => new Map(prev.set(index, {
          value: result.success ? result.value : null,
          isDecrypting: false,
          error: result.success ? null : (result.error || 'Decryption failed'),
          retryCount: result.success ? 0 : 3
        })));
      });

      const successCount = Array.from(results.values()).filter(r => r.success).length;
      setMessage({ 
        type: successCount === ticketIndices.length ? 'success' : 'info', 
        text: `Decrypted ${successCount}/${ticketIndices.length} tickets` 
      });
    } catch (err: any) {
      console.error('Error batch decrypting tickets:', err);
      setMessage({ type: 'error', text: `Batch decryption error: ${err.message || err.toString()}` });
    }
  }, [userTicketCount, instance, isInitialized, address, signer, selectedRound]);

  const claimPrize = async (ticketIndex: number) => {
    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet' });
      return;
    }

    if (!signer) {
      setMessage({ type: 'error', text: 'Signer not available' });
      return;
    }

    if (!isRoundDrawn) {
      setMessage({ type: 'error', text: 'This round has not been drawn yet' });
      return;
    }

    if (hasClaimed) {
      setMessage({ type: 'error', text: 'You have already claimed for this round' });
      return;
    }

    if (!userTicketCount || ticketIndex >= Number(userTicketCount)) {
      setMessage({ type: 'error', text: 'Invalid ticket index' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage(null);

      // Claim prize using ethers
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, await signer);
      const tx = await contract.claimPrize(
        BigInt(selectedRound),
        BigInt(ticketIndex)
      );

      setClaimTxHash(tx.hash);
      setMessage({ type: 'info', text: 'Transaction sent, waiting for confirmation...' });

    } catch (err: any) {
      console.error('Error claiming prize:', err);
      const errorMessage = err?.message || err?.toString() || 'Unknown error';
      
      let userMessage = 'Failed to claim prize';
      if (errorMessage.includes('user rejected')) {
        userMessage = 'Transaction was rejected by user.';
      } else if (errorMessage.includes('revert')) {
        userMessage = `Transaction failed: ${errorMessage}`;
      } else {
        userMessage = `Error: ${errorMessage}`;
      }
      
      setMessage({ type: 'error', text: userMessage });
      setIsLoading(false);
    }
  };

  // Generate round options (current round and previous 4)
  const roundOptions = currentRound ? Array.from({ length: Math.min(Number(currentRound), 5) }, (_, i) => Number(currentRound) - i) : [];

  return (
    <div className="lottery-section">
      <h2 className="section-title">Check Your Tickets</h2>

      {/* FHE Initialization Status */}
      {isZamaLoading && (
        <div className="alert alert-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
            <span>Initializing decryption service... Please wait.</span>
          </div>
        </div>
      )}
      {zamaError && (
        <div className="alert alert-error">
          <div style={{ marginBottom: '0.5rem', fontWeight: '600' }}>
            ❌ Decryption Service Error
          </div>
          <div style={{ fontSize: '0.875rem' }}>{zamaError}</div>
        </div>
      )}

      {/* Round Selection */}
      <div className="form-group">
        <label className="form-label">Select Round</label>
        <select
          value={selectedRound}
          onChange={(e) => setSelectedRound(Number(e.target.value))}
          className="form-input"
        >
          <option value="">Select a round</option>
          {roundOptions.map(round => (
            <option key={round} value={round}>
              Round {round} {round === Number(currentRound) ? '(Current)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Round Results */}
      {selectedRound && isRoundDrawn && winningNumber !== undefined && (
        <div className="status-card" style={{ 
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)',
          border: '2px solid #667eea'
        }}>
          <div className="status-title">Round {selectedRound} Results</div>
          <div className="winning-number" style={{ fontSize: '2rem', fontWeight: '700', marginTop: '0.5rem' }}>
            🎯 Winning Number: {winningNumber}
          </div>
        </div>
      )}

      {/* Tickets List */}
      {userTicketCount && Number(userTicketCount) > 0 && (
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <label className="form-label" style={{ margin: 0 }}>Your Tickets for Round {selectedRound}</label>
            {isInitialized && (
              <button
                onClick={decryptAllTickets}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(102, 126, 234, 0.2)',
                  color: '#667eea',
                  border: '1px solid #667eea',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                Decrypt All
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
            {Array.from({ length: Number(userTicketCount) }, (_, index) => {
              const decryptionState = decryptionStates.get(index);
              const decryptedValue = decryptionState?.value ?? null;
              const isDecrypting = decryptionState?.isDecrypting ?? false;
              const decryptionError = decryptionState?.error;
              const isWinner = decryptedValue !== null && winningNumber !== undefined && decryptedValue === Number(winningNumber);

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    background: isWinner
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                      : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: isWinner ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    boxShadow: isWinner
                      ? '0 8px 24px rgba(102, 126, 234, 0.3)'
                      : '0 4px 16px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.3s ease',
                    transform: isWinner ? 'scale(1.02)' : 'scale(1)',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <span style={{ fontWeight: '500', minWidth: '70px', fontSize: '0.875rem' }}>
                      Ticket #{index + 1}:
                    </span>
                    {isDecrypting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                        <span style={{ opacity: 0.7 }}>Decrypting...</span>
                      </div>
                    ) : decryptionError ? (
                      <span style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                        Error: {decryptionError}
                      </span>
                    ) : (
                      <span style={{
                        fontFamily: 'monospace',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: decryptedValue !== null ? (isWinner ? '#667eea' : 'rgba(255, 255, 255, 0.9)') : 'rgba(255, 255, 255, 0.5)'
                      }}>
                        {decryptedValue !== null ? decryptedValue : '***'}
                      </span>
                    )}
                    {isWinner && (
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                      }}>
                        🎉 WINNER!
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {decryptedValue === null && !isDecrypting && (
                      <button
                        onClick={() => handleDecryptTicket(index)}
                        disabled={!isInitialized}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: isInitialized ? 'pointer' : 'not-allowed',
                          opacity: isInitialized ? 1 : 0.6,
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        Decrypt
                      </button>
                    )}
                    {decryptionError && (
                      <button
                        onClick={() => handleDecryptTicket(index)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#fca5a5',
                          border: '1px solid #fca5a5',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        Retry
                      </button>
                    )}
                    {decryptedValue !== null && isRoundDrawn && !hasClaimed && (
                      <button
                        onClick={() => claimPrize(index)}
                        disabled={isLoading || isConfirmingClaim}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isWinner
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          cursor: (isLoading || isConfirmingClaim) ? 'not-allowed' : 'pointer',
                          opacity: (isLoading || isConfirmingClaim) ? 0.6 : 1,
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          boxShadow: isWinner
                            ? '0 4px 12px rgba(16, 185, 129, 0.3)'
                            : '0 4px 12px rgba(107, 114, 128, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {isConfirmingClaim ? 'Claiming...' : (isWinner ? 'Claim Prize!' : 'Try Claim')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Round Info */}
      {selectedRound && (
        <div className="info-grid">
          <div className="info-card">
            <div className="info-card-title">Round Status</div>
            <div className="info-card-value" style={{ color: isRoundDrawn ? '#059669' : '#f59e0b' }}>
              {isRoundDrawn ? 'Drawn' : 'Pending'}
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-title">Your Tickets</div>
            <div className="info-card-value">{userTicketCount?.toString() || '0'}</div>
          </div>
          <div className="info-card">
            <div className="info-card-title">Prize Pool</div>
            <div className="info-card-value">
              {prizePool ? `${formatEther(prizePool)} ETH` : '0 ETH'}
            </div>
          </div>
          <div className="info-card">
            <div className="info-card-title">Claim Status</div>
            <div className="info-card-value" style={{ color: hasClaimed ? '#059669' : '#6b7280' }}>
              {hasClaimed ? 'Claimed' : 'Not Claimed'}
            </div>
          </div>
        </div>
      )}

      {/* No tickets */}
      {selectedRound && userTicketCount === 0n && (
        <div className="alert alert-info">
          You don't have any tickets for Round {selectedRound}.
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Claim Transaction Status */}
      {isConfirmingClaim && (
        <div className="alert alert-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
            <span>Waiting for claim transaction confirmation...</span>
          </div>
          {claimTxHash && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', opacity: 0.8 }}>
              TX: {claimTxHash.slice(0, 10)}...{claimTxHash.slice(-8)}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="status-card" style={{ marginTop: '2rem' }}>
        <div className="status-title">How to Check & Claim</div>
        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.8' }}>
          <li>Select a round to view your tickets for that round</li>
          <li>Your tickets are shown in encrypted form (***) to protect privacy</li>
          <li>Click "Decrypt" to reveal the actual number on each ticket</li>
          <li>Use "Decrypt All" to decrypt all tickets at once</li>
          <li>Once decrypted, winning tickets will be highlighted in purple</li>
          <li>Click "Claim Prize!" on winning tickets to claim your reward</li>
          <li>Decryption requires wallet signature for security</li>
        </ul>
      </div>

      {/* Recent Rounds */}
      <div className="status-card">
        <div className="status-title">Recent Rounds</div>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {roundOptions.slice(1).map((round) => (
            <RoundSummary key={round} roundNumber={round} />
          ))}
        </div>
        {roundOptions.length <= 1 && (
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
            No previous rounds to display
          </div>
        )}
      </div>
    </div>
  );
}

function RoundSummary({ roundNumber }: { roundNumber: number }) {
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

  const { data: totalTickets } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'totalTicketsInRound',
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
        Winning: {winningNumber?.toString() || 'N/A'}
      </span>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        Tickets: {totalTickets?.toString() || '0'}
      </span>
      <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        Pool: {prizePool ? `${formatEther(prizePool)} ETH` : '0 ETH'}
      </span>
    </div>
  );
}
