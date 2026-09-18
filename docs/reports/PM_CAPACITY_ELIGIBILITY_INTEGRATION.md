# PM capacity eligibility and recovery integration — NQR-041 / NQR-042

Date: 2026-08-30 (Asia/Bangkok)

Result: **INTEGRATED / OFFLINE CHECKS PASS**. This integrates the reviewed Generator-owned capacity eligibility and recovery UI into the authoritative assembled source. It is not browser, saved-artifact, scanner/ECI, assistive-technology, logo-policy, privacy/security, final QA or release signoff.

## Frozen identity and guards

- Authoritative source before integration: 121 files, digest `b9a5f26c0ee3275fa4d1251afa3e195c24442f09635c59450d97dd6d8c35645a`.
- FORMS iteration-3 report SHA-256: `f2d9737ae13e788b279c2d2921998adae04ce8cd99d9c4c2727e09efe8a3bc81`.
- TL independent review SHA-256: `9f357c2f7d825329961659911b03fa73aeccd92ed4a157ec8fdeea0619300913`.
- Reviewed four-file digest: `e356f1f40f37310001a37f7ef8f353bef2eefdb0c19127caab0e5a8130f70147`.
- Before apply, PM freshly verified all four source preimages/candidate hashes, both reports and source package/lock hashes. PM also read the installed Next.js `use client` and Vitest guidance before editing.

## Guarded integration

PM used `apply_patch` and applied only the exact independently reviewed four-file delta:

| Path | Integrated SHA-256 |
|---|---|
| `src/components/generator/Generator.tsx` | `dc2354770f09aad0e2e1c43ae6c920a837f8670b7f25349ae356caca68953c55` |
| `src/components/generator/DownloadBar.tsx` | `80de151df407b171a9246a8a76282c0478c5bcb5c9b3224be6e03acb3ab96a78` |
| `src/components/generator/strings.ts` | `a77bbaa3a1f2a31fef3516e8b749022fab9a683b8ebddb505e1974824cdb548a` |
| `src/components/generator/Generator.test.tsx` | `95a8ce11441d60a1a3bbdc6b71111cf712741b49a6238765f83882ef93e59c92` |

Every integrated file is byte-identical to the frozen candidate. The nine renderer preparation dependencies remained authoritative source bytes and were not copied or edited. Source package/lock remained `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` / `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.

Post-integration inventory: 121 code/config/asset files using `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`, digest `046153ef96d98e8fa71e062d33ea8c218a5f34483676b0054f1ad2611e2fdcd6`.

## Source verification

- Focused Generator + renderer options Vitest: **290/290 PASS**, 2 files.
- Exact `npm test`: **824/824 application tests**, 18 files, plus **119/119 script tests PASS**.
- `npm run typecheck`: **PASS** (`next typegen` and `tsc --noEmit`).
- `npm run lint`: **PASS**.
- `git diff --check`: **PASS**.
- Post-apply candidate, renderer and package hash guards: **PASS**.

The composite `npm test -- --reporter=dot` passed. npm emitted a non-failing warning that the extra `--reporter` option was forwarded to the script-test command; test counts and exit status were unaffected.

The first read-only inventory command accidentally used zsh's reserved `path` variable in a loop, which removed `shasum` from that subprocess PATH and produced an invalid empty digest. It wrote no file and was discarded. The corrected command used a task-specific variable, confirmed 121 paths and produced the digest recorded above.

## Remaining scope

Independent QA must verify this exact assembled source/digest, including current/stale/pending capacity recovery, all output formats and preserved earlier hardening. Browser/localhost paint, actual PNG/SVG/PDF downloads and decode, scanners/ECI, assistive technology, network/logo behavior and production build remain pending under existing environment and product-policy constraints. No commit, push, deploy or production change occurred.
