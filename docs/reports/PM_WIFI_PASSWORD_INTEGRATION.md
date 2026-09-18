# PM WiFi password preservation integration — NQR-033 / NQR-036

วันที่: 2026-08-30 (Asia/Bangkok)

ผล: **INTEGRATED / OFFLINE CHECKS PASS** เฉพาะ reviewed CTRL-002 form-adapter delta; ไม่ใช่ browser, native input, QR artifact, scanner, WiFi access-point, security หรือ release signoff

## Identity and guards

- Source state before this integration: reviewed NQR-032 already integrated over `NQR-P1-CODE-633-e353d3128d7f`
- Provisional pre-integration 117-file digest: `87b71fc25ceaa584d5c4c3161f08db113c7a8b7a5126d03bf50d8f8d45d0c45c`
- FORMS report SHA-256: `39fd2a77cafe4b45e6f3a7c7a6168d770b39c0f6e60c9d44b32d9b282df0cc07`
- TL independent review SHA-256: `04477be80fa1ac4f44166c883e6e67baab05666f317524b7dd30278f8938405d`
- Reviewed two-file digest: `cc84d06ca7497966e22a77ad08002f24040880f69914e6415354cb6fbb1e95ec`
- Current source NQR-033 preimages, frozen candidate hashes, package/lock pairs and unrelated NQR-032 hashes matched before apply.

## Guarded integration

PM applied only the reviewed byte-equivalent changes with `apply_patch`; no FORMS worktree or package lineage was copied.

| Path | Before | Integrated |
|---|---|---|
| `src/components/generator/payload.ts` | `de72b8416967afe63701656ab77660aa43c23b96b3501f1d972c897e38699e7c` | `eb29e7c64c3b36e8d3c4ec95f7d4efd9d6b51f87dac6edff55e9415c062d8db5` |
| `src/components/generator/Generator.test.tsx` | `a5aa9f627e7bd0df394c8cfa53d1faddaf409f4c06343d84fe0e5abb75163f28` | `47160c06dd579d8a3d27c1633a90769abf4a48cb475d0171ff67cd855224d70a` |

Both integrated files are byte-identical to the independently reviewed frozen FORMS candidate. NQR-032 remains byte-identical to its reviewed integrated state.

The post-integration 117-file inventory differs from CODE-633 only at the two NQR-032 and two NQR-033 paths and has provisional digest `20269b7fafaa5ca348d99161c34b13848463ee8bbe515627aeaf600bc62da263`. Vendor hashes remain `429de523…` / `4ede48d4…`. A combined named checkpoint is deferred until remaining frozen review work is resolved.

## Source verification

- Focused Generator WiFi preservation: **74 PASS / 146 skipped**
- Exact `npm test`: **741/741 application tests / 15 files + 119/119 script tests PASS**
- `npm run typecheck`: **PASS** (`next typegen` + `tsc --noEmit`)
- `npm run lint`: **PASS**

## Remaining scope

- The production change preserves every schema-accepted nonblank WPA/WEP password exactly, uses trim only for blank detection, keeps `nopass` omission and raw 63/64 length behavior.
- Native single-line input normalization, actual QR/download bytes, scanners and real WiFi association remain untested under the runtime permission gate.
- This report does not broaden credential/control policy or approve NQR-034 capacity/render work.

