# Deployment

## Current deployment

| Network | Address |
|---|---|
| StudioNet | `0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8` |

Bradbury is not deployed for this project. StudioNet-only is a deliberate, standing convention for this build, not an oversight.

## Deploying the contract yourself

1. Open [GenLayer Studio](https://studio.genlayer.com/contracts).
2. Upload `contracts/sentinel_sla.py` directly through the UI. Never paste code, never use a MetaMask/EVM wallet deploy path — both are rejected.
3. Confirm line 1 is the pinned pragma hash: `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`.
4. Deploy. Copy the resulting contract address and transaction hash from the confirmation screen.

## Deploying the frontend

```bash
cd frontend
npm install
```

Set the deployed contract address in `.env` (copy `.env.example` and fill in the real value, or use Vercel project environment variables):

```
VITE_CONTRACT_ADDRESS_STUDIONET=0x9bf02585228D7A7E3d4dcB3a35928045a7C250E8
```

```bash
npm run dev      # local development
npm run build    # production build
```

For Vercel: import the repo, set the root directory to `frontend`, set the environment variable above in the Vercel project settings, and deploy. `vercel.json` already includes the required SPA rewrite.

## Testing status — stated plainly, not rounded up

**Confirmed live on StudioNet**, not just theoretically correct:

- `register_sla`, `file_compliance_check` — deterministic, multiple successful live calls.
- `resolve_compliance` — tested against three structurally different real GHSA advisories (still-open, closed-with-substantive-fix, withdrawn). All three produced the correct verdict branch. Clean five-validator consensus, zero problematic rotations across all three.
- `open_challenge`, `resolve_challenge` — tested live once each. `resolve_challenge` is the contract's second nondet function and converged cleanly on its first execution.
- `finalize_compliance`, `get_reputation` — tested live; the full lifecycle from registration through a finalized, correctly-populated reputation ledger entry has been confirmed end to end.

**Not yet tested:**

- The `compliant` verdict branch with populated `resolution_hours` math has not been observed live — every real advisory queried during testing had `closed_at` unset on GitHub's own API, which the contract correctly reports as `unverifiable` rather than guess at a resolution time the evidence doesn't support. This is a property of the upstream data (documented in `docs/contracts.md`), not an unverified code path — the arithmetic itself is trivial and was verified by direct code inspection, not live execution.
- Dual-network deployment. This project is StudioNet-only by explicit convention.

**Frontend:** built with the confirmed-working `genlayer-js` SDK patterns (`ensureChain`, wallet persistence, timeout-safe receipt waiting) from this project's own accumulated debugging history. Because this environment has no network access, the frontend could not be run through a real `npm install`/`tsc`/`vite build` cycle before delivery — verification here was limited to import-path resolution and manual structural review. A first `npm install && npm run dev` may surface issues a real compiler would have caught; treat that as expected, not a sign of a rushed build.
