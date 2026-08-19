<div align="center">

<img src="./docs/assets/logo.svg" width="88" alt="SentinelSLA logo" />

# SentinelSLA

### A public, on-chain record of how fast open-source maintainers actually resolve published security advisories.

<br />

![Status](https://img.shields.io/badge/status-live-brightgreen?style=flat-square)
![Networks](https://img.shields.io/badge/network-StudioNet-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20GenVM-4ADE80?style=flat-square)

<br />

**[Live App](https://sentinelsla.vercel.app)** &nbsp;·&nbsp; **[Documentation](./docs/architecture.md)** &nbsp;·&nbsp; **[Smart Contract](./contracts/sentinel_sla.py)** &nbsp;·&nbsp; **[Build Lessons](./LESSONS.md)**

</div>

<br />

---

## What this is

SentinelSLA reads GitHub's own security-advisory records — never a maintainer's self-report — and keeps a permanent, on-chain account of who resolves published vulnerabilities inside the window they publicly committed to. No stake, no GEN transfer, no gamble: the consequence is standing, not money.

> **Building the next app in this project?** Read [`LESSONS.md`](./LESSONS.md) first. It captures every GenVM behavior, GitHub API quirk, and process mistake this build confirmed — written specifically so a fresh session with only this repo doesn't rediscover any of them the hard way.

<br />

<div align="center">

| | |
|---|---|
| **Concept** | Reputation-based maintainer security-response accountability |
| **Consensus need** | A maintainer benefits from a false compliant verdict (public trust signal); a security researcher benefits from a false non-compliant verdict if motivated to damage standing — a genuine two-sided incentive to lie, with zero money on the table |
| **Evidence source** | GitHub's own security-advisories API, fetched by the contract itself — never a submitter-typed URL |
| **Networks** | StudioNet |

</div>

<br />

---

## How it works

1. A maintainer locks a repo and a resolution-time commitment on-chain, before any advisory exists. `register_sla` verifies the repo genuinely exists on GitHub and that the caller controls it — via a file committed to the repo containing their own wallet address — before the commitment is accepted.
2. Anyone files a compliance check referencing a real GHSA advisory ID — never a URL, never a free-text claim.
3. The contract fetches the advisory directly from GitHub, and — if the advisory's own record links one — fetches the actual fix diff, not a rendered HTML page.
4. Independent validators re-derive and compare every field the verdict depends on: resolution timing, fix substantiveness, reason codes.
5. The verdict is escrowed for seven days, challengeable by anyone, before it becomes a permanent mark on the maintainer's public ledger.

<br />

<details>
<summary><b>The three-way verdict</b></summary>
<br />

**Compliant** — resolved inside the committed window, with a fix substantive enough to be independently confirmed against the named vulnerability.

**Non-compliant** — either late, or closed with no attributable fix evidence at all. Speed alone is never treated as compliance.

**Unverifiable** — GitHub's own advisory record doesn't yet support a resolution-time reading (still open, withdrawn, or too sparse to judge). In practice, confirmed across live testing on multiple real advisories, this is the *common* outcome, not a rare fallback — GitHub's API frequently leaves the closed timestamp unset even on fully resolved, well-documented advisories.

</details>

<br />

---

## Deployed contracts

<div align="center">

| Network | Address | Explorer |
|---|---|---|
| StudioNet | `0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6` | [View](https://explorer-studio.genlayer.com/address/0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6) |

</div>

<br />

---

## Quick start

```bash
cd frontend
npm install
npm run dev
```

Full deployment instructions: [`docs/deployment.md`](./docs/deployment.md)

<br />

---

## Project structure

```
contracts/sentinel_sla.py    The GenVM contract
tests/test_sentinel_sla.py   Local gltest suite
frontend/                     React + Vite app
docs/                         architecture.md, deployment.md, contracts.md, frontend.md
LESSONS.md                    Everything this build confirmed, for the next build
LICENSE                       MIT
```

<br />

---

## Status

<div align="center">

![Tested](https://img.shields.io/badge/resolve__compliance%20%C3%97%203%20advisories-tested-brightgreen?style=flat-square)
![Tested](https://img.shields.io/badge/full%20lifecycle%20to%20reputation%20ledger-tested-brightgreen?style=flat-square)
![Untested](https://img.shields.io/badge/compliant%20verdict%20branch-untested%20live-yellow?style=flat-square)
![Untested](https://img.shields.io/badge/canonical%20repo%20binding%20%2B%20ownership%20check-untested%20live-yellow?style=flat-square)
![Untested](https://img.shields.io/badge/duplicate%2Finvalid%20filing%20rejection-untested%20live-yellow?style=flat-square)

</div>

This repo is at a new contract address (`0x2DdE4639AC5941FD46cA3Fa035ee56e33f2d9ff6`), redeployed to add canonical repository binding, a repository-backed ownership check, and duplicate/invalid-filing rejection — see `docs/contracts.md` for the full list of what changed and why.

**Carried forward from the prior deployment's live testing, and not touched by this change:** `resolve_compliance`'s and `resolve_challenge`'s core judgment logic, and the escrow → challenge → finalize → reputation-ledger path, are unmodified by this fix. `resolve_compliance` was tested against three structurally different real GHSA advisories — still-open, closed-with-a-real-fix, and withdrawn — with clean, five-validator consensus and zero problematic rotations each time, and the full lifecycle through a finalized reputation-ledger entry was confirmed end to end. That evidence pertains to the prior address; the underlying code paths it tested are the same code paths at this address, but the test runs themselves have not been repeated here.

**Not yet live-tested at this address, stated plainly rather than assumed to still hold:** `register_sla`'s new nondet round (repo-existence check + on-repo ownership proof), the applicability check inside `resolve_compliance` that rejects a GHSA advisory whose own `source_code_location` doesn't match the registered repo, and the duplicate-filing guard in `file_compliance_check`. All three are structurally consistent with this project's confirmed nondet rules, but "structurally correct" and "confirmed via live GenVM stderr" are different claims — treat these as the first things to exercise in Run and Debug.

One branch has not been observed live: a `compliant` verdict with populated resolution-hours math, because every real advisory queried during testing had an unset `closed_at` on GitHub's own API — which the contract correctly reports as `unverifiable` rather than guessing. This is a property of the evidence source, documented in `docs/contracts.md`, not an unverified code path — that arithmetic was confirmed correct by direct inspection, not live execution.

The frontend was built and manually verified for import correctness and structural soundness, but could not be run through a real compiler in this environment (no network access). Treat a first local `npm install && npm run dev` as the actual first build verification step.

<br />

---

<div align="center">

Built on [GenLayer](https://genlayer.com) · [Portal submission](https://portal.genlayer.foundation/)

</div>
