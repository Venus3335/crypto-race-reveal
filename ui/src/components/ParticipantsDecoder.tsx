import { useCallback, useEffect, useRef, useState } from "react";
import { parseAbiItem } from "viem";
import type { PublicClient, WalletClient } from "viem";
import { useWriteContract } from "wagmi";

import { CONTRACT_ABI } from "../config/contracts";
import { decryptNumber } from "../services/encryptionService";
import "./ParticipantsDecoder.css";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const MAX_LOG_RANGE = 900n;

const DEPLOYMENT_BLOCK = (() => {
  const raw = import.meta.env.VITE_DRAW_DEPLOY_BLOCK;
  if (!raw) return 0n;
  try {
    return BigInt(raw);
  } catch (error) {
    console.warn("Environment variable VITE_DRAW_DEPLOY_BLOCK is invalid. Falling back to 0.", error);
    return 0n;
  }
})();

export interface ParticipantRecord {
  address: string;
  shakeIndex: number;
  timestamp: number | null;
  encryptedNumber: string;
  decryptedNumber: number | null;
}

interface ParticipantsDecoderProps {
  instance: any;
  contractAddress?: `0x${string}`;
  publicClient: PublicClient | undefined;
  walletClient?: WalletClient;
  userAddress?: string;
  currentRound: bigint;
  winningNumber: number | null;
  isRoundDrawn: boolean;
  onStartNextRound(): void;
  onRecordsChange?(records: ParticipantRecord[]): void;
}

const numberShakenEvent = parseAbiItem(
  "event NumberShaken(address indexed user, uint256 indexed round, uint256 indexed shakeIndex, uint256 timestamp)",
);

