# SECURITY REVIEW — NQR Phase 2A Emission Adapter, Stage A Iteration 6 (with iteration 5)

Reviewer: independent SECURITY (did not author this code)
Date: 2026-09-19
Scope: the frozen iteration-6 candidate, reviewed against the iteration-5 runtime model and the real built artifact.

## VERDICT: REQUEST_CHANGES

The candidate is internally well-built — fail-closed on the load vocabulary it recognises, mutation-tight against its own spec, and the runtime pin plus registration grammar are sound. But the security gate's **purpose is unchanged** ("PDF and QR-renderer code must not be loaded when a page starts"), and I can make that code load at a real page's startup, targeting the real bundled renderer chunk, **with zero findings**, using the exact `loadChunk` method the gate models. The spec's own residual claim ("PASS means no un-followable byte-fetching path") is therefore false as written, and the disclosure understates the gap. That is the basis for REQUEST_CHANGES. It is not a rejection of the policy change (withdrawing statement-level review is the Product Owner's call and is defensible); it is a demand that the walker fail closed on the loader family it claims to cover, and that the spec/report stop overclaiming.

## Hashes verified (recomputed, not trusted from the report)

| Item | Value | Status |
| --- | --- | --- |
| canonical5 (A6, via canon.cjs) | `1876688e621217463bd89abe27d98ecd82e39a8566a9ae992ef33eddf585b328` | MATCHES expected |
| canonical5 (A5 runtime model) | `add3eb52e5be93ee18d1db59d04b9b9b8f277fb84327ad97ce573de937845ce9` | MATCHES expected |
| adapter `inspect-turbopack-emission.mjs` sha256 | `12b09f364d008dfc177f648ec7d4ee28db6bc97d4a3a375f3641219514d1fa7f` | matches report §4 |
| test `inspect-turbopack-emission.test.mjs` sha256 | `8e5b9201cfd7d4f1626e99eccdf9ed809e591262c00abfcc54d7303e9166eb6f` | matches report §4 |
| candidate permissions | `-r--r--r--` (0444) | frozen, not modified |
| candidate own test suite | 42/42 pass (`node --test` on the adapter test file) | as claimed |

The real artifact (`nqr-stagea-a5/fixture/artifact`, 180 MB) inspects to `STATIC_UNKNOWN`, 603 UNKNOWN, 0 VIOLATION on the unmodified candidate — release stays BLOCKED, as expected. All work was done on read-only copies under `review-stagea-a6-sec/`; the SOURCE, candidates and artifact were not modified.

---

## FINDING 1 — [HIGH] Factory walker is fail-OPEN for any load spelled outside `firstParam.<l|L|b|w|u>(literal)` / `import(literal)`

`inspectFactory` (candidate lines ~858–958) walks the AST and only treats a call as a byte-moving load when it is a **non-computed** member call whose object is the **literal first parameter identifier**, or a bare `import(...)`. It flags a *non-literal argument* to that recognised shape (`UNRESOLVED_CHUNK_LOAD`), and it flags a bare string chunk-path Literal appearing anywhere (`UNREVIEWED_CHUNK_REFERENCE`, via the `CHUNK_LITERAL` scan). Everything else is silence.

Two independent evasions combine to produce **no diagnostic at all**:

1. Spell the load construct outside the exact recognised shape — computed member `ctx["l"]`, an alias `const c = ctx; c.l(...)`, `document.createElement("script").src=...`, `fetch(...).then(eval)`, `new Worker(...)`, `importScripts(...)`. None is a recognised context call, so no edge and no UNKNOWN.
2. Make the target anything other than a bare string Literal — a **template literal** `` `...` ``, a concatenation `"a"+"b"`, or `atob("...")`. A `TemplateLiteral` is not a `Literal`, so the `CHUNK_LITERAL` scan never sees it.

If both hold, the load is invisible.

### Reproduction against the REAL artifact and the REAL renderer chunk

Injected (via acorn, at the body of an existing factory) into `static/chunks/0-68v-mavrx9j.js` — a chunk referenced by `<script async>` in the real `th.html`, i.e. genuine page startup:

```js
e["l"](`/_next/static/chunks/1xuh9d2c-a_w9.js`)
```

`1xuh9d2c-a_w9.js` is a real chunk in the artifact that already contains the bundled QR-renderer library. Result: `STATIC_UNKNOWN` with **603 UNKNOWN — byte-for-byte the same diagnostic breakdown as the untouched baseline.** No new finding. (`e` is the real context parameter; `e["l"]` is the `loadChunk` method, merely written with brackets and a template argument.)

