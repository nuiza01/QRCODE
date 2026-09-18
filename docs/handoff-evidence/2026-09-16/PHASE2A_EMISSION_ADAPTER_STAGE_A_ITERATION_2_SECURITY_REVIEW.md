# NQR-134 — Stage A iteration2 independent SECURITY review

วันที่ 2026-09-13 | SECURITY | iteration-1

**REQUEST_CHANGES / REVIEW_FAILED** สำหรับ exact NQR130 iteration2 candidate. ไม่ใช่ release/browser/DB acceptance และไม่ใช่การส่ง DEVOPS callback ที่ถูกปฏิเสธซ้ำ

Existing tests ผ่าน **28/28** และหลาย finding เดิมปิดได้ในขอบเขตที่ตรวจ แต่ยังพบ admitted paths ที่ได้ STATIC_SUPPORTED ทั้งที่ binding/HTML/module reachability ไม่ครบ รวมถึง cumulative byte limit ที่ไม่ได้ใช้งานและ public `runCli` error-containment gap. ทุก **result ที่คืนมา** ระหว่าง tests/probes ยังคง `releaseDecision=BLOCKED`; malformed runCli บางรายการ reject แทนคืน result. ไม่มี release bypass หรือ outbound request ที่พิสูจน์ในงานนี้

## 1. Scope / sources

อ่าน authoritative ENGINEERING_LOOP เฉพาะ current Control state; reuse WORKING_AGREEMENT/TEAM_REPORTING ฉบับเต็มที่เพิ่งอ่านเมื่อ 2026-09-13. อ่าน worker iteration2 report ครบ, prep/freeze/delta/evidence manifests, prior TL NQR131 ครบ และทบทวน SECURITY NQR132 SEC1–SEC6. อ่าน candidate adapter1018บรรทัด/test479บรรทัดครบก่อนรัน tests; stage AGENTS และ installed Next testing overview ที่อ่านก่อนหน้านี้ยังใช้ได้ ไม่มี Next application code change

- SOURCE `/Users/sarawutjuntasang/Nexora/QRCODE`
- Candidate `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project`
- i1 snapshot `/private/tmp/nqr130-gate-stage-a-7PEiLUZ0`
- Frozen artifact `/private/tmp/nqr125-build-i2-pUZsutO2/project/.next`
- Own fixtures/evidence `/private/tmp/nqr134-security-oodcb6n3`

เขียนเฉพาะรายงานนี้กับ own temp fixtures/logs. ไม่แก้ candidate/i1/SOURCE/package/lock/teammate reports/PM ledger/artifact. ไม่ hydrate/install/build/typegen/analyzer/PostCSS/browser/server/DB/network/denied cleanup/production/deploy/commit/push และไม่สร้าง task/agent/automation. ทุก exec ใช้ absolute cwd. Fixture HTML/JS เป็น inert strings ที่ adapter parse เท่านั้น ไม่ eval/VM หรือ execute emitted client code

Current five-file isolated workflow อนุมัติแล้ว: repair/affected tests/independent review ทำต่อได้ตาม PM scope โดยไม่ขออนุมัติซ้ำทุก step. Stage B รอทั้ง independent Stage A reviews; งานนี้ไม่ implement Stage B. SOURCE integration/build/deploy ยังไม่ได้รับอนุญาต Automation PAUSED และ real denial มีผลตามเดิม

## 2. Exact identity / preservation

`guard.py` ก่อนและหลัง tests/probes exit0; output เท่ากันทุก byte. Fresh actual SOURCE185 hashes, artifact610 bytes/size/type/exact path set, scope342, i1 25 preserved rows, candidate2 modes0444, source new-path absence, base prep5 และ parser/entity91 bytes checked. Candidate project98 files = authored2 + prep5 + parse5/entities91. ไม่อ้าง fresh full dependency39249+36 verification