export function ParticipantsDecoder({
  instance,
  contractAddress,
  publicClient,
  walletClient,
  userAddress,
  currentRound,
  winningNumber,
  isRoundDrawn,
  onStartNextRound,
  onRecordsChange,
}: ParticipantsDecoderProps) {
  const [records, setRecords] = useState<ParticipantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptingKey, setDecryptingKey] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [modalState, setModalState] = useState<{
    type: "winner" | "none" | null;
    winners: ParticipantRecord[];
  }>({ type: null, winners: [] });
  const [startBusy, setStartBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const recordsRef = useRef<ParticipantRecord[]>([]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const loadRecords = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    if (contractAddress.toLowerCase() === ZERO_ADDRESS) {
      setIsLoading(false);
      setRecords([]);
      setError("The contract address is not configured for this network. Please update contracts.ts.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const latestBlock = await publicClient.getBlockNumber();
      const suggestedFromBlock =
        DEPLOYMENT_BLOCK && DEPLOYMENT_BLOCK > 0n
          ? DEPLOYMENT_BLOCK
          : latestBlock > MAX_LOG_RANGE
            ? latestBlock - MAX_LOG_RANGE
            : 0n;

      const logs = (await publicClient.getLogs({
        address: contractAddress,
        event: numberShakenEvent,
        args: { round: currentRound },
        fromBlock: suggestedFromBlock,
        toBlock: "latest",
      })) as Array<{
        args: {
          user: string;
          shakeIndex: bigint;
          timestamp?: bigint;
        };
      }>;

      const existing = new Map<string, ParticipantRecord>();
      recordsRef.current.forEach((record) => {
        const key = `${record.address.toLowerCase()}-${record.shakeIndex}`;
        existing.set(key, record);
      });

      const fetched = await Promise.all(
        logs.map(async (log) => {
          const user = log.args?.user as string;
          const shakeIndex = Number(log.args?.shakeIndex ?? 0n);
          const key = `${user.toLowerCase()}-${shakeIndex}`;
          const previous = existing.get(key);

          let encrypted: string | null = previous?.encryptedNumber ?? null;
          if (!encrypted) {
            const result = (await publicClient.readContract({
              address: contractAddress,
              abi: CONTRACT_ABI,
              functionName: "getUserNumber",
              args: [currentRound, user as `0x${string}`, BigInt(shakeIndex)],
            })) as `0x${string}`;
            encrypted = result;
          }

          return {
            address: user,
            shakeIndex,
            timestamp: log.args?.timestamp ? Number(log.args.timestamp) : null,
            encryptedNumber: encrypted ?? "0x0",
            decryptedNumber: previous?.decryptedNumber ?? null,
          } satisfies ParticipantRecord;
        }),
      );

      fetched.sort((a, b) => {
        if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
        if (a.timestamp) return -1;
        if (b.timestamp) return 1;
        return a.shakeIndex - b.shakeIndex;
      });

      setRecords(fetched);
      onRecordsChange?.(fetched);
    } catch (err) {
      console.error("Failed to load shake records", err);
      setError(err instanceof Error ? err.message : "Unable to load shake records. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, currentRound, onRecordsChange, publicClient]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (!publicClient || !contractAddress || contractAddress.toLowerCase() === ZERO_ADDRESS) return;

    const unwatch = publicClient.watchContractEvent({
      address: contractAddress,
      abi: [numberShakenEvent],
      eventName: "NumberShaken",
      args: { round: currentRound },
      onLogs: () => loadRecords(),
    });

    return () => {
      unwatch?.();
    };
  }, [contractAddress, currentRound, loadRecords, publicClient]);

  const decryptRecord = useCallback(
    async (record: ParticipantRecord) => {
      if (!instance) {
        setError("Encryption service is not ready yet. Please try again.");
        return;
      }
      if (!contractAddress || !userAddress || !walletClient) {
        setError("Connect with the original participant wallet before decrypting.");
        return;
      }
      if (record.address.toLowerCase() !== userAddress.toLowerCase()) {
        setError("Only the wallet that submitted this shake can decrypt it.");
        return;
      }

      try {
        setDecryptingKey(`${record.address}-${record.shakeIndex}`);
        const value = await decryptNumber({
          instance,
          encryptedHandle: record.encryptedNumber,
          contractAddress,
          userAddress,
          walletClient,
        });

        setRecords((prev) =>
          prev.map((item) =>
            item.address === record.address && item.shakeIndex === record.shakeIndex
              ? { ...item, decryptedNumber: value }
              : item,
          ),
        );
      } catch (err) {
        console.error("Decryption failed", err);
        setError(err instanceof Error ? err.message : "Decryption failed. Please try again later.");
      } finally {
        setDecryptingKey(null);
      }
    },
    [contractAddress, instance, walletClient, userAddress],
  );

  const handleQueryWinners = useCallback(() => {
    setQuerying(true);
    try {
      if (winningNumber == null) {
        setModalState({ type: "none", winners: [] });
        return;
      }
      const winners = records.filter((record) => record.decryptedNumber === winningNumber);
      if (winners.length > 0) {
        setModalState({ type: "winner", winners });
      } else {
        setModalState({ type: "none", winners: [] });
      }
    } finally {
      setQuerying(false);
    }
  }, [records, winningNumber]);

  const handleStartNext = useCallback(async () => {
    if (!contractAddress || !walletClient?.account) {
      setError("Connect with the contract admin wallet before starting the next round.");
      return;
    }

    try {
      setStartBusy(true);
      setError(null);
      await writeContractAsync({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "startNewRound",
        account: walletClient.account.address,
      });
      setRecords([]);
      onStartNextRound();
    } catch (err) {
      console.error("startNewRound failed", err);
      setError(err instanceof Error ? err.message : "Failed to start the next round. Check admin permissions.");
    } finally {
      setStartBusy(false);
    }
  }, [contractAddress, onStartNextRound, walletClient, writeContractAsync]);

  return (
    <div className="decoder-panel">
      <div className="decoder-actions">
        <button type="button" className="decoder-btn" onClick={loadRecords} disabled={isLoading}>
          {isLoading ? "Syncing..." : "Refresh records"}
        </button>
        <button type="button" className="decoder-btn" onClick={handleQueryWinners} disabled={querying || !isRoundDrawn}>
          {querying ? "Searching..." : "Find winners"}
        </button>
        <button type="button" className="decoder-btn" onClick={handleStartNext} disabled={startBusy || !isRoundDrawn}>
          {startBusy ? "Processing..." : "Start next round"}
        </button>
      </div>

      {error && <div className="decoder-error">{error}</div>}

      <div className="records-grid">
        <div className="records-header">
          <span>Participant</span>
          <span>Shake #</span>
          <span>Timestamp</span>
          <span>Encrypted handle</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {records.length === 0 ? (
          <div className="empty-state">No shake records for this round yet.</div>
        ) : (
          records.map((record) => {
            const key = `${record.address}-${record.shakeIndex}`;
            const timestampText = record.timestamp ? new Date(record.timestamp * 1000).toLocaleString() : "--";
            const canDecrypt = userAddress && record.address.toLowerCase() === userAddress.toLowerCase();
            return (
              <div className="record-row" key={key}>
                <span className="mono" data-label="Participant">
                  {record.address}
                </span>
                <span data-label="Shake #">#{record.shakeIndex + 1}</span>
                <span data-label="Timestamp">{timestampText}</span>
                <span className="mono handle" data-label="Encrypted handle">
                  {record.encryptedNumber}
                </span>
                <span data-label="Status">
                  {record.decryptedNumber != null ? (
                    <span className="badge badge-success">{record.decryptedNumber}</span>
                  ) : (
                    <span className="badge">Encrypted</span>
                  )}
                </span>
                <span data-label="Action">
                  <button
                    type="button"
                    className="small-btn"
                    disabled={!canDecrypt || decryptingKey === key}
                    onClick={() => decryptRecord(record)}
                  >
                    {decryptingKey === key ? "Decrypting..." : "Decrypt my number"}
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      {modalState.type && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <header className="modal-header">
              <h3>{modalState.type === "winner" ? "Winning results" : "No winners yet"}</h3>
              <button type="button" className="modal-close" onClick={() => setModalState({ type: null, winners: [] })}>
                Back
              </button>
            </header>
            <div className="modal-body">
              {modalState.type === "winner" ? (
                <div className="modal-content">
                  <p className="modal-highlight">
                    Winning number: <span>{winningNumber ?? "--"}</span>
                  </p>
                  <p>The following addresses decrypted numbers matching the winning number:</p>
                  <ul className="winner-list">
                    {modalState.winners.map((winner) => (
                      <li key={`${winner.address}-${winner.shakeIndex}`}>
                        <span className="mono">{winner.address}</span> · Shake #{winner.shakeIndex + 1}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="modal-content">
                  <p className="modal-highlight">
                    Winning number: <span>{winningNumber ?? "--"}</span>
                  </p>
                  <p>No decrypted records match the winning number yet. Remind participants to decrypt their numbers.</p>
                </div>
              )}
            </div>
            <footer className="modal-footer">
              <button
                type="button"
                className="modal-close secondary"
                onClick={() => setModalState({ type: null, winners: [] })}
              >
                Back to panel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

