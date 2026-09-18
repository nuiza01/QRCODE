# TL review — NQR Phase 2A release gate, Stage B iteration 10

Reviewer: independent TECH LEAD (did not author the code)
Date: 2026-09-18
Candidate: `scratchpad/nqr-stageb-b10/project` (frozen, 0444, not modified)
Baseline: iteration 9, `scratchpad/nqr-stageb-b9/project` (rejected by me and by SECURITY)
Author's report: `docs/reports/PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_10.md`
(sha256 `e5d8d74fe2b14e3aa455ed513ffdf4f2fceb49bf41c69070b629ea8a14c67c5f`)

## Verdict

**REQUEST_CHANGES** on canonical5 `df3c1bb03697ec66d9a393b53eeffabb25baac365af3428a395c032424183b8b`.

The mechanism is accepted. Replacing the hand-picked four-file list with a bounded walk over the whole
`src/` tree is the right change, it is implemented carefully, it fails closed on every unreadable state
I could construct, and it genuinely closes my iteration 9 P1 and SECURITY's F1 *inside* `src/`. I
re-ran both attacks and both now move the digest (§2).

The blocker is narrow and, I want to be explicit, partly my own doing: at iteration 9 I named "bind
the proof to a verify-time digest over all of `src/`" as an acceptable remedy, and the author
implemented exactly that. What I did not name then, and what I can demonstrate now, is that `src/` is
not the boundary of the application. What `src/` code actually resolves to is decided by two files one
directory above it — the root `tsconfig.json` (`compilerOptions.paths`, which 127 of the 154 source
files depend on through the `@/` alias) and `next.config.ts` (`turbopack.resolveAlias`). Either can
redirect `@/components/generator` to a prefilling wrapper outside `src/`. That is SECURITY F1 verbatim,
relocated one directory up, with `COLD_PREVIEW_ABSENCE_SHA256` bit-for-bit unchanged. I demonstrate it
in §3 P1.

The fix is mechanical and small — bring the resolution-governing root files into the same walk — not a
redesign. Nothing else in this iteration needs to move. I am also recording six surviving mutants in
the shipped walk that the report does not list (§3 P2), and an arithmetic discrepancy between §4's
mutation claim and the author's own logs.

## Hashes verified

All recomputed by me, nothing taken from the report.

Canonical5, `node scratchpad/rebuild/canon.cjs <dir>`:

```
nqr-stageb-b10/project   df3c1bb03697ec66d9a393b53eeffabb25baac365af3428a395c032424183b8b   <- required i10 value, matches
nqr-stageb-b9/project    f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb   <- the i9 value I rejected, matches
```

Per-file `shasum -a 256` in `nqr-stageb-b10/project/scripts/` — all five match report §2:

```
5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab  inspect-turbopack-emission.mjs   (unchanged from i9)
11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a  inspect-turbopack-emission.test.mjs (unchanged)
c0f6142161e765042a0c2a408a718b7c00278b94edf00a081409a214f3fd3f11  verify-initial-bundle-boundary.mjs
3f5dcfcfdb710b7106a987ca2aeaa541f1ff80bcde540ee3a65374a40a0675fb  verify-initial-bundle-boundary.test.mjs
3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33  build.mjs                        (unchanged)
```

Only the two verifier files changed, as claimed.

