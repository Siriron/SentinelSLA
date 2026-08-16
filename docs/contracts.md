# Smart contracts

## Deployed address

| Network | Address |
|---|---|
| StudioNet | `0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8` |

Explorer: https://explorer-studio.genlayer.com/address/0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8

Bradbury is not deployed. This project targets StudioNet exclusively, by explicit standing convention rather than oversight.

## Concept

A maintainer commits, on-chain, to a resolution-time window (`sla_hours`) for a repo — before any advisory exists. When a real GitHub Security Advisory (GHSA) is later published against that repo, anyone can file a compliance check referencing the advisory's own GHSA ID. The contract fetches the advisory directly from GitHub's own security-advisories API — never a URL or description any party supplies — and runs independent, multi-validator AI consensus to judge two things: whether it was resolved inside the committed window, and whether the resolution is backed by a real, substantive fix. No GEN moves anywhere in this contract; the consequence is a permanent, public reputation ledger entry.

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
| `get_next_check_id` | — | Next check ID |

## Consensus design

Every nondet write uses `gl.vm.run_nondet_unsafe` with a fully hand-written `validator_fn` — not `gl.eq_principle.prompt_comparative`. This was a deliberate choice: an audited comparison contract (Lumina Protocol, 360-point Projects-track submission) used `prompt_comparative` with an equivalence principle that explicitly excluded score-bearing fields from the agreement check, meaning its leader alone decided the numbers that determined payout while validators only agreed on a coarse verdict bucket. Every field this contract's reputation delta depends on — verdict, fix substantiveness, resolution hours (within a named ±2h tolerance), and every reason code — is independently re-derived by each validator and compared directly, closing that gap.

## Confirmed live behavior (not just theoretical)

Every write method with a `run_nondet_unsafe` call has been exercised live on StudioNet, across genuinely different real-world inputs:

- `resolve_compliance` — tested against three structurally different real GHSA advisories: one still open, one closed with a real, substantive fix commit, and one withdrawn as a false positive. All three produced the correct verdict branch, with clean five-validator consensus and zero problematic rotations.
- `resolve_challenge` — tested once, live, converged cleanly on the first attempt.
- The full `register_sla → file_compliance_check → resolve_compliance → open_challenge → resolve_challenge → finalize_compliance → get_reputation` lifecycle has been run end to end, with the resulting reputation ledger entry confirmed correct.

## Known, deliberate limitations

- **GitHub's advisory API does not expose a first-response timestamp.** The SLA metric this contract judges is resolution time (`published_at` → `closed_at`), not acknowledgment time. This is a source limitation, verified directly against GitHub's REST API documentation before the contract was written, not an oversight discovered later.
- **`closed_at` is empirically often unset**, even on fully reviewed, well-documented, already-fixed advisories — confirmed live against multiple real advisories during this contract's own testing. `unverifiable` should be expected as a common real-world outcome, not a rare fallback.
- **The fix-substantiveness judgment can only reason about what GHSA's own advisory record links to.** A maintainer who resolves a vulnerability without referencing the fix back into the public advisory record is invisible to this contract.
- **`reasoning_summary` content validation is a length threshold**, not full criteria-based semantic validation — the verdict, fix-substantiveness, and resolution-hours fields are fully re-derived and compared; only the free-text explanation of the verdict is length-checked rather than content-checked.
- **No deadline/expiry automation** on unresolved compliance checks — a filed check can sit indefinitely if nobody calls `resolve_compliance`.

## Bug fixes discovered through live testing

Three real bugs were found only through live GenVM execution, none of which static audit alone surfaced:

1. **`gl.message_raw["datetime"]` is an ISO-8601 string, not a Unix integer.** Confirmed via a live stderr traceback. Fixed with a hand-rolled, oracle-verified epoch parser (`_now_epoch_seconds`).
2. **Plain `github.com/.../commit/<sha>` URLs return GitHub's HTML page shell when fetched server-side, not the diff.** Fixed by appending `.diff` to plain commit reference URLs before fetching, with a fallback to the original URL if that fails.
3. **Reputation-ledger key casing mismatch.** Storage writes used unnormalized `.as_hex`, while the read lookup force-lowercased its input — silently making every real (mixed-case, EIP-55 checksummed) address return the zeroed default. Fixed by normalizing to lowercase at every write site.

Full detail on each, including the original stderr and the fix, is in the contract's own module docstring and inline comments. For the transferable, pattern-level version of these lessons — written so the *next* contract doesn't rediscover them — see [`LESSONS.md`](../LESSONS.md) at the repo root.
