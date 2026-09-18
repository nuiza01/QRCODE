# NQR-133 — Stage A iteration2 independent TL re-review

วันที่ 2026-09-13 | TL | iteration-1

**Verdict: REQUEST_CHANGES / REVIEW_FAILED. Stage A acceptance ยังไม่ผ่าน**

ตรวจเฉพาะ frozen NQR130 iteration2 ไม่ใช่งาน logo/auth หรือ Stage B. ทุก InspectionResult ที่ได้จาก probes/CLI ยังคง `releaseDecision=BLOCKED`; malformed exported `runCli` บาง invocation reject โดยไม่มี result. ไม่พบหรืออ้าง release bypass. Real artifact ยัง STATIC_UNKNOWN/BLOCKED และไม่ใช่ finding เพียงเพราะยังไม่รองรับ grammar นั้น

## 1. Scope / authority

อ่าน authoritative Control state วันที่2026-09-13; reuse WORKING_AGREEMENT/TEAM_REPORTING ที่อ่านครบใน sync turn. อ่าน worker report, prep/freeze/delta/verification manifests, full NQR131/NQR132 reports, adapter1018 lines/testทั้งไฟล์ และ relevant NQR129 grammar/graph contract. อ่าน AGENTS และ installed Next testing overview; ไม่มี framework/application edit

Only writes: รายงานนี้และ uniquely allocated `/private/tmp/nqr133-tl-BhOKZIcs` สำหรับ inert fixtures/logs. ไม่แก้ candidate, old i1, SOURCE, packages, frozen artifact, teammate reports หรือ PM ledger. ไม่มี install/hydrate/build/typegen/analyzer/PostCSS/browser/server/DB/network/production/deploy/commit/push/new tasks/agents/automation. Test cleanup ของ worker suiteจำกัด mkdtemp childrenใน review TMPDIR เท่านั้น

Approved five-file workflowดำเนิน bounded repair/test/review ต่อได้โดยไม่ขอ routine approval ซ้ำ; **Stage B ต้องรอ independent Stage A acceptance ทั้งสองฝ่าย**. ไม่มี integration authority จาก reviewนี้

## 2. Exact pre/post identity

Candidate root `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD`.

| Item | Fresh checked SHA-256 |
| --- | --- |
| Worker report `PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_2.md` | `c5723a0ec8fb4e291bc1225f9f35d92bc2bfee198500504494546f524afee83b` |
| `project/scripts/inspect-turbopack-emission.mjs` | `645cc72b75a45cf077fa5cf33d4780de9b48b0a9ae978aacec09b0c0e747ca61` |
| `project/scripts/inspect-turbopack-emission.test.mjs` | `191f65f9619bf1f874e351dd9599873b847ccc97209c3c32ea4462d7c5da2a0b` |
| Two-row compact `{sha256,path}` canonical digest | `b82a8e0c89184612725fc53b8a0fd7a3a1f8e92c2eac8fb1b79d6311ef80ad74` |
| NQR131 report | `830553611bbc8e76aaa24d2cee2dca485d3f1dc6f7707c668ff7b72a30b680e6` |
| NQR132 report | `6f127972e82f949fe5a1965055d1dc8fe305f5ac77c5fd3d4dc3add3c9310e04` |
| Prep manifest | `ab9011d7f7ffaa9b3d3d6b1bd6298e47d9b9aa6ebfdd30f88bea454b7d5046aa` |
| Freeze manifest | `d2d967b2d016e105bbc1548abbc0c431db86831d01061cc94bdb36bc3ff096b5` |
| i1→i2 delta manifest | `74067edc03c5c9a5630cc9c9cc30e08a5c0d0058f001d0dbba53fb7ae5c50c4e` |
| Delta rows canonical | `f90cc2c8f7af0fa7d567d7e165299b7c817b622f33b7a0080488a926965531f9` |
| SOURCE185 actual bytes canonical | `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df` |
| Frozen actual full610 canonical | `4d372f50b89dd44cf2ea3259113d16015406046e29a89f87200c629038f98f1d` |
| Frozen actual scope342 canonical | `80fe2ca3df2c327a8d00ff3dd2765631ee39dbd8ec85e1867409d38ce12daddd` |

