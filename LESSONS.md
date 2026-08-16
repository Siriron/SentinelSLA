# LESSONS — everything this build confirmed, for the next build

**Read this before writing a single line of code on the next GenLayer app.** This document exists for exactly one scenario: you are a fresh Claude instance, in a new conversation, with no memory of building SentinelSLA — someone has handed you this repo and said "build the next one like this, don't repeat the mistakes." Everything below is written for that person. Nothing here assumes you remember this session, because you don't.

This is not a retelling of what SentinelSLA does — `docs/contracts.md` and `docs/architecture.md` cover that. This is the accumulated, hard-won, load-bearing knowledge: confirmed facts about GenVM, GitHub's API, this SDK, and this build process, each stated as a rule you can act on directly, each with the evidence that confirmed it so you can judge how much to trust it.

If anything here conflicts with the project's own "GenLayer Build — Project Knowledge" document, **project knowledge wins** — it's the longer-running, more thoroughly cross-checked source. This document is additive: it captures what SentinelSLA specifically confirmed that project knowledge, as of this build's start, had not yet nailed down.

---

## Part 1 — New GenVM/API facts, confirmed live, not in project knowledge before this build

### 1.0 `createAccount()` expects a private key — never pass a browser-wallet address to it

**Confirmed the hard way, during actual Vercel deployment, not caught in this build's own sandbox** (which had no network access to run a real `npm install`/`tsc`/`vite build` — see Part 3.2 for why that ceiling matters here specifically). The original `useGenLayer.ts` called `createAccount(account)`, passing the connected wallet's address into a function whose real parameter is a **private key**.

**Confirmed directly against GenLayer's own SDK documentation, in their own words:** *"Use `createAccount()` when you want the SDK to handle transaction signing directly. For MetaMask or other external wallet integration, pass just the address string to `createClient()`."*

**Why this didn't throw an error and was so easy to miss:** a wallet address and a private key are both `0x`-prefixed hex strings. Nothing type-checks the semantic difference between them. This means the bug wouldn't announce itself as a compile error or an obvious crash — it would produce a broken or mismatched signing setup that could fail unpredictably, or in subtle ways, on real write transactions in production. This is a materially worse failure mode than a build-time type error, because it can pass casual testing and only misbehave under specific conditions.

**The fix:** pass the address directly, typed as `\`0x${string}\``, as the `account` field — never wrapped in `createAccount()` — for any app where the write path goes through a browser wallet (`window.ethereum`, `eth_requestAccounts`) rather than a raw private key held by the app itself. `createAccount()` is for the opposite case: an app that holds and uses a private key directly, with no external wallet involved at all.

**Action for the next build:** if the app connects via a browser wallet extension (the WalletButton/`eth_requestAccounts` pattern this project always uses for a Projects-track frontend), never call `createAccount()` on the connected address. Pass the address string directly as `account` in `createClient()`. Grep any inherited `useGenLayer.ts`-style hook for `createAccount(` before reusing it, and confirm it's a real project-knowledge-confirmed pattern rather than trusting it because it looks plausible — this exact mistake looked plausible enough to ship.

---

### 1.1 `gl.message_raw["datetime"]` is an ISO-8601 string, not a Unix integer

**This was an open question before this build.** Recourse's own docstring (see project knowledge, section 4) explicitly says this format was "never confirmed against a worked example." It is now confirmed, the hard way, via a live production error:

```
ValueError: invalid literal for int() with base 10: '2026-08-15T01:52:14.768822Z'
```

**The exact format:** `YYYY-MM-DDTHH:MM:SS.ffffffZ` — ISO-8601, UTC, microsecond precision, trailing `Z`. Calling `int()` on this directly throws immediately, before any of your write logic runs.

**The fix, and why it's built the way it is:** a hand-rolled parser (`_now_epoch_seconds()` in `contracts/sentinel_sla.py`), using only integer arithmetic. Two deliberate constraints on this fix, both worth carrying forward:
- **No `float()`, ever** — this is project knowledge's own TIER 1 rule, and it applies here too even though timestamp parsing feels far removed from LLM confidence scores.
- **No stdlib `datetime` import** — because GenVM's exact Python build and version were never independently confirmed, and a hand-rolled parser you can read every line of is safer than trusting an unconfirmed stdlib behavior (e.g. `datetime.fromisoformat()`'s trailing-`Z` support varies by Python version — this was specifically checked and avoided, not overlooked).

