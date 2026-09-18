# NQR-129 — Phase 2A release-gate change specification

Date: 2026-09-10 (Asia/Bangkok)
Owner: TL | iteration-1
Disposition: **PLAN ONLY — implementation-ready proposal, not implementation authority**
Current release: **BLOCKED / NEEDS_EMISSION_REVIEW / UNVERIFIED**

## 1. Scope and decision

This document specifies a minimal two-stage change to the deliberately always-blocking bundle verifier. It does not implement, integrate, approve a release or revise historical acceptance claims. NQR-127 is consumed as diagnostic evidence; its review/probes are not repeated.

Read current SOURCE ENGINEERING_LOOP and full TEAM_REPORTING, current build wrapper and verifier call sites, applicable AGENTS and installed Next lazy-loading guidance. SOURCE control-state prose still describes NQR-127 dispatch; the explicit NQR-129 assignment establishes this new proposal-only scope, not a code-write grant. The immutable NQR-127 report remains byte-identical.

**Can static evidence alone close the release gate? No.** It can close specifically named static predicates within a supported grammar. It cannot establish browser event/load timing, cache behavior, successful downloads or built-runtime DB recovery. A bundle-specific conditional PASS would also not authorize deployment or substitute for independent application/security/DB acceptance.

Proposed startup policy requires explicit acceptance; it must not silently replace earlier promises:
- Generator/application form code **may be initial**.
- Renderer and QR vendor **may load for a current valid preview mount**, without any click. A valid initial state may therefore cause loads during hydration.
- PDF-specific modules must remain deferred until an **eligible, current PDF request**. Merely selecting PDF format, rendering preview, Test Scan, PNG or SVG must not start PDF-specific loading/evaluation.
- An invalid current draft must not initiate a new renderer/vendor load on the strength of a stale validation result. Already loaded modules need not unload; an existing last-valid preview can remain visible under the accepted current UI contract.
- This proposal does not allow eager QR/PDF loading just because the file is called framework/runtime or has a previously observed hash.

This policy is a **proposal**. It does not assert that current browser behavior satisfies it. If PM/product wants stricter “never before user interaction” behavior, that is a distinct product/code requirement and must not be hidden in an analyzer exception.

## 2. Unchanged identity / baseline

Actual lightweight read-only identity check on this turn:

| Identity | SHA-256 / result |
| --- | --- |
| SOURCE185, actual rows | 3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df |
| Full frozen .next610, actual rows and exact file set | 4d372f50b89dd44cf2ea3259113d16015406046e29a89f87200c629038f98f1d |
| NQR-127 report | 8b9b80eb02fc4a804175959bcc1a185ebd14c0ce20518475561d89e43ab6ffe5 |
| package.json | 237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0 |
| package-lock.json | 163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a |
| scripts/verify-initial-bundle-boundary.mjs | a48002f4bde25a9ade697892c6e7b4469ef07cca92f16e176f6ee946bff43650 |
| scripts/build.mjs | 584dce0c983abb7d3b66fd6f5d74ed650cf78b8f38b546e548a3d8b327661ecf |

Frozen project: /private/tmp/nqr125-build-i2-pUZsutO2/project
BUILD_ID: 7OgVcQLdytdDmtYEw_V6N

NQR-127 full physical dependency digest 82b9649f810f12f6e82a9c17213fa0f221775f50b577217bbd5eeb8d600906db is carried evidence, **not freshly rehashed in NQR-129**. No dependency use beyond read-only documentation/source inspection or stdlib guard. SOURCE185 excludes evolving PM reports; this spec does not redefine its inventory.

Canonical JSON: SOURCE rows {sha256,path}; full610 rows {sha256,path,size,type} in the existing manifest's traversal order, compact UTF-8/no LF. Compare sorted actual path sets separately. Do not reorder/rewrite original manifests. Existing artifact342, package/native lineage and all frozen reports remain preserved.

## 3. Minimal proposed file ownership / stages

All paths below are **proposed relative to an authorized isolated implementation worktree**. None is created or edited by NQR-129. No package/schema/config/application/renderer/Auth change is needed for this gate proposal.

