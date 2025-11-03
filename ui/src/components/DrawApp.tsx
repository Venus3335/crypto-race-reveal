import { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from "wagmi";

import { CONTRACT_ABI, getContractAddress } from "../config/contracts";
import { useZamaInstance } from "../hooks/useZamaInstance";
import { ShakeButton } from "./ShakeButton";
import { ResultDisplay } from "./ResultDisplay";
import { AdminPanel } from "./AdminPanel";
import { ParticipantsDecoder } from "./ParticipantsDecoder";
import "./DrawApp.css";

interface ToastMessage {
  type: "info" | "success" | "error";
  text: string;
}

export function DrawApp() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance(chainId);

  const contractAddress = useMemo(() => getContractAddress(chainId), [chainId]);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);
  const [latestShakeIndex, setLatestShakeIndex] = useState<number | null>(null);

  const { data: currentRound, refetch: refetchRound } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "currentRound",
  });

  const { data: isRoundOpen, refetch: refetchRoundOpen } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "isRoundOpen",
  });

  const { data: isRoundDrawn, refetch: refetchRoundDrawn } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "isRoundDrawn",
    args: currentRound ? [currentRound] : undefined,
    query: { enabled: Boolean(currentRound) },
  });

  const { data: participantCount, refetch: refetchParticipantCount } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getParticipantCount",
    args: currentRound ? [currentRound] : undefined,
    query: { enabled: Boolean(currentRound) },
  });

  const { data: totalShakes, refetch: refetchTotalShakes } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getTotalShakes",
    args: currentRound ? [currentRound] : undefined,
    query: { enabled: Boolean(currentRound) },
  });

  const { data: winningNumber, refetch: refetchWinningNumber } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getWinningNumber",
    args: currentRound && isRoundDrawn ? [currentRound] : undefined,
    query: { enabled: Boolean(currentRound && isRoundDrawn) },
  });

  const { data: userShakeCount, refetch: refetchUserShakeCount } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getUserShakeCount",
    args: currentRound && address ? [currentRound, address] : undefined,
    query: { enabled: Boolean(currentRound && address) },
  });

  const { isLoading: txLoading, isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({
    hash: pendingTxHash ?? undefined,
  });

  useEffect(() => {
    if (userShakeCount && userShakeCount > 0n) {
      setLatestShakeIndex(Number(userShakeCount - 1n));
    } else {
      setLatestShakeIndex(null);
    }
  }, [userShakeCount]);

  useEffect(() => {
    if (!txConfirmed || !pendingTxHash) return;

    setToast({ type: "success", text: "Transaction confirmed." });
    setPendingTxHash(null);
    triggerRefresh();
  }, [txConfirmed]);

  useEffect(() => {
    if (!txFailed || !pendingTxHash) return;

    setToast({ type: "error", text: "Transaction failed. Please try again." });
    setPendingTxHash(null);
  }, [txFailed]);

  useEffect(() => {
    const interval = setInterval(() => {
      triggerRefresh();
    }, 5000);

    return () => clearInterval(interval);
  });

  const triggerRefresh = useCallback(() => {
    refetchRound();
    refetchRoundOpen();
    refetchRoundDrawn();
    refetchParticipantCount();
    refetchTotalShakes();
    refetchUserShakeCount();
    refetchWinningNumber();
  }, [
    refetchParticipantCount,
    refetchRound,
    refetchRoundDrawn,
    refetchRoundOpen,
    refetchTotalShakes,
    refetchUserShakeCount,
    refetchWinningNumber,
  ]);

  const statusLabel = useMemo(() => {
    if (isRoundOpen) return "[OPEN] Shake channel active";
    if (isRoundDrawn) return "[DRAWN] Winning number published";
    return "[CLOSED] Waiting for draw";
  }, [isRoundOpen, isRoundDrawn]);

  const numericWinningNumber = useMemo(() => {
    if (winningNumber === null || winningNumber === undefined) return null;
    if (typeof winningNumber === "bigint") return Number(winningNumber);
    if (typeof winningNumber === "number") return winningNumber;
    try {
      return Number(winningNumber as unknown as bigint | number);
    } catch {
      return null;
    }
  }, [winningNumber]);

  const handleShakeSuccess = useCallback(
    (hash: `0x${string}`) => {
      setToast({ type: "info", text: "Transaction submitted. Waiting for confirmation..." });
      setPendingTxHash(hash);
      refetchUserShakeCount();
      refetchParticipantCount();
      refetchTotalShakes();
    },
    [refetchParticipantCount, refetchTotalShakes, refetchUserShakeCount],
  );

  const handleShakeError = useCallback((message: string) => {
    setToast({ type: "error", text: message });
  }, []);

  const handleStartNextRound = useCallback(() => {
    setToast({ type: "info", text: "Preparing the next round..." });
    triggerRefresh();
  }, [triggerRefresh]);

  const normalizeBigInt = (value: unknown) => (typeof value === "bigint" ? value : undefined);
  const currentRoundValue = normalizeBigInt(currentRound);
  const participantValue = normalizeBigInt(participantCount);
  const totalShakesValue = normalizeBigInt(totalShakes);
  const currentRoundLabel = currentRoundValue ? currentRoundValue.toString() : "--";
  const participantLabel = participantValue ? participantValue.toString() : "0";
  const totalShakesLabel = totalShakesValue ? totalShakesValue.toString() : "0";
  const winningNumberLabel = numericWinningNumber != null ? numericWinningNumber.toString() : "--";

  return (
    <div className="draw-app">
      <header className="draw-header">
        <div className="header-content">
          <div className="logo-group">
            <img src="/logo.svg" alt="Draw Lottery" className="brand-logo" />
            <div className="title-stack">
              <h1>Draw Lottery</h1>
              <p>A decentralized FHE-powered lottery that protects fairness and privacy.</p>
            </div>
          </div>
          <ConnectButton showBalance={false} label="Connect Wallet" accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} />
        </div>
      </header>

      <main className="draw-main">
        <section className="info-bar">
          <InfoCard label="Current Round" value={currentRoundLabel} />
          <InfoCard label="Participants" value={participantLabel} />
          <InfoCard label="Total Shakes" value={totalShakesLabel} />
          <InfoCard label="Winning Number" value={winningNumberLabel} emphasis={Boolean(isRoundDrawn)} />
          <InfoCard label="Round Status" value={statusLabel} emphasis />
        </section>

        {toast && (
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.text}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss alert">
              ×
            </button>
          </div>
        )}

        {txLoading && (
          <div className="alert alert-info">
            <div className="loading-spinner" /> Waiting for confirmation...
          </div>
        )}

        {zamaLoading && (
          <div className="alert alert-info">
            <div className="loading-spinner" /> Initializing encryption service...
          </div>
        )}

        {zamaError && <div className="alert alert-error">Encryption service error: {zamaError}</div>}

        {!isConnected || !contractAddress ? (
          <div className="connect-panel">
            <div className="connect-card">
              <h2>Connect your wallet to shake</h2>
              <p>Draw Lottery uses RainbowKit to provide a secure on-chain experience.</p>
              <ConnectButton label="Connect Wallet" />
            </div>
          </div>
        ) : (
          <div className="grid-layout">
            <section className="section-block shake-section">
              <header className="section-header">
                <h2>Participant Shake Area</h2>
                <p>Pay 0.001 ETH to receive an encrypted six-digit number. Every number stays private until the draw.</p>
              </header>

              <ShakeButton
                instance={instance}
                contractAddress={contractAddress}
                userAddress={address}
                walletClient={walletClient}
                disabled={Boolean(isRoundDrawn)}
                onSuccess={handleShakeSuccess}
                onError={handleShakeError}
              />

              <ResultDisplay
                instance={instance}
                contractAddress={contractAddress}
                walletClient={walletClient}
                userAddress={address}
                currentRound={currentRound ?? 0n}
                latestShakeIndex={latestShakeIndex}
                winningNumber={numericWinningNumber}
                isRoundDrawn={Boolean(isRoundDrawn)}
              />
            </section>

            <section className="section-block draw-section">
              <header className="section-header">
                <h2>Admin Draw Controls</h2>
                <p>Only the contract owner can close the round, reveal the winning number, and start the next round.</p>
              </header>

              <AdminPanel
                contractAddress={contractAddress}
                walletClient={walletClient}
                currentRound={currentRound ?? 0n}
                isRoundOpen={Boolean(isRoundOpen)}
                isRoundDrawn={Boolean(isRoundDrawn)}
                totalParticipants={participantCount ?? 0n}
                totalShakes={totalShakes ?? 0n}
                winningNumber={numericWinningNumber}
                onSuccess={triggerRefresh}
              />
            </section>

            <section className="section-block decoder-section">
              <header className="section-header">
                <h2>Number Decoder & Query</h2>
                <p>Review every shake in real time. After the draw, decrypt the numbers and confirm winners before the next round.</p>
              </header>

              <ParticipantsDecoder
                instance={instance}
                contractAddress={contractAddress}
                publicClient={publicClient}
                walletClient={walletClient}
                userAddress={address}
                currentRound={currentRound ?? 0n}
                winningNumber={numericWinningNumber}
                isRoundDrawn={Boolean(isRoundDrawn)}
                onStartNextRound={handleStartNextRound}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

interface InfoCardProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function InfoCard({ label, value, emphasis }: InfoCardProps) {
  return (
    <div className={`info-card${emphasis ? " info-card--emphasis" : ""}`}>
      <span className="info-card__label">{label}</span>
      <span className="info-card__value">{value}</span>
    </div>
  );
}


// Commit 2: feat(contract): Implement shake function for encrypted number submission

// Commit 4: feat(contract): Implement winning number generation logic

// Commit 6: feat(contract): Add events for number shaken and round closed

// Commit 8: feat(contract): Add view functions for round status queries

// Commit 10: fix(contract): Fix timestamp handling in events

// Commit 12: refactor(contract): Improve error messages and revert reasons

// Commit 14: test(contract): Add integration tests for multi-round scenarios

// Commit 16: feat(ui): Initialize React app with Vite and TypeScript

// Commit 18: feat(ui): Implement DrawApp main component structure

// Commit 20: feat(ui): Implement AdminPanel for round management

// Commit 22: feat(ui): Integrate FHEVM encryption service

// Commit 24: feat(ui): Add error boundary and loading states

// Commit 26: feat(ui): Add toast notifications for user feedback

// Commit 28: feat(ui): Add real-time contract event listening

// Commit 30: feat(ui): Add batch decryption functionality
