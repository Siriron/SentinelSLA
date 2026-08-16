import { useGenLayer } from '../hooks/useGenLayer';

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function WalletButton() {
  const { account, connecting, connect, disconnect } = useGenLayer();

  if (account) {
    return (
      <button
        onClick={disconnect}
        className="font-mono text-xs px-3 py-2 rounded border border-voidline bg-voidraised text-trace hover:border-phosphor/40 hover:text-phosphor transition-colors"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-phosphor mr-2 align-middle" aria-hidden="true" />
        {shorten(account)}
      </button>
    );
  }

  return (
    <button
      onClick={() => connect().catch((e) => alert(e.message))}
      disabled={connecting}
      className="font-mono text-xs px-3 py-2 rounded border border-voidline bg-voidraised text-trace hover:border-trace/40 transition-colors disabled:opacity-50"
    >
      {connecting ? 'Connecting…' : 'Connect wallet'}
    </button>
  );
}