Both authored files remain0444, both corresponding SOURCE paths ABSENT. Old i1 authored preimages match delta rows. Entire candidate project98-file byte inventory unchanged pre/post. SOURCE185 actual bytes match pinned185 rows; no claimed whole-repository undocumented-file inventory. Full610 checked actual file bytes/size/type and exact non-directory path set; retained manifest traversal order, not an accidental globally sorted reinterpretation. BUILD_ID `7OgVcQLdytdDmtYEw_V6N`

Five base prep files actual SOURCE=candidate, distinct inodes:

| Path | SHA-256 |
| --- | --- |
| AGENTS.md | `63f2c50380ed6303237cce215ce27af1d620d094c215e28d1b1538a3c070e3bb` |
| package.json | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| package-lock.json | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |
| node_modules/next/package.json | `dc243091ba95352bbc300be22c6561d24a19a1c0bd2c2cc85d2c5168767ea7b9` |
| node_modules/next/dist/compiled/acorn/acorn.js | `758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19` |

parse5 33files `bdfc17d399b82d095822e8e0aea93b953d753da42fff9a2ae38d2dee5bd97409`, entities58files `c94cc262f58d4cf0d88fc8a794daa729dbd8c4fd726bf23d65635dbcf3c34459`: all91 actual SOURCE=candidate bytes, exact package file sets, candidate size/modes, distinct inodes verified. createRequire resolution of parse5/entities/Acorn points to candidate project/node_modules expected entry paths. Full39249+36 dependency digest remains **carried provenance**, not freshly rehashed

SOURCE build wrapper `584dce0c983abb7d3b66fd6f5d74ed650cf78b8f38b546e548a3d8b327661ecf`, verifier `a48002f4bde25a9ade697892c6e7b4469ef07cca92f16e176f6ee946bff43650`, verifier test `c7c2660151ddc3a13639f11e604ea300c9d4649e14611b99394b4377e7f7e240` unchanged

`guard-pre.json` and `guard-post.json` byte-identical, SHA `5b56711a2242181571c17ab3e57acfbe93aadfd1f9ba9924d98a6c8b56da8328`. Worker frozen test log SHA `e2e3dec23b55f797ae139476a09840f87faa3b16156cd09e3b1825aeaf5e8b43` also verified; it is distinct from this review's fresh test log

## 3. Prior closure matrix

| Prior finding | Fresh independent result / disposition |
| --- | --- |
| NQR131 F1 / SEC3 | Original comment/rawtext positives, template/handler UNKNOWN, external EOF VIOLATION now correct. **Partial closure**: namespace/embedded-document omission remains R1 below |
| F2 / SEC1 | Exact external tuple VIOLATION, malformed tuple UNKNOWN, globally missing module UNKNOWN, missing chunk VIOLATION now correct. **Partial closure**: correct loading-context destination not proved, R3 |
| F3 / SEC2 | Continuation shadow/generator/default and mapper shadow UNKNOWN; normal deferred and valid export triple SUPPORTED; short/bad tag UNKNOWN. **Partial closure**: global Promise binding still shadowable, R2 |
| F4 / SEC4 | Independent early/late external loader +1023 unknown statements both VIOLATION; unknownCount1023/violationCount1/truncated=true. Closed in tested scope; representative retained |
| F5 / SEC6 | Original second-open mutation now UNKNOWN with ARTIFACT_BYTE_IDENTITY_MISMATCH and original unknown semantic diagnostic. Admitted buffer repair verified. **Partial closure**: intermediate directory swap still follows outside root, R4 |
| F6 | Metadata, benign IIFE and malformed export now UNKNOWN; no registration-time invocation claim. Original demonstrated classification defects closed in tested scope |
| F7 | Descriptor65537bytes / manifest4194305bytes return fixed CLI_INPUT_FAILURE; oversized rows1025 rejected before row getter (reads0); depth66 fixture UNKNOWN. Worker cumulative Flight/node/depth tests independently rerun. **Partial closure**: advertised64MiB semantic budget is dead code, R5 |
| SEC5 | Main inspect API null/top getter/Proxy/nested throwing getter/invalid identity fixed UNKNOWN with no synthetic marker echo; actual invalid-identity CLI nulls invalid field. **Main entry repaired**; new exported runCli has pre-try raw rejection, R6 |

