# Smart contracts

## Deployed address

| Network | Address |
|---|---|
| StudioNet | `0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6` |

Explorer: https://explorer-studio.genlayer.com/address/0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6

Bradbury is not deployed. This project targets StudioNet exclusively, by explicit standing convention rather than oversight.

## Concept

A maintainer commits, on-chain, to a resolution-time window (`sla_hours`) for a repo — before any advisory exists. `register_sla` verifies the repo is a real, existing GitHub repository and that the caller controls it, via a file committed to the repo containing their own wallet address, before the commitment is locked. When a real GitHub Security Advisory (GHSA) is later published against that repo, anyone can file a compliance check referencing the advisory's own GHSA ID — the contract rejects a filing if that advisory's own record doesn't concern the registered repo, and rejects re-filing the same advisory against the same repo once it has already been finalized. The contract fetches the advisory directly from GitHub's own security-advisories API — never a URL or description any party supplies — and runs independent, multi-validator AI consensus to judge two things: whether it was resolved inside the committed window, and whether the resolution is backed by a real, substantive fix. No GEN moves anywhere in this contract; the consequence is a permanent, public reputation ledger entry.

## Method reference

### Write methods

| Method | Args | Nondet? |
|---|---|---|
| `register_sla` | `repo_url, ecosystem, sla_hours` | No |
| `file_compliance_check` | `repo_url, ghsa_id` | No |
| `resolve_compliance` | `check_id` | Yes |
| `open_challenge` | `check_id, reason_code, statement` | No |
| `resolve_challenge` | `challenge_id` | Yes |
| `finalize_compliance` | `check_id` | No |

### View methods

| Method | Args | Returns |
|---|---|---|
| `get_sla` | `repo_url` | SLA record |
| `get_check` | `check_id` | Compliance check record |
| `get_challenge` | `challenge_id` | Challenge record |
| `get_reputation` | `maintainer_address` | Reputation counts |
| `get_next_check_id` | — | Next check ID (global counter — not safe for reading back a just-filed check_id under concurrent filers; use `get_latest_check_id` for that) |
| `get_latest_check_id` | `filer_address` | The given address's own most recently filed check_id, scoped to that filer — the safe replacement for inferring an ID from the global counter |

## Consensus design

Every nondet write uses `gl.vm.run_nondet_unsafe` with a fully hand-written `validator_fn` — not `gl.eq_principle.prompt_comparative`. This was a deliberate choice: an audited comparison contract (a 360-point Projects-track submission) used `prompt_comparative` with an equivalence principle that explicitly excluded score-bearing fields from the agreement check, meaning its leader alone decided the numbers that determined payout while validators only agreed on a coarse verdict bucket. Every field this contract's reputation delta depends on — verdict, fix substantiveness, resolution hours (within a named ±2h tolerance), and every reason code — is independently re-derived by each validator and compared directly, closing that gap.

## Confirmed live behavior (not just theoretical)

This contract is redeployed at a new address (`0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6`) to add canonical repository binding, a repository ownership check, and duplicate/invalid-filing rejection — see "What changed in this deployment" below. The evidence in this section is split accordingly: what was exercised against the prior deployment's identical, unmodified code paths, versus what is new here and has not yet been exercised at all.

**Carried forward — the underlying code is unchanged by this deployment, though the test runs themselves were performed against the prior address:**

- `resolve_compliance`'s core judgment logic — tested against three structurally different real GHSA advisories: one still open, one closed with a real, substantive fix commit, and one withdrawn as a false positive. All three produced the correct verdict branch, with clean five-validator consensus and zero problematic rotations.
- `resolve_challenge` — tested once, live, converged cleanly on the first attempt.
- The full `register_sla → file_compliance_check → resolve_compliance → open_challenge → resolve_challenge → finalize_compliance → get_reputation` lifecycle was run end to end, with the resulting reputation ledger entry confirmed correct.

**New in this deployment, not yet live-tested:**

- `register_sla`'s nondet round — the repo-existence check against GitHub's repos API, and the on-repo ownership-proof check. This is the one genuinely new nondet pattern in this fix: two plain fetches with a leader/validator re-derivation, no LLM call involved.
- The applicability check inside `resolve_compliance` that rejects a GHSA advisory whose own `source_code_location` field doesn't resolve to the registered repo.
- The duplicate-filing guard in `file_compliance_check` / close-out in `finalize_compliance`.
- `get_latest_check_id`, the new view replacing the global-counter-inference pattern.