| Guard | SHA-256 |
| --- | --- |
| i2 adapter | `645cc72b75a45cf077fa5cf33d4780de9b48b0a9ae978aacec09b0c0e747ca61` |
| i2 test | `191f65f9619bf1f874e351dd9599873b847ccc97209c3c32ea4462d7c5da2a0b` |
| i2 canonical2 | `b82a8e0c89184612725fc53b8a0fd7a3a1f8e92c2eac8fb1b79d6311ef80ad74` |
| i1→i2 canonical delta2 | `f90cc2c8f7af0fa7d567d7e165299b7c817b622f33b7a0080488a926965531f9` |
| SOURCE185 | `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df` |
| Artifact full610 | `4d372f50b89dd44cf2ea3259113d16015406046e29a89f87200c629038f98f1d` |
| Artifact scope342 | `80fe2ca3df2c327a8d00ff3dd2765631ee39dbd8ec85e1867409d38ce12daddd` |
| Old i1 root25 | `df6f13a22f5f3bf272ac6759eda30ae3e79490c4f8a853724e2ffdb7b3dd2a4e` |
| Worker i2 report | `c5723a0ec8fb4e291bc1225f9f35d92bc2bfee198500504494546f524afee83b` |
| Prior TL NQR131 report | `830553611bbc8e76aaa24d2cee2dca485d3f1dc6f7707c668ff7b72a30b680e6` |
| Prior SECURITY NQR132 report | `6f127972e82f949fe5a1965055d1dc8fe305f5ac77c5fd3d4dc3add3c9310e04` |
| Worker real result | `b7cea9e1166fd9654b7cacef427bddc30494f193c896737a3879aaff561f1945` |
| Prep manifest | `ab9011d7f7ffaa9b3d3d6b1bd6298e47d9b9aa6ebfdd30f88bea454b7d5046aa` |
| Delta manifest | `74067edc03c5c9a5630cc9c9cc30e08a5c0d0058f001d0dbba53fb7ae5c50c4e` |
| Freeze prep | `d2d967b2d016e105bbc1548abbc0c431db86831d01061cc94bdb36bc3ff096b5` |
| parse5 actual33 | `bdfc17d399b82d095822e8e0aea93b953d753da42fff9a2ae38d2dee5bd97409` |
| entities actual58 | `c94cc262f58d4cf0d88fc8a794daa729dbd8c4fd726bf23d65635dbcf3c34459` |
| Combined91 prefixed rows | `088147c2f47b4505dae739f8e1d17bf2bf9a60c73aa6d953222326acc056a126` |

Two authored rows use keys `{sha256,path}`, paths `project/scripts/...`, compact UTF-8 JSON/no LF. Delta keys `{after,before,path}`. Source185 uses existing canonical `{sha256,path}` order; artifact uses existing `{sha256,path,size,type}` traversal order, scope order separately. Parser manifests use `{path,type,mode,size,sha256}`; combined91 prefixes `node_modules/<package>/` and path-sorts. Combined was recomputed after the independent before/after91 byte/mode checks, not accepted from manifest text alone

Base prep pins and distinct inodes SOURCE versus stage confirmed:

| Path | SHA-256 |
| --- | --- |
| AGENTS.md | `63f2c50380ed6303237cce215ce27af1d620d094c215e28d1b1538a3c070e3bb` |
| package.json | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| package-lock.json | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |
| Next package | `dc243091ba95352bbc300be22c6561d24a19a1c0bd2c2cc85d2c5168767ea7b9` |
| Acorn | `758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19` |
| SOURCE existing verifier | `a48002f4bde25a9ade697892c6e7b4469ef07cca92f16e176f6ee946bff43650` |
| SOURCE existing verifier test | `c7c2660151ddc3a13639f11e604ea300c9d4649e14611b99394b4377e7f7e240` |
| SOURCE wrapper | `584dce0c983abb7d3b66fd6f5d74ed650cf78b8f38b546e548a3d8b327661ecf` |

BUILD_ID remains `7OgVcQLdytdDmtYEw_V6N`. Worker real UNKNOWN/BLOCKED,2487unknown/0violation,45nodes/2073edges is **carried semantic evidence**, not a SECURITY semantic rerun. Fresh reviewer work rehashed all610 artifact bytes. Real unsupported semantics are not a defect merely because they remain UNKNOWN

## 3. Fresh execution and evidence

All commands below ran with explicit cwd `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project`:

```sh
node --check scripts/inspect-turbopack-emission.mjs
node --check scripts/inspect-turbopack-emission.test.mjs
TMPDIR=/private/tmp/nqr134-security-oodcb6n3 node --test scripts/inspect-turbopack-emission.test.mjs
python3 /private/tmp/nqr134-security-oodcb6n3/guard.py
node /private/tmp/nqr134-security-oodcb6n3/probes.mjs
node /private/tmp/nqr134-security-oodcb6n3/boundaries.mjs
python3 /private/tmp/nqr134-security-oodcb6n3/guard.py
```

