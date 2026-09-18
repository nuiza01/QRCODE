# PM integration — NQR-023 UI filename privacy

2026-08-28, Asia/Bangkok. **Two reviewed files integrated; source checks PASS.** SEC-005 remains open pending separate convenience API work and actual download verification.

## Identity and review

- Baseline: `NQR-P1-6982907ed8d9c48124f2` plus the already integrated NQR-014 FORMS files. This is a new delta, not a copy of that earlier candidate or scaffold.
- Worker report `/Users/sarawutjuntasang/.codex/worktrees/e551/QRCODE/docs/reports/FORMS_FILENAME_PRIVACY.md`, SHA-256 `9925256ed6eced0b2917b1b0f25133e6e1bdb00d53e3c7f58c15726222982616`.
- TL independent report `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/FORMS_FILENAME_REVIEW.md`, SHA-256 `f56cb9b7393bcc673116f7a1ad570515300798219793accf1de5400a2fcd7eb0`.
- TL NQR-024 completed/idle with completed callback tool, cursor `0bdab04d-d9db-415d-b0e5-beb568c2954f:21`. Scoped PASS, 117 independent focused tests; not full privacy or browser acceptance.
- PM read the full review and exact production/test diffs. Production changes only omit the payload-derived label helper/import and add a comment; existing export/save/revision logic is unchanged. Tests add 51 lines without removing prior assertions. All ten types and both locales use generic type/variant filenames; explicit caller-label APIs remain intact.

## Guarded delta

PM recomputed digest `ae8a987c9b86a13a9b41ddcc23ed916e3c5b9c92d4c6903a5ea59a148db15970` from path-sorted compact JSON objects with keys after,before,path. Source preimages and worker/report hashes were rechecked immediately before exact apply_patch. Post-apply source hashes matched both reviewed files; all six integrated SEC-002 files and package/lock guards remained unchanged.

| File | Source preimage SHA-256 | Integrated SHA-256 |
|---|---|---|
| src/components/generator/DownloadBar.tsx | `222ad4836806b2e7052a5a78433d5981ae2eab96f606379b94f62d41e88e23b2` | `63d624935ec8b3ce817fa78205cc63bb4f3cfcc1af620b574dc2940b4c0fc3b4` |
| src/components/generator/Generator.test.tsx | `611454ee98208cf42f10d83b439f898e9d62566bb35169b0835334ca898309d7` | `0fc5665936d0877f68f4bcc24646e398cd4b6f65dda7060e71921d7822bb3155` |

No renderer/package/scaffold files were copied. New tests observe 100 suggested filenames through stubbed render I/O; they do not decode actual files. PDF variant checks use returned artwork width (58.6 rounded to 59mm), not requested symbol width. Payload input/reference and existing invalid, pending, stale, unmount and recovery tests are retained.

## Actual combined source verification

Every command used explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE`.

- `npm test`: exit 0, **534 application tests / 13 files + 119 script tests PASS**, start 18:22:32.
- `npm run typecheck`: exit 0, Next typegen and TypeScript PASS.
- `npm run lint`: exit 0, PASS.
- Post-apply UI/SEC-002/package hash guards: PASS.

This source includes previous reviewed repairs plus SEC-002 and the UI filename change. Footer and RENDER convenience filename work are not integrated yet. No fresh build/browser/downloaded-artifact/network/scanner verification was performed; known restrictions remain and no workaround was used. Generic filenames do not make QR contents confidential. Logo policy is still awaiting the user's decision; nothing in this integration changes SVG support. No commit/push/deploy, dependency changes, secret access or DB operations.