This is not a claim every arbitrary JavaScript/HTML form must become supported. Small conservative UNKNOWN repairs satisfy the disputed boundaries; arbitrary JS evaluation is neither needed nor allowed

## 4. Actionable findings

All adapter line references below refer to `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.mjs`. Owner: existing DEVOPS via PM. Prior frozen snapshots remain immutable

### NQR133-R1 [P1] SVG script and embedded-document executable surfaces silently pass

Lines397–428 read tagName without namespace policy and only `src` for scripts; unrecognized non-handler elements fall through at431–433.

Independent fixtures all return **STATIC_SUPPORTED, zero diagnostics**:

- `<svg><script href="https://example.invalid/probe.js"></script></svg>`
- SVG script with `xlink:href` instead of href
- `<iframe srcdoc="&lt;script>unknown()&lt;/script>"></iframe>`
- iframe with external src

Inert JSDOM corroborates SVG script namespace `http://www.w3.org/2000/svg`, preserved external href/xlink:href, and decoded srcdoc `<script>unknown()</script>`. No script execution, URL request or actual browser claim. The graph records neither these resources nor UNKNOWN. A browser-executable context outside supported grammar must not be silently treated as empty inline JS or inert markup

Repair: namespace-aware executable grammar or fixed UNKNOWN for unreviewed foreign scripts/embedded active documents. Preserve comment/textarea controls; do not classify script-looking text inside them as a violation. Add href/xlink and srcdoc negative controls at the actual extraction entry; extending general browser modeling is not necessary

### NQR133-R2 [P1] Promise identifier binding is still matched by spelling

Lines606–634 validate callback/context/mapper pairwise names but line615 assumes any identifier `Promise` is the global. Factory signature lines659–665 ignores a named function's inner binding.

Three independent variants all **STATIC_SUPPORTED, zero diagnostics**, same modeled71-edge normal deferred graph:

1. `t.v(Promise=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>Promise(9)))`
2. factory parameter named Promise, invoking `Promise.v(l=>Promise.all(...map(x=>Promise.l(x))).then(()=>l(9)))`
3. named factory `function Promise(t){t.v(l=>Promise.all(...).then(()=>l(9)))}`

Lexically, `.all` refers respectively to the loader callback, context parameter, or named factory function, not the approved global Promise primitive. No emitted JS was evaluated. The recorded AFTER_CHUNK_LOAD chain is therefore unproved. Original ordinary loader remains SUPPORTED and shadowed continuation/mapper controls now UNKNOWN

Repair: enforce scope-correct global binding, including named-factory bindings, or narrowly reject shadowing to UNKNOWN. Keep ordinary function-factory support when no conflicting name exists. No arbitrary JS analysis is required

### NQR133-R3 [P2] Destination existence is global, not resolved in its loading context

Lines951–960 build knownModules from **every** parsed chunk. A module's registration in an unreferenced file discharges a Flight/deferred import without proving that file is loaded in that context.

Independent positive/negative pair:

- Missing Flight999 is UNKNOWN. Add only `static/chunks/unreferenced.js` registering999; all route roots/Flight URLs still name entry.js (module7 only). Result becomes **SUPPORTED/zero diagnostics**.
- Normal deferred lazy.js registering9 passes. Change lazy.js to register10 and put9 only in unreferenced.js; loader still loads only lazy.js. Result again **SUPPORTED/zero diagnostics**.

There is no root/chunk-load edge to unreferenced.js in either fixture. Artifact file existence is not runtime factory installation. NQR129 graph contract requires destination resolution in the appropriate execution context, not only a matching ID anywhere on disk. This is a static graph proof gap, not an executed missing-module/browser failure

Repair: prove destination registration available from the modeled root/load closure, or return UNKNOWN when not established. Preserve legitimate modules already registered in the entry chunk and valid lazy targets. Do not claim this demands general runtime/cache/alias acceptance; unmodeled cases may stay UNKNOWN

### NQR133-R4 [P2] O_NOFOLLOW protects final file only; directory substitution escapes admitted root

