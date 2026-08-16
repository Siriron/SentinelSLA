import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGenLayer } from '../hooks/useGenLayer';
import TraceReadout from '../components/TraceReadout';
import VerdictBadge from '../components/VerdictBadge';

interface CheckData {
  check_id: number;
  repo_url: string;
  ghsa_id: string;
  status: string;
  verdict: string;
  fix_substantiveness: string;
  resolution_hours: number;
  reasoning_summary: string;
}

function LiveReading() {
  const { readContract, methods } = useGenLayer();
  const [check, setCheck] = useState<CheckData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    readContract(methods.read.getCheck, [1])
      .then((data) => {
        if (!cancelled) {
          setCheck(data);
          setState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setState('empty');
      });
    return () => {
      cancelled = true;
    };
  }, [readContract, methods]);

  if (state === 'loading') {
    return (
      <div className="border border-voidline rounded-lg bg-voidraised p-8 animate-pulse">
        <div className="h-4 w-48 bg-voidline rounded mb-4" />
        <div className="h-3 w-full bg-voidline rounded mb-2" />
        <div className="h-3 w-2/3 bg-voidline rounded" />
      </div>
    );
  }

  if (state === 'empty' || !check) {
    return (
      <div className="border border-voidline rounded-lg bg-voidraised p-8 text-center">
        <div className="font-mono text-xs text-tracedim uppercase tracking-widest">No reading yet</div>
        <p className="font-sans text-sm text-tracedim mt-2">
          No compliance check has been filed on this contract yet.{' '}
          <Link to="/file" className="text-phosphor hover:underline">
            File the first one.
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="border border-voidline rounded-lg bg-voidraised overflow-hidden">
      <div className="border-b border-voidline px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono text-[11px] text-tracedim uppercase tracking-widest mb-1">Live from chain · check #{check.check_id}</div>
          <div className="font-mono text-sm text-trace">{check.repo_url}</div>
        </div>
        <VerdictBadge value={check.verdict} />
      </div>
      <div className="px-6 py-5 grid sm:grid-cols-3 gap-6">
        <div>
          <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Advisory</div>
          <div className="font-mono text-sm text-trace">{check.ghsa_id}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Fix evidence</div>
          <div className="font-mono text-sm text-trace capitalize">{check.fix_substantiveness || '—'}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] text-tracedim uppercase tracking-widest mb-1">Resolution</div>
          <div className="font-mono text-sm text-trace">
            {check.resolution_hours > 0 ? `${check.resolution_hours}h` : '—'}
          </div>
        </div>
      </div>
      {check.reasoning_summary && (
        <div className="px-6 pb-5">
          <p className="font-sans text-xs text-tracedim leading-relaxed border-t border-voidline pt-4">
            {check.reasoning_summary}
          </p>
        </div>
      )}
    </div>
  );
}

const HOW_IT_WORKS: { title: string; body: string }[] = [
  {
    title: 'A maintainer commits to a window',
    body: 'A repo and a resolution-time SLA are locked on-chain before any advisory exists — nothing about the commitment can be reshaped later by whoever ends up unhappy with the outcome.',
  },
  {
    title: 'An advisory is filed against a GHSA ID',
    body: 'Anyone can reference a real GitHub Security Advisory. The only input is the advisory ID — never a URL, never a description either party could shape.',
  },
  {
    title: 'The contract reads GitHub, not either party',
    body: 'Published, closed, and withdrawn timestamps come straight from the GHSA record itself. If a fix commit is referenced, its actual diff is fetched and judged against the vulnerability it claims to close.',
  },
  {
    title: 'Independent validators re-derive the verdict',
    body: 'Every field that decides the outcome — verdict, fix quality, resolution hours — is independently recomputed and compared, not just checked for the right shape.',
  },
  {
    title: 'A verdict is escrowed, then finalized',
    body: 'A seven-day window lets anyone challenge the reading before it becomes a permanent mark on the public ledger. No stake, no GEN at risk — only standing.',
  },
];

export default function Home() {
  return (
    <div>
      <section className="grid-field border-b border-voidline">
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="font-mono text-xs text-phosphor uppercase tracking-widest mb-4">
            Reading the record, live
          </div>
          <h1 className="font-mono text-4xl sm:text-5xl font-bold text-trace leading-tight max-w-3xl mb-6">
            A public clock on how fast maintainers actually fix what they said they would fix.
          </h1>
          <p className="font-sans text-base text-tracedim max-w-xl mb-10 leading-relaxed">
            SentinelSLA reads GitHub&rsquo;s own security-advisory records — never a maintainer&rsquo;s word for it — and
            keeps an on-chain, permanent account of who resolves published vulnerabilities inside the window
            they committed to.
          </p>

          <LiveReading />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">How it works</div>
        <h2 className="font-mono text-2xl text-trace mb-12">Five steps, none of them self-reported.</h2>

        <div className="space-y-8">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="flex gap-6 items-start">
              <div className="font-mono text-xs text-tracedim w-6 shrink-0 pt-1">{String(i + 1).padStart(2, '0')}</div>
              <div className="flex-1 border-b border-voidline pb-8">
                <h3 className="font-mono text-sm text-trace mb-2">{step.title}</h3>
                <p className="font-sans text-sm text-tracedim leading-relaxed max-w-xl">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-voidline">
        <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">The verdict itself</div>
        <h2 className="font-mono text-2xl text-trace mb-8">Three readings, never a forced binary.</h2>
        <TraceReadout
          events={[
            { label: 'Compliant', verdict: 'compliant', detail: 'Resolved inside the window, with a substantive, verifiable fix.' },
            { label: 'Non-compliant', verdict: 'non_compliant', detail: 'Late, or closed with no attributable remedy — speed alone is not compliance.' },
            { label: 'Unverifiable', verdict: 'unverifiable', detail: 'The advisory record does not yet support a resolution-time reading — most real advisories land here.' },
          ]}
        />
        <p className="font-sans text-xs text-tracedim mt-6 max-w-2xl leading-relaxed">
          In practice, most published advisories do not carry a closed timestamp yet — GitHub&rsquo;s own API leaves it
          unset more often than not, even on well-documented, fully resolved issues. Unverifiable is not a rare
          fallback here; it is the honest, common reading when the evidence itself is incomplete.
        </p>
      </section>

      <section className="border-t border-voidline">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <h2 className="font-mono text-2xl text-trace mb-4">Put a repo on the record.</h2>
          <p className="font-sans text-sm text-tracedim mb-8 max-w-md mx-auto">
            Registering costs nothing but a transaction. The commitment is public the moment it is made.
          </p>
          <Link
            to="/register"
            className="inline-block font-mono text-sm px-6 py-3 rounded border border-phosphor/40 bg-phosphordim text-phosphor hover:bg-phosphor hover:text-void transition-colors"
          >
            Register an SLA
          </Link>
        </div>
      </section>
    </div>
  );
}
