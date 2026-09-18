# PM integration — reviewed Unicode rendering fix

Date: 2026-08-28, Asia/Bangkok.

Status: **Integrated, unit checks PASS; QA-001 remains pending integrated browser/export/scanner verification.**

## Evidence accepted

- RENDER implementation report: `/Users/sarawutjuntasang/.codex/worktrees/fc7f/QRCODE/docs/reports/RENDER_UNICODE_FIX.md`.
- Independent TL review: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/RENDER_INDEPENDENT_REVIEW.md`, NQR-015 iteration-1, PASS for code review only. TL independently ran 70 renderer tests and additional vendor/reader/capacity probes; no browser/build claim.
- PM received the terminal callback, read the full review and confirmed the completed/idle worker and completed callback tool before dispatching NQR-017 (FORMS review).
- Baseline: `NQR-P1-6982907ed8d9c48124f2`. Reviewed RENDER delta: `bcbe798cb60cfbdafa529b442ffdbca5c7a83814bc598c7d8fe9c19b6e384039`.

## Integration and verification

PM read the local Next lazy-loading guide and rechecked exact current source preimages plus all candidate hashes before applying only these three files with `apply_patch`. Existing gradient integration was retained. No package, dependency, vendor, route or unrelated user file was changed.

| File | Required source preimage | Integrated SHA-256 |
|---|---|---|
| `src/qr/render/options.ts` | `7f16d1a7a648c618e3be9615149d340940bc5edecfe065ccd13a507b71717687` | `fe7b43d25298d5867241df4cf15cabc6b7dc718b796ac8fe725617e7d0a625b8` |
| `src/qr/render/options.test.ts` | `c9b9be8e1f56b7197e4a3971fef77b89bd5de8d1eb496814d8b376084f2d000e` | `e035d0284efdd7b17f92b6d54603d6020cbc83e5db7617eafd20d3d0f8d68955` |
| `src/qr/render/unicode.test.tsx` | Absent, checked before adding | `335345df666ded884c4bb0c4f32d9693d8fb77069994ae06e6e0450d0db1ee64` |

Actual commands from `/Users/sarawutjuntasang/Nexora/QRCODE` after integration:

- `npm test`: exit 0, **382/382 tests, 12 files**, 17:53:21 Bangkok. This covers the combined gradient + Unicode source state, not FORMS or DEVOPS candidates.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0.
- Post-apply SHA-256 checks matched all three reviewed candidate files.

## Still pending

The adapter fixes the actual vendor's single-byte truncation by passing UTF-8 bytes only at the styling boundary; public payload/result strings remain unchanged. It does not add ECI, guarantee every scanner's charset interpretation, or preserve ill-formed lone UTF-16 surrogates (TextEncoder substitutes U+FFFD). UTF-8 can exceed capacity sooner; overflow/recovery, logo/ECC, actual PNG/SVG/PDF artifacts and independent decode remain QA requirements.

Existing build/server artifacts still represent the earlier baseline and must not be used as evidence for the integrated source. No fresh build/browser/export/network audit was run in this integration step. The known build runtime and browser security restrictions remain unresolved. FORMS review, BACKEND drift review and SECURITY review continue; no commit/push/deploy or final acceptance occurred.
