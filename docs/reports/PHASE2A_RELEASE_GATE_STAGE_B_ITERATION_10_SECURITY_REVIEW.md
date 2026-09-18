# NQR-129 Stage B iteration 10 — Independent SECURITY review

Date 2026-09-18 | Reviewer: SECURITY (did not write this code, did not coordinate with TL)
Candidate: `scratchpad/nqr-stageb-b10/project` (frozen 0444)
Previous iteration I reviewed: iteration 9 — REQUEST_CHANGES

## Verdict: **REQUEST_CHANGES**

On the canonical5 I recomputed myself:
**`df3c1bb03697ec66d9a393b53eeffabb25baac365af3428a395c032424183b8b`** (matches the coordinator's value)

The mechanism is much better than iteration 9 and I could not break the walk itself. Both bypasses that
made me reject iteration 9 (SEC F1 barrel, TL P1 validator) are genuinely dead — I re-ran mine and it now
blocks with `COLD_PREVIEW_PROOF_MISMATCH`.

I am asking for changes for the same *class* of defect as iteration 9, in a new place: **the reviewed source
still carries an assurance that my reproduction contradicts.** The comment says the digest covers
"EVERY file under the application source tree", but the digest root is `src/`, and in Next.js 16 `src/` is not
the application source tree. I built a working prefill path entirely outside `src/`, left the digest equal to
the pin, and reached `PASS_BUNDLE_SCOPE` and real CLI **exit 0** (F1 / SEC10-A). The person doing C1 admission
reads that comment to decide whether they must check the absence themselves.

The fix is small again: either correct the scope wording, or extend the pin to the handful of out-of-`src`
files Next.js designates. No redesign. Details in §6.

---

## 1. Identity I verified myself (before and after all experiments)

| File (`project/scripts/`) | SHA-256 | vs i9 |
| --- | --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` | same |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` | same |
| verify-initial-bundle-boundary.mjs | `c0f6142161e765042a0c2a408a718b7c00278b94edf00a081409a214f3fd3f11` | **changed** |
| verify-initial-bundle-boundary.test.mjs | `3f5dcfcfdb710b7106a987ca2aeaa541f1ff80bcde540ee3a65374a40a0675fb` | **changed** |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` | same |

- canonical5 i10 = `df3c1bb0…b8b` — recomputed with `rebuild/canon.cjs` on the frozen candidate and again on my
  byte-equal working copy; identical both times and unchanged after all experiments.
- canonical5 i9 = `f551d9ca…e7fc` — recomputed, matches the value in my iteration 9 review.
- `diff -rq` between the two candidate trees: only the two files above differ. (The i10 candidate also carries a
  full 154-file `src/` copy, where i9 carried only 5 files; `src/` is not part of canonical5.)
- `COLD_PREVIEW_ABSENCE_SHA256` = `79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a`.
  I reproduced it three ways — from the frozen candidate, from my copy, and from the **live SOURCE repo**
  (`/Users/sarawutjuntasang/Nexora/QRCODE`, 154 files under `src/`). All three equal the pin, so the pin is
  current and integration will not immediately mismatch.
- `ADMITTED_ACCEPTANCE_SHA256` is still `[]`. **No acceptance record can pass this gate today.**

## 2. Tests I ran myself

- Byte-equal copy of the candidate at `review-stageb-b10-sec/project`, Node v24.14.1, `TMPDIR` inside the review area.
- `node --test scripts/*.test.mjs` → **288/288 pass** (report claims 288; matches).
- My own probes, all reproducible from this directory:
  - `probe-walk.mjs` — 19 tree shapes against `readColdPreviewAbsence()` (results table in §4.2)
  - `probe-resource.mjs` — denial-of-verification measurements
  - `project/scripts/sec-probe.test.mjs` — copy of the author's test file plus 6 end-to-end probes
    `SEC10-A`…`SEC10-F`, run with `node --test --test-name-pattern "^SEC10-" scripts/sec-probe.test.mjs` → 6/6 pass

---

## 3. Findings

### F1 — P2 (blocking) The absence proof is scoped to `src/`, but the Next.js application is not. Working PASS.

`COLD_PREVIEW_ABSENCE.root` is `"src"`. The comment above it calls this "EVERY file under the application
source tree" and enumerates "a route, the generator, the barrel that re-exports it, a validator". That
enumeration invites exactly the wrong inference, because in Next.js 16 the files that decide *which* route
tree and *which* modules are used sit outside `src/` by Next's own convention.

From the shipped docs in this repo (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`),
which AGENTS.md makes authoritative:

- `src-folder.md`: "`src/app` or `src/pages` will be ignored if `app` or `pages` are present in the root
  directory." A root `app/` makes the entire reviewed `src/app` dead code, with the digest untouched.
- `src-folder.md`: "Config files like `package.json`, `next.config.js` and `tsconfig.json` should remain in the
  root of your project", and `.env.*` likewise. `tsconfig.json` is where `"@/*": ["./src/*"]` lives.
- `instrumentation-client.md`: "place the file in the **root** of your application or inside a `src` folder" —
  code that runs in the browser *before the app becomes interactive*.
- `proxy.md`: "Create a `proxy.ts` (or `.js`) file in the project root, or inside `src`".
- `08-turbopack.md` / `05-config/01-next-config-js/turbopack.md`: `turbopack.resolveAlias` maps "aliased imports
  to modules to load in their place", configured in `next.config.js`.

The minimal version needs one line and no new route. Both generator pages import through the alias:

```
src/app/[locale]/page.tsx:13          import { Generator } from "@/components/generator";
src/app/[locale]/qr/[type]/page.tsx:20 import { Generator } from "@/components/generator";
```

Adding `"@/components/generator": ["./vendor/prefilled-generator"]` to `tsconfig.json` `paths` (and/or the
matching `turbopack.resolveAlias`) redirects both pages to a prefilling module while every file under `src/`
stays byte-identical.

**Reproduction — `SEC10-A`, passes (full PASS, not a near-miss).** In a gate copy that admits a record whose
`COLD_VALID_INITIAL_PREVIEW.status = "NOT_APPLICABLE"`, with the reviewed `src/` copied in unmodified, I planted
*only* out-of-`src` files next to it: a root `app/[locale]/qr/[type]/page.tsx`, a `tsconfig.json` with the alias
above, a `next.config.ts` with `turbopack.resolveAlias`, an `instrumentation-client.ts` seeding
`window.__NQR_SEED`, and `vendor/prefilled-generator.tsx`.

```
readColdPreviewAbsence(base)  -> 79de2baf…c9f2a   (equals COLD_PREVIEW_ABSENCE_SHA256)
verifyInitialBundleBoundary() -> PASS_BUNDLE_SCOPE
build.mjs --verify-existing   -> exit 0
```

`probe-walk.mjs` case `A2` is the same thing isolated to the digest: `MATCHES PIN`.

**Contrast, and credit where due — `SEC10-B` / `probe-walk.mjs` `A1`:** my iteration 9 F1 (append to
`src/components/generator/index.ts`) now yields digest `faa825e4…` and

```
{"code":"NQR_BUNDLE_NEEDS_EMISSION_REVIEW","reasonCodes":["COLD_PREVIEW_PROOF_MISMATCH"]}
```

with the real CLI exiting non-zero. TL's P1 (`payload.ts`) is closed by the same mechanism. That part of the
iteration is genuinely fixed.

**Blast radius.** Identical in shape to iteration 9: this is not an unauthenticated bypass. It still needs an
admitted record (a reviewed source change) plus control of the working tree, and today
`ADMITTED_ACCEPTANCE_SHA256` is empty and `SUPPORTED_PROFILE.sourceInventorySha256` is stale, so nothing passes
at all. The risk is **admit-time**: a C1 reviewer who reads "EVERY file under the application source tree" and
therefore does not check `tsconfig.json`, `next.config.ts`, a root `app/`, `proxy.ts` or
`instrumentation-client.ts` for themselves.

I confirmed SOURCE has **none** of those out-of-`src` surfaces today (no root `app/` or `pages/`, no `proxy.*`,
no `instrumentation*.ts`, no `mdx-components.tsx`), so this is about the durability of the evidence, not a
present-day defect in the application.

### F2 — P3 The code comment asserts a runbook control that does not exist yet

`verify-initial-bundle-boundary.mjs` states: *"The runbook makes that a required step; the gate cannot enforce
it."* I grepped `docs/RELEASE_GATE_RUNBOOK.md` (124 lines) for `cold`, `applicable`, `waiver`, `absence`,
`checkout`, `src/` — the only hit is an unrelated line 116. The author's own report §5 line 70 says the runbook
step "จะเพิ่มตอน integrate" (will be added at integrate time), which is honest; the comment in the reviewed
source is written in the present tense and is therefore not true of any tree that exists today. Same category
as F1: an assurance in reviewed source that a C1 admitter will rely on.

### F3 — LOW (accepted as documented) The digest binds the gate's own checkout at walk time, not the artifact

Carried forward from my iteration 9 F2 / TL P2. `decideExistingArtifact` reads
`readColdPreviewAbsence(new URL("../", VERIFIER_URL))` — the tree beside the running gate — while `buildDir` is
any absolute path. The author now states this plainly in the comment ("It is NOT a statement about the artifact
under test… running the gate in a different checkout than the one that produced the artifact voids this proof"),
which is the disclosure I asked for, so I accept it as documented rather than re-raising it.

Two precisions worth recording:

- The comment names only the *different checkout* case. The equivalent same-checkout case needs no race and no
  second checkout: build from a dirty tree, restore the reviewed bytes, then run the gate.
- **`SEC10-F`**: the digest is read once and never re-checked. I computed the digest, then appended a prefill
  line to `src/components/generator/index.ts`, then ran the decision with the digest already in hand:
  `PASS_BUNDLE_SCOPE []`. This is inherent to a one-shot digest and gives no power to anyone who cannot already
  write the tree, but it means the proof is "the tree was clean during the walk", not "the tree is clean".

### F4 — LOW Directory enumeration has no breadth limit; the file and byte caps never bound it

`visit()` collects every entry name of a directory into `names` and sorts it before any limit is consulted.
`rows.length > maxFiles` and `totalBytes > maxTotalBytes` are checked **only inside the file branch**, so a tree
made of directories alone never trips either. `maxDepth` caps depth at 24 but nothing caps breadth.

Measured (`probe-resource.mjs`, this machine):

| shape | result | time | RSS |
| --- | --- | --- | --- |
| reviewed tree, 154 files | `MATCHES PIN` | 22 ms | — |
| one directory, 400 000 entries | `null` | 980 ms | 247 MB |
| 40 000 empty directories, 0 files | `null` | 4 258 ms | ~190 MB heap |

Linear in entry count, so ~10 M entries is a multi-GB allocation and a likely fatal OOM. The direction is
fail-closed in every case (`null`, or process abort — never PASS), and it requires write access to the tree, so
this is denial-of-verification only. Worth a cheap guard (`if (names.length > someCap) return false`) mostly so
the limits in `COLD_PREVIEW_ABSENCE` mean what they appear to mean.

### F5 — INFO The kept `directoryIdentity` guard is weaker than its comment for a symlinked root

`directoryIdentity` uses `lstat`, while `opendir` follows symlinks. For the **root** (`<checkout>/src`) — the one
directory with no parent entry-loop to reject it — a symlinked `src` means the guard pins the *link's* inode,
not the directory that was actually listed, so repointing the link between the two reads would not be noticed.
No exploit: every file underneath then fails `readBoundFile`'s `realpath(path) === path` and the walk returns
`null` (verified, `B1`). Recording it because the author's comment explicitly reasons about which guard enforces
what, and this one does not enforce quite what it says in that one case.

### F6 — INFO Empty directories contribute no rows

`rows` only records files, so adding or removing empty directories under `src/` leaves the digest at the pin
(`probe-walk.mjs` `D4`: `MATCHES PIN`). No code impact; noted for completeness because the digest is described
as covering "every file under the tree" and that is literally accurate.

---

## 4. The threat questions, answered directly

### 4.1 Q1 — Re-run F1; can any edit that introduces a prefill leave the digest unchanged?

- **Inside `src/`: no.** I could not find one. Every in-tree shape I tried either changes the digest or returns
  `null`. Row entries are `{path, sha256}` with full relative paths; a filename cannot contain `/` (verified) and
  `opendir` never yields `.` or `..` (verified), so the row list is unambiguous with respect to tree content.
  The i9 F1 barrel edit, the TL P1 validator edit, a case-only rename, and a hardlink with different bytes all
  change the digest.
- **Outside `src/`: yes — see F1.** `PASS_BUNDLE_SCOPE` + CLI exit 0 with the digest equal to the pin.

### 4.2 Q2 — Judge each deletion in item 6. Do `opendir` and `readBoundFile` really enforce what was removed?

I tested each removed guard against the shape it used to catch. **All three deletions are justified** —
every shape still fails closed:

| id | shape | result |
| --- | --- | --- |
| BASE | verbatim copy of reviewed `src/` | MATCHES PIN |
| A1 | i9 F1 barrel edit inside `src/` | other digest (blocks) |
| **A2** | **root `app/` + tsconfig paths + next.config alias + instrumentation-client, `src/` untouched** | **MATCHES PIN — see F1** |
| B1 | `src` is a symlink to a real directory | `null` |
| B2 | `src/lib` is a symlink (parent component for its children) | `null` |
| B3 | one file replaced by a symlink to identical bytes | `null` |
| B4 | one file replaced by a **hardlink** to identical bytes | MATCHES PIN |
| B5 | hardlink with different bytes | other digest (blocks) |
| B6 | repoRoot reached through a symlinked ancestor | `null` |
| C1 | `config.ts` renamed to `Config.ts` (case only) | other digest (blocks) |
| D1 | 26 nested directories (maxDepth 24) | `null` |
| D2 | 2 100 extra files (maxFiles 2048) | `null` |
| D3 | one 9 MiB file (bytesPerFile 8 MiB) | `null` |
| D4 | two empty directories added | MATCHES PIN (F6) |
| D5 | one file `chmod 000` | `null` |
| D6 | a FIFO inside `src/` | `null` |
| E1 / E2 / E3 | no `src/` / `src` is a file / `src` is empty | `null` |

Per deletion:

- **Dirent type check** — correctly redundant. `lstat` on each entry still runs, and `!stat.isFile()` rejects
  FIFOs (`D6`), sockets, devices and symlinks (`B3`). Dropping it also avoids over-blocking on filesystems that
  report `UNKNOWN` dirent types, so the deletion is a small improvement, not just a wash.
- **Containment check (my iteration 9 F5)** — correctly judged unreachable. `opendir` never yields `.` or `..`
  (verified directly) and no listed name contains a separator (verified), and the root is a frozen constant
  joined onto the checkout. I withdraw F5 from iteration 9; the author is right that carrying an unreachable
  guard in a gate is worse than not carrying it.
- **`isDirectory` / `isSymbolicLink` / `realpath` in `directoryIdentity`** — the *outcomes* are correctly
  enforced elsewhere (`B1`, `B2`, `B3`, `B6` all `null`), so the deletion does not weaken the gate. The one
  imprecision is F5 above, which has no exploit.

Specific shapes asked about:

- **Symlinked `src` root (`B1`)** → `null`. Caught by `readBoundFile`'s `realpath(path) === path`, exactly as
  the author claims (`O_NOFOLLOW` alone would *not* catch it — it only applies to the final component).
- **Symlinked parent component inside the tree (`B2`)** → `null`, via `lstat` + `!stat.isFile()` at the parent's
  entry loop, before `opendir` is ever called on it.
- **Hardlink (`B4`, `B5`)** → passes, and harmlessly so: what is hashed is content, so a hardlink cannot
  introduce bytes without changing the digest. Correct to have no guard here.
- **Case-insensitive filesystem** → no longer a concern for the walk. In iteration 9 the four pinned names were
  string literals, so a case mismatch could block (my i9 F4). Now every name comes from the directory listing
  itself, so the path used always has the on-disk spelling. A case-only rename is a *content* change and blocks
  correctly (`C1`). I also confirmed Node resolves `import.meta.url` through `realpath`, so a checkout reached
  via a symlinked path (`/tmp` → `/private/tmp`) still yields the real path and does **not** false-positive —
  my iteration 9 F4 is not reachable through the production entry point. `B6` shows it only if a caller passes a
  non-real root itself.
- **File swapped between the digest read and the decision** → not re-checked; `SEC10-F` returns
  `PASS_BUNDLE_SCOPE []`. See F3. Each individual file read is protected within `readBoundFile` by the
  `dev:ino:size:mtimeNs:ctimeNs` before/after comparison; there is no cross-file or post-walk consistency check.

I could **not** deterministically win the mid-listing directory-swap race that the kept `dev:ino` guard exists
to close (the reviewed tree lists in ~20 ms). I read the guard as correct, and its failure direction is `false`
→ `null` → BLOCKED.

### 4.3 Q3 — Working-tree controller vs acceptance-record-only controller

- **Record only: no new power.** `SEC10-E` — take an admitted clean record, flip
  `COLD_VALID_INITIAL_PREVIEW` to `NOT_APPLICABLE`, and the result is `["ACCEPTANCE_NOT_ADMITTED"]`. The bytes are
  hash-pinned in reviewed source; unadmitted bytes are never parsed or used to steer inspection.
- **Working tree: yes, and this is now *easier* than in iteration 9.** In iteration 9 they had to restore four
  pinned files during the run (my F2). In iteration 10 they do not have to restore anything or race anything:
  they leave `src/` genuinely untouched and put the prefill in `tsconfig.json` / `next.config.ts` / a root
  `app/` / `proxy.ts` / `instrumentation-client.ts`. The artifact and the tree are then honestly consistent with
  each other, and the digest legitimately equals the pin. That is F1. Widening the evidence from 4 files to 154
  closed the two known holes but did not change the boundary that matters.
  They still cannot admit a record, so this is admit-time risk, not a runtime bypass.

### 4.4 Q4 — Do the three reason codes leak anything? Is the fixed-code discipline intact?

**No leak; discipline intact.** All three are fixed string literals reached on disjoint branches, verified
individually in `SEC10-C`:

```
wrong scenario waived  -> ["SCENARIO_NOT_APPLICABLE_FORBIDDEN"]
src/ removed           -> ["COLD_PREVIEW_PROOF_UNREADABLE"]
src/ edited            -> ["COLD_PREVIEW_PROOF_MISMATCH"]
```

- `readColdPreviewAbsence` returns `null` rather than throwing; no path, no per-file digest, no exception text
  escapes it on any of my 19 shapes.
- The branch order is correct: a waiver of the wrong scenario id is `SCENARIO_NOT_APPLICABLE_FORBIDDEN`
  regardless of the digest, so a valid digest cannot launder a forbidden waiver.
- All three enter BLOCKED, never FAIL, which is right — missing proof is not a proven violation.
- CLI output is codes only. `build.mjs` prints `reasons: COLD_PREVIEW_PROOF_UNREADABLE` and nothing else, and
  normalizes *any* non-gate error to the fixed `NQR_VERIFY_EXISTING_FAILED` ("filesystem errors can carry
  absolute paths"), so even an unexpected throw out of the walk cannot leak a path through the CLI.
- No oracle value: `COLD_PREVIEW_ABSENCE_SHA256` is an exported constant in public source, so distinguishing
  MISMATCH from UNREADABLE tells an attacker nothing they cannot already compute.

Splitting one code into three is a real operability gain (an operator can now tell a forbidden waiver from an
unreadable tree from a changed tree) at no confidentiality cost.

### 4.5 Q5 — Is the gate revision change correct, so iteration 9 records cannot be reused?

**Correct.** Computed by me from both candidate trees:

| key | i9 | i10 |
| --- | --- | --- |
| adapterSha256 | `5f9ee31f…08ab` | same |
| buildWrapperSha256 | `3808dfc6…cf33` | same |
| originArtifactsSha256 | `823975eb…d65a` | same |
| originGateSha256 | `bc1fc5a8…c2ae` | same |
| verifierLogicSha256 | `629eb10b…0959` | **`c0f61421…3f11`** |

`sha256(JSON.stringify(gateRevision))`: i9 `c1273221…b21f` → i10 `a90fe5bf…6129`. Exactly one key moved, which
is right: only the verifier changed, and the test file is correctly not on the decision path. The
`ADMISSION_DECLARATION` normalization touches only the `ADMITTED_ACCEPTANCE_SHA256` block, which is untouched
here, so nothing is masked.

**`SEC10-D`**: a record built against the i9 `verifierLogicSha256` and then admitted into the i10 gate yields
`["GATE_REVISION_MISMATCH","REVIEW_NOT_ACCEPTED"]` — the record binding and all three review signatures fail
together, which is the intended coupling. Moot in practice today since `ADMITTED_ACCEPTANCE_SHA256` is empty.

### 4.6 Q6 — Denial-of-verification / resource issues in the bounded walk

- **Depth** (`maxDepth: 24`), **file count** (`maxFiles: 2048`), **total bytes** (`maxTotalBytes: 32 MiB`) and the
  inherited **per-file limit** (8 MiB) all fire and all fail closed — `D1`, `D2`, `D3` above.
- **Very wide directory**: no limit at all on entry count during enumeration — see F4. 400 000 entries in one
  directory cost 980 ms and 247 MB RSS before returning `null`; 40 000 empty directories cost 4.3 s and never
  consult any limit at all. Fail-closed DoV, requires tree write. This is the one resource gap I would fix.
- **Odd filenames** (embedded quote, newline, NFD combining character) are handled: the walk completes and
  `JSON.stringify` escapes them, so there is no row-encoding ambiguity and no crash.
- No exception escapes `readColdPreviewAbsence` on any shape I tried (`lstat` is `.catch(() => null)`, `opendir`
  is wrapped, `readBoundFile` has its own try/catch), and `Buffer.alloc` is guarded by the size check before it.
- Symlink loops are excluded by design, as stated — a symlinked directory is rejected by `lstat` before recursion.

---

## 5. Checked and found correct — no finding

- The waiver is still pinned to one scenario id and the exact literal status; a valid digest cannot widen it.
- A waived scenario still has to satisfy every other requirement of that scenario (routes, `state`,
  `observationsSha256`, artifact identity).
- `checkTimingEvidence` never sets `failed = true` on the NOT_APPLICABLE path, so a waiver can never turn a FAIL
  into a PASS.
- Unadmitted acceptance bytes are still never parsed or used to steer inspection.
- The pin reproduces from the live SOURCE repo, so the constant is current.
- `readBoundFile`'s `O_NOFOLLOW` + `realpath` equality + before/after `fileIdentity` is the right shape for each
  individual read, and is what actually carries the symlink rejection the author relies on.
- 288/288 of the author's own tests pass on a byte-equal copy, and their new tests do cover my i9 F1, TL's P1,
  a symlinked component and an unreadable file.

## 6. What I am asking for (small, and re-checkable)

1. **Required (F1).** Stop the reviewed comment from claiming `src/` is the application source tree. Either:
   - **(a)** say what is actually proven — "every file under `src/`" — and name the surfaces it does *not* cover
     (`tsconfig.json` `paths`, `next.config.ts` including `turbopack.resolveAlias`, a root `app/` or `pages/`
     which per Next's docs makes `src/app` ignored entirely, `proxy.ts`, `instrumentation*.ts`, `.env.*`,
     `public/`), and add a C1 checklist item to inspect them by hand; **or**
   - **(b)** extend the proof: additionally pin `tsconfig.json` and `next.config.ts` by digest and require the
     absence of root `app/`, `pages/`, `proxy.*` and `instrumentation*.*`. This is a handful of extra rows and
     would let the comment keep its current strength.

   (b) is the stronger fix. Either is acceptable to me; what I cannot accept is the current wording plus a
   working `PASS` that contradicts it.
2. **Required (F2).** Change "The runbook makes that a required step" to reflect reality, or land the runbook
   step in the same change.
3. **Recommended (F4).** Cap entries per directory in `visit()` and add it to `COLD_PREVIEW_ABSENCE`.
4. **Optional (F5).** One clause in the `directoryIdentity` comment noting it pins the link, not the listed
   directory, when the root is a symlink.

Still outstanding from iteration 9 and acknowledged by the author as integrate-time work: runbook §5 C1 item,
§7 false-positive list, and the new reason codes in the §62 table (my i9 F6).

## 7. What I could not verify / limitations I accept

- **I did not build the application.** No `npm install`, no build, no dev server, no browser — as instructed.
  The *digest invariance* half of F1 I verified directly and end to end (`A2`, `SEC10-A`: PASS + CLI exit 0).
  The *"and the app really would prefill"* half rests on the Next.js 16 documentation shipped in this repo
  (`node_modules/next/dist/docs/…`), which AGENTS.md designates as the authority. I have not observed a rendered
  page. A reviewer who can build should confirm the root-`app/`-overrides-`src/app` precedence empirically.
- **The mid-listing directory-swap race** that the kept `dev:ino` guard closes: I could not win it
  deterministically against a tree that lists in ~20 ms. I reviewed the guard as source and confirmed its
  failure direction is fail-closed, but I have no positive experiment for it.
- **Multi-GB OOM behaviour** of F4: extrapolated from 400 000 entries; I did not create a tree large enough to
  force the abort.
- **Nothing outside the frozen candidate and SOURCE was modified.** Both candidate roots and SOURCE were treated
  read-only; all experiments ran in `review-stageb-b10-sec/` on copies. Candidate canonical5 recomputed
  unchanged after all work.
- **Environment note, reported not worked around:** both `python3` and `git` on this machine are Xcode shims and
  emit *"You have not agreed to the Xcode license agreements."* I did **not** accept the licence and did not use
  `sudo`, so I could not run `git status` on SOURCE as a final read-only check. I made the one file edit that
  needed `python3` with an ordinary file edit instead, and I verified read-only compliance the other way: I wrote
  only inside `review-stageb-b10-sec/`, the candidate's five canonical files still hash to canonical5
  `df3c1bb0…b8b` after all experiments, their `0444` modes are intact, and SOURCE's `src/` still digests to the
  pin. No other blocked operation.

---

## 8. Artifacts

All under `scratchpad/review-stageb-b10-sec/`:

- `project/` — byte-equal working copy of the candidate (canonical5 `df3c1bb0…b8b`)
- `project/scripts/sec-probe.test.mjs` — author's test file + probes `SEC10-A`…`SEC10-F`
- `probe-walk.mjs` — 19 tree shapes against `readColdPreviewAbsence()`
- `probe-resource.mjs` — denial-of-verification measurements
