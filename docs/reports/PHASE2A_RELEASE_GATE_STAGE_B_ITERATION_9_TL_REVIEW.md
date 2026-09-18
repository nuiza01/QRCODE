# TL review — NQR Phase 2A release gate, Stage B iteration 9

Reviewer: independent TECH LEAD (did not author the code)
Date: 2026-09-18
Candidate: `scratchpad/nqr-stageb-b9/project`
Baseline: iteration 8, `scratchpad/nqr-stageb-b8/project`

## Verdict

**REQUEST_CHANGES** on canonical5 `f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb`.

The mechanism is well built and the tests are unusually mutation sensitive. The blocker is not the
plumbing, it is the proof: `COLD_PREVIEW_ABSENCE_SOURCES` does not contain the file that actually
decides whether the first paint is a valid preview. I demonstrate below that a one-line edit to an
unpinned source reintroduces a cold valid initial preview on the default route while
`COLD_PREVIEW_ABSENCE_SHA256` stays bit-for-bit identical. Until the pinned set covers that decision
(or the gate stops relying on a hand-curated list), a NOT_APPLICABLE record can reach
PASS_BUNDLE_SCOPE while the exempted scenario is observable in the running app.

## Hashes verified

Recomputed with `node scratchpad/rebuild/canon.cjs <dir>`:

```
$ node rebuild/canon.cjs nqr-stageb-b9/project
f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb    <- matches the required i9 value
$ node rebuild/canon.cjs nqr-stageb-b8/project
1c4bdab39842797014f0d82a224261392dd7a1cfb274ed1e9067764f37c2edb7    <- matches the accepted i8 baseline
```

Per-file, `shasum -a 256` in `nqr-stageb-b9/project/scripts/` — all five match report §2:

```
5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab  inspect-turbopack-emission.mjs
11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a  inspect-turbopack-emission.test.mjs
629eb10bf84792c81447d97a63c0b54344483353ede6934be75e7f8998870959  verify-initial-bundle-boundary.mjs
81612f4142597b7058c2c5be2aced34e30314fb3ebad1de74cc74dbb8dd249fb  verify-initial-bundle-boundary.test.mjs
3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33  build.mjs
```

Diff appendix: `shasum -a 256 scratchpad/i8-i9.diff` = `da8435a32351e04fc30f1afce297216f223ae1323fdcfc05b86193fca5e37a7a`,
272 lines, and the fenced ```diff block in the report is **byte-identical** to that file (compared
programmatically). Applying it reproduces the candidate:

```
$ cp -R nqr-stageb-b8/project/. patchtest/ && patch -p1 < i8-i9.diff
patch applied
$ node rebuild/canon.cjs patchtest
f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb
```

Pinned application digest recomputed independently:

```
$ node -e 'import("./scripts/verify-initial-bundle-boundary.mjs").then(async m =>
    console.log(await m.readColdPreviewAbsence(process.cwd())))'