| File | Stage | Minimum responsibility |
| --- | --- | --- |
| scripts/inspect-turbopack-emission.mjs (new) | A | Read-only bounded input collection, explicit emission grammar/graph model and deterministic static findings; contains the versioned profile and evidence-shape definitions. No Next process, source writes or release authorization. |
| scripts/inspect-turbopack-emission.test.mjs (new) | A | Inert synthetic registration/runtime/Flight/graph fixtures and mutation controls. No arbitrary emitted code execution. |
| scripts/verify-initial-bundle-boundary.mjs (existing) | B | Preserve current closed inspector/API. Add conditional bundle evaluator and checked evidence admission; replace unconditional throw only after independent acceptance. Unknowns still throw fixed needs-review. |
| scripts/verify-initial-bundle-boundary.test.mjs (existing) | B | Extend existing fixtures, wrapper tests, missing evidence and conditional-success controls; preserve all prior fail-closed tests. |
| scripts/build.mjs (existing) | B | Preserve normal build/origin admission. Add narrowly parsed verify-existing mode to verify an already emitted artifact without running Next; both origin and bundle conditions must pass before success. |

Five source/test paths total (two new, three existing), plus separately reviewed policy/QA reports in documentation/evidence storage. No new dependency, package script, environment bypass flag, production key, credential, telemetry or network capability.

**Stage A is not a release mechanism:** it reports STATIC_SUPPORTED / STATIC_VIOLATION / STATIC_UNKNOWN with releaseDecision=BLOCKED unconditionally. Standalone diagnostic CLI may exit0 to mean “inspection completed” only when output prominently retains releaseDecision=BLOCKED; never label that exit a release PASS. The current verifier/build wrapper remains unchanged during Stage A.

Stage B is separately authorized and reviewed. The adapter's STATIC_SUPPORTED result is necessary, not sufficient. Splitting stages prevents a successful reader from silently becoming a release-authorizing executable.

## 4. Proposed API and decision contract

Names are proposal contracts, not current exports:

| API | Input | Output / guarantee |
| --- | --- | --- |
| inspectTurbopackEmission({artifactRoot, expectedInputs, profile}) | Explicit root + approved identity/profile, no environment inference | Read-only deterministic InspectionResult; schemaVersion, identity, supported profile, node/edge categories, bounded diagnostics, staticStatus; never returns release PASS. |
| evaluateBundleBoundary({inspection, timingEvidence, acceptedReview}) | Already validated immutable evidence objects admitted by trusted coordinator | Pure decision {status: PASS_BUNDLE_SCOPE / BLOCKED / FAIL, reasonCodes, identity, policyVersion}; cannot execute code/load URL. |
| verifyInitialBundleBoundary(buildDir, options?) | Existing buildDir retained; optional explicit expected identity and evidence inputs for Stage B | Resolve only for PASS_BUNDLE_SCOPE; throw fixed NQR_BUNDLE_STATIC_CHECK_FAILED for proven violation, fixed NQR_BUNDLE_NEEDS_EMISSION_REVIEW for unknown/missing/unaccepted evidence. No options means BLOCKED, preserving existing safe default. |

Detailed predicates:

PASS_BUNDLE_SCOPE iff all are true:
1. Actual bytes/path sets match one internally consistent artifact, source/toolchain and versioned profile.
2. Every required executable root/edge is accounted for; all relevant graph and load-policy predicates are supported and satisfied.
3. Complete browser timing evidence matches exactly this artifact, policy and accepted scenarios.
4. Independent TL + SECURITY findings for this gate implementation/profile are resolved; QA evidence accepted by PM and bound to its exact bytes.
5. No relevant input changes during verification, no unavailable required file, unsupported grammar, unresolved computation, missing record or prior evidence revocation.

FAIL is a positively proven boundary violation; BLOCKED is missing/unknown/ambiguous/incomplete evidence. Neither may yield process exit0 in release mode. An unknown alongside any proven violation must not hide that violation. Fixed reason codes must never echo arbitrary exception.message/stack, payload or credentials. Keep root/path diagnostics constrained to approved project-relative identities.

Existing inspector results remain distinguishable: UNSUPPORTED under the old closed grammar does not magically become PASS. Stage B explicitly documents which reviewed adapter predicate closes each unsupported class. Empty/trivial ESM success still cannot satisfy missing timing evidence.

