import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import {
  STUDIONET_CONFIG,
  STUDIONET_CONTRACT_ADDRESS,
  RECEIPT_CONFIG,
  EXPLORER_TX_URL,
} from '../config/chains';
import SENTINEL_SLA_ABI_METHODS from '../lib/contractMethods';

// Builds an Error carrying the transaction hash and timeout state.
export class TimeoutError extends Error {
  txHash: string;
  isTimeout = true;

  constructor(hash: string) {
    super(
      `Consensus is taking longer than expected. Your transaction was submitted — check its status directly: ${EXPLORER_TX_URL(hash)}`
    );
    this.txHash = hash;
  }
}

// Switch the wallet to StudioNet only when a write operation is requested.
async function ensureChain() {
  const eth = (window as any).ethereum;

  if (!eth) return;

  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CONFIG.chainId }],
    });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [STUDIONET_CONFIG],
      });

      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CONFIG.chainId }],
      });
    } else if (err && err.code === -32002) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      throw err;
    }
  }
}

export function useGenLayer() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const readClientRef = useRef<any>(null);

  // Silently reconnect to an already-authorized wallet.
  useEffect(() => {
    const eth = (window as any).ethereum;

    if (!eth) return;

    eth
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts[0]) {
          setAccount(accounts[0]);
        }
      })
      .catch(() => {});

    const handleAccountsChanged = (accounts: string[]) => {
      setAccount(accounts[0] || null);
    };

    if (eth.on) {
      eth.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (eth.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const getReadClient = useCallback(() => {
    if (!readClientRef.current) {
      readClientRef.current = createClient({
        chain: studionet,
      });
    }

    return readClientRef.current;
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;

    if (!eth) {
      throw new Error(
        'No wallet extension found. Install a browser wallet to connect.'
      );
    }

    setConnecting(true);

    try {
      const accounts: string[] = await eth.request({
        method: 'eth_requestAccounts',
      });

      if (accounts[0]) {
        setAccount(accounts[0]);
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
  }, []);

  const getWriteClient = useCallback(async () => {
    const eth = (window as any).ethereum;

    if (!eth || !account) {
      throw new Error('Connect a wallet first.');
    }

    await ensureChain();

    const client = createClient({
      chain: studionet,
      account: createAccount(account as `0x${string}`),
      provider: eth,
    });

    if (typeof client.connect === 'function') {
      try {
        await client.connect('studionet');
      } catch {
        // Non-fatal. Continue without explicit connect.
      }
    }

    return client;
  }, [account]);

  const readContract = useCallback(
    async (functionName: string, args: any[] = []) => {
      const client = getReadClient();

      const result = await client.readContract({
        address: STUDIONET_CONTRACT_ADDRESS,
        functionName,
        args,
      });

      return typeof result === 'string' ? JSON.parse(result) : result;
    },
    [getReadClient]
  );

  const writeContract = useCallback(
    async (functionName: string, args: any[] = []): Promise<{ hash: string }> => {
      const client = await getWriteClient();

      const hash = await client.writeContract({
        address: STUDIONET_CONTRACT_ADDRESS,
        functionName,
        args,
        value: BigInt(0),
      });

      try {
        await client.waitForTransactionReceipt({
          hash,
          status: 'ACCEPTED' as any,
          retries: RECEIPT_CONFIG.retries,
          interval: RECEIPT_CONFIG.interval,
        });
      } catch {
        throw new TimeoutError(hash);
      }

      return { hash };
    },
    [getWriteClient]
  );

  return {
    account,
    connecting,
    connect,
    disconnect,
    readContract,
    writeContract,
    contractAddress: STUDIONET_CONTRACT_ADDRESS,
    methods: SENTINEL_SLA_ABI_METHODS,
  };
}
