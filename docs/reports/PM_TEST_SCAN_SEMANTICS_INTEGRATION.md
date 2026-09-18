# PM Test Scan dialog semantics integration — NQR-050 / NQR-051

Date: 2026-08-31 (Asia/Bangkok)

Result: **INTEGRATED / OFFLINE CHECKS PASS**. This integrates the independently reviewed Test Scan dialog accessibility repair into the authoritative assembled source. It is not the required real-browser/accessibility retest, logo-boundary approval, build, scanner/ECI, deployment or product acceptance.

## Frozen identity and guards

- Authoritative source before integration: 121 code/config/asset paths, digest `046153ef96d98e8fa71e062d33ea8c218a5f34483676b0054f1ad2611e2fdcd6`.
- FORMS NQR-050 report SHA-256: `d3b47f6aea7f60d27c0ac12146580cf7e494c78167d23f075c8c4d1f8b236072`.
- DS NQR-051 independent review SHA-256: `4ca7dfe3e8034213893176918c68d3ee9a08ebee543f8255a9d37c224061c3f7`.
- Reviewed two-file digest: `1c377ff0736211153314a8dcc6ba4db15da975b3bb90b9f8a772b9e24b3619bb`.
- Source production preimage `TestScanDialog.tsx`: `40f2a319d4f76bdd0ab9d44bf3f51a2aef2fd4038bccb7e7e0aebe51b35043f9`; focused test path absent.
- Source package/lock remained `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` / `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.

PM read the installed Next.js 16.3.1 Client Component, Vitest and accessibility guides before editing. Immediately before apply, PM verified both reports, source preimage/new-path absence, both candidate hashes, package guards and the frozen renderer boundary.

## Guarded integration

PM used `apply_patch` and applied only the exact independently reviewed two-file delta:

| Path | Integrated SHA-256 |
|---|---|
| `src/components/generator/TestScanDialog.tsx` | `877194ca8e6c1fcc2f3464edbd1a584951880073a1e6ae4af1bc5286fb193a14` |
| `src/components/generator/TestScanDialog.test.tsx` | `64fccb41ebf6399561dbad9aa10ba0961bc8ded5e2eeec737a0c164fddd56d55` |

Both source files are byte-identical to the frozen FORMS candidate. No Generator, TestScanCard, shared dialog, renderer, package or logo file was copied or edited.

Post-integration inventory: 122 code/config/asset paths using `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`, digest `36213632ee89d2e41c32299103114cfff77e2b8bc43ee4bcf29d395f433373bf`.

## Source verification

- Focused `TestScanDialog` + existing `Generator` Vitest: **238/238 PASS**, 2 files.
- Exact `npm test`: **827/827 application tests**, 19 files, plus **119/119 script tests PASS**.
- `npm run typecheck`: **PASS** (`next typegen` and `tsc --noEmit`).
- `npm run lint`: **PASS**.
- `git diff --check`: **PASS**.
- Candidate byte identity and package guards after apply: **PASS**.

One preliminary focused command incorrectly passed file arguments through the composite `npm test` script. Vitest itself ran the complete application suite and passed 827/827, but npm forwarded the file arguments to the subsequent Node script-test command, which cannot load `.tsx`, so that command exited 1. This was a command-shape error, not a code/test regression. PM reran the focused tests with `npm exec -- vitest run ...` and the exact composite `npm test` without arguments; both passed as recorded above.

## Remaining scope

QA must rerun the real-browser Thai/English dialog tree and keyboard paths on an assembled candidate containing this exact delta: one localized dialog title, one localized Close, initial focus, forward/backward trap, Escape/outside/body close and trigger focus restoration, plus responsive paint. NQR-045-A11Y-01 is not closed by jsdom evidence alone. RENDER NQR-046 iteration-2 remains isolated and must complete TL/SECURITY re-review before guarded integration and final combined QA/build.