### Evidence trust and artifact binding

Evidence schema must include: schema/policy/profile versions; BUILD_ID; source inventory, artifact-scope/full inventory and dependency digests; adapter/verifier revision; browser/version; scenario IDs; cold/warm preparation and timestamps; local origin; relevant request/resource/cache/initiator/event records; observations and fixed failures; pre/post identity; reviewer dispositions and exact accepted report digests.

A caller-supplied JSON field such as approved=true, passed=true, “reviewer: TL” or an arbitrary evidence hash **is not authority**. Hashes bind bytes, not truth or reviewer identity. The trusted PM/release process must first admit the exact reviewer/QA records and provide the accepted digest set under the same controlled review boundary as the gate code. Gate cross-checks only that admitted set, not an environment-selected self-approval file. Ordinary local invocation without this trusted admission context stays BLOCKED.

Do not invent a cryptographic signing/key-management system in this narrow implementation. If automated CI cannot enforce the trusted admission boundary (protected inputs/access review), automation remains BLOCKED until that separate trust design is reviewed. This proposal grants neither new CI access controls nor privileges. The pure evaluator is not an authentication service.

### Build / verification sequencing

Current scripts/build.mjs:19–25 spawns Next then calls the verifier; :26–29 verifies baked origins. That cannot consume browser evidence for its just-created BUILD_ID before QA exists.

Proposed strict additional mode:
node scripts/build.mjs --verify-existing --artifact <absolute-root> --acceptance <admitted-record-path>

- No implicit default artifact/evidence path, no fallback to latest build, no scanning arbitrary user directories.
- Mutually exclusive with build modes --production/--preview. Reject extra/duplicate/unknown arguments, absent evidence or escaped root. Existing invocations retain current argument semantics.
- verify-existing must never invoke Next, build/typegen/analyzer, a server, browser or DB. It checks actual bytes, explicit accepted production origin, origin artifacts and admitted bundle evidence on the same existing artifact.
- Stage B must define trusted acceptance-path admission above before implementing any successful branch. A plain command with caller-authored evidence must not authorize itself.
- Fresh build still emits a diagnostic artifact and reports pending evidence/nonzero; then independent QA/review occurs. Only verify-existing can later report the reviewed bundle/origin gate passed for those exact bytes. A rebuild invalidates all prior artifact evidence.
- Bundle PASS + origin PASS means those scopes only. Aggregate engineering release readiness also requires app/security/built-DB gates; it is never deploy authorization.
- Old wrapper exit1 and old reports are immutable historical facts; do not rewrite NQR-125/126/127 as release PASS.
- Adding this path after explicit code authorization is not permission to retry the denied audit:bundle/PostCSS job. That job is unrelated and remains prohibited.

## 5. Supported version/emission grammar and unknown cases

Initial profile proposal: Next **16.3.1**, production Turbopack browser emission, pinned installed dependency/parser/native bytes from the accepted lineage. No semver range or “Next-compatible” fallback. Match the approved compiler/runtime semantic profile plus actual emitted bytes; package.version alone is insufficient.

NQR-127 exact artifact is a seed **diagnostic** example. Its hashes/counts/IDs are not universal allowlists or evidence that every execution path is safe. Different source must get new source/artifact identity and review. Changed compiler/runtime/polyfill/native bytes need a new reviewed profile. Chunk filename/hash renaming may be supported only when the AST graph and corresponding manifests are consistently regenerated and fully proved; do not rely on fixed module94553/13/23/57 counts as acceptance rules.

