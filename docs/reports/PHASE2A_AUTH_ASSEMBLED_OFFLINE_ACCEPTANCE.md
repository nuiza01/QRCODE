# Phase 2A Auth18 — assembled offline gate accepted

Date: 2026-09-10. Decision: PM accepts the scoped offline integration and independent QA gate. Not build, live login, real MariaDB or release acceptance.

## Frozen source

Authoritative root: /Users/sarawutjuntasang/Nexora/QRCODE.
Assembled185 canonical (ASCII path order, sha256,path, compact UTF-8/no trailing LF): 3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df.
Exact checkpoint: /private/tmp/nqr122-auth-integration-POST185.json, serialized SHA ee1b04c22c0b46a95e3f2e6a00fdb6a586127d7868cb56d8f1f199bb322adc40.
Reviewed Auth18 delta: 9faf962e431888e787fdee58a12397240871f301a4970221e0e9f45c46719f62, canonical keys after,before,path.
Recoverable source backup remains /private/tmp/nqr122-auth-integration-BACKUP.json, SHA a6ed5abf1b987ef2e7305976cc5ee4a07070c7a5a2035388e4cdbd0c12d27139.

## Accepted evidence

- PM integration report: [PHASE2A_AUTH_SOURCE_INTEGRATION.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/reports/PHASE2A_AUTH_SOURCE_INTEGRATION.md), immutable SHA 53ef235e10142309d2379bda15a7d83658452041bdb1294ee251a451aff483ea.
- QA NQR123 iteration1: [original report](/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/PHASE2A_AUTH_ASSEMBLED_OFFLINE_QA.md), immutable SHA 2b7f24ffa69bf2877d5e4d5b0d381c24977b31af687cde6a8b59267a10cf63fc.
- QA NQR123 iteration2: [required additive erratum](/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/PHASE2A_AUTH_ASSEMBLED_OFFLINE_QA_ERRATUM.md), SHA cb80176a2eacdca4605631cd0fd9181a16772fa4188738b625c2b53afaaef422. Read together with the original, not optionally.

Fresh QA iteration1 focused auth/installed-driver163 tests across10 files, full1129 across46 files plus scripts247, lint, direct tsc --noEmit --incremental false, offline drift10 tables/29 statements and diff check passed. PM independently ran full1129/scripts247/lint/directtsc/drift/diff earlier on exactly this source. Generated Next types already existed; no typegen or build. Installed-driver/inert stream evidence is not actual MariaDB protocol/load evidence. Legacy eventless B12 and other bounded prior review qualifications remain unchanged.

## Report discrepancy resolved, not erased

PM found twelve wrong hash strings in the original migration/native table and a reversed canonical key-order label. QA preserved the original report and explicitly acknowledged that retained iteration1 output cannot retroactively substantiate those twelve claimed comparisons. The mechanism producing the wrong strings is unknown; no unsupported explanation is accepted.

Iteration2 machine reconciliation freshly compared actual SOURCE/candidate bytes against final SECURITY and PM PRECHECK: all15 package/schema/migration/native pins match and all4 existing generated-type inputs match. NARROW uses after,before,path. No suites were rerun in iteration2; their results remain iteration1 evidence.

PM read the complete erratum and independently verified:
- erratum/original/script/preJSON/postJSON five actual hashes;
- pre/post evidence equality after removing only phase;
- all12 corrected table values against current source bytes;
- source185, Auth18, candidate185, package/native/schema/reviewer and outside18 guards through the read-only integration guard.

Source185 remains exact. There is no demonstrated code drift or new actionable code defect from this reporting issue. The original table itself must not be cited as accurate evidence.

## Next boundary

The user-approved eighteen-file integration plus offline QA is complete. Source stays frozen and workers return to standby; the existing automation remains paused.

Next proposed combined validation gate is isolated temporary local MariaDB/runtime verification and a fresh immutable real-origin build with local artifact QA on this exact source. These actions are outside the current explicit offline-only authority and must not start until separately authorized. No deployment, Plesk, production DB/DNS/OAuth mutation, spending, secrets handling, commit/push or new infrastructure authority is implied. Separate dialog3 integration remains excluded.

No live production inspection or change occurred. The previously recorded rollback BUILD_ID m1fxDjFEQxdLlI91m1Czx remains untouched and rejected Gg64LFGQcClo_70kqyHFi remains prohibited. Old build artifacts do not represent this newly integrated source.