Lines207,234–235 reopen directory paths after lstat; final file open159–162 follows symlinked ancestors. Final rewalk963–968 compares only final file rows, not directory identities throughout traversal.

Independent deterministic probe uses only owned inert fixture directories:

1. After walker lstat sees fixture `static/chunks` as directory, an in-memory fs.opendir hook parks that directory and substitutes a symlink to review-owned sibling containing **identical entry.js bytes**.
2. The entry fd is opened through that symlink; observed realpath is `/private/tmp/nqr133-tl-BhOKZIcs/owned-sibling/entry.js`, outside artifact root.
3. Immediately after open, remove the owned symlink and restore original directory; finally restore both Node hooks. No secret, SOURCE, candidate or real artifact is touched.
4. Adapter returns **STATIC_SUPPORTED, zero diagnostics**; final byte rewalk passes.

This does not demonstrate byte forgery: parsed bytes are identical to the admitted expected hash. It demonstrates that advertised no-follow/local-containment/directory-change detection remains incomplete despite repaired semantic byte binding. Retain that distinction in severity/claims

Repair: anchor traversal to validated directory identities/no-follow boundaries and fail UNKNOWN on substitution/change; do not present a final pathname rewalk as proof no ancestor changed. Add controlled directory-swap regression alongside existing byte-race/symlink controls. If the trusted immutable-directory assumption is instead a prerequisite, it must be explicit and technically enforced at admission rather than claimed as reader protection

### NQR133-R5 [P2, code evidence] 64MiB cumulative executable budget is no longer used

Profile line56 declares64MiB and state119 initializes executableBytes. Increment/check176–177 executes only when readStableFile bucket equals executable. **All current call sites pass identity**:246 (walk),344–345 (toolchain),979 (CLI). HTML/JS parsing later consumes retained buffers without charging that budget

Thus per-file8MiB and aggregate identity512MiB do not enforce the explicitly preserved64MiB cumulative executable contract from NQR129. A sufficiently large collection of individually valid admitted chunks can bypass that specific limit. This is direct code evidence, **not** a claim of measured exhaustion: no oversized aggregate/OOM/stress fixture was run. Other measured caps above remain valid

Repair: charge a clearly defined cumulative semantic/executable-byte counter for admitted inputs before parsing; avoid accidentally counting final identity rewalk twice. Add a bounded boundary regression, keeping honest UNKNOWN at exhaustion

### NQR133-R6 [P2/low impact] New exported runCli leaves argument validation outside fixed failure boundary

Lines986–992 access `args.length`, indices and call isAbsolute before try. Main inspect API fix does not cover this export.

Independent `runCli(null, inertWriter)` rejects TypeError; non-string path slots reject TypeError; an args.length getter throwing `Error("PRIVATE_MARKER")` rejects with that original marker-bearing Error. No fixed result is written. The injected writer in all tests is safe and does not throw; this finding is not about arbitrary output-sink failures

Actual process.argv remains string-array input; normal CLI positive/invalid-identity/no-args controls behave safely. Therefore this is **public programmatic containment**, not an actual command-line secret leak or release bypass

Repair: move whole input validation inside fixed boundary and validate finite string-array shape, or keep helper private if not intended as public API. Test null/getter/invalid element types on the actual export. Do not broaden claims that every exported invocation returns a safe result while this branch rejects raw errors

## 5. Actual checks and evidence

All execution cwd explicitly `/private/tmp/nqr133-tl-BhOKZIcs`; initial context/report work cwd `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE`. Node v24.14.1, existing dependencies only. Fresh checks:

```sh
python3 /private/tmp/nqr133-tl-BhOKZIcs/guard.py
node --check /private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.mjs
node --check /private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.test.mjs
TMPDIR=/private/tmp/nqr133-tl-BhOKZIcs node --test /private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.test.mjs
node /private/tmp/nqr133-tl-BhOKZIcs/probe.mjs
node /private/tmp/nqr133-tl-BhOKZIcs/boundaries.mjs
```

Both syntax checks exit0/no stderr. Worker suite **28/28 PASS**, no failed/skipped tests,1085.404083ms. Probe helper exit0 means it collected evidence/asserted BLOCKED, **not** candidate acceptance:45 result records include36 content fixtures, five API controls, three rejected runCli cases and one second-open race. Boundary helper adds caps/CLI/directory-swap/inert DOM controls. No eval/VM/client-code execution; JSDOM has neither runScripts nor external resources enabled