| Executable form | Exact supported subset to implement | BLOCKED / FAIL cases |
| --- | --- | --- |
| HTML roots and files | Reuse existing bounded fatal UTF-8 parse and local containment checks; executable scripts/preload/modulepreload, inert JSON distinguished; record classic/module/nomodule separately | Unknown MIME/link mode, base/origin/path escape, absolute external executable, duplicate/conflicting URL modes, missing/changed/oversized file; do not execute HTML. Preserve current limits (22 contract HTML inputs,512 entries/route,256 JS files,8MiB/file,64MiB cumulative). |
| Static ESM | Existing closed forms remain supported with deterministic literal contained .js edges | Computed/import-attributes/unmodeled expressions remain unknown; do not broaden as an incidental side effect. |
| Flight bootstrap | Exact noncomputed member chain and assignment/or-array empty fallback, one literal [0] argument, no other expression effect | Spreads/getters/computed keys/proxy/callback substitution, altered global target/additional call; not any .push. |
| Flight data | Exact push([1,string]) outer AST; parse versioned bounded wire records without eval; validate all executable module/resource/preload references, record ID resolution | Parsing I lines alone is insufficient. Unknown tags/length forms, unresolved references, external/encoded escape URLs, dynamic data affecting module roots block. Support text/model-only wire forms only with proof they cannot create executable refs. No fabricated generic wire acceptance. |
| Compressed factory registration | Exact approved global/currentScript head, numeric safe-integer ID groups followed by syntactic function/arrow factories; factory groups/aliases retained; registration vs invocation separate | Spread/call/getter instead of factory, prototype/property substitution, altered push target, malformed/duplicate/conflicting definitions; duplicate IDs allowed only with proven installed runtime alias semantics and reviewed equivalent definitions. Unknown factory body effects block affected proof. |
| Overwritten exports | Explicit context-bound .s/.v/.n/.j operations, exports/namespace cache identity and literal target IDs, scope-correct symbol resolution | Matching property spelling alone is invalid; shadowed bindings, computed calls and unsupported writes cannot be treated as imports or ignored. Cross-group collisions/order dependence require proof or block. |
| Deferred loader | Exact exported thunk storing a function, literal contained chunk set, reviewed load/then/import pattern; classify thunk creation, invocation and returned promise separately | IIFE invocation, default-argument side effect, hidden load on registration, alias/callback escape or uncertain call timing blocks. Eager proven PDF load is FAIL, not a tolerated wrapper. |
| Runtime backend | Explicit reviewed runtime profile: registry/cache/install, context methods, chunk URL construction/suffix, retries, queue drainage, otherChunks and runtimeModuleIds, parent/runtime source distinction | No entire-file/framework exemption. Changing callback dispatch, script creation, metadata roots, suffix/origin calculation or alias semantics blocks until reviewed. Exact hash is drift detection after semantic review, not semantic proof by itself. |
| Polyfills | Exact reviewed installed polyfill bytes, appropriate script mode and initialization effects; recorded version/profile | Minified prefix/name/substrings do not establish identity. New bytes require review. Nomodule inclusion is not evidence of modern-browser execution. |
| Dynamic/nested/vendor paths | Explicit scoped model for installed React Flight module require/preload and nested vendor loaders when reachable; preserve their own binding and module namespace | Unknown computed target/callgraph, arbitrary eval/new Function/importScripts/loader escape without a reviewed model blocks proof. Presence of vendor prefix does not grant an exemption. |

Requirements for graph model:
- Edge kinds at minimum: registration, synchronous instantiation, deferred-thunk creation, deferred invocation, Flight resolve/preload, explicit chunk load, unknown. Preserve origin node/span and semantic conditions.
- Walk both HTML/Flight roots and runtime entry roots; account for application/dependency factories as well as runtime.
- Module aliases, cache and overwritten exports must not lose reachability. Validate destination existence and resolve appropriate execution context.
- Scope analysis must distinguish e.i(id) context imports from nested t[i](...) and local t.r() (NQR-127 false-positive examples).
- Byte marker absence is supplemental only. Marker disappearance under minification cannot be a PASS predicate. Marker presence identifies a candidate for semantic classification, not automatically an executed dependency.
- Evidence/error output must remain bounded, deterministic and non-sensitive. Resource exhaustion/parser exceptions return fixed unknown/failure, not best-effort PASS.
- Full610 source maps are support data, not executable truth; browser runtime absent source map cannot be “proved” using a server backend map.

## 6. Mandatory verification controls (proposal; not run)

Extend existing suite and fixtures where natural. Every negative mutation needs a specific expected decision/reason, and must fail if its associated guard is removed. “No exception” and snapshots of configuration are insufficient.

