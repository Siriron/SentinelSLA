import { EXPLORER_TX_URL } from '../config/chains';

export type TxState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; hash: string }
  | { status: 'timeout'; hash: string }
  | { status: 'error'; message: string };

export default function TxStatus({ state }: { state: TxState }) {
  if (state.status === 'idle') return null;

  if (state.status === 'pending') {
    return (
      <div className="border border-voidline rounded bg-voidraised px-4 py-3 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-trace animate-blink" aria-hidden="true" />
        <div>
          <div className="font-mono text-xs text-trace">Consensus in progress</div>
          <div className="font-sans text-[11px] text-tracedim mt-0.5">
            This can take several minutes — GenVM consensus runs through multiple rounds, especially for a write
            that triggers an AI judgment.
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'success') {
    return (
      <div className="border border-phosphor/30 rounded bg-phosphordim px-4 py-3">
        <div className="font-mono text-xs text-phosphor">Confirmed</div>
        <a
          href={EXPLORER_TX_URL(state.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-tracedim hover:text-phosphor underline underline-offset-2 mt-1 inline-block"
        >
          View transaction →
        </a>
      </div>
    );
  }

  if (state.status === 'timeout') {
    return (
      <div className="border border-static/30 rounded bg-staticdim px-4 py-3">
        <div className="font-mono text-xs text-static">Taking longer than expected</div>
        <div className="font-sans text-[11px] text-tracedim mt-1">
          Your transaction was submitted and may still succeed — GenVM consensus can genuinely take a few
          minutes.
        </div>
        <a
          href={EXPLORER_TX_URL(state.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] text-static hover:text-trace underline underline-offset-2 mt-1 inline-block"
        >
          Check its status on the explorer →
        </a>
      </div>
    );
  }

  return (
    <div className="border border-alarm/30 rounded bg-alarmdim px-4 py-3">
      <div className="font-mono text-xs text-alarm">Transaction failed</div>
      <div className="font-sans text-[11px] text-tracedim mt-1">{state.message}</div>
    </div>
  );
}
