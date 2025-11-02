import { useCallback, useMemo, useState } from "react";
import type { WalletClient } from "wagmi";
import { CONTRACT_ABI } from "../config/contracts";
import "./AdminPanel.css";

interface AdminPanelProps {
  contractAddress?: `0x${string}`;
  walletClient: WalletClient | undefined;
  currentRound: bigint;
  isRoundOpen: boolean;
  isRoundDrawn: boolean;
  totalParticipants: bigint;
  totalShakes: bigint;
  winningNumber: number | null;
  onSuccess(): void;
}

type AdminState = "idle" | "closing" | "drawing" | "starting";

export function AdminPanel({
  contractAddress,
  walletClient,
  currentRound,
  isRoundOpen,
  isRoundDrawn,
  totalParticipants,
  totalShakes,
  winningNumber,
  onSuccess,
}: AdminPanelProps) {
  const [state, setState] = useState<AdminState>("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isOwnerActionAvailable = useMemo(() => {
    return Boolean(contractAddress && walletClient);
  }, [contractAddress, walletClient]);

  const participantsLabel = useMemo(() => totalParticipants.toString(), [totalParticipants]);
  const shakeLabel = useMemo(() => totalShakes.toString(), [totalShakes]);

  const runWrite = useCallback(
    async (functionName: "closeRound" | "drawWinningNumber" | "startNewRound") => {
      if (!contractAddress || !walletClient) {
        setMessage("Connect with the contract deployer account before trying again.");
        return;
      }

      try {
        const txHash = await walletClient.writeContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName,
        });
        setLastTxHash(txHash);
        setMessage(functionName === "drawWinningNumber" ? "Winning number generated. Refresh shortly to view it." : null);
        onSuccess();
      } catch (error) {
        console.error(`${functionName} error`, error);
        if (error instanceof Error) {
          setMessage(error.message);
        } else {
          setMessage("Operation failed. Please confirm the current wallet has admin permissions.");
        }
      }
    },
    [contractAddress, onSuccess, walletClient],
  );

  const handleCloseRound = useCallback(async () => {
    setState("closing");
    setMessage(null);
    await runWrite("closeRound");
    setState("idle");
  }, [runWrite]);

  const handleDraw = useCallback(async () => {
    setState("drawing");
    setMessage(null);
    await runWrite("drawWinningNumber");
    setState("idle");
  }, [runWrite]);

  const handleStartNextRound = useCallback(async () => {
    setState("starting");
    setMessage(null);
    await runWrite("startNewRound");
    setState("idle");
  }, [runWrite]);

  return (
    <div className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <h3>Admin Console</h3>
          <p>Close round → draw winning number → start next round. Only the contract owner may perform these actions.</p>
        </div>
      </header>

      <div className="admin-panel__stats">
        <Stat label="Current Round" value={`#${currentRound.toString()}`} />
        <Stat label="Total Participants" value={participantsLabel} />
        <Stat label="Total Shakes" value={shakeLabel} />
        <Stat label="Winning Number" value={winningNumber != null ? winningNumber.toString() : "--"} highlight={isRoundDrawn} />
      </div>

      <div className="admin-panel__actions">
        <ActionButton
          label="Close Current Round"
          description="Stop accepting shakes and move to draw-ready state."
          disabled={!isOwnerActionAvailable || !isRoundOpen || state !== "idle"}
          loading={state === "closing"}
          onClick={handleCloseRound}
        />
        <ActionButton
          label="Draw Winning Number"
          description="Use on-chain randomness to generate a six-digit winning number."
          disabled={!isOwnerActionAvailable || isRoundOpen || isRoundDrawn || state !== "idle"}
          loading={state === "drawing"}
          onClick={handleDraw}
        />
        <ActionButton
          label="Start Next Round"
          description="After publishing the winning number, open a new shake round."
          disabled={!isOwnerActionAvailable || !isRoundDrawn || state !== "idle"}
          loading={state === "starting"}
          onClick={handleStartNextRound}
        />
      </div>

      {message && <div className="admin-panel__message">{message}</div>}
      {lastTxHash && (
        <div className="admin-panel__message">
          Latest transaction: {lastTxHash.slice(0, 10)}…{lastTxHash.slice(-8)}
        </div>
      )}
      {!isOwnerActionAvailable && <div className="admin-panel__hint">Connect the admin wallet to manage rounds.</div>}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function Stat({ label, value, highlight }: StatProps) {
  return (
    <div className={`admin-stat${highlight ? " admin-stat--highlight" : ""}`}>
      <span className="admin-stat__label">{label}</span>
      <span className="admin-stat__value">{value}</span>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  description: string;
  disabled: boolean;
  loading: boolean;
  onClick(): void;
}

function ActionButton({ label, description, disabled, loading, onClick }: ActionButtonProps) {
  return (
    <button type="button" className="admin-action" disabled={disabled} onClick={onClick}>
      <div className="admin-action__body">
        <span className="admin-action__label">{label}</span>
        <p>{description}</p>
      </div>
      <span className="admin-action__status">{loading ? "Executing..." : disabled ? "Unavailable" : "Run action"}</span>
    </button>
  );
}

