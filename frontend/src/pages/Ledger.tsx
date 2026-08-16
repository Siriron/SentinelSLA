import { useState } from 'react';
import { useGenLayer } from '../hooks/useGenLayer';
import Field from '../components/Field';

interface ReputationData {
  maintainer: string;
  compliant_count: number;
  non_compliant_count: number;
  unverifiable_count: number;
  last_verdict: string;
  last_finalized_at: number;
}

function Stat({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="border border-voidline rounded bg-voidraised px-5 py-4">
      <div className={`font-mono text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="font-mono text-[11px] text-tracedim uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}

export default function Ledger() {
  const { readContract, methods } = useGenLayer();
  const [address, setAddress] = useState('');
  const [data, setData] = useState<ReputationData | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setState('loading');
    try {
      const result = await readContract(methods.read.getReputation, [address.trim()]);
      setData(result);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  const total = data ? data.compliant_count + data.non_compliant_count + data.unverifiable_count : 0;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">The record</div>
      <h1 className="font-mono text-2xl text-trace mb-3">Reputation ledger</h1>
      <p className="font-sans text-sm text-tracedim mb-8 leading-relaxed">
        Look up any address that has ever registered an SLA. Every finalized verdict against their repos is
        counted here, permanently, whether it favors them or not.
      </p>

      <form onSubmit={handleLookup} className="flex gap-3 items-end mb-10">
        <div className="flex-1">
          <Field label="Maintainer address" value={address} onChange={setAddress} placeholder="0x…" />
        </div>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="font-mono text-sm px-5 py-2.5 rounded border border-voidline bg-voidraised text-trace hover:border-phosphor/40 hover:text-phosphor transition-colors disabled:opacity-40"
        >
          {state === 'loading' ? 'Reading…' : 'Look up'}
        </button>
      </form>

      {state === 'error' && (
        <div className="border border-alarm/30 rounded bg-alarmdim px-4 py-3 font-sans text-sm text-tracedim">
          Could not read that address. Check it is a valid address and try again.
        </div>
      )}

      {data && total === 0 && (
        <div className="border border-voidline rounded bg-voidraised px-6 py-8 text-center">
          <div className="font-mono text-xs text-tracedim uppercase tracking-widest">No finalized record</div>
          <p className="font-sans text-sm text-tracedim mt-2">
            This address has not had a compliance check finalized yet — either none have been filed, or one is
            still in its challenge window.
          </p>
        </div>
      )}

      {data && total > 0 && (
        <div>
          <div className="font-mono text-xs text-tracedim mb-4 truncate">{data.maintainer}</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <Stat label="Compliant" value={data.compliant_count} colorClass="text-phosphor" />
            <Stat label="Non-compliant" value={data.non_compliant_count} colorClass="text-alarm" />
            <Stat label="Unverifiable" value={data.unverifiable_count} colorClass="text-static" />
          </div>
          <div className="border-t border-voidline pt-6">
            <div className="font-mono text-[11px] text-tracedim uppercase tracking-widest mb-3">
              Most recent finalized verdict
            </div>
            <div className="font-mono text-sm text-trace capitalize">{data.last_verdict || '—'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
