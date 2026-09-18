# PM capacity classifier and preview-status foundation integration — NQR-038 iteration-2 / NQR-040

วันที่: 2026-08-30 (Asia/Bangkok)

ผล: **INTEGRATED / OFFLINE CHECKS PASS**. This closes NQR-039 F1/F2 for the exact reviewed renderer foundation. It is not Generator capacity eligibility, browser/artifact/scanner/ECI, logo-policy, final QA or release signoff.

## Identity and guards

- Authoritative source before integration: 118 files, digest `faa221f5f7298a280f85a3143f6456961c28a02a43587a44d945dfaa274ee683`.
- RENDER iteration-2 report SHA-256: `82257e64a7e41ab5184f4679c2f4cdc6f003761a2a87151c2d9ce1d248f71bce`.
- TL independent re-review SHA-256: `b99088795812b7e33b0348f9b94c4e47a3f815778f0bc1ad23658731e0a2e74b`.
- Reviewed seven-file digest: `d28dec06f4807c74d4bb775942ce714fc97a76c4928d6933847995edceb353e2`.
- Before apply, all four source preimages, three new-file absences, seven candidate hashes and source/candidate package pairs matched the frozen reports.
- PM read the installed Next.js Client Component, `use client`, and Vitest guidance before final verification; no Next-specific convention change was introduced.

## Guarded integration

PM used `apply_patch` and applied only the exact reviewed seven files. No worktree, package lineage or generated output was copied.

| Path | Integrated SHA-256 |
|---|---|
| `src/qr/render/QrPreview.tsx` | `03ab542ebad287af2122a9f9b9c32f534a6241acde04c3f4deceb29e7111bd0b` |
| `src/qr/render/engine.ts` | `e606c9d3283aedeed0a1516b83b8e0f2c9bcfe3788b2d6201cb3784b3a132c00` |
| `src/qr/render/errors.ts` | `00595b3ae0e1a5ae5322da714444e3290a108cb20afcd641a49f3b8677b7f05b` |
| `src/qr/render/failure-classifier.test.tsx` | `695bfb8d5537f787e63df3b893ae0383f5190698f76f8211c6c6944163a97c50` |
| `src/qr/render/failure-state.test.tsx` | `b1c12eb15279a92420c90ad88638d02d640b223d064117dde0d5e0accb9e9235` |
| `src/qr/render/index.ts` | `2122c6c6baff3f223e5280543aa75ae90745f292dff39f4d30c981bc62d22ac3` |
| `src/qr/render/preview-status.test.tsx` | `c914a2ad7332db2bf5c07dad5ea914f3c0d8f198d7287da7184de47cb0e57e1b` |

Every integrated file is byte-identical to the independently reviewed frozen candidate. Source package/lock remained `b33fd111…` / `6cbbdadc…`; installed vendor bundle/map remained `429de523…` / `4ede48d4…`.

Post-integration inventory: 121 code/config/asset files using the checkpoint algorithm `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`, digest `b9a5f26c0ee3275fa4d1251afa3e195c24442f09635c59450d97dd6d8c35645a`.

## Source verification

- Focused eight-file Vitest: **232/232 PASS**.
- Exact `npm test`: **809/809 application tests / 18 files + 119/119 script tests PASS**.
- `npm run typecheck`: **PASS** (`next typegen` and `tsc --noEmit`).
- `npm run lint`: **PASS**.

An initial command passed file arguments through the composite `npm test` script. Its Vitest stage passed all 809 tests, but the Node script-test stage then tried to execute TS/TSX test paths and exited 1. This was a command-shape error, not an application failure. PM reran the intended focused suite through the Vitest binary and then ran exact `npm test`; both canonical commands passed as recorded above.

## Remaining scope

The renderer foundation now exposes safe fixed failure codes and revision-tagged preview success/error status. Generator-owned synchronous pending/current eligibility, confirmed-current capacity blocking for Test Scan/exports, localized copy and accessibility remain a separate FORMS assignment. Actual browser paint, saved PNG/SVG/PDF, scanners/ECI, async vendor drawing rejection/timeout/abort behavior and logo policy remain pending. No deployment, commit or production action occurred.
