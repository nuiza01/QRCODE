# PM integration — NQR-025 convenience filename privacy

2026-08-28, Asia/Bangkok. **Four reviewed files integrated; combined source checks PASS.** UI and convenience API defaults are now generic. SEC-005 actual download/privacy acceptance remains pending.

## Identity and independent review

- Baseline `NQR-P1-6982907ed8d9c48124f2` plus approved Unicode/gradient/SEC-002; this is the new four-file naming delta, not a replacement of the worker's whole tree.
- RENDER candidate `/Users/sarawutjuntasang/.codex/worktrees/fc7f/QRCODE`; report `docs/reports/RENDER_FILENAME_PRIVACY.md` SHA-256 `66d248ad1e25d2015ced4f811c563ff61d43079b23154b4a1747be7643a05879`.
- TL report `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/RENDER_FILENAME_REVIEW.md`, SHA-256 `9826d06969e44866510cb02dc47551f72a43cb3cddfe4f95f4ee44230a6a5e6b`.
- Callback `TEAM_REPORT | NQR-028 | TL | iteration-1 | DONE`; completed/idle and completed callback tool verified at cursor `0bdab04d-d9db-415d-b0e5-beb568c2954f:25`.
- TL scoped PASS: 109 focused tests in four files plus independent in-memory probes (zero payload-field reads and arity 1; 12,480 sanitizer differential cases, 20 meaningful/10 empty fixtures, 2,100 variant comparisons, 1,000 empty-label generic checks). These are TL results, not PM reruns of the independent probes or browser evidence.

PM read the full independent report including probes, inspected the exact application/test patch and relevant installed Next client/lazy-loading guides. Retained `defaultLabelFor` returns undefined without reading payload fields; default naming no longer uses it to recover a label. Explicit caller labels remain sanitized. Shared sanitizer additionally omits fragments without a Unicode letter/number after its existing normalization/truncation; meaningful Thai/Latin/NFC/digit labels remain compatible. Nontext-only custom variants are also omitted; current application size/mm variants remain unchanged. No new rename UI or storage.

## Guarded integration

Immediately before apply_patch, PM verified both report hashes, three source preimages, absent new test, four candidate hashes and current package guards. Digest `ded01a63ef9a912f7aaf2c8f1bd911a2d32afba472ee4a21c17943ffe4d3ff2f` recomputed from path-sorted `candidateSHA + "  " + path + "\n"` lines.

| File | Source preimage SHA-256 | Integrated SHA-256 |
|---|---|---|
| src/qr/render/export-filename.test.tsx | absent | `be047a7b69a2a9e5b96cac866baddeb73e8fca38d4cf866f1a229e8238c6eca8` |
| src/qr/render/export.ts | `5daf992490be2cd99de6ccc9b00a66372e5ec150d5f633e895af36973b95efda` | `018a302ac8195edb52b1e7e38ed9f8697b9ea0faad5d932530ee15a2817446a8` |
| src/qr/render/filename.test.ts | `d0039f14fe8355416d3bed9f92715ca90b68ba59af885e7bcbd90df698531b4e` | `6ae522b1771818686db755610dc4a1ac929bb30497a59d1b27c363c79cfc0da9` |
| src/qr/render/filename.ts | `453912c4fbf198058840b4e5f82abdcaeac67f722987a767d2703cf68e391f9a` | `5080c8c2cf20f1c643ae261b980cb7be29dba11b8e5d61d30fd1170f4242dd02` |

Post-apply source hashes matched all four reviewed files. Fifteen preserved guards passed for package/lock, current FORMS DownloadBar/test/strings, footer/test, quality/test, Unicode and non-export SEC-002 files. No carry-forward/scaffold/package files copied. Root package hashes remain `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` / `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.

## Actual combined source verification

Every command used explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE` with existing dependencies.

- `npm test`: exit 0, **588 application tests / 15 files + 119 script tests PASS**, start 18:40:19; application duration 7.51 seconds.
- `npm run typecheck`: exit 0, Next typegen and TypeScript PASS.
- `npm run lint`: exit 0, PASS.
- Post-apply four-file and preserved hash guards: PASS.

Combined source includes all previously reviewed repairs, UI filename/privacy and footer changes plus convenience API naming. FORMS safe export UI errors NQR-027 are not integrated; TL NQR-029 was dispatched once after idle verification, on separate frozen files. Its reviewer was informed that this PM renderer-only source activity is authorized.

New convenience tests exercise application APIs with inert vendor/PDF/download sinks (300 generic cases plus explicit-label/variant/data-flow/color cases). They do not validate downloaded PNG/SVG/PDF bytes, native save timing, OS collision suffixes, or browser network behavior. QR payload/result data and export body semantics are unchanged; generic filenames do not make QR contents or explicit caller labels confidential.

No new build/browser/network/scanner verification, install, dependencies, commit/push/deploy, secret access or DB operations. Existing build artifacts/server are stale. Final QA must use the assembled candidate once permissions are resolved. SEC-001/003 SVG-logo admission/recovery and associated vendor logging remain open awaiting user policy; no logo support change was implemented.