| Control family | Required positives | Required negatives / mutation sensitivity |
| --- | --- | --- |
| Identity | Actual consistent source/artifact/profile/evidence; valid path normalization | Change1byte in source/runtime/chunk/evidence, BUILD_ID mismatch, stale QA, extra/missing file, symlink escape, read-time mutation, wrong parser/native version; each blocks |
| Registration | Alias groups, safe literal constants, approved arrow/function factories, installed dedup/overwrite semantics | Change push receiver, replace stored thunk with invoked IIFE, extra top-level side effect, getters/spread, duplicate conflicting ID, overwritten target collision; each detected |
| Graph | Resolve literal and modeled alias/Flight/nested edges to correct destinations | Missing destination, eager load injected in factory, dynamic path, shadowed context, property mutation, hidden lazy-target promotion; no heuristic all-framework pass |
| Flight | Reviewed bootstrap and data/wire variants; escaped string remains data | Inject executable outer AST, external/preload reference inside wire string, unknown wire tag, truncation/length mismatch, reordered/unresolved module ID; block, no eval |
| Timing policy | Empty preview no new QR/PDF load; valid mount QR allowed; eligible PDF event allows PDF; safe warm-cache reuse | Eager PDF at hydrate/preview/format-select/PNG/SVG/Test Scan; stale draft triggers new load; evidence without event/initiator; fake cache-negative; fail or unknown |
| Evidence admission | Accepted independent record digests match actual artifact/policy | Caller self-approval boolean/name/hash, missing reviewer, rejected/revoked receipt, modified log, wrong origin/tool/version or later rebuild; block |
| Wrapper | Old args preserved, fresh build missingQA blocked; explicit existing artifact+all gates accepted succeeds without Next spawn | Verify-existing invokes build, missing/duplicate args, automatic latest fallback, forged receipt, origin failure, incomplete scope; all fail closed |
| Regression/privacy | Existing origin, path/size/read-race/resource/closed syntax and fixed-error tests pass | Raw thrown string/object/getter/cause leaks; filesystem/network side effects during inspection; permissive catch leading to PASS |

Mutation tests must demonstrate red against an intentionally weakened isolated evaluator and green against the guarded one; never mutate SOURCE/frozen artifact to obtain red. Use inert fixtures, not execute the untrusted browser bundles. Acceptance requires one real fresh authorized emission fixture in addition to inert controls, without suppressing unsupported cases to make tests green.

No new test run claimed here. Full unit suite/typecheck/lint and script regression scope will be selected after actual code delta exists; normal dependency cache writes require ordinary permission. No install or framework upgrade is implied.

## 7. Browser evidence protocol for the proposed timing policy

Prerequisites: mandatory approved neo tools available, exact authorized diagnostic runtime isolation, no DB/real identity required for this bundle gate; cold state established and recorded, no silent browser substitute. Permission denial stops the affected test. Proposed instrumentation is observational; persistent app instrumentation requires a separate reviewed code delta.

For th/en public landing plus generator routes covering all10 types:
1. **Cold/empty-invalid startup:** fresh browser context or verifiably cleared cache/service-worker state under authorized QA, listeners attached before navigation. Record HTML/Flight/scripts/preloads, request initiation and response/cache metadata through hydration and a declared quiet interval (propose2seconds after hydration/network settles; this is bounded observation, not universal absence proof). No valid-preview event means no new renderer/QR/PDF request or evaluation.
2. **Cold/valid initial preview:** only if a supported initial-state route/flow already exists; otherwise explicitly mark this scenario unsupported and request an approved fixture. Do not silently prefill after load and call it valid startup. QR loader may initiate with current valid preview mount/hydration without click; PDF-specific imports must not.
3. **Empty→valid interaction:** record input revision, accepted valid preview mount and QR initiator. Invalid/superseded revisions must not introduce new unauthorized loads; existing last-valid preview/cache presence is not a fresh load.
4. **Non-PDF actions:** Test Scan, PNG, SVG, format selection and size/style changes; no PDF-specific request/evaluation. Record cancellation/retry/unmount cases as relevant.
5. **First eligible PDF request:** event/request correlation precedes PDF module fetch/evaluation; verify transitive PDF helper imports and outcomes. Cancellation before eligibility must not start it; cancellation after a legitimate import starts cannot undo that request and is not retroactive violation.
6. **Warm repetition / navigation:** retain module/cache state explicitly, repeat preview and all export actions; record disk/memory cache, already-resident modules and initiators. Zero network transfer alone cannot prove deferred module evaluation. Browser tracing must support the claim or leave evaluation timing UNVERIFIED.

