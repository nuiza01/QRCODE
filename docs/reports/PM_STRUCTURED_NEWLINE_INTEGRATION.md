# PM structured-newline integration — NQR-032 / NQR-035

วันที่: 2026-08-30 (Asia/Bangkok)

ผล: **INTEGRATED / OFFLINE CHECKS PASS** เฉพาะ reviewed CTRL-001 structured-text newline delta; ไม่ใช่ browser, native contact/calendar, scanner, URL-safety, privacy หรือ release signoff

## Identity and guards

- Source checkpoint before integration: `NQR-P1-CODE-633-e353d3128d7f`
- Pre-integration 117-file digest: `e353d3128d7f50c2a58798dc62dbbde81a28df0504288aca24bb2e276c060e51`
- TL report SHA-256: `84ba559e31b7cced99c8b2abd4637d728a5417e7e7d1495728f57f2ac02f29a1`
- SECURITY review SHA-256: `fc2e9b5785067ee8b6d64753550879245a7f68a004c2ba630a7a2f85abf3ff23`
- Reviewed two-file digest: `dd6d6d3f0a9e5d17e6255d48fad2d142c530e333d3652ba0a0919f8db82ad17f`
- Before apply, all 117 checkpoint hashes, source preimages, candidate hashes, package/lock pairs and vendor hashes matched their recorded values.

## Guarded integration

PM applied only the reviewed byte-equivalent changes with `apply_patch`; no worktree/package lineage was copied.

| Path | Before | Integrated |
|---|---|---|
| `src/qr/payload/encode.ts` | `b41de960ab51e4a02c6fb02a1b16f22220e72eea360afa429bdc2c42a687a4e6` | `235047afc9e5161a6eca9fe0553812bbc79a7b08b9132bbac69c656093592d7d` |
| `src/qr/payload/encode.test.ts` | `0daaf01e61c9af6bbd52063ee805f7391a37278d0a4962d8a2764324bbad783a` | `cf3c4aa32f1dddbe6a9763a25e62ae481aa42f6b8225a3134c8c7c9f35ed13fc` |

Both integrated files are byte-identical to the independently reviewed frozen TL candidate. The resulting 117-file inventory differs from CODE-633 only at these two paths and has provisional digest `87b71fc25ceaa584d5c4c3161f08db113c7a8b7a5126d03bf50d8f8d45d0c45c`. A combined named checkpoint is deferred until the other already-frozen reviewed deltas are reconciled.

Vendor evidence remained unchanged:

- bundle `429de523c7563fc0647e618f5a8ea567d5a16412a13ef5d6a082b4502f5a54f9`
- source map `4ede48d46884ea56e753a6bff33854e60d9782a47a09802f705e4b9a33d88210`

## Source verification

- Focused `vitest` for encode + PromptPay: **56/56 PASS**
- Initial full attempts exposed one timing-sensitive existing Generator test timeout at varying unrelated cases; no payload assertion failed. A diagnostic full run with one retry passed **667/667**.
- Final exact `npm test`: **667/667 application tests / 15 files + 119/119 script tests PASS**
- `npm run typecheck`: **PASS** (`next typegen` + `tsc --noEmit`)
- `npm run lint`: **PASS**

The transient timeout is recorded rather than hidden; the final required command passed without changing tests or production code beyond the reviewed delta.

## Remaining scope

- vCard website lone-CR behavior remains the explicit legacy exception and is not a URL/control-policy approval.
- Browser input normalization, native contacts/calendar import, rendered/downloaded artifacts, real scanners and ECI interoperability remain pending under the existing runtime permission gate.
- NQR-033, NQR-034 and their independent reviews remain separate; this report does not approve or integrate them.

