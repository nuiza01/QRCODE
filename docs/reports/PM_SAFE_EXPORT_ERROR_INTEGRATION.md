# PM integration — NQR-027 safe export errors

2026-08-28, Asia/Bangkok. **Three reviewed files integrated; combined source checks PASS.** This closes the application raw-export-error display path at code/unit level, not the whole SEC-004 finding or privacy/browser acceptance.

## Review and identity

- Original baseline `NQR-P1-6982907ed8d9c48124f2` plus previously integrated NQR-014/NQR-023 FORMS bytes.
- Worker `/Users/sarawutjuntasang/.codex/worktrees/e551/QRCODE/docs/reports/FORMS_SAFE_EXPORT_ERRORS.md`, SHA-256 `3226d69ac5eab80cf8f48516a3537701f7431bbfb8635f4f920e2cb581d583b6`.
- Independent TL `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/SAFE_EXPORT_ERROR_REVIEW.md`, SHA-256 `3f7aaec19b631845592ea6490b3c0a8ac1396b0b621ec18607e8da0fc94d68f2`.
- Callback `TEAM_REPORT | NQR-029 | TL | iteration-1 | DONE`; completed/idle with callback tool completed at cursor `0bdab04d-d9db-415d-b0e5-beb568c2954f:27`.
- TL scoped PASS: independently ran 146 Generator tests, nonincremental tsc, and six actual React StrictMode cases with inert render IO (three formats × two locale directions). Proxy inspections zero, formatter zero-argument, pending/current alert relocalization, stale rejection/unmount suppression and retry confirmed. PM read the full report and reproducible appendix; these probes are TL evidence, not PM reruns.

PM inspected the exact minimal diff and relevant installed Next client/Vitest guides. DownloadBar now stores only a boolean failure and uses binding-free catch; it does not inspect, stringify or retain the thrown value. The one production formatter call uses fixed useful th/en copy, with the narrow local `GeneratorStrings.download.failed` contract changed to `() => string`. Existing render/save/naming/revision/finally behavior is preserved. No renderer/domain/shared i18n change.

## Guarded integration

Both report hashes, three source preimages, three candidate hashes, compact JSON delta and source package guards matched before apply_patch. Delta `35f216805c06cb5da43d2bcc4cc8904bbb2c36a5cd6a12ec5c60c003856c8fa1` is SHA-256 of path-sorted compact JSON objects with keys `after,before,path`.

| File | Source preimage SHA-256 | Integrated SHA-256 |
|---|---|---|
| src/components/generator/DownloadBar.tsx | `63d624935ec8b3ce817fa78205cc63bb4f3cfcc1af620b574dc2940b4c0fc3b4` | `598a46dcaa6b49571c993df99be0660559c1f834c8a9c1a492d2da61a77bbb70` |
| src/components/generator/Generator.test.tsx | `0fc5665936d0877f68f4bcc24646e398cd4b6f65dda7060e71921d7822bb3155` | `a5aa9f627e7bd0df394c8cfa53d1faddaf409f4c06343d84fe0e5abb75163f28` |
| src/components/generator/strings.ts | `cb3260654100c54bb2b8860dd36103753b407634f3024f13ca4a4fc90b1e7c3c` | `c8cdbfcbcf3d93f322791436d48f4cfaf7831a461896a6f9e6b6f5ccd14a6273` |

Post-apply hashes matched; package/lock and recently integrated renderer export/filename guards were preserved. No other worktree files copied. Root package hashes remain `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` / `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.

## Actual combined source checks

All commands used explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE`, existing dependencies.

- `npm test`: exit 0, **633 application tests / 15 files + 119 script tests PASS**, start 18:44:41, application duration 6.46 seconds.
- `npm run typecheck`: exit 0, Next typegen and TypeScript PASS.
- `npm run lint`: exit 0, PASS.
- Post-apply candidate/package/API naming hash guards: PASS.

This includes the reviewed UI and convenience filename changes together with safe errors and all earlier integrations. No production build, browser, actual download, network, camera or screen-reader verification was attempted. Console checks exercise application paths with stubbed IO, not real vendor logging. SEC-001/003 SVG-logo handling and associated vendor logging remain OPEN; the user has not approved a logo policy. No install, new dependencies, secret access, DB operation, commit/push/deploy or permission workaround.

## Frozen follow-up checkpoint

`docs/reports/P1_CODE_CHECKPOINT_633.json` records the assembled code as `NQR-P1-CODE-633-e353d3128d7f`, digest `e353d3128d7f50c2a58798dc62dbbde81a28df0504288aca24bb2e276c060e51` over 117 code/config/asset files; installed vendor bundle/map hashes are separate. It excludes secret environment files, docs, generated caches/types and most node_modules. It is not a replacement baseline, dependency snapshot, successful build or release signoff.

After idle verification, PM dispatched existing QA task NQR-030 for bounded UTF-8 capacity/overflow/recovery code/component coverage and existing SECURITY task NQR-031 for the previously reported control-character serialization gap. Both use this same frozen source and write only their own reports. No source code changes during these reviews; coordination documents may advance. These are pending results, not completed QA. Browser/real scanner coverage remains blocked and is not replaced by the offline checks.
