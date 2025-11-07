import { useState, useEffect } from 'react';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';
import { useChainId, useAccount } from 'wagmi';

export function useZamaInstance() {
  const [instance, setInstance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();
  const { isConnected, address } = useAccount();

  useEffect(() => {
    let mounted = true;

    const initZama = async () => {
      // Reset state if wallet disconnected
      if (!isConnected) {
        if (mounted) {
          setInstance(null);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Initializing Zama SDK...');
        console.log('Chain ID:', chainId);
        console.log('Wallet connected:', isConnected);
        console.log('Address:', address);
        console.log('window.ethereum:', !!window.ethereum);

        await initSDK();
        console.log('SDK initialized successfully');

        let config;
        // Use window.ethereum as network provider for all networks
        // This ensures FHE operations use the wallet's network provider
        // SepoliaConfig provides the coprocessor contract addresses for Sepolia testnet
        if (!window.ethereum) {
          throw new Error('window.ethereum is not available. Please install MetaMask or another Web3 wallet.');
        }

        config = {
          ...SepoliaConfig,
          network: window.ethereum,
        };
        
        console.log('Using SepoliaConfig with window.ethereum as network provider');

        console.log('Creating Zama instance...');
        const zamaInstance = await createInstance(config);
        console.log('Zama instance created successfully:', !!zamaInstance);

        if (mounted) {
          setInstance(zamaInstance);
          setError(null);
        }
      } catch (err: any) {
        console.error('Failed to initialize Zama instance:', err);
        const errorMessage = err?.message || err?.toString() || 'Unknown error';
        console.error('Error details:', {
          message: errorMessage,
          stack: err?.stack,
          name: err?.name
        });
        
        if (mounted) {
          setError(`Failed to initialize encryption service: ${errorMessage}`);
          setInstance(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Only initialize if wallet is connected
    if (isConnected && chainId) {
      initZama();
    } else {
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [chainId, isConnected, address]);

  return { 
    instance, 
    isLoading, 
    error, 
    isInitialized: !isLoading && !error && !!instance && isConnected 
  };
}