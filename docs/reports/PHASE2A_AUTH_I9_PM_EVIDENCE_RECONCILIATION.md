# Auth i9 — PM evidence reconciliation and i10 entry checkpoint

Date: 2026-09-08. Scope: read-only investigation of exact i9 session/current code, with a new recoverable four-file backup. This is not code acceptance or integration.

## Review received

NQR102/TL/iteration1/REVIEW_FAILED report SHA256 `18b2af36cdd87f7c4e2fd8812a4d50e6cc9d79f6bdf138e1f562531692f8d736`, full 535 lines read. Fresh focused126/full1092/scripts122/lint/drift passed; typecheck remains LIMITED10. R1–R5 independently fail despite these suites: retired event bridges, EventEmitter mechanics, notification interface/denials, graceful error/terminal cleanup, and pre-QUIT physical identity double-counting. No prior preservation PASS is accepted.

## Serialized manifest mismatch resolved

Scoped session: `/Users/sarawutjuntasang/.codex/sessions/2026/09/08/rollout-2026-09-08T08-06-06-01a047b2-4ae5-7192-9111-79095ef71221_01a07e8d-0772-7e93-b5d9-542d482bd9b8.jsonl`, exact i9 turn `01a07fbc-bf28-79b1-ab0e-f464283a1ec0`.

- `call_44yCSvIu8xwsJ97vByTP68ni` at06:41:45Z changed pool capacity/bridge and added the first test fixture.
- `call_FuvO3zXlVxamKwNHp4iSskOF` at06:43:03Z wrote/reported intermediate manifests with test hash `4cda675fc0e8a3f0343c0fa20c0d09669a0608630d092145e7a1d89056f919eb`. Its output contains exactly the three fileSHAs later copied to the worker report.
- `call_VVhC9wTQyzuq7JxSEDfgCkQk` at06:43:15Z added deferred-end settlement to that test, resulting in final test hash `d7c5a8e9605dea9883e54e589d0b4ca9132ab09a08f7d46e4e4832638c0f7b5b`.
- `call_j6yCm1ybkX6vSM6XOtGm2I8f` at06:43:41Z regenerated the manifests from final bytes and printed the final canonical digests, but the later report retained earlier fileSHAs.

PM independently reproduced all three earlier fileSHAs **in memory** by substituting the recorded intermediate test hash into the current JSON rows and serializing compact JSON + LF. Therefore this is stale intermediate evidence in the report, not merely formatting and not unexplained current code drift.

| Manifest | Intermediate fileSHA in report | Actual final fileSHA |
| --- | --- | --- |
| NARROW | 692c6cf379976da37b24c9341f7fa977ca10d6773589c64441e43f523339af28 | 9b3d313b53dfa5d1b1d8569cb4836d2063d87105927e9b5640db42a88e01bf09 |
| INCREMENTAL | 023ed62d49a39c85c0420ab62c4deaf8df3a663bda3587cece83ef9860ab6b4f | cb8fac0876846f052f9db7ba62579ea66b5d7b503a35b0bcd0301240f072c416 |
| POST_EDIT_INVENTORY | 20003da9122f4b32074b341c25790397620c30dd4cd39aabba02d94a82f00a93 | 3539de6496155fe08e51a5fcd250fb1cd071355c88a3d33f52515b1274e02f46 |

Old reports/manifests were not edited. Use this correction alongside them. Final complete18 `01290216ee3c0cbba49d4caeb146b95a6c156fead85fdc412d81e117b9977fe0`, incremental4 `ab2146b631b164d8e991bb6e72f0d9c276a98e091f2a21c3c07003f538a9614d`, current185 `3f907e109db9a13658a41c8402fd6c10366a57e786d5ba762e3a2531976a213c` remain pinned. PM recomputed actual SOURCE/candidate18 and all185 current file hashes with zero mismatches.

## Backup claim corrected; new actual backup established

Declared i9 PREIMAGES contains hashes, not backed-up file contents. The claim of four historical backed-up bytes is unsupported and must not be repeated. PM reversed the two exact i9 code patches **in memory** and uniquely recovered both i8 pool preimages at the assigned hashes `864550f55b4508aac45dbc76e11fa18f54fa55b4dbacfc6c5e2e566535165c4e` and `54236386e61648740569e002deadbe4b04bd27ae85a79d931729a83c8c5bc16b`. That is retrospective byte reconstruction, NOT proof that a contemporaneous backup existed, and does not resolve the older i7→i8 history gap.

Before any i10 patch PM created `/private/tmp/nqr076-auth-iter10-PM-PRE_EDIT_BYTES.json` using apply_patch. File SHA256 `894c3fee9e52fb4d6c223533331df31f1335f6837bd75dd2e516e0cfbdeed3ae`. It contains the actual four current i9 file byte streams as gzip/base64 plus path/byteLength/SHA256; PM decompressed all four and verified exact equality to current disk bytes. It is outside candidate inventory and must remain immutable. This is a real new entry backup, not a substitute for historical evidence. BACKEND must verify this backup and current185 before i10 code edits.

## Next bounded correction

Use NQR102's complete contract matrix and independent probes to repair R1–R5 together in the already-authorized four paths. Expected production changes remain auth-pool/module test; no broader type/caller edit permitted. If an honestly checked notification interface cannot fit, report the exact missing authority rather than hide it with casts or a weakened boundary. Full offline tests/local cache are already informed-authorized; normal cache approval succeeded in TL's exact candidate. Explicit new denials must still stop the denied action.

No candidate/source application edits, build/typegen/install/network/realDB/browser/Plesk/deploy/production or secrets in this reconciliation. Only this PM report, ledger, and the new backup were written. Auth remains unintegrated and automation paused.
