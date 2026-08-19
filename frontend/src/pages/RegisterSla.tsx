import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenLayer } from '../hooks/useGenLayer';
import Field from '../components/Field';
import TxStatus, { TxState } from '../components/TxStatus';
import { TimeoutError } from '../hooks/useGenLayer';
import WalletButton from '../components/WalletButton';

// Mirrors the contract's own _parse_repo_url — used only to preview the
// exact proof-file path a maintainer needs to have in place before
// submitting, so a failing registration transaction (a real, on-chain
// consensus round) isn't the first place they learn the format was
// wrong. The contract itself is the actual source of truth and re-parses
// this server-side regardless of what this preview shows.
function parseRepoForPreview(repoUrl: string): { owner: string; name: string } | null {
  let s = repoUrl.trim();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, '');
  if (s.startsWith('www.')) s = s.slice(4);
  if (!s.startsWith('github.com/')) return null;
  s = s.slice('github.com/'.length).replace(/\/+$/, '');
  if (s.endsWith('.git')) s = s.slice(0, -4);
  const parts = s.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}

export default function RegisterSla() {
  const { account, writeContract, methods } = useGenLayer();
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [ecosystem, setEcosystem] = useState('');
  const [slaHours, setSlaHours] = useState('');
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

  const canSubmit = repoUrl.trim() && ecosystem.trim() && Number(slaHours) > 0 && account;
  const parsedRepo = useMemo(() => parseRepoForPreview(repoUrl), [repoUrl]);
  const proofUrl = parsedRepo
    ? `https://raw.githubusercontent.com/${parsedRepo.owner}/${parsedRepo.name}/HEAD/SENTINELSLA.md`
    : null;

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

      <div className="border border-alarm/30 rounded bg-voidraised px-4 py-3 mb-6">
        <div className="font-mono text-xs text-alarm uppercase tracking-widest mb-2">Before you submit — prove you own this repo</div>
        <p className="font-sans text-sm text-tracedim leading-relaxed mb-2">
          The contract fetches your repo's default branch server-side and checks two things: that it's a real,
          existing GitHub repository, and that a file named <code className="text-trace">SENTINELSLA.md</code>{' '}
          exists in it containing your connected wallet address. Add that file — anywhere in it is fine, just
          include your address — and commit it before registering, or the transaction will fail.
        </p>
        {proofUrl ? (
          <p className="font-mono text-xs text-static break-all">
            Checked at: <a href={proofUrl} target="_blank" rel="noreferrer" className="text-phosphor underline underline-offset-2">{proofUrl}</a>
          </p>
        ) : (
          <p className="font-sans text-xs text-static">Enter a repository below to see the exact file path that will be checked.</p>
        )}
      </div>

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
