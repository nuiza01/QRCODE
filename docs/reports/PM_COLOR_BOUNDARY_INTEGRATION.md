# PM integration — SEC-002 color boundary

2026-08-28, Asia/Bangkok. **Six reviewed files integrated; combined source checks PASS.** Browser/export/network/scanner verification remains pending. This is not privacy signoff or a logo-policy change.

## Review and identity

- Original baseline: `NQR-P1-6982907ed8d9c48124f2`. RENDER's starting point includes the approved Unicode and gradient carry-forward.
- RENDER report: `/Users/sarawutjuntasang/.codex/worktrees/fc7f/QRCODE/docs/reports/RENDER_SECURITY_BOUNDARY.md`, SHA-256 `a57b6332fc68ec2a5b3ec709adb37a039935958aaf23cea3329a3247905a52f8`.
- TL independent report: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/COLOR_BOUNDARY_REVIEW.md`, SHA-256 `3707d96f170cc883722753ec9e78a2b13cc02ad8844e20e1dc2cd4f0b7aac53b`.
- `TEAM_REPORT | NQR-021 | TL | iteration-1 | DONE` verified against completed/idle task and completed callback tool, cursor `0bdab04d-d9db-415d-b0e5-beb568c2954f:20`.
- TL PASS is scoped code/unit review: actual 170 focused tests plus in-memory probes for all 4,096 shorthand colors, invalid scalar/async paths, mutation across await, Unicode/result.data and synthetic PDF cleanup. It is not native browser or network evidence.
- PM read the complete TL report, implementation diff and new colors helper, then recomputed frozen six-file digest `bd1a5b3f6f0ed78afa9540d6e4019340527c25df4892a72b9840f952c9c1bc9f`: SHA-256(JSON.stringify(path-sorted objects with keys after,before,path; before=null for new files)). Read installed Next use-client guidance before application.

## Applied delta

Source preimages, new-file absence, candidate hashes, report identity and package guards were checked immediately before generating/applying an exact apply_patch. Approved quality and Unicode carry-forward matched source and were not recopied. All six source hashes matched the candidate immediately after application, before releasing RENDER for separate filename work.

| File | Preimage SHA-256 | Integrated SHA-256 |
|---|---|---|
| src/qr/render/colors.ts | absent | `b9c08e11a015ba4fc6ee9defeb2ccde580dcef2a30a00530500c6cac01d1c546` |
| src/qr/render/engine.ts | `60c1baf9827e277efd9dc92b467f9162c6f666b5132f87e021c14960ab9abf74` | `9616cce76567c459102d66f10d9083d6293a46c0e4502808c4e76a523bf39daa` |
| src/qr/render/export.ts | `494f24cf47654c28a9d1c69a3e8d9344174511015ba06f22ee587766435cd403` | `5daf992490be2cd99de6ccc9b00a66372e5ec150d5f633e895af36973b95efda` |
| src/qr/render/options.test.ts | `e035d0284efdd7b17f92b6d54603d6020cbc83e5db7617eafd20d3d0f8d68955` | `000751da7b5cff4a1976afc5fe0f80ca22269f31fadf0aebbaabbc698e7e308f` |
| src/qr/render/options.ts | `fe7b43d25298d5867241df4cf15cabc6b7dc718b796ac8fe725617e7d0a625b8` | `edda603c3b0841db5acf31c27ca8c5cc8a303af4e4e54146d5cbe5f5d3d85591` |
| src/qr/render/security-boundary.test.tsx | absent | `1ca66101b150f855d0f7f623591e688e72a2f2f07c53bce33d15a82ef6a4b419` |

No package/lock, domain/quality, FORMS or worker scaffold files were copied. Existing integrated package.json guard `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1` and lock guard `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72` were preserved.

## Behavior and limitations

Only opaque #RGB/#RRGGBB paints are admitted and copied to canonical lowercase six-digit colors for foreground, background and both gradient stops, including inactive foreground fallback. Invalid paint is rejected before vendor constructor/update and before export resource/conversion/download sinks; errors do not echo input. Unicode payload/result.data, scan-quality policy, ECC/margin behavior and output signatures remain intact.

The preview can still load the vendor module on mount; that is not paint consumption and is not a zero-network guarantee. Existing safe drawing can remain under the error overlay after an invalid update. The guard does not sanitize logoUrl or close SVG logo resource paths. SEC-001/003 implementation remains unassigned pending the user's SVG policy decision. Unit doubles and synthetic DOM do not certify real exports or scanner compatibility.

## Actual integrated checks

All commands used explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE`.

| Command | Actual result |
|---|---|
| `npm test` | Exit 0: **514 application tests / 13 files + 119 script tests PASS**, started 18:17:44 |
| `npm run typecheck` | Exit 0: Next typegen and TypeScript PASS |
| `npm run lint` | Exit 0: PASS |
| Six post-apply hashes | PASS |

This source includes reviewed gradient, Unicode, DevOps, FORMS validation/locale, SEO redaction and SEC-002. Filename/footer follow-ups are not integrated yet. No fresh build/browser/actual download/network/physical scan was performed; known permission restrictions remain and no workaround was attempted. No commit/push/deploy, new dependencies, secrets or database operations.
