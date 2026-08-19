# Frontend

## Stack

React + Vite + TypeScript + Tailwind CSS, no Next.js. `index.html` sits in the project root, per Vite's requirement.

## Design direction

The visual language is deliberately an instrument-panel register — a dark field, phosphor-green/amber/gray status signals, monospace-forward type — grounded in the actual subject: this contract reads a clock, not a party's word for what happened. The signature element is `TraceReadout`, a horizontal timeline trace reused at two scales: a live, real reading of on-chain check data in the hero, and a compact form for the reputation ledger.

This is a deliberate departure from prior builds in this project (which used docket-ledger and graphite/verified-green registers respectively) — chosen specifically because the concept itself (a live, evidence-derived accountability record) called for a different visual world, not for novelty's own sake.

## Structure

```
src/
  components/    Layout, WalletButton, TxStatus, VerdictBadge, TraceReadout, Field, ErrorBoundary
  config/        chains.ts — single source of truth for RPC/chainId/explorer/contract address
  hooks/         useGenLayer.ts — wallet connect, ensureChain, read/write contract calls
  lib/           contractMethods.ts — method-name registry matching the deployed contract exactly
  pages/         Home, RegisterSla, FileCheck, CheckDetail, Ledger, Docs, NotFound
```

## Confirmed SDK patterns in use

- Chain imports from `genlayer-js/chains` (`studionet`), never the package root.
- Write clients pass `provider: window.ethereum` explicitly — omitting this caused a confirmed live bug in an earlier project build where transactions silently executed on the wrong network.
- `ensureChain()` runs immediately before every write, never on a network-toggle click, to avoid an unwanted wallet popup from simply viewing a page.
- Wallet connection persists across reloads via a silent `eth_accounts` check on mount (never `eth_requestAccounts`, which would prompt), with an `accountsChanged` subscription to stay in sync.
- `writeContract` always passes `value: BigInt(0)` even when unused, per the SDK's requirement.
- `readContract`'s return value is always parsed as JSON — it comes back as a string.
- `waitForTransactionReceipt` uses generous, network-specific retry/interval config, since GenVM consensus for a write that triggers an LLM judgment can genuinely take several real minutes. A timeout surfaces a direct explorer link via a typed `TimeoutError` (carrying `txHash` and `isTimeout`), rather than a generic failure state — a timeout is not the same UI state as a rejected transaction, since the transaction may well still succeed.

## Known limitation of this delivery

This environment had no network access, so the frontend could not be run through a real `npm install`, `tsc --noEmit`, or `vite build` before being handed off. Verification here was limited to import-path resolution and manual structural review — a genuine, if lower-confidence, substitute for a real compiler. Expect to run a real build locally as the actual first verification step.

A genuine mobile-navigation bug (the primary nav had no mobile equivalent below the 768px breakpoint) was found and fixed during this build, but only after it was specifically asked about — not caught by the build process itself. See [`LESSONS.md`](../LESSONS.md) section 3.3 for why "used some responsive classes" and "checked every breakpoint explicitly" turned out to be different claims, and what to check for on the next build.
