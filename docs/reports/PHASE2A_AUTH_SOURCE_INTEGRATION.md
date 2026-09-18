# NQR-122 — reviewed Auth18 SOURCE integration

Date: 2026-09-10. Owner: PM. Status: integrated; PM offline checks PASS; independent assembled QA pending.

## Authority and scope

User approved the explicit request to back up and integrate the eighteen reviewed Auth files into authoritative SOURCE and continue offline QA. This expands the prior candidate-only authority, not build/typegen, install, real DB, server/browser/network, Plesk/OAuth/DNS/deploy/production, secrets, spending or commit/push. Separate dialog3 candidate is excluded. Existing automation stays paused.

SOURCE: /Users/sarawutjuntasang/Nexora/QRCODE.
Reviewed candidate: /private/tmp/nqr076-auth-iter3-wsubl935, iteration22.
Read installed Next route-handlers and Vitest guides before source integration.

## Exact identity and recoverability

| Item | SHA-256 |
| --- | --- |
| Reviewed candidate185 canonical | e360c1f86d2badd23610f01fed7c1054a0beca4bcc02842d103e1bd14a0ccfa0 |
| Reviewed SOURCE18 delta canonical | 9faf962e431888e787fdee58a12397240871f301a4970221e0e9f45c46719f62 |
| Preintegration SOURCE179 canonical (after,path) | a8020f5292b39dddc0cd9fbde2f18db3e89b60c2bf9ec7698ea79a6d54cdafa7 |
| Assembled SOURCE185 canonical (sha256,path) | 3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df |
| SOURCE185 serialized checkpoint | ee1b04c22c0b46a95e3f2e6a00fdb6a586127d7868cb56d8f1f199bb322adc40 |
| Recoverable Auth18 backup | a6ed5abf1b987ef2e7305976cc5ee4a07070c7a5a2035388e4cdbd0c12d27139 |
| Preintegration Git-visible inventory265 | 0e7525befca18c36638e90061004d558f4311a61a9345b2e9a67b7184c847121 |
| Verification log JSON | 134d88788165d370beaae44e1b235eb62560b1ce194c09acb26f5a0c64ad478d |

ASCII path order, compact UTF-8/no trailing LF for canonical hashes; serialized file hashes are different.

Files under /private/tmp/nqr122-auth-integration-:
- BACKUP.json: gzip/base64 exact twelve prior file contents; six new-path absence records. All decoded hashes and byte lengths verified before application. No credentials copied.
- INVENTORY.json: full Git-visible preintegration265 path/hash inventory, including existing deletions as null.
- PRECHECK.json: full fresh candidate/SOURCE/pin/backup preflight.
- POST185.json: authoritative assembled checkpoint to use for independent QA.
- VERIFICATION.json: actual PM test/lint/tsc/drift results and post-test guards.
- guard.mjs: read-only guard/patch-generation helper. Actual backup, evidence and all source writes performed with apply_patch.

All eighteen SOURCE preimages/new-path absences matched the reviewed NARROW.json before writes. The exact twelve modified plus six added paths are those in /private/tmp/nqr076-auth-iter22-NARROW.json; all eighteen after hashes match. Candidate185 remained unchanged. Postintegration and post-test inventory comparison found no unrelated changed/added paths; PM control/report files are explicitly separate. Existing dirty worktree preserved.

The two differences between assembled SOURCE and reviewed candidate are deliberately retained SOURCE analyzer files:
- scripts/verify-initial-bundle-boundary.mjs: a48002f4bde25a9ade697892c6e7b4469ef07cca92f16e176f6ee946bff43650
- scripts/verify-initial-bundle-boundary.test.mjs: c7c2660151ddc3a13639f11e604ea300c9d4649e14611b99394b4377e7f7e240

Packages, schema/migration/snapshot/journal and nine installed mysql2 pins were rechecked against final SECURITY report before and after integration/tests. No whole-worktree copy, analyzer rollback or dialog integration occurred.

## Review admissions

Fresh actual report hash checks matched:
- BACKEND iteration22: 7a4d6500b6f1a39d3706bfe4d693e93096b73781508f4d21bbc53a3edf9851c7
- TL NQR120: 78d6673455fda70c72caf60c54d8e5f0e43a974e6a14ae4f00d4321a9adcebef
- SECURITY NQR121: 1915526dde2a08c9b657eda76a9a878c71d003bfd40165f0b3a6be34c277e0b7

Prior review qualifications and historical evidence remain in PHASE2A_AUTH_OFFLINE_REVIEW_CLOSEOUT.md; this report does not rewrite them.

## PM fresh assembled verification

Node v24.14.1. Commands run from SOURCE with DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET unset for tests/lint/tsc; drift ran with DATABASE_URL unset. No credential files read.

| Actual command | Result |
| --- | --- |
| npm test | PASS: Vitest 1129/1129, 46 files; scripts 247/247; exit0 |
| npm run lint | PASS exit0 |
| ./node_modules/.bin/tsc --noEmit --incremental false | PASS exit0 using already-present SOURCE generated declarations |
| npm run check:drift | PASS: 10 tables, 29 SQL statements, offline/no DB |
| git diff --check | PASS exit0 |
| Fresh post-test exact185/Auth18/outside18/package/native/report guards | PASS; same assembled digest |

The SOURCE script count247 differs intentionally from temporary candidate122 because the separately reviewed analyzer pair is retained. Passing wrapper negative/stub tests are not a fresh Next build or release admission.

Full temporary-candidate TSC previously had ten missing generated Next LayoutProps/PageProps names. SOURCE currently has existing .next/types declarations and this direct noEmit command passes. No next typegen, next dev/build, fake declaration creation or package typecheck script was run. This is evidence against existing SOURCE type inputs, not freshly generated build types or artifact compatibility.

Existing type-input hashes observed after check:
- validator.ts: 04072a29ca63ce1500c353953b7f2cb9777ecac419bd79ba81d4381d9b47b001
- routes.d.ts: e1b7e3dfe1b0a905b9d33f064648343de1a458207a3a45a0fb16fadbd8c77c11
- cache-life.d.ts: 4f984436b10cfb43ccf7fc3114dcb851cbefa4d58b7d8ae741aaae0f6e330129
- root-params.d.ts: 535decf70db9ab87eb7e7a79921962426a46353b30531e83f300441345815c8e

## Next gate and limits

Assign existing QA task independent offline assembled checks against POST185 and the same frozen Auth18/source packages. QA must independently verify identity, relevant auth/session/readiness/callback/resource contracts and regression suites, distinguish installed driver/inert streams from real DB and preserve legacy eventless B12 qualification. Do not fabricate fresh historical matrix execution or alter source to get a pass.

No new build or artifact was produced. Not login/real MariaDB/runtime/browser/load/production/release acceptance. Recorded rollback BUILD_ID m1fxDjFEQxdLlI91m1Czx remains untouched; rejected Gg64LFGQcClo_70kqyHFi remains prohibited. PM has not inspected or mutated live production in this work.

