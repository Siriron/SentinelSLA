import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGenLayer, TimeoutError } from '../hooks/useGenLayer';
import Field from '../components/Field';
import TxStatus, { TxState } from '../components/TxStatus';
import VerdictBadge from '../components/VerdictBadge';
import WalletButton from '../components/WalletButton';

interface CheckResult {
  check_id: number;
  status: string;
  verdict?: string;
  fix_substantiveness?: string;
  resolution_hours?: number;
}

export default function FileCheck() {
  const { account, writeContract, readContract, methods } = useGenLayer();
  const [repoUrl, setRepoUrl] = useState('');
  const [ghsaId, setGhsaId] = useState('');
  const [fileTx, setFileTx] = useState<TxState>({ status: 'idle' });
  const [resolveTx, setResolveTx] = useState<TxState>({ status: 'idle' });
  const [checkId, setCheckId] = useState<number | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);

  const canFile = repoUrl.trim() && /^GHSA-/i.test(ghsaId.trim()) && account;

  async function handleFile(e: React.FormEvent) {
    e.preventDefault();
    if (!canFile) return;
    setFileTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.fileComplianceCheck, [repoUrl.trim(), ghsaId.trim()]);
      setFileTx({ status: 'success', hash });
      // Reads this filer's own latest check_id back from the contract,
      // scoped to their own address — never inferred as
      // next_check_id - 1, which was a real race condition under
      // concurrent filers (any other write bumping next_check_id
      // between this transaction confirming and the read firing would
      // silently point at the wrong check).
      const latest = await readContract(methods.read.getLatestCheckId, [account]);
      if (latest.has_filed) {
        setCheckId(Number(latest.check_id));
      } else {
        setFileTx({ status: 'error', message: 'Filed, but could not read back the check ID. Refresh and check the explorer transaction.' });
      }
    } catch (err: any) {
      if (err instanceof TimeoutError) setFileTx({ status: 'timeout', hash: err.txHash });
      else setFileTx({ status: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  async function handleResolve() {
    if (checkId === null) return;
    setResolveTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.resolveCompliance, [checkId]);
      setResolveTx({ status: 'success', hash });
      const data = await readContract(methods.read.getCheck, [checkId]);
      setResult(data);
    } catch (err: any) {
      if (err instanceof TimeoutError) setResolveTx({ status: 'timeout', hash: err.txHash });
      else setResolveTx({ status: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Step two</div>
      <h1 className="font-mono text-2xl text-trace mb-3">File a compliance check</h1>
      <p className="font-sans text-sm text-tracedim mb-8 leading-relaxed">
        Reference a real GitHub Security Advisory against a repo with a registered SLA. The advisory ID is the
        only evidence you supply — everything the verdict depends on is fetched by the contract itself.
      </p>

      {!account && (
        <div className="border border-voidline rounded bg-voidraised px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <span className="font-sans text-sm text-tracedim">Connect a wallet to file a check.</span>
          <WalletButton />
        </div>
      )}

      {checkId === null && (
        <form onSubmit={handleFile} className="space-y-5">
          <Field
            label="Repository"
            value={repoUrl}
            onChange={setRepoUrl}
            placeholder="github.com/owner/repo"
            hint="Must already have a registered SLA."
          />
          <Field
            label="GHSA advisory ID"
            value={ghsaId}
            onChange={setGhsaId}
            placeholder="GHSA-xxxx-xxxx-xxxx"
          />
          <button
            type="submit"
            disabled={!canFile || fileTx.status === 'pending'}
            className="w-full font-mono text-sm px-4 py-3 rounded border border-phosphor/40 bg-phosphordim text-phosphor hover:bg-phosphor hover:text-void transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {fileTx.status === 'pending' ? 'Filing…' : 'File check'}
          </button>
        </form>
      )}

      <div className="mt-6">
        <TxStatus state={fileTx} />
      </div>

      {checkId !== null && !result && (
        <div className="mt-8 border-t border-voidline pt-8">
          <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Check #{checkId} filed</div>
          <p className="font-sans text-sm text-tracedim mb-5 leading-relaxed">
            Now trigger resolution — the contract fetches the advisory live from GitHub and runs independent
            AI consensus on it. This step calls a real LLM through multiple validators, so it takes noticeably
            longer than filing did.
          </p>
          <button
            onClick={handleResolve}
            disabled={resolveTx.status === 'pending'}
            className="w-full font-mono text-sm px-4 py-3 rounded border border-alarm/40 bg-alarmdim text-alarm hover:bg-alarm hover:text-void transition-colors disabled:opacity-40"
          >
            {resolveTx.status === 'pending' ? 'Reading GitHub, running consensus…' : 'Resolve compliance'}
          </button>
          <div className="mt-6">
            <TxStatus state={resolveTx} />
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8 border border-voidline rounded-lg bg-voidraised overflow-hidden">
          <div className="border-b border-voidline px-5 py-4 flex items-center justify-between">
            <span className="font-mono text-xs text-tracedim uppercase tracking-widest">Verdict</span>
            <VerdictBadge value={result.verdict ?? 'unverifiable'} />
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Fix evidence</div>
              <div className="font-mono text-sm text-trace capitalize">{result.fix_substantiveness || '—'}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Resolution</div>
              <div className="font-mono text-sm text-trace">
                {result.resolution_hours ? `${result.resolution_hours}h` : '—'}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5">
            <p className="font-sans text-xs text-tracedim leading-relaxed mb-3">
              Escrowed for a seven-day challenge window before it finalizes onto the reputation ledger.
            </p>
            <Link
              to={`/checks/${checkId}`}
              className="inline-block font-mono text-xs text-phosphor hover:text-trace underline underline-offset-2"
            >
              Track this check — challenge or finalize it →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