**Verification method worth reusing:** the parser was checked against Python's own `datetime` as an independent oracle, across six cases including the exact real error string, epoch zero, a leap day, a year boundary with microseconds, and the year-2100 non-leap-century edge case (2100 is divisible by 4 but not 400 — the single case naive leap-year logic most commonly gets wrong). All six matched. This oracle-cross-check pattern — write the naive/obvious version, write the paranoid version, diff them against known-correct values — is worth reusing any time you're hand-rolling arithmetic GenVM's constraints won't let you delegate to a library.

**Action for the next build:** copy `_now_epoch_seconds()` verbatim rather than re-deriving it. It's confirmed correct, not just plausible.

### 1.2 Plain GitHub commit URLs return HTML, not diff content, when fetched server-side

**Symptom, confirmed live:** fetching `github.com/<owner>/<repo>/commit/<sha>` via `gl.nondet.web.request()` returns GitHub's rendered HTML page shell. GitHub renders the actual diff client-side via JavaScript — a server-side fetch never executes that JS, so you get boilerplate/CSS with zero visible code changes. Five independent validators confirmed this identically in live testing (zero rotation) — the model correctly read the fetched content as unhelpful and downgraded its judgment accordingly, which is actually the *correct* fallback behavior, but it meant the contract's real judgment capability was never being exercised.

**The fix:** GitHub serves raw plain-text diffs at the same URL with `.diff` (or `.patch`) appended — confirmed via multiple independent, long-standing developer references, not invented for this build. `_to_raw_diff_url()` in `contracts/sentinel_sla.py` implements this, with two deliberate limits worth keeping:
- Only transforms plain `.../commit/<sha>` URLs — never touches PR-scoped commit URLs (`.../pull/<n>/commits/<sha>`), because `.diff` support on those is confirmed inconsistent (can 404) via the same research pass that confirmed the fix.
- Falls back to fetching the original URL if the `.diff` fetch itself fails, rather than losing all fix content silently.

**Action for the next build:** any contract that fetches a GitHub commit as evidence needs this transform. Copy `_to_raw_diff_url()`, don't re-derive it — and don't assume it extends safely to PR URLs without separately confirming `.diff` support there first.

### 1.3 GitHub's Security Advisories API (GHSA) empirically does not populate `closed_at`, even on fully resolved advisories

**This is an empirical finding, not a documented API limitation** — the schema documents `closed_at` as a real field, but across three structurally different real advisories tested live in this build (one still-open, one closed-with-a-real-merged-fix and `github_reviewed: true`, one withdrawn-as-false-positive), `closed_at` came back null/unset on all three. A fourth, independent data point — GitHub's own official REST API documentation example response — doesn't even show `closed_at` populated in its shown fields.

**What this means for design, not just for SentinelSLA specifically:** if you're building anything that judges advisory *resolution timing* via this API, expect the "advisory still open by the API's own record" branch to be the *common* case, not a rare fallback. Design your verdict shape and your UI copy around that expectation from the start — don't build a three-way verdict where two branches are theoretical and only discovered to be the practical default after shipping.

**Separately confirmed: GHSA has no maintainer-first-response timestamp at all**, in either the `/advisories/{ghsa_id}` or `/repos/{owner}/{repo}/security-advisories/{ghsa_id}` endpoint. If a future concept needs "time to acknowledge" rather than "time to resolve," GHSA cannot supply it — this was checked directly against GitHub's own REST API documentation before assuming otherwise.

### 1.4 GitHub's unauthenticated REST API is rate-limited to 60 requests/hour, per source IP

Confirmed directly from GitHub's own documentation. This matters specifically for multi-validator GenVM contracts: each validator makes an *independent* fetch, so if evidence-fetching logic isn't designed around GenLayer's own "Extract Stable Fields" guidance (compare only fields the source guarantees are stable across independent calls — IDs, publish timestamps — never counts/timestamps that could legitimately drift between two calls seconds apart), rate-limiting is one more source of manufactured false disagreement between validators, on top of ordinary source-data variance. This wasn't a problem SentinelSLA hit directly (checked and designed around before deploy), but it's a real risk worth checking explicitly on the next contract that hits any rate-limited external API from inside a nondet block.

### 1.5 `gl.nondet.web.request(url, method='GET')` has the identical response shape as `gl.nondet.web.get()`

Confirmed directly against GenLayer's own Web Access documentation before use, not assumed from `.get()`'s already-confirmed shape. Same `.status_code` (int) / `.body` (bytes, needs `.decode("utf-8")`) structure. This means project knowledge's confirmed `_fetch_text` helper (built for `.get()`) extends safely to `.request()` — just swap the call, keep the same defensive `getattr`/bytes-handling/try-except structure. Don't assume this kind of equivalence for other SDK method pairs without checking directly; this one specifically was verified, not inferred.

