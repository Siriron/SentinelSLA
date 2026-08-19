import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGenLayer, TimeoutError } from '../hooks/useGenLayer';
import { CHALLENGE_REASON_CODES } from '../lib/contractMethods';
import TxStatus, { TxState } from '../components/TxStatus';
import VerdictBadge from '../components/VerdictBadge';
import WalletButton from '../components/WalletButton';

interface CheckData {
  check_id: number;
  repo_key: string;
  repo_url: string;
  ghsa_id: string;
  filer: string;
  filed_at: number;
  status: string;
  verdict: string;
  fix_substantiveness: string;
  resolution_hours: number;
  reasoning_summary: string;
  reason_codes: string[];
  escrowed_at: number;
  challenge_window_ends: number;
  finalized_at: number;
  challenge_id: string;
}

interface ChallengeData {
  challenge_id: number;
  check_id: number;
  challenger: string;
  reason_code: string;
  statement: string;
  status: string;
  opened_at: number;
  resolved_at: number;
  original_verdict: string;
  final_verdict: string;
  resolution_summary: string;
}

const REASON_LABELS: Record<string, string> = {
  GHSA_RECORD_MISREAD: 'The advisory record was misread',
  FIX_REFERENCE_MISJUDGED: 'The linked fix was misjudged',
  TIMESTAMP_MISCALCULATED: 'Resolution time was miscalculated',
  ADVISORY_WITHDRAWN_SINCE: 'The advisory has since been withdrawn',
  WRONG_ADVISORY_FOR_REPO: 'This advisory does not apply to this repo',
};

function formatWindow(secondsLeft: number): string {
  if (secondsLeft <= 0) return 'closed';
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  return `${hours}h ${minutes}m remaining`;
}