- Both syntax checks individually exit0; fresh existing suite28/28 PASS,0fail/skip.
- `probes.mjs` exit0:26 inert fixture inspections +6 public API controls +4 exported runCli controls +3 actual parser resolution observations (39records). Assertions distinguish expected fixed behavior from recorded open findings; script exit0 is not acceptance of bad results.
- `boundaries.mjs` exit0:2 controlled between-phase file changes,5 actual CLI subprocess cases,1 hostile oversized-manifest control. Each subprocess uses same explicit cwd,10-second timeout and1MiB output cap. Only own fixture file bytes are changed by an fs.open hook, restored in finally; candidate/parser/emitted client code is not changed or executed.
- Existing tests cleanup only their own mkdtemp children under this review's TMPDIR. Review fixtures/evidence remain retained. No external URL was fetched; all URL markers synthetic `.invalid`.

Actual CLI subprocess invocation pattern (adapter absolute path; flags unchanged):

```sh
node /private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.mjs --artifact /private/tmp/nqr134-security-oodcb6n3/fixtures/cli-base --expected /private/tmp/nqr134-security-oodcb6n3/cli-descriptor.json
```

The own descriptor was sequentially valid, invalid identity marker,65537-space oversize,invalid UTF8 and relative-manifest path. Actual results: valid exit0 SUPPORTED/BLOCKED; invalid identity exit0 UNKNOWN/BLOCKED/no marker echo; remaining3 exit2 CLI_INPUT_FAILURE/UNKNOWN/BLOCKED. All5 stderr empty. Inputs/results are documented in the reproducible boundaries script; final descriptor retains the last case, not five separate immutable inputs

| Evidence in own temp root | SHA-256 |
| --- | --- |
| guard.py | `090a009292b25ddca3e55fccade403fb9351764da4a41aeb4bec48c5f577f02f` |
| guard-pre.json = guard-post.json | `0ae5cedeb445526b405321ebb3bcd9a8ed5f35de82ee2ff5a3251318af4e7485` |
| tests.json | `8f77e0c46a8fadbb8bf3ebe52ada62aee2cba728c094a59b600a5291cc1f06a5` |
| probes.mjs | `b697fdc3619237474d794524401e95fd3bc9b8c1c7e03fb8f5817abba5e84aa3` |
| summary.json | `c2ec371b1cb4ccfa35561e0528ebd4fb8656112faaabe83dd5ebb1f70eeff3f3` |
| boundaries.mjs | `efe59c47ac1c7dc070be1d191cb546679e26806e3432774b788d782e5bc438af` |
| boundary-summary.json | `99e1f7bdc2e58a530d9bb5139508ea954f58467ba4c679867486acad018bda33` |

Initial file discovery tried generic `delta-manifest.json` once (not found); actual `i1-i2-delta-manifest.json` was then read and hash-verified. No permission denial or workaround occurred during read/tests

## 4. Prior closure matrix

| NQR132 finding | Fresh result / disposition |
| --- | --- |
| SEC1 Flight/module references | Original missing module→UNKNOWN; malformed pair→UNKNOWN; external string→VIOLATION; missing chunk→VIOLATION; valid fixtures preserved. **Partial closure:** global module-presence check does not prove module load reachability; record IDs still unmodeled (NQR134-SEC3). |
| SEC2 thunk binding/export grammar | Old shadow/default/generator continuation all UNKNOWN; missing loader module UNKNOWN; normal loader and literal export triples supported; short export UNKNOWN. **Partial closure:** global `Promise` can still be shadowed (NQR134-SEC1). |
| SEC3 HTML contexts | Comment/rawtext supported without false external violation, template/handler UNKNOWN, EOF external element no longer omitted. **Partial closure:** foreign-script href/nested documents remain unmodeled but supported (NQR134-SEC2). |
| SEC4 capped severity | **Closed for tested contract:**1320unknowns followed by a recognized external loader yields VIOLATION, count1 and retained representative despite1024 detail cap. Early external case also VIOLATION. No reliance on the old misleading benign-IIFE violation. |
| SEC5 original inspect API privacy | **Closed for original cases:** null/throwing top-level getter/Proxy/invalid marker fixed UNKNOWN/BLOCKED, no original exception/marker echo; top-level getter not invoked. Nested getter invoked once but contained. New exported runCli has separate gap NQR134-SEC5. |
| SEC6 admitted bytes/final walk | **Scoped closure:** actual parsing uses inventory buffers; both independent supported→unknown and unknown→supported second-open mutations yield UNKNOWN with final byte mismatch. First case still has original registration7, second does not—evidence parsed bytes stayed original. No claim of atomic hostile-filesystem containment against every ancestor/swap race. |

