import { useEffect, useState } from "react";
import { JsonRpcProvider } from "ethers";
import { createInstance, initSDK } from "@zama-fhe/relayer-sdk/bundle";

type ZamaInstance = Awaited<ReturnType<typeof createInstance>>;

const LOCAL_RPC_URL = "http://127.0.0.1:8545";
const LOCAL_GATEWAY_CHAIN_ID = 55815;
const LOCAL_VERIFIER_DECRYPTION = "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64";
const LOCAL_VERIFIER_INPUT = "0x812b06e1CDCE800494b79fFE4f925A504a9A9810";

export function useZamaInstance(chainId?: number) {
  const [instance, setInstance] = useState<ZamaInstance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function createMockInstance(): Promise<ZamaInstance> {
      const provider = new JsonRpcProvider(LOCAL_RPC_URL);
      const metadata = await provider.send("fhevm_relayer_metadata", []);
      if (
        !metadata?.ACLAddress ||
        !metadata?.InputVerifierAddress ||
        !metadata?.KMSVerifierAddress ||
        !metadata?.gatewayChainId
      ) {
        throw new Error("FHEVM metadata is not available on the local Hardhat node.");
      }

      const { MockFhevmInstance } = await import("@fhevm/mock-utils");
      return MockFhevmInstance.create(provider, provider, {
        aclContractAddress: metadata.ACLAddress,
        chainId: metadata.chainId ?? 31337,
        gatewayChainId: metadata.gatewayChainId ?? LOCAL_GATEWAY_CHAIN_ID,
        inputVerifierContractAddress: metadata.InputVerifierAddress,
        kmsContractAddress: metadata.KMSVerifierAddress,
        verifyingContractAddressDecryption: LOCAL_VERIFIER_DECRYPTION,
        verifyingContractAddressInputVerification: LOCAL_VERIFIER_INPUT,
      });
    }

    async function bootstrap() {
      if (!chainId) {
        setInstance(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await initSDK();

        const created = await createMockInstance();

        if (!disposed) {
          setInstance(created);
        }
      } catch (err) {
        console.error("Failed to initialise FHE instance:", err);
        if (!disposed) {
          const message =
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Failed to initialise encryption service";
          setError(message);
        }
      } finally {
        if (!disposed) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      disposed = true;
    };
  }, [chainId]);

  return { instance, isLoading, error } as const;
}