Actual CLI child-process checks (15s bounded Python subprocess, exact argv/output retained in commands.json):

- no args → exit2, STATIC_UNKNOWN/BLOCKED, identity null, no stderr
- `--artifact /private/tmp/nqr133-tl-BhOKZIcs/fixtures/api --expected /private/tmp/nqr133-tl-BhOKZIcs/cli-expected.json` → exit0 SUPPORTED/BLOCKED
- same artifact with cli-invalid-identity.json → exit0 UNKNOWN/BLOCKED, invalid source identity null, synthetic marker absent, no stderr

All context/candidate/guard reads are read-only. Probes adapt earlier independent TL patterns in the new root only, not DEVOPS's copied logs. Exploratory duplicate export names yielded SUPPORTED but **is not asserted as a defect** without additional installed export semantics proof. Empty chunk with requested module7 is UNKNOWN; invalid UTF8 UNKNOWN. No count of these explorations is presented as independent acceptance

| Retained evidence under `/private/tmp/nqr133-tl-BhOKZIcs` | SHA-256 |
| --- | --- |
| guard.py | `c03bff1a2137ed34e8fb04f3c6801d1f9c725fb38e58cc6f335d8f1628417197` |
| guard-pre.json = guard-post.json | `5b56711a2242181571c17ab3e57acfbe93aadfd1f9ba9924d98a6c8b56da8328` |
| probe.mjs | `91ff6ecf23b7a36782bf74f505424eaa41ffdc743638165957c7fac1d0bcb540` |
| probe-results.json | `b89a733d5bdfc40a61fbb87392fd09c3e86835763fed87439db962776868f7da` |
| boundaries.mjs | `59880b6598ad1b513696c6e0b16cbcf5d3e25a3e469d511559fbbf5b43240e44` |
| boundary-results.json | `2817c4b8c82cb2635745647770c7252d6e976f34d368f1af56af8dd9f24dfab3` |
| tests.log | `5ab27f98c14909b235e941c2e212a0b36ecf09cc777df1244cea40ea9f146776` |
| commands.json | `d04782c17b7b6a93b2ea51f60d92183157a1b1b33e02fb0f1f6de346bfd2b8ec` |

## 6. Trust / remaining limits / next action

parse5 and Acorn load before API toolchain checks. All91 parser prep bytes and pinned Acorn/Next bytes were freshly verified and unchanged here; this supports the **trusted frozen dependency preparation** assumption. Adapter itself hashes only selected entry/package files and does not independently prove every imported module or mutable resolver/cache/native state. Source/dependency digest fields remain validated caller provenance, not complete-tree computation inside adapter. No parser-package tampering was attempted

Public plain-data checks inspect top-level descriptors; Proxy reflection may invoke traps, nested inputs are not a general hostile-object sandbox. Main entry exceptions are now fixed in tested cases; this does not establish CPU/time bounds on malicious Proxy traps. HTML parsing/Acorn allocate before some post-parse node caps; no memory/time benchmark or resource-exhaustion claim was run

Frozen real result SHA `b7cea9e1166fd9654b7cacef427bddc30494f193c896737a3879aaff561f1945` verified: STATIC_UNKNOWN/BLOCKED, unknown2487/violation0/truncated, nodes45/edges2073. This is retained worker semantic evidence, **not a fresh semantic run on real artifact**. Actual610 bytes independently rehashed. Real runtime/Flight/cache/vendor/browser timing/evaluation still unproved, and honest UNKNOWN remains correct

PM should reconcile with independent SECURITY re-review and route bounded R1–R6 repair to existing DEVOPS within approved Stage A scope, preserve i2 freeze, then re-review newly frozen bytes. Conservative UNKNOWN is acceptable for unsupported executable/binding/loading contexts. Maintain BLOCKED on all Stage A results. Do not start Stage B, integrate SOURCE, rebuild or grant release on this review

Terminal: **REVIEW_FAILED; TL STANDBY after one callback**. Report file SHA is supplied separately to avoid self-reference