---

## Part 2 — Storage-key and address-handling facts, confirmed live

### 2.1 `Address.as_hex` is not automatically normalized — and neither is a real wallet address's display casing

**The bug, confirmed live:** a fully finalized compliance check existed in contract storage (confirmed via a direct `get_check` read), but `get_reputation` returned the all-zero default for that exact check's own maintainer, every time, regardless of how much real data existed. Root cause: `register_sla` stored the reputation-ledger key as `sender.as_hex`, completely unnormalized. `get_reputation`'s read-side lookup force-lowercased its string input. Real Ethereum-ecosystem wallet addresses commonly use EIP-55 mixed-case checksum casing (e.g. `0xbcC6964a09ea35f3321d29EE8cA83D29e4ad655F` — this exact address was the one that exposed the bug). Mixed-case stored key, lowercased lookup key: two different strings, silent miss, every single time.

**Why this was invisible for so long, and the general lesson:** every *internal* write-to-write comparison in the contract (e.g. `finalize_compliance` comparing against what `register_sla` had written) used the *same* unnormalized convention on both sides, so those never failed. The bug only existed at the *external* boundary — a plain string typed in from outside meeting a `TreeMap` key built from an SDK object property. **The general rule: any time a `TreeMap` is keyed by something derived from an `Address` object, and that same map is also looked up via a plain external string input, normalize at every single site that touches that key — write and read — to one explicit, stated convention (this build used `.lower()` everywhere). Never assume an SDK property's casing behavior without checking, and never let "it matched during testing" substitute for explicit normalization, since testing with only one wallet address can hide exactly this class of bug.**

**Action for the next build:** grep every `TreeMap` keyed by an address-derived value for every site that constructs that key. If there's more than one such site (there almost always is — at minimum one write, one read), confirm they all apply the identical normalization. Don't trust that they do just because tests passed once with one address.

---

## Part 3 — Process and verification lessons, not GenVM-specific

### 3.1 Automated text find-and-replace across multiple files is a real risk, not a shortcut

**What happened:** fixing a cosmetic frontend issue (apostrophes inside JSX text confusing a hand-rolled bracket checker) via a single automated multi-file find-and-replace pass introduced three *new*, genuinely broken outputs: a doubled-article grammar artifact ("a the maintainer's"), an HTML entity used in a context where it would render literally instead of decoding (a JS string value, not JSX children text — entities only decode in the latter), and one outright broken sentence where a contraction expansion picked the wrong meaning ("that's" meaning "that has," expanded to "that is").

**The lesson, stated as a rule:** any text-content fix across multiple files should be done by reading and editing one instance at a time, not by trusting a blanket automated substitution — especially in an environment with no compiler to immediately catch the fallout. This is slower. It is also the only reliable method available when `tsc` isn't running. Treat "I'll fix this with one clever regex across every file" as a yellow flag whenever there's no fast feedback loop to catch what it breaks.

**Also confirmed as a real, distinct blind spot:** a hand-rolled bracket/brace balance checker (necessary here specifically because there was no network access to run real `tsc`) cannot distinguish a quote character used as a real string delimiter from one appearing inside plain JSX text content — both single quotes (contractions: "doesn't") and double quotes (quoted words: `"unverifiable"` inside a `<div>`) trigger false positives. When using this kind of custom verification tool, expect and specifically check for this exact failure mode before trusting a "clean" result, and prefer rephrasing contractions/quoted-words-in-JSX-text over trying to make the checker smarter — it's a losing battle without a real parser.

### 3.2 No network access means no real `npm install`/`tsc`/`vite build` — know this before starting, not after

This sandbox environment had zero network egress. This means: no package registry access, no real TypeScript compilation, no real bundler run, ever, for this entire build. Every verification performed on the frontend was a genuine, but meaningfully weaker, substitute: relative-import-path resolution (reliable), a custom bracket-balance scanner (has confirmed real blind spots, see 3.1), and careful manual reading. **This is categorically less confidence than the contract's own verification enjoyed** — the contract could be checked with a real Python `ast.parse()` and a real `tokenize` pass, both genuine compiler-grade tools; nothing equivalent existed for the TypeScript/React side in this environment.

**This gap was not hypothetical — it produced a real, confirmed production bug.** Section 1.0's `createAccount()` misuse shipped through every check this environment could run (import resolution, bracket balance, manual review) and was only caught when the app was actually built and deployed for real, on Vercel, where a real `tsc` pass exists. A missing `vite-env.d.ts` (needed for `import.meta.env.VITE_*` typing) was a second, independent thing this environment's checks couldn't catch. Both are now fixed in this repo — but they stand as direct proof, not just a cautious disclaimer, that "passed every check available in this sandbox" and "passed a real compiler" are different claims.