TL F6 correction independently preserved: benign factory IIFE is UNKNOWN/ON_MODULE_INSTANTIATION, not claimed executed during registration; malformed metadata/duplicate semantics remain covered by fresh existing tests. TL F7 bounds improved and tested for descriptor/manifest/depth/Flight/graph nodes, but cumulative executable limit regressed (NQR134-SEC4)

## 5. Remaining actionable findings

All locations below refer to exact i2 `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/inspect-turbopack-emission.mjs`. All owners: **DEVOPS via PM; independent TL/SEC re-review**. Severity concerns a local diagnostic contract; release remains BLOCKED. Returning UNKNOWN is an acceptable minimal compatible fix for unproved semantics

### NQR134-SEC1 — MEDIUM: the accepted thunk can shadow global Promise

Lines606–615 only prevent callbackName=contextName and match `Promise.all` by spelling. No check establishes that `Promise` is the global intrinsic rather than the loader parameter/factory binding.

Actual inert factory body:

```js
t.v(Promise=>Promise.all(["static/chunks/lazy.js"].map(x=>t.l(x))).then(()=>Promise(9)))
```

With registered9 and existing lazy chunk, `shadow-global-promise` returns **STATIC_SUPPORTED, diagnostics0,72edges**, same count as normal loader. Here `Promise.all` refers to the callback parameter's property; the reviewed global Promise-all/load-then-import model does not establish this operation. No code was executed and no actual callback behavior is asserted

Fix/regression: reject or resolve all free identifiers in the accepted pattern, including `Promise`; add factory-context and outer-loader-parameter shadow controls plus normal-loader positive. Keep already-fixed continuation/mapper restrictions. This is the remaining SEC2 class, not a request for arbitrary JavaScript support

### NQR134-SEC2 — MEDIUM: HTML namespace and nested executable document roots are ignored

Lines397–429 use tagName/attribute name without node.namespaceURI. A `script` is treated as HTML script and only `src` is inspected; href is not. Other tags such as iframe are traversed without inspecting their document-bearing attributes.

Actual inert tails added to an otherwise supported22-route fixture:

```html
<svg><script href="https://example.invalid/inert.js"></script></svg>
<iframe srcdoc="&lt;script src=&quot;https://example.invalid/inert.js&quot;&gt;&lt;/script&gt;"></iframe>
```

Both cases return **STATIC_SUPPORTED, diagnostics0,67edges**, identical to the baseline. Plain SVG path control also supported. These unmodeled resource/document references disappear from proof. This is source/parse-tree evidence, **not** a browser execution or network observation; no claim that every browser must fetch either marker. The review does not reopen logo policy

Fix/regression: use namespace-aware executable-root handling; return UNKNOWN on unmodeled foreign-script/document contexts rather than treating them as inert HTML. Cover SVG href/xlink forms and nested-document attributes with safe static fixtures; retain comment/rawtext/template/handler controls. No new network test or dependency installation is needed to fail closed

### NQR134-SEC3 — MEDIUM: global registration presence substitutes for reachable module resolution

Lines927–960 inspect all chunk files and construct one global `knownModules` set. `UNRESOLVED_MODULE_DESTINATION` checks membership, not whether the target is installed by the root/chunk-load context of that edge. Flight at511–539 does not use captured wire record ID to validate uniqueness/conflict/resolution.

Actual `unloaded-module`: Flight references module999 with entry.js, entry.js only defines7; module999 exists solely in `static/chunks/unreferenced.js`, with no HTML, Flight or loader edge to that file. Result **SUPPORTED/diagnostics0,68edges**. Removing the unrelated registration file (missing-module control) correctly returns UNKNOWN. Merely adding an unreferenced file therefore closes a graph proof without establishing a load path

Additional `duplicate-flight-record-id` reuses wire ID1 with differing module7/9/export records and returns SUPPORTED/diagnostics0. This is unmodeled ID handling, not proof of actual runtime conflict behavior; the installed first/last/duplicate semantics were not re-proved here

Fix/regression: bind module destinations to reachable registration/chunk contexts and explicitly model or reject ambiguous record identities. Global file existence alone is insufficient under NQR129's required destination/execution-context proof. Add target-in-unreferenced-file versus target-in-declared-load positive/negative pair. Unsupported context may remain UNKNOWN; no demand to make real artifact supported