Diff appendix: the fenced ```diff block extracted from the report is **468 lines**, sha256
`959d05ae45f39b639ab35e836b82f6d03c468f82b1231e607ad17db641e9b99f` — both match report §2. Applying it
reproduces the candidate exactly:

```
$ cp -R nqr-stageb-b9/project i9copy && cd i9copy && patch -p1 < i9-i10-from-report.diff
patching file 'scripts/verify-initial-bundle-boundary.mjs'
patching file 'scripts/verify-initial-bundle-boundary.test.mjs'
$ node rebuild/canon.cjs i9copy
df3c1bb03697ec66d9a393b53eeffabb25baac365af3428a395c032424183b8b
```

Pinned application digest, recomputed independently against four separate roots:

```
SOURCE repo                     79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a  == COLD_PREVIEW_ABSENCE_SHA256
nqr-stageb-b10/project          79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a  (identical bytes to SOURCE src/)
my working copy                 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a
nqr-stageb-b9/project           f10a4a93bf0bcc74ebd5ff7ba4fdb7ef1a09b806000b4b0dacbde53c0e7dfccb  (i9 only ever carried the 4 pinned files)
```

`find src -type f | wc -l` in SOURCE = **154**, matching report §2. `find src -type l | wc -l` = 0.
`COLD_PREVIEW_ABSENCE` = `{root:"src", maxFiles:2048, maxTotalBytes:33554432, maxDepth:24}` as documented.

Suite: `npm run test:scripts` in my copy of the candidate — **288/288 pass, 0 fail, twice**, matching
report §4. `npx eslint` — exit 0, no output, no warnings.

## §2 — My iteration 9 findings, re-tested

Each probe copies SOURCE `src/` into a fresh temp root, applies the change, and recomputes
`readColdPreviewAbsence`. `moved` means the digest left the pinned value (the gate blocks).

| probe | result |
| --- | --- |
| **TL P1**: edit `src/components/generator/payload.ts` (the `validateDraft` file) | **moved** `4ef773cd…` |
| **SEC F1**: edit the barrel `src/components/generator/index.ts` | **moved** `31d9c73e…` |
| new file anywhere in `src/` | **moved** |
| delete a file from `src/` | moved / null |
| rename a `src/` file, same bytes, new path | **moved** (path is in the row) |
| swap the contents of two `src/` files | **moved** (paths bind to hashes) |
| hardlink inside `src/` pointing at a file outside it | **moved** (bytes are hashed where they are seen) |
| touch a `src/` file, contents identical | unchanged (correct — content-addressed) |

**TL P1 is closed. SEC F1 is closed.** Within `src/`, I could not construct any edit that reintroduces
a prefill path and leaves the digest at the pinned value. My iteration 9 P2 (the list itself was
untested, and a file could be dropped from it and re-pinned) is closed by construction: there is no
list left to drop from, and my equivalent mutant (`TL-M15`, walk the checkout root instead of the `src`
root) is killed by 3 tests.

My iteration 9 P3s:
- **near-miss fixture** (`slice(0,63)+"0"` could duplicate the real value) — **fixed**, the test now
  flips the last digit conditionally and asserts `absence !== COLD_PREVIEW_ABSENCE_SHA256` first.
  Two more near-miss shapes (leading space, uppercase) were added. Good.
- **reason-code conflation** — **fixed**, see §5.
- **`realpath` strictness on symlinked checkouts** — unchanged, see §3 P5.

## §3 — Findings

### P1 (blocking) — `src/` is not the application boundary: the root files that decide what `src/` resolves to are outside the proof, and SECURITY F1 reproduces through them with the digest unchanged

The pages mount the generator through the alias, not through a relative path:

```
src/app/[locale]/page.tsx:13   import { Generator } from "@/components/generator";
```

`@/*` is defined in the **root `tsconfig.json`**, which is not under `src/` and therefore not in the
walk. Next resolves it: `node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md:422`
— *"Next.js has in-built support for the `"paths"` and `"baseUrl"` options of `tsconfig.json`"*.
`next.config.ts` offers a second, independent redirect: `turbopack.resolveAlias`
(`node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md:385`). 127 of the 154 files under
`src/` import through `@/`, so this is not a corner of the app, it is the app's whole import surface.

Demonstrated against the candidate's own `readColdPreviewAbsence`, on a faithful copy of the reviewed
checkout (root config files + `src/` + `scripts/`):

```
clean checkout       : 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a
after tsconfig remap : 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a  <- UNCHANGED, still the pinned value
after next.config    : 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a  <- UNCHANGED, still the pinned value
after root proxy.ts  : 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a  <- UNCHANGED, still the pinned value
```

The tsconfig remap is three lines and one new file, neither under `src/`:

```json
"paths": { "@/components/generator": ["./shim/generator.ts"], "@/*": ["./src/*"] }
```
```ts
// shim/generator.ts
import { Generator as Base } from "../src/components/generator";
export function Generator(props) { return Base({ ...props, initialDraft: { url: "https://nexora.example" } }); }
```

This is SECURITY F1 — "make the barrel re-export a prefilling wrapper" — with the wrapper moved one
directory up. The verifier still reports the pinned digest, so a `NOT_APPLICABLE` record for
`COLD_VALID_INITIAL_PREVIEW` still reaches `PASS_BUNDLE_SCOPE`.

Two more outside-`src/` surfaces in the same class, both confirmed digest-neutral above:
- **root `proxy.ts`** — Next 16 accepts proxy (ex-middleware) *"in the project root, or inside `src`"*
  (`.../01-getting-started/16-proxy.md:31`). Only the `src` variant is covered.
- **a second app root** (`app/` or `pages/` at the repo root) — `src/app` is a convention, not a
  constraint.

What the code comment claims (`verify-initial-bundle-boundary.mjs:536-546`) is scoped honestly about
*artifact binding* — that part is a genuine improvement over iteration 9 — but the sentence it opens
with is a claim about the application: *"nothing prefills them from the URL, cookies or storage, and no
content type validates an empty draft"*, followed by *"any edit anywhere in that tree — a route, the
generator, the barrel that re-exports it, a validator that would start accepting an empty draft —
changes the digest and blocks"*. The barrel is exactly what can be swapped out from `tsconfig.json`
without touching the tree.

**Required fix (small, bounded):** extend the same walk to the files that govern how `src/` resolves and
what else can become a route — at minimum the root `tsconfig.json` and `next.config.ts` — and fail
closed on the presence of a second app root or a root-level `proxy.ts`/`middleware.ts`. `package.json`
does not need adding: `build.mjs` `dependencyDigest()` already recomputes the dependency closure from
the installed tree (test *"the pinned dependency digest matches the installed tree"*), which is a real
recomputed control rather than a declared one.

**Not an acceptable alternative:** relying on `expectedInputs.sourceInventorySha256`. I traced it —
`inspect-turbopack-emission.mjs:370` compares the value the *record declares* against the constant
`SUPPORTED_PROFILE.sourceInventorySha256`; nothing in either module recomputes an inventory from disk.
It is an attestation, not a proof. `readColdPreviewAbsence` remains the only thing the gate recomputes
from the checkout. (See "Could not verify" — I could not establish which paths that 185-path manifest
covers.)

### P2 — Six surviving mutants in the shipped walk that report §4 does not list or justify

Report §4 claims exactly **one** deliberate survivor (`before === null ||`). I ran **27 mutants of my
own** against the full `npm run test:scripts` suite in my own copies: **18 killed, 9 survived.** Beyond
the author's declared one, these survived against code that ships.

**(a) The two byte limits are completely untested.**

| mutant | effect |
| --- | --- |
| `TL-M1` delete the `totalBytes > maxTotalBytes` disjunct | the 32 MiB total-byte cap is removed; suite green |
| `TL-M2` `readBoundFile(path, Number.MAX_SAFE_INTEGER)` | the 8 MiB per-file bound is removed; suite green |

§4 lists the *file* cap and the *depth* cap as caught, and both really are (I killed both, including
both off-by-one variants). The two byte limits are simply not exercised by any test, and §4 does not
say so.

**(b) A name filter that excludes a pattern absent from today's tree always survives.** Three
instances, all with the suite green:

| mutant | effect |
| --- | --- |
| `TL-M11` `if (name.startsWith(".")) continue;` | every dotfile silently excluded from the proof |
| `TL-M25` `if (name.startsWith("_")) continue;` | every `_`-prefixed file silently excluded |
| `TL-M26` `if (name.endsWith(".d.ts")) continue;` | every ambient declaration file silently excluded |

`src/` contains no file of any of those shapes today, so nothing can catch the exclusion. Exploiting it
requires editing the gate itself (which moves canonical5 and the gate revision), so this is a
test-completeness gap rather than a second evasion — but it is the *same* gap that let iteration 9's
four-file list go untested, and the kill is one cheap test: plant a dotfile, a `_`-prefixed file and a
`.d.ts` file in a temp tree and assert the digest moves for each.

**(c) Half the directory identity is unpinned.**

| mutant | effect |
| --- | --- |
| `TL-M4` identity returns `` `${stat.ino}` `` instead of `` `${stat.dev}:${stat.ino}` `` | suite green |

The `dev`-only mutant (`TL-M3`) *is* killed, so exactly one half of the identity string is pinned.

Two further survivors I agree are equivalent, recorded for completeness: `TL-M6` (`lstat` → `stat` per
entry — still caught downstream by `readBoundFile`'s `realpath` check, which I verified case by case in
§4) and `TL-M13` (`=== null` → `== null` — `undefined` is already rejected earlier as
`INVALID_DECISION_INPUT`).

**Killed, for the record** (18): dev-only identity; ignoring subdirectory failures; file-cap and
depth-cap off-by-ones; reversed per-directory sort; skipping `.test.` files; swapped reason codes;
walking the checkout root instead of `src`; dropping the post-list recheck; skipping non-file entries;
basename-only rows; empty-tree-is-proof; skipping unreadable files; silently truncating at the cap
instead of failing; **hashing only the first 1 KiB or first 64 bytes of each file**; recording file
length instead of a content hash; and removing the `try`/`catch` from `directoryIdentity`. The
truncation mutants matter: had they survived, prefill could have been appended to the end of any large
source file without moving the digest. They do not. The suite is genuinely sensitive — the gaps above
are limits and name filters, not the core.

### P2 — §4's mutation arithmetic does not reconcile with the author's own logs

§4 says *"24 mutants across 4 rounds, 21 caught"*. The logs on disk
(`scratchpad/mutate10.log`, `10b`, `10c`, `10d`, `10e`) contain **29 distinct mutant labels**: 19
distinct killed, 10 distinct survived. Nine of the ten survivors were legitimately resolved by
*deleting the mutated code* (that is the §1 item 6 / §4 story, and it is a sound way to answer a
survivor), but that leaves the count overstated in both figures. §4 also says the identity-constant
mutant was run in "two rounds"; the logs show three (`M19`, `M21`, `M23`).

Separately, `mutate10d.log` records `M22-no-lstat-catch` as SURVIVED, against a `try`/`catch` in
`directoryIdentity` that still ships — a survivor on live code that §4 does not list. **I could not
reproduce it.** My nearest equivalent (`TL-M21`, delete the `try`/`catch` and let `lstat` throw) is
**killed, 8 failing tests** — as it should be, since a missing `src/` makes `lstat` throw before
`opendir` is ever reached, and the "no source tree at all" assertion then rejects instead of returning
`null`. So either `M22` mutated something else or it was mis-scored. Its definition is not recoverable:
`mutate10d.mjs` on disk (16:24) is a later revision than its own log (16:22) and now contains only
`M23`/`M24`/`M25`. This does not indicate a defect in the gate — the guard is well tested — but §4's
survivor accounting cannot be reconciled from the evidence left behind.

### P3 — The JSDoc ordering claim is wrong

`verify-initial-bundle-boundary.mjs:930` — *"Digest over the whole application source tree, in ASCII
path order."* It is not. It is depth-first, with a per-directory `names.sort()`. Where a directory name
is a prefix of a sibling file name the two orders differ, because `.` (0x2E) sorts before `/` (0x2F):

```
tree: src/a.ts, src/a/z.ts
actual rows : a/z.ts, a.ts   -> 0734cfcb7190fc53c5ac16bae66340298924a1edd726e399d630e352eccb1ef1  (== what the code produces)
ASCII order : a.ts, a/z.ts   -> 8980cbb4d9d4d03f42c27c8ed3b74c1ab8abe46dd832f226ef791c03de594b01
```

`names.sort()` is also UTF-16 code-unit order, not byte order, which diverges for non-ASCII names.
Neither breaks determinism or any security property — the order is a deterministic total order either
way, and the "order does not depend on creation order" test is valid. But `SOURCE185` is documented
elsewhere as *"ASCII path order"* (`docs/CLAUDE_HANDOFF.md:97`), so anyone who later tries to reconcile
the two digests will be comparing different orderings. Fix the comment, or sort `rows` by path before
hashing.

### P3 — The only compensating control for "the proof is not bound to the artifact" does not exist yet

§5 and the code comment both correctly say the gate reads the tree next to itself and that running it
in a different checkout than the one that built the artifact voids the proof, and both correctly say
this cannot be enforced in code — it has to be a runbook step. I checked
`docs/RELEASE_GATE_RUNBOOK.md`: it does not enumerate reason codes at all (so nothing there is stale),
and it contains no such step. Accepting this iteration means accepting that the sole mitigation for
TL P2 / SEC F2 is deferred work. That is defensible as sequencing, but it should be a named,
tracked integration blocker rather than a line in §5, and SECURITY F6 should be resolved in the same
change.

### P3 — `realpath` strictness on symlinked checkouts (carried forward from iteration 9, unchanged)

`readBoundFile` requires `realpath(path) === path`, so a checkout reached through *any* symlinked path
component yields `null` for every file and therefore `COLD_PREVIEW_PROOF_UNREADABLE`:

```
direct path  : 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a
same tree via a symlinked parent : null
```

This is fail-closed and I am not asking for it to change. It is now *better* diagnosable than at
iteration 9 thanks to the reason-code split, but the runbook should tell the operator that a symlinked
checkout path (the classic case on macOS: anything under `/tmp`, which is a symlink to `/private/tmp`)
reports `COLD_PREVIEW_PROOF_UNREADABLE` and is a checkout problem, not tampering.

## §4 — Judging the deletions (report §1 item 6 and §4)

I checked each deletion against the premise the author gives for it. **All three are sound. None of
them weakens the gate**, and I would not have the author restore any of them.

**1. The dirent type check (removed as redundant with `lstat`).** Correct, and it is more than
redundant — it would have been *worse* than `lstat`. `dirent.type` comes from `d_type`, which
filesystems are permitted to report as `DT_UNKNOWN`; a gate that blocked on that would fail closed on
perfectly ordinary trees. `lstat` is authoritative and is performed per entry regardless. The only
thing the dirent check could have added is naming a readdir/lstat race explicitly, and such a race
already blocks — the digest moves or the walk returns false.

**2. The containment check SECURITY F5 asked for (not added, declared unreachable).** I verified the
premise empirically rather than taking it on trust. Node's `opendir`/`readdir` never yield `.` or `..`
(libuv filters them; confirmed by probe), and a POSIX directory entry name cannot contain `/`. The root
is the frozen constant `COLD_PREVIEW_ABSENCE.root` joined onto `repoRoot`. There is therefore no
attacker-controlled component in `join(directory, name)` and any containment assertion would be dead by
construction. **I support the author against SECURITY F5 here**, and the inline comment explaining it is
the right artefact to leave behind. SECURITY may reasonably still want the invariant written down; if
so it should be an assertion in the *test*, not a branch in the gate.

**3. Identity narrowed to `dev:ino` (dropping `isDirectory` / `isSymbolicLink` / `realpath`).** Sound,
and I traced every case rather than trusting the comment, because the comment's first clause is
slightly loose: `opendir` does **not** refuse a symlink — it follows one, so a symlinked directory
opens fine. What actually rejects each case is:

| case | actually rejected by | verified |
| --- | --- | --- |
| a subdirectory replaced by a symlink | per-entry `lstat` → neither `isDirectory()` nor `isFile()` → `return false` | null |
| a file replaced by a symlink | same, plus `readBoundFile`'s `O_NOFOLLOW` | null |
| the **root** `src` replaced by a symlink | `readBoundFile`'s `realpath(path) === path` on the first file (the root is never `lstat`ed as an entry) | null |
| the tree reached through a symlinked ancestor | same `realpath` check | null |
| a symlink added beside the sources | per-entry `lstat` | null |
| a FIFO in the tree | `!stat.isFile()` | null |

So the dropped clauses were genuinely masked, and the comment's second clause (the `O_NOFOLLOW` +
`realpath` argument) is the accurate one. Worth tightening the first clause so the next reader does not
conclude that `opendir` alone rejects symlinks and delete the wrong guard.

**4. The kept survivor `before === null ||` — I agree with keeping it, and with the reasoning.**
`lstat(dir)` needs `x` on the parent; `opendir(dir)` needs `x` on the parent *and* `r` on the dir, so
`lstat` failing strictly implies `opendir` failing, and no test can separate them. My own `TL-M7`
reproduces the author's `M24`: SURVIVED, all 288 tests pass. Removing it would make two failed identity
reads compare equal, which is wrong on its own terms even if unreachable today. Keep it; the comment
already says why.

## §5 — Reason codes

Used exactly as documented, in one place each (`verify-initial-bundle-boundary.mjs:761-768`):

```
scenario.id !== NOT_APPLICABLE_SCENARIO   -> SCENARIO_NOT_APPLICABLE_FORBIDDEN
coldPreviewAbsence === null               -> COLD_PREVIEW_PROOF_UNREADABLE
coldPreviewAbsence !== the pinned digest   -> COLD_PREVIEW_PROOF_MISMATCH
```

- The order is right: a forbidden waiver is reported as forbidden whether or not the proof is
  readable (tested both ways), so an operator is never told "unreadable" about a policy violation.
- `SCENARIO_NOT_APPLICABLE_UNPROVEN` is **fully gone** from `scripts/` — no stale emitter, and the
  runbook never named it, so nothing dangles.
- The `null` branch is reachable only after the input has already passed the type guard, so
  `undefined`, `0`, `false`, `["x"]` and a `toString`-shaped object all land on `INVALID_DECISION_INPUT`
  first. Tested.
- **No leakage.** Every reason is a fixed literal added to a `Set`; `decision()` emits
  `[...reasons].sort()`. The walk swallows every error (`catch { return null }`, `.catch(() => null)`),
  so no `errno`, path, or exception text can reach the output. `build.mjs:187` prints
  `${code}\nreasons: ${codes.join(",")}` and nothing else. I checked the CLI stderr assertions in the
  tests and they match exactly that shape.
- Swapping the two new codes is killed by 2 tests (`TL-M14`).

## §6 — The walk itself

Everything below was measured against the candidate's own module, not read off the report.

| property | result |
| --- | --- |
| entries per directory | `names.sort()`, deterministic; **not** global ASCII path order (P3 above) |
| path construction | `join(directory, name)` for I/O, `prefix + "/" + name` for the row; both derived from the listing, no escape possible |
| file cap | 2048 files → digest; 2049 → `null`. Exact, no off-by-one |
| depth cap | 24 levels → digest; 25 → `null`. Exact |
| total-byte cap | present, **untested** (P2 `TL-M1`) |
| per-file bound | 8 MiB; a larger file → `null` (I confirmed by probe). **Untested** (P2 `TL-M2`) |
| file contents | full bytes hashed — truncation mutants at 1 KiB and 64 bytes are both killed |
| empty tree | `rows.length === 0` → `null`. Also covers a tree of nothing but empty directories |
| missing tree / root is a file | `null` |
| unreadable file (0o000) | `null` |
| non-regular entries (symlink, FIFO) | `null` |
| directory swapped mid-walk | `null` (tested by monkey-patching `fs.opendir`; my `TL-M16` confirms the post-list recheck is load-bearing) |
| file → directory substitution | readable, so digest **moves** (`COLD_PREVIEW_PROOF_MISMATCH`, not `UNREADABLE`) — correctly distinguished and correctly tested |
| empty directories | invisible to the digest (they contribute no row). Harmless — an empty directory cannot carry code |
| file mode changes | invisible to the digest. Harmless for this proof |
| `dev:ino` recheck | `before` taken before `opendir`, `after` taken after the listing completes. A swap-and-restore that reuses the inode is undetectable; that is inherent, not a defect |

## What I could not verify

- **The 185-path source manifest.** `/private/tmp/nqr122-auth-integration-POST185.json` does not exist
  on this machine, so I could not establish whether the inventory that `sourceInventorySha256` attests
  to includes `tsconfig.json` and `next.config.ts`. Even if it does, it is a declared value compared
  against a constant (§3 P1), never recomputed, so it does not substitute for the walk.
- **That the §3 P1 remaps actually produce a rendered cold valid preview.** Building is outside this
  review's constraints (no `npm install`, no build, no dev server). I established the mechanism from
  the installed Next 16 documentation and demonstrated the digest-neutrality against the candidate's
  own code. The evasion inside `src/` that I *did* fully demonstrate at iteration 9 is now closed.
- **The author's `M22-no-lstat-catch` mutant.** Its definition is no longer on disk, so I could not
  determine what it changed; my nearest equivalent is killed (§3 P2).
- **Blocked:** `python3` and `git` are both unusable here — each demands the Xcode licence, which I did
  not accept and did not work around. I used `node` for every hash and extraction instead, so nothing
  substantive was lost; but I could **not** run `git status` to confirm SOURCE's working tree is clean.
  I verified SOURCE integrity the other way instead: `readColdPreviewAbsence(SOURCE)` still returns
  `79de2baf…`, i.e. all 154 files under `src/` are byte-for-byte as pinned.
- **Post-review integrity, re-checked after all experiments:** both candidate roots recompute to their
  expected canonical5 (`df3c1bb0…` for i10, `f551d9ca…` for i9) and the verifier is still mode `0444`.
- SOURCE and both candidate roots were treated read-only throughout; all experiments ran in
  `scratchpad/review-stageb-b10-tl/` and in fresh `mkdtemp` roots. No install, build, dev server,
  browser, network, database, deploy, commit or push.

## Summary of required changes

1. **P1** — bring the resolution-governing root files (`tsconfig.json`, `next.config.ts`) into the same
   bounded walk, and fail closed on a second app root or a root-level `proxy.ts` / `middleware.ts`.
   Re-pin. Adjust the comment so the application-level claim matches what is actually pinned.
2. **P2** — add tests for the total-byte cap, the per-file bound, the `dev` half of the directory
   identity, and for a dotfile / `_`-prefixed / `.d.ts` file planted in the tree; or state each as a
   deliberate, justified survivor.
3. **P2** — correct §4's mutation figures against the logs, and account for `M22-no-lstat-catch`.
4. **P3** — fix the "ASCII path order" comment (or sort `rows` by path).
5. **P3** — land the runbook step and the new reason codes (SECURITY F6) as a tracked integration
   blocker rather than an open note.

Items 2–5 are report/test hygiene and would not, on their own, have held the gate. Item 1 is the
blocker.
