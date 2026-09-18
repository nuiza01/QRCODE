# NQR-130 — Phase 2A emission adapter Stage A iteration 3

วันที่ 2026-09-13 | DEVOPS | iteration-3

**Outcome: DONE / REVIEW-READY — candidate repair ครบขอบเขต แต่ Stage A และ release ยังคง BLOCKED**

งานนี้ซ่อมเฉพาะ Stage A candidate แยกใหม่ตาม merged TL/Security findings จาก iteration-2. ไม่มีการแก้ SOURCE, package/lock, wrapper, verifier, frozen artifact หรือ snapshot เก่า; ไม่มี install/build/browser/server/network/DB/deploy/commit/push/production contact และไม่ได้เริ่ม Stage B. ทุก `InspectionResult` ที่ได้ยังมี `releaseDecision="BLOCKED"`. ขั้นถัดไปคือ independent TL และ SECURITY review บน exact frozen bytes ด้านล่าง

## 1. Inputs, authority และ isolation

- SOURCE (read-only): `/Users/sarawutjuntasang/Nexora/QRCODE`
- i1 preserved: `/private/tmp/nqr130-gate-stage-a-7PEiLUZ0`
- i2 preserved/frozen: `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD`
- i3 new candidate: `/private/tmp/nqr130-gate-stage-a-i3-fBy3Aj4N`
- Frozen diagnostic artifact: `/private/tmp/nqr125-build-i2-pUZsutO2/project/.next`
- TL review: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_2_TL_REVIEW.md`, SHA-256 `35c7ef163dee144d5164e35aebef3bbd0a56d8d1168945c8df84e8c285d456ca`
- SECURITY review: `/Users/sarawutjuntasang/.codex/worktrees/7b9b/QRCODE/docs/reports/PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_2_SECURITY_REVIEW.md`, SHA-256 `07e60b7ca5a336211f9a644a74bf88891e130e781cb1c738a7b2299001998f22`
- i2 worker report SHA-256 `c5723a0ec8fb4e291bc1225f9f35d92bc2bfee198500504494546f524afee83b`

อ่าน review ทั้งสองฉบับครบและอ่าน exact reproduction scripts จาก `/private/tmp/nqr133-tl-BhOKZIcs` กับ `/private/tmp/nqr134-security-oodcb6n3` ก่อน repair. i3 เริ่มว่าง แล้ว physical-copy exact i2 `project/` จำนวน 98 files; ก่อนแก้ authored2 มี canonical digest `b82a8e0c89184612725fc53b8a0fd7a3a1f8e92c2eac8fb1b79d6311ef80ad74`, ตรง i2 ทุก byte และทุก file มี inode แยก ไม่มี hardlink

## 2. Exact authored delta และ freeze

Prep 96 files (base5 + parse5/entities91) เป็น physical copies และ **excluded from authored delta**. Project inventory ก่อน/หลังยัง 98 files; final guard พบ changed paths เท่านั้นสองรายการและ hardlinks i2→i3 เท่ากับ 0

| Path | i2 before SHA-256 | i3 frozen SHA-256 | Mode |
| --- | --- | --- | --- |
| `project/scripts/inspect-turbopack-emission.mjs` | `645cc72b75a45cf077fa5cf33d4780de9b48b0a9ae978aacec09b0c0e747ca61` | `63fc94534e072ad72ab805c94a5aba4864628d7222a985f23b56c4405f6dc51c` | `0444` |
| `project/scripts/inspect-turbopack-emission.test.mjs` | `191f65f9619bf1f874e351dd9599873b847ccc97209c3c32ea4462d7c5da2a0b` | `6103a6f4ef56d3001b30b2111fce21452076cb07317fe4eefb6ee599568f2454` | `0444` |

- Frozen two-row compact `{sha256,path}` canonical SHA-256: `da69c4667784b1f73895b00665791ea1b6c915235e886ff6dd3d8a6be36c559e`
- i2→i3 two-row compact `{after,before,path}` canonical SHA-256: `d695959fdba2a6713448795ef48297c69f709cd7e77ac811ae504637a3ef305e`
- Final sizes: adapter 52,061 bytes / 1,124 lines; tests 34,341 bytes / 639 lines

## 3. Repairs mapped to merged findings

1. **TL R1 / SEC2 — HTML execution roots:** parser now checks `namespaceURI`; foreign `<script>` including SVG `href`/`xlink:href` and HTML `iframe` nested browsing contexts return fixed UNKNOWN. Comment/rawtext/plain SVG remain supported; template and event handlers remain UNKNOWN; recognized external HTML script remains VIOLATION
2. **TL R2 / SEC1 — Promise binding:** exact deferred loader now rejects `Promise` shadowing by loader callback, factory context parameter, or named factory inner binding. Ordinary reviewed loader remains supported. No emitted JavaScript is eval/VM/executed
3. **TL R3 / SEC3 — module availability and Flight records:** destination proof now uses registration subjects intersected with modeled route roots/Flight chunk references or deferred source/explicitly loaded chunks. Registration in an unrelated artifact file no longer satisfies a destination. Duplicate/conflicting Flight record IDs return UNKNOWN. Valid entry registration and lazy-chunk target remain supported
4. **TL R4 — directory substitution:** traversal records and revalidates directory `dev:ino` anchors before/after `opendir`; stable leaf reads also compare opened-handle identity to the current path identity. Controlled ancestor substitution now stops UNKNOWN before opening the sibling file, even when sibling bytes are identical and the original path is restored later
5. **TL R5 / SEC4 — cumulative bytes:** each distinct admitted HTML/JS semantic buffer is charged once against the declared 64MiB executable limit before retention/parsing. BUILD_ID, toolchain reads, final identity rewalk and CLI descriptor/manifests are not double-charged. A pure bounded seam exercises exact-limit and over-limit arithmetic without large/OOM fixtures
6. **TL R6 / SEC5 — exported CLI containment:** null, Proxy/getter and non-string argv reads are contained and return exit2 with fixed `INVALID_CLI_ARGUMENTS`; valid CLI remains exit0. Writer invocation is outside the untrusted-input catch so a trusted output-sink failure remains a distinct propagated failure

## 4. Red → green evidence

### Red control run against exact copied i2 adapter

```sh
node --test scripts/inspect-turbopack-emission.test.mjs
```

Run ก่อน implementation หลังเพิ่ม controls เท่านั้น: exit1, **35 tests / 28 pass / 7 fail / 0 skipped**, duration 1163.419709ms. Seven failing tests correspond exactly to foreign/nested HTML, Promise shadow, context-bound destinations, Flight record IDs, semantic byte seam, ancestor-directory substitution และ hostile `runCli`. Existing 28 tests passed in that red run

### Frozen green run

```sh
node --check scripts/inspect-turbopack-emission.mjs
node --check scripts/inspect-turbopack-emission.test.mjs
node --test --test-reporter=spec --test-reporter-destination=/private/tmp/nqr130-gate-stage-a-i3-fBy3Aj4N/evidence/green-tests.log scripts/inspect-turbopack-emission.test.mjs
```

Both syntax checks exit0. Frozen suite exit0: **35/35 PASS, 0 fail/skipped/todo**, duration 1499.174584ms. Log SHA-256 `9ca2b7c4c7d30b8bca6604a84b90508924e0f03296c62493e9f403277bb96237`

### Copied independent reviewer probes on i3 bytes

Copied scripts changed only their candidate/evidence-root literals; original reviewer evidence and i1/i2 remained untouched

| Command / evidence | Result | Evidence SHA-256 |
| --- | --- | --- |
| `node evidence/tl/probe.mjs` | exit0; 45 records; prior positives preserved; all Promise/HTML/orphan cases UNKNOWN; violation cap monotonic; hostile runCli exit2 | `probe-results.json` `97b8d0ea6d00dc85ae2d8fec057cf5572516adae54f694c75ad7c96f1071a317` |
| `node evidence/tl/boundaries.mjs` | exit0; 8 records; directory swap UNKNOWN, `openedOutsideArtifact=false`; CLI caps preserved | `boundary-results.json` `a50d822be5091f14eac5028871ebf7515f5232e531824913185e67d8484c9c92` |
| `node evidence/security/probes.mjs` | exit0; 39 records; shadow Promise/unloaded module/duplicate Flight/foreign script/nested document UNKNOWN; valid positives preserved | `summary.json` `4fc3043016366f6189830cd9c75e952b9d2014d4acb24cf65181ffdfa730559e` |
| `node evidence/security/boundaries.mjs` | exit0; 8 records; both semantic mutation directions UNKNOWN; valid CLI exit0; invalid/capped CLI exit2 | `boundary-summary.json` `99e1f7bdc2e58a530d9bb5139508ea954f58467ba4c679867486acad018bda33` |

Key observed controls:

- `positive`, `valid_deferred`/`valid-loader`, literal export, comment, rawtext, plain SVG: `STATIC_SUPPORTED / BLOCKED`
- external Flight/script and early/late external loader after diagnostic overflow: `STATIC_VIOLATION / BLOCKED`, with VIOLATION representative retained
- SVG href/xlink, iframe src/srcdoc, three Promise-shadow forms, orphan Flight/deferred registration, duplicate/conflicting Flight record IDs, template/handler, benign IIFE/runtime metadata: `STATIC_UNKNOWN / BLOCKED`
- controlled directory swap: `STATIC_UNKNOWN / BLOCKED`, includes `ARTIFACT_DIRECTORY_IDENTITY_MISMATCH`; no sibling leaf opened
- null/getter/Proxy/non-string `runCli`: no rejection/no marker echo, exit2 fixed result; injected safe writer used except the explicit trusted-writer separation test

## 5. Frozen real artifact diagnostic

Exact CLI inspection used i3 adapter, i2 immutable expected manifests, and frozen artifact only:

```sh
node scripts/inspect-turbopack-emission.mjs \
  --artifact /private/tmp/nqr125-build-i2-pUZsutO2/project/.next \
  --expected /private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/evidence/real-artifact-expected.json