### NQR134-SEC4 — MEDIUM: 64MiB cumulative executable cap is dead after buffer refactor

**Code evidence only; no large-memory stress fixture.** `executableBytes` is initialized119 and incremented only inside readStableFile's `bucket==='executable'` at175–177. Every remaining call passes `"identity"`: inventory246, toolchain344–345 and CLI979. Semantic HTML/JS loops read buffers directly and never account cumulative executable bytes. Thus profile limit56 remains declared but has no reachable charging path

Individual8MiB checks and overall512MiB identity cap still apply, so this is not a claim of unlimited memory. However the approved64MiB cumulative executable bound is not enforced, and semantic buffers can be retained before any effective cumulative accounting. Existing >8MiB single-file test cannot catch it

Fix/regression: account distinct admitted semantic bytes against64MiB before retaining/parsing them; avoid double-charging final rewalk/toolchain/CLI identity data. Test cumulative boundary with a bounded accounting-unit seam or proportionate owned fixtures; do not raise limits or stress production to get a red. Restore the declared contract rather than silently relabel512MiB as the executable budget

### NQR134-SEC5 — LOW: exported runCli performs untrusted argument reads outside its try

Lines986–992 access args.length/index values and call isAbsolute before try993. `inspectTurbopackEmission` now contains malformed input, but this newly exported helper does not.

Fresh direct public calls: `runCli(null,collector)` and non-string path arguments reject TypeError without any fixed result; an Array Proxy whose get trap throws a synthetic Error rejects the **same original Error object**, output absent. `runCli([],collector)` correctly returns2 with fixed UNKNOWN/BLOCKED output. This is not reachable via ordinary process.argv strings and is **not an OS CLI exploit**; it is an exported API consistency/privacy gap

Fix/regression: admit/check argument-array data and types within the containment boundary, then emit fixed invalid-input output. Preserve actual CLI argument strictness/exit2 and ordinary valid exit0 diagnostic semantics. Do not claim protection against a deliberately malicious output callback; that trusted sink is a distinct boundary

## 6. Trust / limitations / next action

Actual local `createRequire(candidate).resolve` and realpath point to stage Acorn, parse5/dist/index.js and entities/dist/index.js. Entry SHA respectively `758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19`, `b825162aced2e79be8d68d45efb1f89ec34ed4189467195a071a0d7b694a19d4`, `442e6496aca70e865e6e9f295a71794e1889d247031e77ea1c58c415d172485b`. All91 transitive package files were freshly compared to SOURCE/manifest before and after, not only entry hashes. These are trusted physical prep bytes; import occurs before API validation. Adapter only rechecks six package/entry files and does not itself verify arbitrary resolver/cache/native state or all91 at runtime. Full dependency digest `82b9649f810f12f6e82a9c17213fa0f221775f50b577217bbd5eeb8d600906db` remains carried

Monotonic severity, fixed returned identity primitives, existing traversal caps, O_NOFOLLOW leaf reads, admitted semantic buffers and final rewalk are real improvements. O_NOFOLLOW does not by itself prove all ancestor-directory swaps impossible; finite pre/post checks do not supply atomic filesystem snapshot guarantees. No hostile external filesystem or parser mutation was attempted. Parsing limits apply partly after AST/tree creation; no universal CPU/memory deadline guarantee is claimed

Worker verification-summary.json references a green log different from final frozen green-tests-frozen.log in the report; treat them as separate retained runs, not a mismatch in current candidate identity or this fresh28-test result. Original failed/red attempts and denied callback are historical evidence and unchanged

No browser timing/evaluation/cache, network absence, native execution, real DB recovery, export/scanner or aggregate security acceptance follows from this review. Stage A always BLOCKED is preserved. Real UNKNOWN is expected; fix admitted false-supported/error/bounds defects, not unknown real grammar for the sake of a green label

Next: PM reconcile with NQR133 TL, route these five bounded findings to DEVOPS within approved candidate repair scope, preserve exact i2 snapshot/evidence and obtain a new frozen iteration for independent review. Stage B waits technical Stage A acceptance; no renewed routine user approval is invented. No SOURCE integration/build/deploy is authorized here

Final report hash is sent separately in the single NQR134 terminal callback. If that delivery receives an actual denial, do not retry/change channel; mark CALLBACK_FAILED for PM read-only retrieval. **REVIEW_FAILED; SECURITY STANDBY after reporting**
