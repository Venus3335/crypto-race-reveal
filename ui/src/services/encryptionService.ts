import type { createInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { WalletClient } from "viem";

type ZamaInstance = Awaited<ReturnType<typeof createInstance>>;

const MIN_NUMBER = 100_000;
const MAX_NUMBER = 999_999;
const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function generateRandomSixDigits(): number {
  return Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
}

export async function encryptSixDigitNumber(instance: ZamaInstance, contractAddress: string, userAddress: string) {
  const encryptedInput = await instance
    .createEncryptedInput(contractAddress, userAddress)
    .add32(generateRandomSixDigits())
    .encrypt();

  return encryptedInput;
}

async function createSignature(instance: ZamaInstance, contractAddress: string, walletClient: WalletClient) {
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "7";
  const contractAddresses = [contractAddress];

  const keypair = instance.generateKeypair();
  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account unavailable. Please reconnect.");
  }

  const signature = await walletClient.signTypedData({
    account,
    domain: eip712.domain,
    primaryType: "UserDecryptRequestVerification",
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    message: eip712.message,
  });

  return {
    keypair,
    signature: signature.replace(/^0x/, ""),
    startTimestamp,
    durationDays,
  };
}

interface DecryptOptions {
  instance: ZamaInstance | null;
  encryptedHandle: string;
  contractAddress: string;
  userAddress: string;
  walletClient: WalletClient | undefined;
}

// Enhanced decryption with better error handling
export async function decryptNumber({ instance, encryptedHandle, contractAddress, userAddress, walletClient }: DecryptOptions) {
  if (!instance) throw new Error("Encryption service is not ready yet.");
  if (!walletClient) throw new Error("Wallet is unavailable. Please reconnect.");
  if (!encryptedHandle || encryptedHandle === ZERO_HANDLE) {
    throw new Error("No decryptable number is available yet.");
  }

  const { keypair, signature, startTimestamp, durationDays } = await createSignature(instance, contractAddress, walletClient);

  const handlePairs = [{ handle: encryptedHandle, contractAddress }];
  const result = await instance.userDecrypt(
    handlePairs,
    keypair.privateKey,
    keypair.publicKey,
    signature,
    [contractAddress],
    userAddress,
    startTimestamp,
    durationDays,
  );

  const decrypted = result[encryptedHandle];
  if (typeof decrypted === "undefined") {
    throw new Error("Decryption failed. Please try again later.");
  }

  return Number(decrypted);
}

export async function decryptBoolean(options: DecryptOptions) {
  const value = await decryptNumber(options);
  return value === 1;
}

