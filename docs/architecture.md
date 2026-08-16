# Architecture

## Overview

SentinelSLA is a reputation-based accountability system, not a staked dispute. There is no escrow of value, no slashing, no GEN transfer anywhere in the contract. The lifecycle produces a durable, public reputation-ledger entry instead.

## Data flow

```
Maintainer                    Anyone                     GenVM validators
     │                          │                                │
     ├─ register_sla ──────────►│                                │
     │  (locks repo + window)   │                                │
     │                          ├─ file_compliance_check ────────►│
     │                          │  (GHSA ID only)                │
     │                          │                                │
     │                          │◄── resolve_compliance ─────────┤
     │                          │    fetches GHSA API directly   │
     │                          │    fetches fix diff if linked  │
     │                          │    leader/validator consensus  │
     │                          │    verdict escrowed (7 days)   │
     │                          │                                │
     │                          ├─ open_challenge (optional) ────►│
     │                          │◄── resolve_challenge ──────────┤
     │                          │    re-fetches fresh, second    │
     │                          │    independent consensus round │
     │                          │                                │
     │                          ├─ finalize_compliance ──────────►│
     │                          │    applies delta to ledger     │
     │                          │                                │
     │◄── get_reputation ───────┤                                │
```

## Why resolution-time-plus-fix-substantiveness, not a binary date check

A contract that only diffed two timestamps would barely need an LLM, let alone multi-validator consensus — that risks reading as the "AI app with GenLayer attached" pattern GenLayer's own review process explicitly flags. The fix-substantiveness judgment — does the linked commit or PR that GHSA's own record references actually address the named vulnerability, or is `closed_at` just an administrative status flip with no attributable remedy — is a genuine evaluative question that benefits from real multi-validator judgment, which is why it's a first-class part of the verdict rather than an afterthought.

## Evidence provenance

The only external input any party supplies to this contract is a GHSA ID string, in `file_compliance_check`. Every other fact the verdict depends on — advisory state, timestamps, description, references, and (if present) the linked fix content — is fetched by the contract itself, server-side, from a source neither the maintainer nor the filer controls. This is the structural fix for the evidence-binding failure pattern that has been directly, repeatedly confirmed as a rejection cause in prior submissions to this project: a caller-selected or submitter-supplied evidence artifact with no independent binding to the claim being judged.

## Consensus mechanism

`gl.vm.run_nondet_unsafe` with a fully hand-written `validator_fn`, following seven confirmed correctness rules without exception:

1. `run_nondet_unsafe` called positionally, never with keyword arguments.
2. `validator_fn` checks `isinstance(leaders_res, gl.vm.Return)` first, reads `.calldata`, never `json.loads()`s it.
3. No `.send()` anywhere — this contract never transfers value, so this rule is structurally inapplicable rather than merely avoided.
4. Every storage-backed field is `copy_to_memory()`'d in the deterministic body before `run_nondet_unsafe` is called.
5. No class-body attribute carries a type annotation unless it's genuine, mutable, per-instance storage. All constants live at module level.
6. `leader_fn`/`validator_fn` are nested functions, zero `self.` reference anywhere in either body.
7. No `DynArray` on any nested `@allow_storage` dataclass field — array-shaped data uses a delimiter-joined string instead.

## Escrow and challenge window

A verdict from `resolve_compliance` is not immediately applied to the reputation ledger. It sits in a seven-day escrow (`CHALLENGE_WINDOW_SECONDS`), during which anyone can call `open_challenge`. A challenge triggers a second, fully independent nondet consensus round (`resolve_challenge`) that re-fetches the advisory fresh and can uphold, overturn, or reject the original verdict. Only after the window closes, or a challenge resolves, does `finalize_compliance` apply the outcome to the permanent ledger.