```

Fresh result: `STATIC_UNKNOWN / BLOCKED`, unknown2487, violation0, truncated=true, graph45 nodes/2073 edges, BUILD_ID `7OgVcQLdytdDmtYEw_V6N`. Result JSON SHA-256 remains `b7cea9e1166fd9654b7cacef427bddc30494f193c896737a3879aaff561f1945`; identity fields remain SOURCE185 `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df`, dependency `82b9649f810f12f6e82a9c17213fa0f221775f50b577217bbd5eeb8d600906db`, full610 `4d372f50b89dd44cf2ea3259113d16015406046e29a89f87200c629038f98f1d`, scope342 `80fe2ca3df2c327a8d00ff3dd2765631ee39dbd8ec85e1867409d38ce12daddd`

ผล UNKNOWN นี้ถูกต้องและไม่ได้ถูกแก้ให้เขียวเพื่ออ้าง release; unsupported real Turbopack/Flight semantics ยังต้องพิสูจน์ใน scope ที่ได้รับอนุญาตภายหลัง

## 6. Pre/post guards และ preservation

Reviewer guard ถูกเรียกสองครั้งระหว่างงานและหลัง freeze; ทั้งคู่ exit0 และให้ identity ชุดเดียวกัน:

- SOURCE185 actual canonical `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df`
- i2 canonical2 `b82a8e0c89184612725fc53b8a0fd7a3a1f8e92c2eac8fb1b79d6311ef80ad74`; i1 root25 `df6f13a22f5f3bf272ac6759eda30ae3e79490c4f8a853724e2ffdb7b3dd2a4e`
- frozen artifact full610/scope342 digestsตรงค่าด้านบนและ exact path sets ผ่าน
- parse5 33 files canonical `bdfc17d399b82d095822e8e0aea93b953d753da42fff9a2ae38d2dee5bd97409`; entities 58 files canonical `c94cc262f58d4cf0d88fc8a794daa729dbd8c4fd726bf23d65635dbcf3c34459`
- base prep SHA-256: AGENTS `63f2c50380ed6303237cce215ce27af1d620d094c215e28d1b1538a3c070e3bb`, package `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`, lock `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`, Next package `dc243091ba95352bbc300be22c6561d24a19a1c0bd2c2cc85d2c5168767ea7b9`, Acorn `758cead0e9764f94320f938ac169fb95c7eeea30dc675a6e5b1133fae239fa19`
- SOURCE wrapper `584dce0c983abb7d3b66fd6f5d74ed650cf78b8f38b546e548a3d8b327661ecf`, verifier `a48002f4bde25a9ade697892c6e7b4469ef07cca92f16e176f6ee946bff43650`, verifier test `c7c2660151ddc3a13639f11e604ea300c9d4649e14611b99394b4377e7f7e240`
- final i3 guard: 98 files, changed paths exactly authored2, prep96 byte-identical to i2, 0 hardlinks, authored modes0444

## 7. Honest limits / next required action

Directory protection is finite static checking, not an atomic filesystem snapshot or a kernel/filesystem adversary guarantee. It anchors every traversed directory at checkpoints and binds each opened leaf to its current path identity; admission still assumes a trusted local filesystem and no attacker able to defeat all checks below Node/OS semantics. Parser imports occur before API validation; copied parser/toolchain bytes were pinned and checked, but adapter does not self-attest every transitive resolver/cache/native state. HTML/Acorn parsing can allocate before post-parse tree/node caps; no OOM/large aggregate stress was run

Flight/module reachability is deliberately limited to reviewed roots and explicit loads; unsupported cache, alias, runtime registration and cross-context semantics remain UNKNOWN. No browser timing/evaluation/cache behavior, runtime execution, export/scanner acceptance, production evidence or release authorization follows. The test-only byte-budget seam shares the production arithmetic but is not a production-sized memory benchmark

**Next action:** PM routes exact frozen i3 authored2 digest `da69c466…c559e` to independent TL and SECURITY re-review. Stage B, SOURCE integration, rebuild and deployment remain prohibited until both reviews accept the exact bytes and PM issues further authority

## 8. Terminal callback

ส่ง terminal callback ไป PM task `01a047a6-65b5-7cd3-8897-67dd87dbaa07` exactly oneครั้งในรูป `TEAM_REPORT | NQR-130 | DEVOPS | iteration-3 | DONE` พร้อม report path/hash, candidate digest, changed scope, checks, limitations และ next action แล้ว แต่ security gate ปฏิเสธด้วยเหตุผลว่า payload มี internal paths/artifact identifiers/hashes/verification details และ trusted transcript ไม่อนุญาต sensitive egress สำหรับ exact payload/destination นั้น

สถานะการส่ง: **CALLBACK_FAILED**. ไม่ retry, ไม่ลด/เปลี่ยน payload, ไม่เปลี่ยน channel และไม่ bypass denial ตาม TEAM_REPORTING. PM ยังอ่าน task/report นี้ได้ภายใต้สิทธิ์ read ที่มีอยู่

Terminal status: **DONE / CALLBACK_FAILED; DEVOPS STANDBY**. Final report SHA-256 ถูกคำนวณหลังเพิ่มบันทึกนี้และรายงานใน task ต้นทาง