4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453   == COLD_PREVIEW_ABSENCE_SHA256
```

The four pinned files in the candidate are byte-identical to the SOURCE repo's copies
(`e3ecd19a…`, `d4c0d4e8…`, `7d03839a…`, `c6c33ee4…`), so the pin does describe the real application.

Suite: `npm run test:scripts` equivalent, `node --test scripts/*.test.mjs` — **287/287 pass, 0 fail**
in the candidate; **284/284** in i8. +3 tests, no test removed (the test diff is additive apart from
the `withAdmittedGate` option and the `stageBInputs` field). `npx eslint` on both changed files: exit 0,
no output.

## Findings

### P1 — The pinned set omits the code that decides the predicate; a fifth file reintroduces the flow without moving the digest

The gate's whole claim rests on the app never producing a valid payload at first paint. The chain is:

- `src/components/generator/Generator.tsx:99` — `useState<DraftMap>(emptyDrafts)` **(pinned)**
- `src/components/generator/drafts.ts:118` — `emptyDrafts()` returns all-empty fields **(pinned)**
- `src/components/generator/Generator.tsx:126` — `validateDraft(type, drafts[type], …)` **(the call is pinned, the function is not)**
- `src/components/generator/payload.ts:255` — `validateDraft` is what turns an empty draft into `payload: null` **(NOT pinned)**
- `src/components/generator/Generator.tsx:153` — `previewPayload = validation.payload ?? lastValid[type] ?? null` **(pinned)**

So "empty draft ⇒ no payload" is decided in `payload.ts` (and the zod schemas under `src/qr/` it calls),
neither of which is in `COLD_PREVIEW_ABSENCE_SOURCES`
(`scripts/verify-initial-bundle-boundary.mjs:542-547`).

Demonstrated in my own copy of the SOURCE repo
(`review-stageb-b9-tl/repo-copy`, SOURCE untouched). Before the edit, a vitest probe over all ten
content types confirms the claim holds today:

```
TYPES_WITH_VALID_EMPTY_PAYLOAD=[]      (test passes)
```

After inserting six lines into the unpinned `src/components/generator/payload.ts` (a "marketing
default" for the empty `url` draft — `url` is the default `initialType`, so this is the landing page's
first paint):

```
TYPES_WITH_VALID_EMPTY_PAYLOAD=["url"]
AssertionError: expected [ 'url' ] to deeply equal []

$ # digest over the four pinned files, after that change:
4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453   <- UNCHANGED
```

The gate would still accept `COLD_VALID_INITIAL_PREVIEW: NOT_APPLICABLE` for an application that
renders a valid preview on first paint of `/[locale]`.

The same hole is open through other unpinned files: `src/components/generator/PayloadForm.tsx`,
`fields.tsx`, `index.ts` (the barrel that both pages import through, currently a plain re-export), and
any new file under `src/app/` that mounts `<Generator>`.

The code comment at `scripts/verify-initial-bundle-boundary.mjs:536-541` overstates this —
"adding any prefill path changes the digest and blocks" is only true for prefill added *inside those
four files*. Report §5 bullet 2 does flag the "new page" variant honestly and asks the reviewer to
judge; it does not mention that the validity decision for the *existing* path is already outside the
pin, which is the stronger and more likely case.

**Asked directly: yes, a fifth file can reintroduce the flow without changing the digest, and
`src/components/generator/payload.ts` is that file today.**

Suggested remedies (author's choice): add `payload.ts` and the schema module it parses with; or derive
the list from the module graph reachable from the two pages and assert it in a test; or bind the proof
to a verify-time digest over all of `src/` rather than a hand-curated list.

### P2 — No test pins the completeness of `COLD_PREVIEW_ABSENCE_SOURCES` (surviving mutant)

`scripts/verify-initial-bundle-boundary.test.mjs:1695-1696` only asserts the list is sorted and has no
duplicates. Nothing asserts *which* files are in it. Mutant: delete
`"src/app/[locale]/qr/[type]/page.tsx"` from the list (line 544) and re-pin
`COLD_PREVIEW_ABSENCE_SHA256` to `39beba39cfaed6ddcb0a6840f5514911ac3b3f3ce9fc6222642955b1385f9dcd`:

```
$ node --test scripts/verify-initial-bundle-boundary.test.mjs
ℹ pass 147
ℹ fail 0
```

**SURVIVED.** One of the two pages that mounts the generator can be dropped from the proof and the
suite stays green. This is the testability counterpart of P1: the mechanism around the list is
thoroughly tested, the list itself is not.

(Note on my own harness: the equivalent mutants that drop `drafts.ts` or `Generator.tsx` were "killed",
but only by accident — see P3 below. The list is untested in all three cases.)

### P2 — The proof is bound to the verifier's checkout, not to the artifact under review

`scripts/verify-initial-bundle-boundary.mjs:976` reads the sources from
`fileURLToPath(new URL("../", VERIFIER_URL))` — the project directory the *gate module* happens to sit
in. Nothing ties that tree to the build being verified: `coldPreviewAbsence` is never cross-checked
against `identity.sourceInventorySha256` or any other artifact identity, unlike every other piece of
timing evidence, which must match `identity` (lines 728-745). A gate copy placed next to a `src/`
snapshot that did not produce the artifact still "proves" the absence for that artifact.

In-repo runs make this mostly theoretical, but the design comment claims the proof is taken from the
world rather than from the record, and it is only taken from *a* world.

I could not determine whether `sourceInventorySha256` would independently catch a `src/` change: it is
a value the build declares in `expectedInputs` and the verifier only compares it to the pinned constant
`inspect-turbopack-emission.mjs:47`; no code in the repo computes it, and I am blocked from running a
build. See "Could not verify".

### P3 — Brittle negative fixture in the new test

`scripts/verify-initial-bundle-boundary.test.mjs:1673` builds the "one character off" digest as
`` `${COLD_PREVIEW_ABSENCE_SHA256.slice(0, 63)}0` ``. When the pin's last character is already `0`
this silently degenerates into a *duplicate of the positive case* and the assertion inverts. This is
not hypothetical: two of my re-pinned mutants produced digests ending in `0`
(`…9363ff20`, `…f5f92050`), and both were "killed" by this fixture asserting BLOCKED against a
legitimately PASSing input — a false kill, hiding the real result. Suggest `slice(0, 63) + (last === "0" ? "1" : "0")`
or a fixed unrelated 64-hex constant.

### P3 — Reason-code conflation between "wrong scenario exempted" and "proof unreadable"

`scripts/verify-initial-bundle-boundary.mjs:753-755` emits `SCENARIO_NOT_APPLICABLE_UNPROVEN` for both
"you exempted a scenario you may not exempt" and "the reviewed sources could not be read". Those need
different operator responses. The CLI prints reason codes only, so the runbook reader cannot tell a
policy violation from a checkout problem.

### P3 — `realpath` strictness makes a symlinked checkout indistinguishable from tampering

`readBoundFile` requires `await realpath(path) === path`, so a checkout reached through *any* symlinked
path component fails closed. Verified in my scratch dir:

```
copy:             4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453
unreadable(000):  null
dir-not-file:     null
symlinked-root:   null      <- repo reached via a symlinked parent
symlinked-subdir: null      <- src/components is a symlink
```

Correct direction (fail closed), but combined with the P3 above, a CI worker using a symlinked cache
path will BLOCK with `SCENARIO_NOT_APPLICABLE_UNPROVEN` and no way to tell why.

### P3 — Surviving equivalent mutant: `!==` → `!=` on the digest comparison

Line 753, `coldPreviewAbsence != COLD_PREVIEW_ABSENCE_SHA256`: 147/147 pass. Benign — the input type
guard at line 806 has already narrowed the value to `string | null`, and `null != "<hex>"` is `true`.
Recording it for completeness; no change needed, though `!==` is the right thing to keep.

### P3 — Runbook reason-code list not yet updated

`docs/RELEASE_GATE_RUNBOOK.md:62` enumerates the common reason codes and does not list
`SCENARIO_NOT_APPLICABLE_UNPROVEN`. The author correctly did not touch SOURCE in this iteration; this
is an integration-time follow-up, noted so it is not lost.

## What I checked and found sound

**1. Can NOT_APPLICABLE reach PASS unintentionally?** No, within the input the gate is given.

- Other scenario ids: `scenario.id !== NOT_APPLICABLE_SCENARIO ||` (line 753) — killed mutant M1.
- Missing/absent proof: `coldPreviewAbsence` is in `DECISION_INPUT_KEYS` (line 566) and `exactKeys`
  requires the exact sorted key set, so omitting it is `INVALID_DECISION_INPUT`; `null` and `""` both
  block.
- Key ordering: `exactKeys` sorts (`Object.keys(value).sort().join(",")`, line 584), so order is
  irrelevant.
- Prototype tricks: `plainRecord` (line 575) rejects non-`Object.prototype` prototypes and any
  accessor descriptor; `Object.hasOwn(TIMING_SCENARIO_ROUTES, scenario.id)` (line 736) prevents
  `__proto__`/`constructor` lookups; admission uses a captured `Set.prototype.has` via `Reflect.apply`
  (line 517). Independently, `timing` always originates from `JSON.parse` of canonical-round-tripped
  bytes (lines 826-833), so boxed `String` ids and exotic descriptors cannot reach the scenario loop
  at all.
- Case: `COLD_PREVIEW_ABSENCE_SHA256.toUpperCase()` blocks (tested, and mutant M5 confirms).
- Near-miss status: `"NOT_APPLICABLE "` falls through to `TIMING_EVIDENCE_INCOMPLETE` (mutant M7).
- The exemption does **not** relax the rest of the scenario contract: exact keys, membership,
  duplicate detection, exact route set, `state`, `observationsSha256` hex and the pre/post identity
  match all run before the `status` switch (lines 734-747).
- Omitting the scenario entirely still trips `seen.size !== REQUIRED_TIMING_SCENARIOS.length`.
- `coldPreviewAbsence` being "attacker controlled through callers": `evaluateBundleBoundary` is a pure
  function whose only in-tree caller computes the value at line 976. A caller that passes the constant
  is lying in exactly the way a caller passing forged `acceptanceBytes` or `gateRevision` would, which
  is the established i8 trust model. Acceptable. (It is worth noting the constant is `export`ed, so
  the lie is one import away; that is also true of `ADMITTED_ACCEPTANCE_SHA256`.)

**2. Is the factual claim true today?** Yes. Empirically, no content type yields a valid payload from
`emptyDrafts()` (probe above, run against the real SOURCE tree copied to my scratch dir). The report's
supporting claim that `src/` contains no `searchParams`, `localStorage`, `sessionStorage` or
`document.cookie` is also true — `grep -rn` over `src` returns nothing for all four. `<Generator>` is
mounted from exactly the two pinned pages. `initialType` only selects a tab. The claim is correct; the
*proof of the claim* is what P1 is about.

**3. Fail-closed behaviour.** Verified for: sources absent (empty dir → `null`), unreadable
(`chmod 000` → `null`), replaced by a directory (`null`), replaced by a symlink (`null`), reached
through a symlinked parent (`null`), and a gate copy with no `src/` at all — the CLI test at
`verify-initial-bundle-boundary.test.mjs:1725-1745` runs `build.mjs --verify-existing` for real and
asserts exit 1 with `reasons: SCENARIO_NOT_APPLICABLE_UNPROVEN`. An unproven NOT_APPLICABLE yields
BLOCKED, not FAIL, which is the right classification (missing evidence, not a proven violation) and
matches how i8 treated non-PASS statuses.

**4. Mutation sensitivity.** I ran 13 mutants of my own against the candidate's verifier suite, one
full suite run each (`review-stageb-b9-tl/mutate.mjs`). 11 killed, 1 equivalent-mutant survivor, plus
the separately-run list-completeness mutant that survived:

| # | Mutant | Result |
|---|---|---|
| M1 | drop the scenario-id guard (any scenario exemptible) | killed |
| M2 | drop the digest guard (no proof needed) | killed |
| M3 | `\|\|` → `&&` in the guard | killed |
| M4 | `!==` → `!=` on the digest compare | **SURVIVED** (equivalent, see P3) |
| M5 | case-insensitive digest compare | killed |
| M6 | unproven NOT_APPLICABLE also sets `failed` (FAIL not BLOCKED) | killed |
| M7 | accept `status.trim() === "NOT_APPLICABLE"` | killed |
| M8 | `readColdPreviewAbsence` skips a missing file instead of returning null | killed |
| M9 | delete the `coldPreviewAbsence` input type guard | killed |
| M10 | type guard rejects `null` too | killed |
| M11 | drop the `path` binding from the digest rows | killed |
| M13 | read sources with plain `readFile` (follow symlinks, no realpath) | killed |
| M12c | drop `src/app/[locale]/qr/[type]/page.tsx` from the list and re-pin | **SURVIVED** (P2) |

The author's report claims "mutation 11 แบบ ถูกจับทั้งหมด (11/11)". I reproduce that level of
sensitivity for the *mechanism*; the claim is accurate for the mutants chosen, but the chosen set does
not include the source list itself, which is the one that survives.

**5. Regressions and honesty.** No behavioural regression found: the only semantic change to the i8
decision path is the new `coldPreviewAbsence` input and the new `NOT_APPLICABLE` branch; every other
status still routes exactly as before, and all 284 i8 tests are still present and green. The gate
revision change *is* handled honestly — report §2 last bullet states plainly that
`verifierLogicSha256` changes and therefore the gate revision changes and any admitted record must be
reissued, and `docs/ENGINEERING_LOOP.md:57` repeats it in bold. `ADMITTED_ACCEPTANCE_SHA256` is still
empty and the dependency pin is unchanged, both as reported. Report §5 bullet 4 also correctly refuses
to dress the PO decision up as an engineering conclusion.

## Could not verify

- **What `sourceInventorySha256` actually covers.** No producer exists in `scripts/`; the verifier only
  compares the build-declared value to the pinned profile constant. I therefore cannot say whether it
  would independently catch an edit to `payload.ts`. If it does cover all of `src/`, P1's exploitability
  in a real gate run is reduced (though the mechanism's own claim is still overstated, and the digest
  remains the thing the exemption is keyed on). Running a build to find out is outside my constraints.
- **Real browser timing behaviour.** No dev server, no browser, so the "QA cannot observe this scenario"
  claim is verified by source analysis and a unit-level probe of `validateDraft`, not by observation.
- **`ADAPTER_STATIC_UNKNOWN` on a real artifact** — unchanged from i8 and outside this diff.
- `python3` on this machine is an Xcode stub that demands a licence agreement; I did not accept it and
  redid that step in Node instead. Nothing was blocked as a result.
- **`git` is the same Xcode stub**, so I could not run `git status` to demonstrate the SOURCE tree is
  clean. I did not accept the licence. Instead:
  `find src scripts docs -newermt "2026-09-18 10:50" -type f` lists only
  `docs/ENGINEERING_LOOP.md` (10:55:14) and `docs/reports/PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_9.md`
  (10:53:36), both written by the author's process, not by this review; no file under `src/` or
  `scripts/` was modified. Both candidate roots still recompute to their expected canonical5 after all
  my work (`f551d9ca…e7fc` and `1c4bdab3…edb7`).

## Constraints honoured

SOURCE repo and both candidate roots were read only. All writes were under
`scratchpad/review-stageb-b9-tl/` (`repo-copy/`, `mut-base/`, `mut-work/`, `m12*/`, `fc/`,
`patchtest/`, `mutate.mjs`, this file). No install, build, dev server, browser, network, database,
deploy, commit or push. No sudo, no Xcode licence.
