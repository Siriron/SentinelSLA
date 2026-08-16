import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { STUDIONET_CONFIG, STUDIONET_CONTRACT_ADDRESS, RECEIPT_CONFIG, EXPLORER_TX_URL } from '../config/chains';
import SENTINEL_SLA_ABI_METHODS from '../lib/contractMethods';

// Confirmed pattern (Sigil, adapted): builds an Error carrying the tx hash
// and a timeout flag as real properties, not just a string message, so
// calling code can branch on it distinctly from a genuine failure.
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

// Confirmed pattern: switching the wallet's chain must happen at write
// time, never on every network glance, since that would trigger an
// unwanted wallet popup just from looking at a page.
async function ensureChain() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET_CONFIG.chainId }] });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [STUDIONET_CONFIG] });
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: STUDIONET_CONFIG.chainId }] });
    } else if (err && err.code === -32002) {
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}

export function useGenLayer() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const readClientRef = useRef<any>(null);

  // Confirmed pattern: silently check eth_accounts on mount (never
  // eth_requestAccounts, which would prompt) to reconnect without a click
  // if already authorized, and stay in sync if the wallet switches.
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts[0]) setAccount(accounts[0]);
      })
      .catch(() => {});
    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts[0] || null);
    if (eth.on) eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const getReadClient = useCallback(() => {
    if (!readClientRef.current) {
      readClientRef.current = createClient({ chain: studionet });
    }
    return readClientRef.current;
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      throw new Error('No wallet extension found. Install a browser wallet to connect.');
    }
    setConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts[0]) setAccount(accounts[0]);
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
    // Confirmed defensive pattern (present in real working code, not in
    // official SDK examples): only call if it exists, since contracts
    // built on SDK versions without it should never throw here.
    if (typeof client.connect === 'function') {
      try {
        await client.connect('studionet');
      } catch {
        // non-fatal — proceed without it
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
      // Confirmed: readContract returns a JSON string — always parse it.
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
        value: BigInt(0), // confirmed required even when unused
      });
      try {
        await client.waitForTransactionReceipt({
          hash,
          status: 'ACCEPTED',
          retries: RECEIPT_CONFIG.retries,
          interval: RECEIPT_CONFIG.interval,
        });
      } catch (waitError) {
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