**Action for the next build:** state this limitation plainly, early, in any conversation — don't let a long, careful-looking verification process on the frontend imply the same confidence level as the contract's verification. If the next environment *does* have network access, use it — run the real build, don't default to the manual-checking process this build was forced into just because it's a known pattern now. If it doesn't, budget explicitly for the person running a real build themselves and reporting back what breaks — that step is not optional polish, it's where real bugs like 1.0 actually get caught.

### 3.3 A working desktop layout does not confirm a working mobile layout — check both explicitly, as separate questions

**The bug:** the primary navigation was built with `hidden md:flex` and no mobile equivalent — meaning the entire nav (every link except the logo) vanished completely below the 768px breakpoint, with zero replacement. This was only caught because the person building alongside this session explicitly asked "is this mobile-friendly?" — it was not caught during the build itself, despite an explicit design-quality checklist being followed.

**The lesson:** "I used responsive Tailwind classes in a few places" is not the same claim as "I checked this renders correctly at every breakpoint," and the two should not be conflated when reporting status. **Concretely, before calling a frontend done: grep for every `hidden md:`/`hidden sm:`/`hidden lg:` pattern and confirm each one has an actual, functioning alternative at the breakpoint where it hides something — not just that something else technically exists in the DOM.** A hidden nav with no mobile menu is a broken core function, not a minor polish gap, and it should be caught by the build process itself, not only by someone testing on a phone afterward.

### 3.4 Live testing against real, uncurated external data finds bugs that static audit — however thorough — cannot

All three of Part 1 and Part 2's confirmed bugs were invisible to a complete, seven-item static audit pass (the same audit discipline documented in project knowledge, section 4) run *before* any live deployment. Every one of them only surfaced once the contract ran against real GenVM execution and real, structurally varied external data (three different real GHSA advisories, not one cherry-picked example; a real wallet address with real EIP-55 casing, not a test placeholder).

**The lesson, already stated in project knowledge but worth re-confirming with fresh evidence:** static audit and live testing are not substitutes for each other — they catch genuinely different classes of bugs. A contract that passes every static check is not "probably fine," it's "ready for the testing that actually finds the remaining bugs." Budget real time for live testing against varied, real inputs on every future build, not as a formality after the "real work" of writing the contract, but as an equally load-bearing phase of the build.

---

## Part 4 — What "model app" actually means, concretely, for the next build

If this repo is handed to a fresh Claude instance as a template, here is what "build me something this thorough" should concretely translate to, so nothing gets lost between sessions:

1. **Run the Concept Evaluation Framework (project knowledge, section 2) before writing any code**, including the genre/complexity rotation check against the tracker.
2. **Start from the correct skeleton** (`projects-track-skeleton.py` or `contracts-track-skeleton.py`, both in Project files), never from a blank file or from copying this contract and stripping fields.
3. **Write the seven-item nondet audit as an actual literal script pass**, the way this build did (see the container tool calls in this build's own history for the exact pattern: comment-stripping, nested-function-scope-aware `self.` detection, a real AST parse, a real tokenizer bracket check) — not as an eyeballed checklist.
4. **Verify every SDK method's real behavior before depending on it** — this build found three genuinely new, previously-unconfirmed facts (Part 1) by refusing to assume, and each one would have caused a silent or loud production bug if assumed instead of checked.
5. **Deploy and test live against real, structurally varied inputs** before considering any nondet function proven — one successful test is not the same claim as "this works," per 3.4.
6. **Check mobile and desktop as two separate, explicit questions**, not as one "responsive" checkbox — per 3.3.
7. **State verification-confidence honestly and specifically** — "confirmed via a real compiler" and "confirmed via manual review because no compiler was available" are different claims, and conflating them erodes exactly the kind of trust this document exists to protect.
8. **When something breaks, fix it, write down what actually happened and why, and add a regression test** — the pattern this build followed for all three contract-level bugs and is following right now, in this very document, for the frontend and process lessons too.

If the next build produces a new, confirmed fact of the same caliber as Part 1 or Part 2 — a real SDK behavior, a real GenVM constraint, a real API limitation — it belongs in project knowledge's own bug catalog (section 4), not just in that build's own local docs. This document itself, once its lessons are folded into project knowledge, has done its job and can be treated as historical record rather than a live reference.
