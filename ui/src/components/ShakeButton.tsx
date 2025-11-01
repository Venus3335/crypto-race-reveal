import { useCallback, useMemo, useState } from "react";
import type { createInstance } from "@zama-fhe/relayer-sdk/bundle";
import { bytesToHex, parseEther } from "viem";
import type { WalletClient } from "viem";
import { CONTRACT_ABI } from "../config/contracts";
import { encryptSixDigitNumber } from "../services/encryptionService";
import "./ShakeButton.css";

type ZamaInstance = Awaited<ReturnType<typeof createInstance>>;

interface ShakeButtonProps {
  instance: ZamaInstance | null;
  contractAddress?: `0x${string}`;
  userAddress?: `0x${string}`;
  walletClient: WalletClient | undefined;
  disabled?: boolean;
  onSuccess(hash: `0x${string}`): void;
  onError(message: string): void;
}

export function ShakeButton({
  instance,
  contractAddress,
  userAddress,
  walletClient,
  disabled,
  onSuccess,
  onError,
}: ShakeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  const isReady = useMemo(() => {
    return Boolean(instance && contractAddress && userAddress && walletClient);
  }, [contractAddress, instance, userAddress, walletClient]);

  const handleShake = useCallback(async () => {
    if (!instance || !contractAddress || !userAddress || !walletClient) {
      onError("Please connect your wallet and wait for the encryption service to be ready.");
      return;
    }

    setIsLoading(true);
    setDebugMessage(null);

    try {
      const encryptedInput = await encryptSixDigitNumber(instance, contractAddress, userAddress);

      const handleBytes = encryptedInput.handles?.[0] ?? new Uint8Array([]);
      let handleHex = bytesToHex(handleBytes);
      if (handleHex.length < 66) {
        handleHex = `0x${handleHex.slice(2).padStart(64, "0")}`;
      } else if (handleHex.length > 66) {
        handleHex = `0x${handleHex.slice(2, 66)}`;
      }
      const proofHex = bytesToHex(encryptedInput.inputProof ?? new Uint8Array([]));

      setDebugMessage(
        [
          `handles: ${encryptedInput.handles.length}`,
          `proof: ${encryptedInput.inputProof.length} bytes`,
        ].join(" | "),
      );

      const txHash = await walletClient.writeContract({
        address: contractAddress,
        abi: CONTRACT_ABI,
        functionName: "shake",
        args: [handleHex, proofHex],
        value: parseEther("0.001"),
        account: userAddress,
        chain: walletClient.chain,
      });

      onSuccess(txHash);
    } catch (error) {
      console.error("Shake error:", error);

      if (error instanceof Error) {
        if (error.message.includes("RoundNotOpen")) {
          onError("The current round is not open for shaking.");
        } else if (error.message.includes("InvalidShakePayment")) {
          onError("Please ensure the 0.001 ETH shake fee is included.");
        } else {
          onError(error.message);
        }
      } else {
        onError("Shake failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, instance, onError, onSuccess, userAddress, walletClient]);

  return (
    <div className="shake-card">
      <div className="shake-card__content">
        <h3>Generate an Encrypted Number</h3>
        <p>
          Use the FHE service to produce a unique six-digit number. All numbers remain encrypted before the draw, preventing leaks.
        </p>
        <ul>
          <li>Shake fee: 0.001 ETH</li>
          <li>Multiple shakes per address are allowed</li>
          <li>Verify winnings immediately after the draw</li>
        </ul>
      </div>
      <div className="shake-card__action">
        <button
          type="button"
          className="shake-button"
          onClick={handleShake}
          disabled={!isReady || disabled || isLoading}
        >
          <span className="shake-button__label">{isLoading ? "Awaiting confirmation..." : "Shake Now"}</span>
          <span className="shake-button__fee">Fee 0.001 ETH</span>
        </button>
        {!isReady && <p className="shake-card__hint">Connect your wallet and wait for the encryption service to initialize.</p>}
        {debugMessage && <p className="shake-card__debug">{debugMessage}</p>}
      </div>
    </div>
  );
}

