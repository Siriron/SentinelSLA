import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenLayer } from '../hooks/useGenLayer';
import Field from '../components/Field';
import TxStatus, { TxState } from '../components/TxStatus';
import { TimeoutError } from '../hooks/useGenLayer';
import WalletButton from '../components/WalletButton';

export default function RegisterSla() {
  const { account, writeContract, methods } = useGenLayer();
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [ecosystem, setEcosystem] = useState('');
  const [slaHours, setSlaHours] = useState('');
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

  const canSubmit = repoUrl.trim() && ecosystem.trim() && Number(slaHours) > 0 && account;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.registerSla, [
        repoUrl.trim(),
        ecosystem.trim(),
        Number(slaHours),
      ]);
      setTx({ status: 'success', hash });
    } catch (err: any) {
      if (err instanceof TimeoutError) {
        setTx({ status: 'timeout', hash: err.txHash });
      } else {
        setTx({ status: 'error', message: err?.message ?? 'Unknown error' });
      }
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Step one</div>
      <h1 className="font-mono text-2xl text-trace mb-3">Register a resolution-time commitment</h1>
      <p className="font-sans text-sm text-tracedim mb-8 leading-relaxed">
        This locks a repo and a resolution window on-chain, before any advisory exists. Nothing about it can be
        reshaped later — that is what makes a later verdict mean something.
      </p>

      {!account && (
        <div className="border border-voidline rounded bg-voidraised px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <span className="font-sans text-sm text-tracedim">Connect a wallet to register an SLA.</span>
          <WalletButton />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Repository"
          value={repoUrl}
          onChange={setRepoUrl}
          placeholder="github.com/owner/repo"
          hint="The exact repo this commitment applies to."
        />
        <Field
          label="Ecosystem"
          value={ecosystem}
          onChange={setEcosystem}
          placeholder="npm, maven, pip, cargo…"
        />
        <Field
          label="Resolution window (hours)"
          type="number"
          value={slaHours}
          onChange={setSlaHours}
          placeholder="168"
          hint="Time from an advisory's publish date to its close date, per the GHSA record."
        />

        <button
          type="submit"
          disabled={!canSubmit || tx.status === 'pending'}
          className="w-full font-mono text-sm px-4 py-3 rounded border border-phosphor/40 bg-phosphordim text-phosphor hover:bg-phosphor hover:text-void transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {tx.status === 'pending' ? 'Submitting…' : 'Register commitment'}
        </button>
      </form>

      <div className="mt-6">
        <TxStatus state={tx} />
      </div>

      {tx.status === 'success' && (
        <button
          onClick={() => navigate('/file')}
          className="mt-4 font-mono text-xs text-tracedim hover:text-phosphor underline underline-offset-2"
        >
          File a compliance check next →
        </button>
      )}
    </div>
  );
}
