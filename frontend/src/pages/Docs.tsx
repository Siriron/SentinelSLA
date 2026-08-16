import { STUDIONET_CONTRACT_ADDRESS, EXPLORER_ADDRESS_URL } from '../config/chains';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-voidline pt-10 pb-4">
      <h2 className="font-mono text-xl text-trace mb-5">{title}</h2>
      <div className="font-sans text-sm text-tracedim leading-relaxed space-y-4">{children}</div>
    </section>
  );
}

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'contracts', label: 'Smart contracts' },
  { id: 'api', label: 'API reference' },
  { id: 'faq', label: 'FAQ' },
];

export default function Docs() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-[180px_1fr] gap-12">
      <nav className="hidden md:block sticky top-24 self-start" aria-label="Docs sections">
        <div className="font-mono text-[11px] text-tracedim uppercase tracking-widest mb-3">On this page</div>
        <ul className="space-y-2">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} className="font-mono text-xs text-tracedim hover:text-phosphor">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <h1 className="font-mono text-3xl text-trace mb-2">Documentation</h1>
        <p className="font-sans text-sm text-tracedim mb-10">
          Everything the contract actually does, stated plainly — including where it is genuinely limited.
        </p>

        <Section id="overview" title="Overview">
          <p>
            SentinelSLA is a reputation ledger for open-source maintainer security-response accountability. A
            maintainer commits to a resolution window for a repo before any advisory exists. When a real GitHub
            Security Advisory (GHSA) is published against that repo, anyone can file a compliance check
            referencing its advisory ID — never a URL, never a description either party could shape. The
            contract fetches the advisory directly from GitHub&rsquo;s own API and runs independent, multi-validator
            AI judgment against it. No GEN moves anywhere in this contract — the consequence is a permanent,
            public mark on a reputation ledger, not a financial stake.
          </p>
        </Section>

        <Section id="how-it-works" title="How it works">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong className="text-trace">register_sla</strong> locks a repo, an ecosystem tag, and a
              resolution-hours commitment on-chain.
            </li>
            <li>
              <strong className="text-trace">file_compliance_check</strong> references a real GHSA ID against a
              repo with a registered SLA.
            </li>
            <li>
              <strong className="text-trace">resolve_compliance</strong> fetches the advisory from GitHub&rsquo;s
              security-advisories API, judges resolution timing and fix substantiveness through independent
              validator re-derivation, and escrows the verdict for seven days.
            </li>
            <li>
              <strong className="text-trace">open_challenge</strong> / <strong className="text-trace">resolve_challenge</strong>{' '}
              let anyone contest an escrowed verdict during the window — a second, independent AI consensus
              round re-fetches the advisory fresh and can uphold, overturn, or reject the challenge.
            </li>
            <li>
              <strong className="text-trace">finalize_compliance</strong> applies the verdict to the
              maintainer&rsquo;s permanent reputation ledger once the window closes or a challenge resolves.
            </li>
          </ol>
        </Section>

        <Section id="architecture" title="Architecture">
          <p>
            Every judgment runs through GenVM&rsquo;s leader/validator consensus, using{' '}
            <code className="text-trace">gl.vm.run_nondet_unsafe</code> with a fully hand-written validator —
            not a black-box equivalence principle. Every field the verdict depends on (verdict, fix
            substantiveness, resolution hours, reason codes) is independently re-derived and compared, with
            named numeric tolerance where it applies. Nothing about the outcome is decided by the leader alone.
          </p>
          <p>
            Fix-reference commits are fetched as raw diffs, not rendered HTML pages, so the model reads actual
            code changes — added and removed lines, hunk headers — rather than a page shell with nothing
            substantive in it.
          </p>
        </Section>

        <Section id="contracts" title="Smart contracts">
          <p>
            Deployed on GenLayer StudioNet at{' '}
            <a
              href={EXPLORER_ADDRESS_URL(STUDIONET_CONTRACT_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-phosphor hover:underline font-mono"
            >
              {STUDIONET_CONTRACT_ADDRESS}
            </a>
            .
          </p>
          <p>
            Source: <code className="text-trace">contracts/sentinel_sla.py</code>. Full test suite:{' '}
            <code className="text-trace">tests/test_sentinel_sla.py</code>.
          </p>
        </Section>

        <Section id="api" title="API reference">
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs text-phosphor uppercase tracking-widest mb-2">Write methods</div>
              <ul className="space-y-1.5 font-mono text-xs text-tracedim">
                <li>register_sla(repo_url, ecosystem, sla_hours)</li>
                <li>file_compliance_check(repo_url, ghsa_id)</li>
                <li>resolve_compliance(check_id)</li>
                <li>open_challenge(check_id, reason_code, statement)</li>
                <li>resolve_challenge(challenge_id)</li>
                <li>finalize_compliance(check_id)</li>
              </ul>
            </div>
            <div>
              <div className="font-mono text-xs text-static uppercase tracking-widest mb-2">Read methods</div>
              <ul className="space-y-1.5 font-mono text-xs text-tracedim">
                <li>get_sla(repo_url)</li>
                <li>get_check(check_id)</li>
                <li>get_challenge(challenge_id)</li>
                <li>get_reputation(maintainer_address)</li>
                <li>get_next_check_id()</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="faq" title="FAQ">
          <div className="space-y-6">
            <div>
              <div className="font-mono text-sm text-trace mb-1">Why does "unverifiable" show up so often?</div>
              <p>
                GitHub&rsquo;s advisory API does not reliably populate a closed timestamp, even on fully reviewed,
                already-fixed advisories — confirmed directly against real advisories during this contract&rsquo;s own
                testing. Rather than guess at a resolution time the evidence does not actually support, the
                contract reports it honestly as unverifiable. This is a property of the upstream data, not a
                shortcoming in the judgment.
              </p>
            </div>
            <div>
              <div className="font-mono text-sm text-trace mb-1">Why resolution time, not response time?</div>
              <p>
                GitHub&rsquo;s advisory API has no field for when a maintainer first responded — only when an advisory
                was published and closed. Resolution time is a real, arguably stronger accountability signal,
                but it is a different claim than acknowledgment speed, and it is stated here rather than left to
                be discovered later.
              </p>
            </div>
            <div>
              <div className="font-mono text-sm text-trace mb-1">Is there a financial stake?</div>
              <p>No. No GEN moves at any point in this contract. The consequence is standing, not money.</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
