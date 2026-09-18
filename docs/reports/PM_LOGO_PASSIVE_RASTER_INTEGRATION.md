# PM passive-logo raster boundary integration — NQR-046 / NQR-055 / NQR-056

Date: 2026-08-31 (Asia/Bangkok)

Result: **INTEGRATED / OFFLINE CHECKS PASS**. This integrates the exact TL- and SECURITY-reviewed passive SVG/local logo-raster boundary into the authoritative assembled source. It is not the pending browser/network/artifact/resource/annotation/cancellation QA, production build, scanner/ECI, deployment or product acceptance.

## Frozen identity and guards

- Authoritative source before integration: 122 code/config/asset paths, digest `36213632ee89d2e41c32299103114cfff77e2b8bc43ee4bcf29d395f433373bf`.
- RENDER iteration-3 report SHA-256: `27b2e93f620ed8ab42ae200d74eccc552e36e43706b01404f524173f83b17ed8`.
- TL NQR-055 review SHA-256: `2f5f247c5f53fd0ff02bd25d35c47889e03bb82e5c73305f776dddeab1b8b318` — SCOPED PASS.
- SECURITY NQR-056 review SHA-256: `585df1f01fcdc1f116cec57fc7e23740ba7908c7400ee5689bd8c09fcabbb4ea` — SCOPED PASS.
- Complete reviewed 10-file digest: `66d68c3419698255e5b1a11f8589d1b2b8c7fc749a5f1337178e702d991fdeca`.
- Narrow iteration-3 three-file digest: `8695e5e54ccba4f56c88e908bfeed129787425c42c270aa33ce97ecb59ce8e6e`.
- Source package/lock: `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` / `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.

Immediately before integration PM independently recomputed the candidate digest, all ten candidate hashes, seven source preimages, three source new-path absences, current source digest and package/Test Scan guards. Every value matched the frozen reviews.

## Guarded integration

PM used `apply_patch` to apply only the exact reviewed ten-file candidate:

| Path | Integrated SHA-256 |
|---|---|
| `src/qr/render/QrPreview.tsx` | `d5e9175e1008c81ee71aaea8c6c6b63478cbc0634c88de7003a0df086270e980` |
| `src/qr/render/engine.ts` | `a80581ded961e98496caba1b2ce9ed2f1e183f7d2dbf86ccace751b655f219d0` |
| `src/qr/render/export.ts` | `28c124280ce18cace0000904c784da61f6886499f1a9793c3696d16fdcc5da69` |
| `src/qr/render/index.ts` | `6f238ea5b9ba94bfc9aa5afc5c272f4097946d29c988259cc4aed94f51bc2ccd` |
| `src/qr/render/logo-entrypoints.test.tsx` | `4a78f40bc580908ab3542670128cf2fd17f6e47f80dc89f9ef78e4edf3dbf583` |
| `src/qr/render/logo-security.test.tsx` | `141448cd5287e5dc7625d179fe0a4972a95abbd23b927e621675a0acd208cb60` |
| `src/qr/render/logo.ts` | `2669ceed8bbf90bb9ad283a57a2ea497cd3e566736c068ad766b2a0b9e101509` |
| `src/qr/render/options.test.ts` | `20bbfb9fe683e1475f20f5cfab872c4773bc76bfeeda085cd7c41ffb06a8d0a1` |
| `src/qr/render/options.ts` | `2d6aa8fd89c00ae705f3735b4c109aa13df5e862d61ee0a8c449e872c0a6c040` |
| `src/qr/render/preview-status.test.tsx` | `29870092de88ed7008df4f2551d969fe82ba027993715eaa3634d7ff0b323b7c` |

All ten files are byte-identical to the reviewed RENDER candidate. Test Scan integration and package bytes remained exact. No whole worktree, dependency, generated cache or report was copied.

The first generated patch attempt used standard unified-diff hunk line numbers, which the workspace `apply_patch` parser does not accept; verification failed before any edit. PM converted only the hunk headers to the supported form and reapplied the same exact content. Post-apply byte comparisons passed for all ten files.

Post-integration inventory: 125 code/config/asset paths using `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`, digest `bbc142d769336abab45e649595d22780fbbc2ace59264693b4896ec823a55237`.

## Source verification

- Focused renderer Vitest: **301/301 PASS**, 12 files.
- Exact `npm test`: **879/879 application tests**, 21 files, plus **119/119 script tests PASS**.
- `npm run typecheck`: **PASS** (`next typegen` and `tsc --noEmit`).
- `npm run lint`: **PASS**.
- `git diff --check`: **PASS**.
- Post-apply ten-file byte identity, Test Scan and package guards: **PASS**.

## Integrated boundary

The source now implements strict passive SVG element/attribute/value admission and sanitized local serialization, local rasterization of the logo only, vector QR artwork, fixed private failures, bounded non-cooperative timeout/caller cancellation, byte-anchored PNG structure/CRC/IHDR validation, separate source 2048/4MP and prepared 1024/1MP limits, post-await PNG/SVG/PDF cancellation and no-save checks, latest-wins cleanup and vendor/PDF final gates. These are reviewed code/unit claims; real browser and artifact closure remains separate.

## Remaining scope

Independent QA must verify this exact 125-path digest in a fresh browser/runtime: representative PNG/JPEG/GIF/WebP/passive SVG logos, zero external request, actual preview and PNG/SVG/PDF exports, vector QR plus local PNG logo only, no original SVG/resource/link/PDF annotation, prepared dimension/decode/malformed recovery, timeout/caller abort/latest-wins/download cancellation and cleanup. DEVOPS must then run a fresh release build/origin/artifact/bundle gate on the same final digest. Physical scanner/ECI, real three-bank PromptPay UAT and production deployment/domain remain separately owned gates.