export default function CheckDetail() {
  const { checkId: checkIdParam } = useParams<{ checkId: string }>();
  const checkId = Number(checkIdParam);
  const { account, writeContract, readContract, methods } = useGenLayer();

  const [check, setCheck] = useState<CheckData | null>(null);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const [reasonCode, setReasonCode] = useState<string>('');
  const [statement, setStatement] = useState('');
  const [challengeTx, setChallengeTx] = useState<TxState>({ status: 'idle' });
  const [resolveChallengeTx, setResolveChallengeTx] = useState<TxState>({ status: 'idle' });
  const [finalizeTx, setFinalizeTx] = useState<TxState>({ status: 'idle' });

  const loadCheck = useCallback(async () => {
    if (!Number.isFinite(checkId)) {
      setLoadError('Invalid check ID.');
      return;
    }
    try {
      const data = await readContract(methods.read.getCheck, [checkId]);
      setCheck(data);
      setLoadError(null);
      if (data.challenge_id) {
        try {
          const chData = await readContract(methods.read.getChallenge, [Number(data.challenge_id)]);
          setChallenge(chData);
        } catch {
          // A non-empty challenge_id always corresponds to a real challenge
          // record once open_challenge has run — a failed lookup here means
          // the read itself is transiently unavailable, not that the
          // challenge doesn't exist. Leave the prior challenge state (if
          // any) rather than clearing it on a transient read failure.
        }
      }
    } catch (err: any) {
      setLoadError(err?.message ?? 'Could not load this check.');
    }
  }, [checkId, readContract, methods]);

  useEffect(() => {
    loadCheck();
  }, [loadCheck]);

  // Keep the challenge-window countdown live without re-fetching the
  // chain every second — only the local clock needs to tick.
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(interval);
  }, []);

  const canSubmit = methods.write.openChallenge;

  async function handleOpenChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!reasonCode || !statement.trim() || !account) return;
    setChallengeTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.openChallenge, [checkId, reasonCode, statement.trim()]);
      setChallengeTx({ status: 'success', hash });
      await loadCheck();
    } catch (err: any) {
      if (err instanceof TimeoutError) setChallengeTx({ status: 'timeout', hash: err.txHash });
      else setChallengeTx({ status: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  async function handleResolveChallenge() {
    if (!check?.challenge_id) return;
    setResolveChallengeTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.resolveChallenge, [Number(check.challenge_id)]);
      setResolveChallengeTx({ status: 'success', hash });
      await loadCheck();
    } catch (err: any) {
      if (err instanceof TimeoutError) setResolveChallengeTx({ status: 'timeout', hash: err.txHash });
      else setResolveChallengeTx({ status: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  async function handleFinalize() {
    setFinalizeTx({ status: 'pending' });
    try {
      const { hash } = await writeContract(methods.write.finalizeCompliance, [checkId]);
      setFinalizeTx({ status: 'success', hash });
      await loadCheck();
    } catch (err: any) {
      if (err instanceof TimeoutError) setFinalizeTx({ status: 'timeout', hash: err.txHash });
      else setFinalizeTx({ status: 'error', message: err?.message ?? 'Unknown error' });
    }
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="border border-alarm/30 rounded bg-alarmdim px-4 py-3">
          <div className="font-mono text-xs text-alarm">Could not load check #{checkId}</div>
          <div className="font-sans text-xs text-tracedim mt-1">{loadError}</div>
        </div>
        <Link to="/file" className="mt-4 inline-block font-mono text-xs text-tracedim hover:text-phosphor underline underline-offset-2">
          ← File a new check
        </Link>
      </div>
    );
  }

  if (!check) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="font-mono text-xs text-tracedim animate-pulse">Loading check #{checkId}…</div>
      </div>
    );
  }

  const windowSecondsLeft = check.challenge_window_ends - now;
  const windowOpen = check.status === 'verdict_escrowed' && check.challenge_id === '' && windowSecondsLeft > 0;
  // A second challenge within the same original window is a real,
  // legitimate path this contract's state machine allows (the window
  // itself is never reset by resolve_challenge) — so a resolved
  // challenge_id does not by itself close the ability to challenge again,
  // only the window's own expiry does.
  const canChallengeNow =
    check.status === 'verdict_escrowed' &&
    windowSecondsLeft > 0 &&
    (check.challenge_id === '' || (challenge && challenge.status !== 'open'));
  const canFinalizeNow =
    check.status === 'verdict_escrowed' &&
    (check.challenge_id !== '' || windowSecondsLeft <= 0);
  const canResolveOpenChallenge = check.status === 'challenged' && challenge?.status === 'open';

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Check #{check.check_id}</div>
      <h1 className="font-mono text-2xl text-trace mb-1 break-all">{check.repo_url}</h1>
      <p className="font-mono text-sm text-tracedim mb-8">{check.ghsa_id}</p>

      <div className="border border-voidline rounded-lg bg-voidraised overflow-hidden mb-6">
        <div className="border-b border-voidline px-5 py-4 flex items-center justify-between">
          <span className="font-mono text-xs text-tracedim uppercase tracking-widest">Verdict</span>
          <VerdictBadge value={check.verdict || 'unverifiable'} />
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Fix evidence</div>
            <div className="font-mono text-sm text-trace capitalize">{check.fix_substantiveness || '—'}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Resolution</div>
            <div className="font-mono text-sm text-trace">
              {check.resolution_hours ? `${check.resolution_hours}h` : '—'}
            </div>
          </div>
        </div>
        {check.reasoning_summary && (
          <div className="px-5 pb-4">
            <p className="font-sans text-xs text-tracedim leading-relaxed">{check.reasoning_summary}</p>
          </div>
        )}
        <div className="border-t border-voidline px-5 py-3 flex items-center justify-between">
          <span className="font-mono text-[10px] text-tracedim uppercase tracking-widest">Status</span>
          <span className="font-mono text-xs text-trace capitalize">{check.status.replace(/_/g, ' ')}</span>
        </div>
        {check.status === 'verdict_escrowed' && (
          <div className="border-t border-voidline px-5 py-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-tracedim uppercase tracking-widest">Challenge window</span>
            <span className="font-mono text-xs text-trace">{formatWindow(windowSecondsLeft)}</span>
          </div>
        )}
      </div>

      {challenge && (
        <div className="border border-voidline rounded-lg bg-voidraised overflow-hidden mb-6">
          <div className="border-b border-voidline px-5 py-4 flex items-center justify-between">
            <span className="font-mono text-xs text-tracedim uppercase tracking-widest">Challenge #{challenge.challenge_id}</span>
            <VerdictBadge value={challenge.status} />
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Reason</div>
              <div className="font-sans text-sm text-trace">{REASON_LABELS[challenge.reason_code] ?? challenge.reason_code}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Statement</div>
              <p className="font-sans text-sm text-tracedim leading-relaxed">{challenge.statement}</p>
            </div>
            {challenge.resolution_summary && (
              <div>
                <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Resolution</div>
                <p className="font-sans text-sm text-tracedim leading-relaxed">{challenge.resolution_summary}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!account && (
        <div className="border border-voidline rounded bg-voidraised px-4 py-3 mb-6 flex items-center justify-between gap-4">
          <span className="font-sans text-sm text-tracedim">Connect a wallet to challenge or finalize this check.</span>
          <WalletButton />
        </div>
      )}

      {canResolveOpenChallenge && (
        <div className="border-t border-voidline pt-6 mb-6">
          <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Challenge open</div>
          <p className="font-sans text-sm text-tracedim mb-4 leading-relaxed">
            Independent AI consensus re-fetches the advisory and fix reference fresh and judges the challenge
            statement against them — this does not trust the original verdict or the challenger's framing alone.
          </p>
          <button
            onClick={handleResolveChallenge}
            disabled={resolveChallengeTx.status === 'pending'}
            className="w-full font-mono text-sm px-4 py-3 rounded border border-alarm/40 bg-alarmdim text-alarm hover:bg-alarm hover:text-void transition-colors disabled:opacity-40"
          >
            {resolveChallengeTx.status === 'pending' ? 'Re-deriving evidence, running consensus…' : 'Resolve challenge'}
          </button>
          <div className="mt-4">
            <TxStatus state={resolveChallengeTx} />
          </div>
        </div>
      )}

      {canChallengeNow && account && (
        <div className="border-t border-voidline pt-6 mb-6">
          <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Challenge this verdict</div>
          <form onSubmit={handleOpenChallenge} className="space-y-4">
            <label className="block">
              <span className="font-mono text-[11px] text-tracedim uppercase tracking-widest">Reason</span>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="mt-1.5 w-full bg-void border border-voidline rounded px-3 py-2.5 font-mono text-sm text-trace focus:border-phosphor/50 focus:outline-none transition-colors"
              >
                <option value="">Select a reason…</option>
                {CHALLENGE_REASON_CODES.map((code) => (
                  <option key={code} value={code}>{REASON_LABELS[code] ?? code}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[11px] text-tracedim uppercase tracking-widest">Statement</span>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                placeholder="What specifically was misjudged, and why?"
                rows={4}
                className="mt-1.5 w-full bg-void border border-voidline rounded px-3 py-2.5 font-mono text-sm text-trace placeholder:text-tracedim/50 focus:border-phosphor/50 focus:outline-none transition-colors resize-none"
              />
            </label>
            <button
              type="submit"
              disabled={!canSubmit || !reasonCode || !statement.trim() || challengeTx.status === 'pending'}
              className="w-full font-mono text-sm px-4 py-3 rounded border border-alarm/40 bg-alarmdim text-alarm hover:bg-alarm hover:text-void transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              {challengeTx.status === 'pending' ? 'Opening…' : 'Open challenge'}
            </button>
          </form>
          <div className="mt-4">
            <TxStatus state={challengeTx} />
          </div>
        </div>
      )}

      {canFinalizeNow && account && (
        <div className="border-t border-voidline pt-6 mb-6">
          <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">
            {check.challenge_id !== '' ? 'Challenge resolved' : 'Challenge window closed'}
          </div>
          <p className="font-sans text-sm text-tracedim mb-4 leading-relaxed">
            This applies the final verdict to the maintainer's reputation ledger. This step is permanent — the
            same advisory can never affect this repo's reputation again once finalized.
          </p>
          <button
            onClick={handleFinalize}
            disabled={finalizeTx.status === 'pending'}
            className="w-full font-mono text-sm px-4 py-3 rounded border border-phosphor/40 bg-phosphordim text-phosphor hover:bg-phosphor hover:text-void transition-colors disabled:opacity-40"
          >
            {finalizeTx.status === 'pending' ? 'Finalizing…' : 'Finalize to reputation ledger'}
          </button>
          <div className="mt-4">
            <TxStatus state={finalizeTx} />
          </div>
        </div>
      )}

      {windowOpen && !canChallengeNow && (
        <p className="font-sans text-xs text-tracedim">Waiting on the challenge window — nothing to do yet.</p>
      )}

      {check.status === 'finalized' && (
        <div className="border border-phosphor/30 rounded bg-phosphordim px-4 py-3">
          <div className="font-mono text-xs text-phosphor mb-1">Finalized</div>
          <p className="font-sans text-xs text-tracedim leading-relaxed mb-2">
            This verdict is permanently applied to the maintainer's reputation ledger.
          </p>
          <Link to="/ledger" className="font-mono text-xs text-phosphor hover:text-trace underline underline-offset-2">
            View the reputation ledger →
          </Link>
        </div>
      )}
    </div>
  );
}