The most compact standalone reproduction — a factory with a plain, signature-legal parameter that aliases the context, uses computed access to the exact modeled `l` method, and a template-literal target:

```js
(t,e,n)=>{ const c = t; c[`l`](`/_next/static/chunks/pdf-vendor.js`); }
```

→ `STATIC_SUPPORTED`, unknown=0, violation=0, no edge recorded. Verified end-to-end through the frozen adapter with all identity checks passing (`review-stagea-a6-sec/attack.mjs`, cases `A1`, `A3`, `A4`, `A5`, `A6`, `A7`, `A10`, `B2`, `B6`, `B7`, `FINAL`; the real-artifact case `inj2.mjs`).

### Why this defeats the compensating control too

The stated backstop (spec §2.3 #5 / task point (e)) is a Stage-B marker scan over **startup chunks**. The startup set is built from the edges this adapter emits. Because the invisible load emits **no edge**, the target renderer chunk is never added to the reachable/startup set, so the marker-scan compensator does not examine it either. The two controls fail together, for the same reason. Contrast Finding 4: a load expressed through the runtime registration *is* recorded as an edge and *does* enter the startup set.

### Threat-model scope (stated honestly)

My real-artifact repros recompute the expected manifest from the mutated tree, so artifact identity passes trivially. In production the manifest is pinned upstream, so a *post-build* artifact swap without updating the pin is caught by identity alone. This finding therefore bites when the hostile load is present **at or before** the point the pinned manifest is computed — a compromised source module, a malicious dependency, or a compromised build. That is exactly the threat this static gate exists to catch (if it only caught post-pin tampering, the identity manifest would make the walker pointless). So the finding is squarely in scope.

### Note on what the signature gate *does* defend

`inspectFactory`'s signature check refuses `arguments`-based access, 4+ params, destructured context `({l})=>...`, and rest params (`UNSUPPORTED_FACTORY_SIGNATURE`, test at line 981). Good. But it does not stop in-body aliasing (`const c = t`) or computed access — an inconsistent boundary: the context can't be destructured in the parameter list, yet can be freely re-bound and bracket-accessed one line later.

### Suggested direction (not implemented)

Fail closed on the loader family, not just its canonical spelling: treat any computed member call on, or any alias of, the context parameter as UNKNOWN; treat any member call on the context whose method name is a loader with a non-literal argument as UNKNOWN. And require the marker-scan compensator to scan **all** chunks in the artifact, not only graph-reachable startup chunks — reachability is precisely what an attacker hides.

---

## FINDING 2 — [MEDIUM] Overclaim in spec §2.3 and the iteration-6 report (same pattern flagged for Stage B iters 9/10)

- Spec §2.3 claim #2 calls `context.l/L/b/w/u` and `import()` **"every byte-fetching construct" (ทุกตัว)** that is read and resolved. Finding 1 shows this is only true for one spelling of each; a bracket, an alias, or a template argument evades silently.
- Spec §2.3 closing line: *"PASS means 'no un-followable byte-fetching path, and no PDF/renderer code in the startup set'."* Finding 1 is a counterexample to both halves.
- The iteration-6 report table (§2) row "context.l/L/b/w/u with literal → edge through `normalizeChunkReference`, subject to the same path-escape and external-URL rules as every other path" implies these methods are reliably covered, without noting the bracket/alias/template escape.
- The candidate's own test titled **"every construct that can fetch bytes is read, resolved and recorded"** (line 903) exercises only `t.l(...)` dot-form with literals and `t.l(globalThis.x)` variable form. Its title asserts more than it tests.

To the report's credit, §6 *does* disclose a residual: "if loaded another way (e.g. building `<script>` yourself) it won't be caught at this layer — must rely on browser evidence and marker scan." But it frames the escape as an exotic self-built `<script>`, not as trivial re-spellings *within the recognised loader family*, and it does not note that these are fail-OPEN (no UNKNOWN) rather than fail-closed. The PM gap report (`PM_PHASE2A_ADAPTER_GRAMMAR_GAP.md`) is the most honest document in the chain — it explicitly says option 2's downside is "confidence from observation, not proof." The overclaim is in the spec and the iteration-6 report/test titles, and it is the same overclaim pattern the mandate warns about.

---

## FINDING 3 — [INFO / accepted relaxation] Removal of `reviewedExportBindings` (iteration 5→6)

`context.s` (esmExport) previously required a `[name, 0, primitive] × N` binding tuple; a malformed tuple was UNKNOWN (blocking). In iteration 6 the binding list is "the module's own business": `s` with an **arbitrary** binding list and an integer source is now `STATIC_SUPPORTED` (repro `Q3a`). This is a genuine relaxation of a prior control, but it opens **no byte-load path** — `s` re-exports from an already-registered module, and the security-relevant invariant is preserved: a non-integer source → `UNRESOLVED_MODULE_REFERENCE` (UNKNOWN, `Q3b`), and the referenced module must exist → `UNRESOLVED_MODULE_DESTINATION` if absent (`Q3c`). Consistent with the withdrawn statement-level policy. Accept as documented.

---

## FINDING 4 — [INFO / verified safe] Runtime pin + registration grammar (Q2)

The runtime IIFE body is admitted by SHA-256 of its body span; only the registration call is parsed. I verified on the real runtime chunk (`turbopack-31n9jue5s48pd.js`):

- The pin matched the real body (no `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` at baseline).
- An attacker who keeps the pinned body byte-identical **can** rewrite the registration payload — but the grammar constrains it: `otherChunks` entries pass through `normalizeChunkReference` and must resolve to chunks the artifact carries (else `MISSING_GRAPH_DESTINATION`, VIOLATION), and `runtimeModuleIds` must be non-negative integers whose modules must be registered (else `UNRESOLVED_MODULE_DESTINATION`). The payload cannot declare new code.
- Critically, adding the renderer chunk to `otherChunks` **is recorded as a visible `synchronous-instantiation` / `RUNTIME_INITIAL_CHUNK` edge** and adds the chunk to the startup set (repro `q2.mjs`) — so unlike Finding 1, this path feeds the marker-scan compensator its input.

The duplicate-key guard removal (iteration 5) is inert as claimed: both metadata parsers require exactly two properties and require both names to resolve, so a repeated key drops one → parse returns null → UNKNOWN (fail-closed). The runtime pin is a sound control; the exposure is the factory walker in ordinary chunks, not the runtime.

---

## FINDING 5 — [INFO] Fail-closed audit (Q4)

Within the recognised vocabulary the new diagnostics are fail-closed: `UNRESOLVED_CHUNK_LOAD` (non-literal / missing loader argument), `UNRESOLVED_MODULE_REFERENCE` (non-integer module ref), `MISSING_GRAPH_DESTINATION` (VIOLATION), `CHUNK_PATH_ESCAPE` (VIOLATION), `EXTERNAL_EXECUTABLE_REFERENCE` (VIOLATION), `UNRESOLVED_MODULE_DESTINATION`, and syntax/UTF-8/limit failures all → UNKNOWN or VIOLATION. The single silence path is the fail-OPEN behaviour of Finding 1: an unreadable/unrecognised load construct becomes no diagnostic. That is the one place where "an unreadable construct becomes silence," and it is the finding.

---

## What I could not verify / limitations accepted

- **Stage-B marker scan and browser evidence (spec §3).** The compensating controls named in §2.3 #5 live in the Stage-B verifier, which is not part of this candidate. I could not test whether the marker scan scans all chunks or only graph-reachable startup chunks; Finding 1's compounding claim rests on the reasonable reading that the startup set is built from this adapter's edges. If Stage B independently scans **every** chunk regardless of reachability, Finding 1's second-order impact (compensator blindness) is reduced, though the primary static-gate silence remains.
- **Real-artifact identity in production.** My mutation repros pass identity because I recompute the manifest over the mutated tree; I could not exercise the real upstream pinning pipeline (no build permitted). The threat-model scope in Finding 1 states the consequence.
- **No build / no npm install / no browser / no network** were run, per constraints. The `verifyLocalToolchain` identity checks pass against the symlinked `node_modules`, so the parser/HTML-parser lineage is the real pinned toolchain.
- I reviewed the three deliberately-changed test expectations (shadowed-Promise deferred loader → `UNRESOLVED_CHUNK_LOAD`; malformed export tuple → destination-based; ordinary IIFE in a factory → not flagged unless it contains a chunk-path literal). None hides a weakening beyond the accepted policy change; all remain UNKNOWN where a5 was UNKNOWN, except the export-tuple relaxation covered in Finding 3.

## Artifacts of this review

Under `review-stagea-a6-sec/`: `attack.mjs` (synthetic harness), `cases1.mjs`/`cases2.mjs`/`q3.mjs`/`final.mjs` (case batches), `realrun.mjs`/`baseline.mjs` (real-artifact driver), `inject2.mjs` (real-startup-chunk injection), `q2.mjs` (runtime-payload rewrite), and the captured result JSON files.
