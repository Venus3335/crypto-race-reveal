import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import type { WalletClient } from "viem";

import { CONTRACT_ABI } from "../config/contracts";
import { decryptNumber } from "../services/encryptionService";
import "./ResultDisplay.css";

interface ResultDisplayProps {
  instance: any;
  contractAddress?: `0x${string}`;
  walletClient?: WalletClient;
  userAddress?: string;
  currentRound: bigint;
  latestShakeIndex: number | null;
  winningNumber: number | null;
  isRoundDrawn: boolean;
}

export function ResultDisplay({
  instance,
  contractAddress,
  walletClient,
  userAddress,
  currentRound,
  latestShakeIndex,
  winningNumber,
  isRoundDrawn,
}: ResultDisplayProps) {
  const [decryptedNumber, setDecryptedNumber] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: encryptedHandle, refetch } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getUserNumber",
    args:
      contractAddress && userAddress && latestShakeIndex !== null
        ? ([currentRound, userAddress as `0x${string}`, BigInt(latestShakeIndex)] as const)
        : undefined,
    query: {
      enabled: Boolean(contractAddress && userAddress && latestShakeIndex !== null),
    },
  });

  useEffect(() => {
    setError(null);
    setDecryptedNumber(null);
  }, [currentRound, latestShakeIndex]);

  const encryptedHandleHex = useMemo(() => {
    if (!encryptedHandle) return undefined;
    if (typeof encryptedHandle === "string") return encryptedHandle as `0x${string}`;
    if ((encryptedHandle as any)?.handle) {
      return (encryptedHandle as any).handle as `0x${string}`;
    }
    return undefined;
  }, [encryptedHandle]);

  const isWinner = useMemo(() => {
    if (winningNumber == null || decryptedNumber == null) return null;
    return winningNumber === decryptedNumber;
  }, [decryptedNumber, winningNumber]);

  const canDecrypt = Boolean(instance && walletClient && contractAddress && userAddress && encryptedHandleHex);

  const handleDecrypt = async () => {
    if (!canDecrypt) {
      setError("Encrypted data is not ready yet. Please try again shortly.");
      return;
    }

    if (!contractAddress || !userAddress || !walletClient || !encryptedHandleHex) return;

    try {
      setIsDecrypting(true);
      setError(null);
      const value = await decryptNumber({
        instance,
        encryptedHandle: encryptedHandleHex,
        contractAddress,
        userAddress,
        walletClient,
      });
      setDecryptedNumber(value);
    } catch (err) {
      console.error("Decrypt failed", err);
      setError(err instanceof Error ? err.message : "Decryption failed. Please try again.");
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="result-card">
      <header className="result-header">
        <h3>My Latest Shake</h3>
        <button type="button" onClick={() => refetch()} disabled={!contractAddress || !userAddress}>
          Refresh encrypted handle
        </button>
      </header>

      <dl className="result-info">
        <div>
          <dt>Current round</dt>
          <dd>{currentRound.toString()}</dd>
        </div>
        <div>
          <dt>Shake index</dt>
          <dd>{latestShakeIndex != null ? latestShakeIndex + 1 : "--"}</dd>
        </div>
        <div>
          <dt>Encrypted handle</dt>
          <dd className="mono">{encryptedHandleHex ?? "--"}</dd>
        </div>
      </dl>

      <button className="decrypt-button" type="button" onClick={handleDecrypt} disabled={!canDecrypt || isDecrypting}>
        {isDecrypting ? <span className="spinner" /> : "Decrypt my number"}
      </button>

      {error && <div className="result-error">{error}</div>}

      {decryptedNumber != null && (
        <div className="decrypted-panel">
          <h4>Decrypted result</h4>
          <p>{decryptedNumber}</p>
          {isWinner != null && (
            <div className={`winner-badge ${isWinner ? "winner-badge--success" : "winner-badge--neutral"}`}>
              {isWinner ? "Congratulations! You won this round." : "Not a winner this time. Better luck next round!"}
            </div>
          )}
          {winningNumber != null && <p className="winning-number">Winning number: {winningNumber}</p>}
        </div>
      )}

      {!isRoundDrawn && <p className="result-hint">The administrator will publish the winning number after the draw.</p>}
    </div>
  );
}