These are structurally consistent with every confirmed rule in this project's nondet catalog, but that is a claim about the code as written, not a claim about live GenVM execution — treat this list as the priority order for Run and Debug testing before relying on this deployment further.

## What changed in this deployment

In response to portal reviewer feedback (steward: Pavel Kolosov) on the prior submission, requesting that advisory and fix references be bound to a canonical registered repository, that duplicate or invalid filings be rejected before they can affect reputation, that a repository-backed ownership check be added, and that the challenge/finalization flow be completed in the app with a safely-returned check ID:

- `register_sla` now parses `repo_url` into a canonical `owner/name` form, fetches GitHub's repos API to confirm the repository genuinely exists, and requires a file (`SENTINELSLA.md`) committed to the repo containing the caller's own wallet address before accepting the commitment — a repository-file challenge, verified server-side, never a submitter-typed claim.
- `resolve_compliance` now checks the fetched advisory's own `source_code_location` field against the registered repo before any judgment prompt is built, and hard-fails the transaction on a mismatch rather than producing a verdict for an inapplicable advisory.
- `file_compliance_check` now rejects re-filing a GHSA ID against a repo once that pair has already reached `finalize_compliance`, closing a path that could otherwise apply a second reputation delta for the same real-world event.
- The frontend now has a `/checks/:checkId` page wired to `open_challenge`, `resolve_challenge`, and `finalize_compliance` — previously present in the contract and method registry but never called from any page. A new `get_latest_check_id` view, scoped to the actual filer's address, replaces inferring a just-filed check's ID from the global `next_check_id` counter, which was a real race condition under concurrent filers.

## Known, deliberate limitations

- **GitHub's advisory API does not expose a first-response timestamp.** The SLA metric this contract judges is resolution time (`published_at` → `closed_at`), not acknowledgment time. This is a source limitation, verified directly against GitHub's REST API documentation before the contract was written, not an oversight discovered later.
- **`closed_at` is empirically often unset**, even on fully reviewed, well-documented, already-fixed advisories — confirmed live against multiple real advisories during this contract's own testing. `unverifiable` should be expected as a common real-world outcome, not a rare fallback.
- **The fix-substantiveness judgment can only reason about what GHSA's own advisory record links to.** A maintainer who resolves a vulnerability without referencing the fix back into the public advisory record is invisible to this contract.
- **`reasoning_summary` content validation is a length threshold**, not full criteria-based semantic validation — the verdict, fix-substantiveness, and resolution-hours fields are fully re-derived and compared; only the free-text explanation of the verdict is length-checked rather than content-checked.
- **No deadline/expiry automation** on unresolved compliance checks — a filed check can sit indefinitely if nobody calls `resolve_compliance`.
- **The ownership-proof check is a lightweight, on-chain-verifiable proxy for repository control, not an OAuth-based identity link.** Anyone who can commit to a repo (any collaborator with write access, not necessarily the original owner) can satisfy it. This is a deliberate scope choice — a real GitHub-identity-to-wallet binding would need off-chain auth infrastructure this contract does not have — not an oversight.
- **The applicability check depends on GHSA populating `source_code_location`** on the advisory record. This field's presence has not been independently confirmed across a broad sample of advisories the way `closed_at`'s absence was (see above) — if a real advisory omits it, `resolve_compliance` currently hard-rejects the filing rather than falling back to a softer check. Worth confirming empirically alongside the live-testing pass this deployment still needs.

## Bug fixes discovered through live testing

Three real bugs were found only through live GenVM execution, none of which static audit alone surfaced:

1. **`gl.message_raw["datetime"]` is an ISO-8601 string, not a Unix integer.** Confirmed via a live stderr traceback. Fixed with a hand-rolled, oracle-verified epoch parser (`_now_epoch_seconds`).
2. **Plain `github.com/.../commit/<sha>` URLs return GitHub's HTML page shell when fetched server-side, not the diff.** Fixed by appending `.diff` to plain commit reference URLs before fetching, with a fallback to the original URL if that fails.
3. **Reputation-ledger key casing mismatch.** Storage writes used unnormalized `.as_hex`, while the read lookup force-lowercased its input — silently making every real (mixed-case, EIP-55 checksummed) address return the zeroed default. Fixed by normalizing to lowercase at every write site.

Full detail on each, including the original stderr and the fix, is in the contract's own module docstring and inline comments. For the transferable, pattern-level version of these lessons — written so the *next* contract doesn't rediscover them — see [`LESSONS.md`](../LESSONS.md) at the repo root.
