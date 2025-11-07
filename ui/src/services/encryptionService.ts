/**
 * Encryption Service
 * Handles all FHE encryption/decryption operations with retry logic and error handling
 */

import { ethers } from 'ethers';
import { CONTRACT_ABI } from '../config/contracts';

export interface EncryptionResult {
  handle: string;
  inputProof: string;
}

export interface DecryptionResult {
  value: number;
  success: boolean;
  error?: string;
}

export interface DecryptionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<DecryptionOptions> = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000,
};

/**
 * Encrypt a ticket number
 */
export async function encryptTicketNumber(
  instance: any,
  contractAddress: string,
  userAddress: string,
  ticketNumber: number
): Promise<EncryptionResult> {
  try {
    if (!instance || !contractAddress || !userAddress) {
      throw new Error('Missing required parameters for encryption');
    }

    if (ticketNumber < 11 || ticketNumber > 99) {
      throw new Error('Ticket number must be between 11 and 99');
    }

    // Create encrypted input
    const input = instance.createEncryptedInput(contractAddress, userAddress);
    input.add8(ticketNumber);
    const encryptedInput = await input.encrypt();

    if (!encryptedInput || !encryptedInput.handles || encryptedInput.handles.length === 0) {
      throw new Error('Encryption failed: No handle returned');
    }

    return {
      handle: encryptedInput.handles[0],
      inputProof: encryptedInput.inputProof,
    };
  } catch (error: any) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt ticket number: ${error.message || error.toString()}`);
  }
}

/**
 * Decrypt a ticket with retry logic
 */
export async function decryptTicket(
  instance: any,
  contractAddress: string,
  userAddress: string,
  signer: ethers.Signer,
  round: number,
  ticketIndex: number,
  options: DecryptionOptions = {}
): Promise<DecryptionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      if (!instance || !contractAddress || !userAddress || !signer) {
        throw new Error('Missing required parameters for decryption');
      }

      // Get the encrypted ticket handle from the contract
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
      const encryptedTicketHandle = await contract.getUserTicket(BigInt(round), BigInt(ticketIndex));

      if (!encryptedTicketHandle || encryptedTicketHandle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('Invalid ticket handle');
      }

      // Create keypair for decryption
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: encryptedTicketHandle,
          contractAddress: contractAddress,
        },
      ];

      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [contractAddress];

      // Create EIP712 signature for decryption
      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      // Perform user decryption with timeout
      const decryptionPromise = instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        userAddress,
        startTimeStamp,
        durationDays,
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Decryption timeout')), opts.timeout);
      });

      const result = await Promise.race([decryptionPromise, timeoutPromise]) as any;
      const decryptedValue = result[encryptedTicketHandle];

      if (decryptedValue === undefined || decryptedValue === null) {
        throw new Error('Decryption returned no value');
      }

      return {
        value: decryptedValue,
        success: true,
      };
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || error.toString();

      // Check if error is retryable
      const isRetryable = 
        errorMessage.includes('network') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT');

      if (!isRetryable || attempt >= opts.maxRetries) {
        return {
          value: 0,
          success: false,
          error: errorMessage,
        };
      }

      // Wait before retry
      if (attempt < opts.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
      }
    }
  }

  return {
    value: 0,
    success: false,
    error: lastError?.message || 'Decryption failed after all retries',
  };
}

/**
 * Batch decrypt multiple tickets
 */
export async function batchDecryptTickets(
  instance: any,
  contractAddress: string,
  userAddress: string,
  signer: ethers.Signer,
  round: number,
  ticketIndices: number[],
  options: DecryptionOptions = {}
): Promise<Map<number, DecryptionResult>> {
  const results = new Map<number, DecryptionResult>();

  for (const index of ticketIndices) {
    const result = await decryptTicket(
      instance,
      contractAddress,
      userAddress,
      signer,
      round,
      index,
      options
    );
    results.set(index, result);

    // Small delay between decrypts to avoid overwhelming the relayer
    if (index < ticketIndices.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Validate encryption service is ready
 */
export function validateEncryptionService(instance: any, isInitialized: boolean): { valid: boolean; error?: string } {
  if (!instance) {
    return { valid: false, error: 'Encryption instance not available' };
  }

  if (!isInitialized) {
    return { valid: false, error: 'Encryption service not initialized' };
  }

  if (typeof instance.createEncryptedInput !== 'function') {
    return { valid: false, error: 'Invalid encryption instance' };
  }

  if (typeof instance.generateKeypair !== 'function') {
    return { valid: false, error: 'Invalid decryption instance' };
  }

  return { valid: true };
}


