# PM renderer failure-state integration — NQR-034 Part A / NQR-037

วันที่: 2026-08-30 (Asia/Bangkok)

ผล: **PART A INTEGRATED / OFFLINE CHECKS PASS**; Part B remains **ADJUST / PLAN ONLY**. This is not browser, artifact, scanner, ECI, capacity-UX, logo-policy, security or release signoff.

## Identity and guards

- Source state before integration: reviewed NQR-032/NQR-033 over historical checkpoint `NQR-P1-CODE-633-e353d3128d7f`
- Provisional pre-integration 117-file digest: `20269b7fafaa5ca348d99161c34b13848463ee8bbe515627aeaf600bc62da263`
- RENDER report SHA-256: `4da425ef08c147cb48c1b86d1700c3f8c69b93c4ddd8867e06b2dd987e3e03ee`
- TL independent review SHA-256: `e5415763fc0f251c118b70e7e7d22e8be9822fa393b3cd16a31872e82ccc69f8`
- Reviewed Part A two-file digest: `9c8e74665036121717ba029ff302fa2386c66510faf4a6be0a4f978b62ffe4d6`
- Before apply, current source engine preimage, new-test absence, candidate hashes, package/lock pairs, authorized NQR-032/NQR-033 four-path state and vendor hashes matched.

## Guarded Part A integration

PM applied only the reviewed byte-equivalent changes with `apply_patch`; no RENDER worktree/package lineage was copied.

| Path | Before | Integrated |
|---|---|---|
| `src/qr/render/engine.ts` | `9616cce76567c459102d66f10d9083d6293a46c0e4502808c4e76a523bf39daa` | `e4fd6aa5b867dfb9fb17c97e92373df767c93badc2376c256f2c9e292eb01f8e` |
| `src/qr/render/failure-state.test.tsx` | absent | `5203af12c316ff4e98288fa9dd8b0579079dbc08a6242b762bd37d921fa7bfcb` |

Both files are byte-identical to the independently reviewed frozen candidate. The current 118-file inventory differs from CODE-633 only at six authorized paths from NQR-032, NQR-033 and NQR-034 Part A. Provisional digest: `faa221f5f7298a280f85a3143f6456961c28a02a43587a44d945dfaa274ee683`.

Vendor evidence remains unchanged:

- bundle `429de523c7563fc0647e618f5a8ea567d5a16412a13ef5d6a082b4502f5a54f9`
- source map `4ede48d46884ea56e753a6bff33854e60d9782a47a09802f705e4b9a33d88210`

## Source verification

- Focused failure-state/Unicode/SEC-002/options/filename/export: **204/204 PASS / 6 files**
- Exact `npm test`: **781/781 application tests / 16 files + 119/119 script tests PASS**
- `npm run typecheck`: **PASS**
- `npm run lint`: **PASS**

## Part B disposition retained

No Part B implementation was applied. TL disposition is ADJUST before implementation:

- classify capacity only at the narrow pinned-vendor matrix boundary with primitive/grammar/left>right/length/version guards;
- never inspect, coerce, attach or log unknown thrown data;
- Generator owns a synchronous monotonic revision; status stores minimal non-payload metadata;
- only confirmed capacity for the exact current revision blocks Test Scan/all exports;
- pending may run a fresh current export; stale callbacks cannot authorize/block/save;
- generic preview or format-specific failures remain safe/local, not global capacity decisions;
- normalized effective ECC controls available recovery actions; any new logo policy still needs the user.

Part B requires a separate explicitly authorized implementation assignment, independent review and assembled QA.

## Remaining scope

Actual browser paint/downloaded PNG/SVG/PDF/PDF conversion, scanner/ECI, timeouts/abort behavior and UI capacity copy/accessibility remain pending. Part A proves wrapper code/unit behavior, not a previous UI stale-save defect or final acceptance.