“PDF-specific” means graph-classified entry/modules uniquely required for PDF. Shared helpers already required by the approved preview graph are not misclassified merely by residing in a PDF dependency package; shared classification itself needs proof. No name-based carve-out.

Evidence bundle must bind scenario and event timelines to exact chunk hashes/URLs/module roles, capture console and cache/initiator data, retain invalidating/failed attempts and clearly separate observed request, evaluation and paint. Partial visibility cannot be reported as no evaluation. Cover cold/warm state isolation and browser/version. Browser traces are finite behavioral evidence combined with static proof; they do not prove arbitrary future executions.

QA HTTP50/public503 evidence, developer runtime tests and static gzip totals cannot replace this protocol. Built-MariaDB fault/recovery, physical scanner/accessibility/download acceptance and actual deploy readiness remain separately tracked gates.

## 8. Independent acceptance and smallest next authorization

This specification's author must not self-approve its implementation. Proposed implementation owner: existing DEVOPS task, assigned by PM after explicit authority; no worker is dispatched by this report.

Acceptance order:
1. PM/product explicitly accept or amend the startup policy and code scope.
2. Stage A isolated adapter + fixtures; TL and SECURITY independently inspect grammar, false positives/negatives, provenance and mutation controls. Neither report implies release readiness.
3. Separately authorized Stage B gate/wrapper change; independent TL + SECURITY test trusted evidence admission, absence of bypass, verify-existing no-spawn behavior and stable errors. If TL authors any code, another independent reviewer is required for that portion.
4. PM guarded integration only of reviewed exact deltas, preserving packages/application/Auth/schema; fresh authorized immutable emission, independent QA/browser and separate built-DB gates. Rebind reports to new hashes; historical diagnostic acceptance is not inherited automatically.
5. PM admits evidence; verify-existing may close bundle/origin scope. Product acceptance and deploy authority remain distinct. Any unsupported path, dissenting blocking finding, missing tooling/evidence or denied action keeps relevant gate BLOCKED.

Minimal next user authorization, to be asked by PM (not assumed from “continue”):
> อนุมัติ policy ว่า Generator อยู่ initial ได้, renderer/QR vendor โหลดเมื่อ mount preview ที่ valid ปัจจุบันได้โดยไม่ต้องคลิก และ PDF โหลดเมื่อมีคำขอ PDF ที่ผ่านเงื่อนไขเท่านั้น พร้อมอนุมัติให้ทำ candidate ใน isolated worktree สำหรับ adapter/test ใหม่2ไฟล์และ verifier/test/build-wrapper เดิม3ไฟล์ตาม NQR-129 โดยทำ Stage A ก่อน และให้ Stage B ผ่าน TL/SEC review อิสระก่อน PM integrate; ห้าม deploy หรือข้าม gate/permission denial

The wording above authorizes a proposed candidate/review workflow only if the user actually approves it. SOURCE integration, fresh build/browser evidence collection and trusted evidence-admission deployment should be stated explicitly in the subsequent PM scope; they are not actions started here. If the user only approves Stage A, the always-blocking verifier must stay unchanged. No additional account/spending/production authority is needed or requested for the local specification itself.

## 9. Delivery / actual work

Only new written path:
/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/PHASE2A_RELEASE_GATE_CHANGE_SPEC.md

Actual checks this turn: current control/full reporting read; NQR-127 SHA and SOURCE185/full610 actual hashes/path-set checked; package/lock/verifier/wrapper pins checked; current call sites inspected; installed guide read. No repeated NQR-127 AST review, no test/build/analyzer/browser/network/server/DB/install or source code edits.

NQR-127 immutable report is preserved. Existing release BLOCKED result is unchanged. This is **PLAN ONLY** and the next action is PM policy/scope approval routing, not implementation or deployment. Report's actual SHA is delivered externally to avoid self-reference.

