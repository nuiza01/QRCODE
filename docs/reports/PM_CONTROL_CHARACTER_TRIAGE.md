# PM triage — NQR-031 control-character findings

2026-08-28, Asia/Bangkok. **Two LOW code findings accepted for narrow worktree repairs; source unchanged.** Broader input policy and actual browser/scanner acceptance remain open.

## Evidence received and reproduced

- SECURITY report `/Users/sarawutjuntasang/.codex/worktrees/7b9b/QRCODE/docs/reports/CONTROL_CHARACTER_REVIEW.md`, SHA-256 `11b48a14dc573b2fd466f4d63e3f6d890b20cdb817177260289e34a6009ede3f` verified; full report and reproducible probe read.
- `TEAM_REPORT | NQR-031 | SECURITY | iteration-1 | DONE` verified completed/idle with completed callback tool at cursor `52194528-bbe9-4dc0-9edb-eae609edfe2e:8`.
- PM executed the report's inspected, hash-guarded Node stdin probe using a bounded child process at explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE`: 146 fixtures, 136 schema accepts, 132 validateDraft accepts, 536 options UTF-8 assertions; maximum field42/wire105 code units. Node24.14.1, TypeScript5.9.3, zod4.4.3. Exit0.
- An initial extraction-wrapper assertion stopped before executing the probe because its trailing blank line was not trimmed; corrected the in-memory extraction and reran. No file edits or partial result counted.
- CODE-633 117-file checkpoint and both installed vendor hashes remained unchanged before/after. No DOM/browser/network/render/export operation in this probe; options byte equality does not prove semantic interoperability.

## PM disposition and assignments

CTRL-001: shared vCard/Event text escaping handles LF/CRLF but leaves lone CR raw. Accept a narrow fix to treat CRLF as one logical newline and lone CR/LF as escaped newlines in text-valued properties. Keep backslash-first escaping, ordinary text/delimiters, structural separators, versions, dates and unrelated payloads unchanged. URI-valued vCard website must retain its current behavior in this delta; its broader URL policy is not silently decided through a shared helper.

NQR-032 assigned once to existing TL task after idle check. Own worktree `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE`; only `src/qr/payload/encode.ts`, `encode.test.ts` and own `docs/reports/STRUCTURED_NEWLINE_FIX.md`. Fresh own/source preimages matched:

- encode.ts `b41de960ab51e4a02c6fb02a1b16f22220e72eea360afa429bdc2c42a687a4e6`
- encode.test.ts `0daaf01e61c9af6bbd52063ee805f7391a37278d0a4962d8a2764324bbad783a`

CTRL-002: protected WiFi passwords are passed through generic trimmed optional text, so a visible credential such as space + SYNpass1 + space is encoded as a different password. Accept preserving exact raw nonblank password bytes. Keep the existing form rejection of empty/whitespace-only passwords, nopass omission, validation codes and schema maximum63. A raw overlength password fails explicitly rather than being trimmed to fit. Do not harmonize the direct schema's whitespace-only acceptance or introduce blanket control rejection in this fix. Other optional text fields retain their behavior.

NQR-033 assigned once to existing FORMS task after idle check. Own worktree `/Users/sarawutjuntasang/.codex/worktrees/e551/QRCODE`; only `src/components/generator/payload.ts`, `Generator.test.tsx` (a focused colocated test only if needed) and own `docs/reports/WIFI_PASSWORD_PRESERVATION.md`. Fresh own/source preimages matched:

- payload.ts `de72b8416967afe63701656ab77660aa43c23b96b3501f1d972c897e38699e7c`
- Generator.test.tsx `a5aa9f627e7bd0df394c8cfa53d1faddaf409f4c06343d84fe0e5abb75163f28`

Both assignments require red regression, exact new-delta hashes, existing-dependency verification, independent review before PM integration and one terminal callback. No source edits/hydration/install, build/browser workaround, dependency or logo-policy changes. TL cannot approve its own implementation as final QA. QA's source freeze was preserved during dispatch; both repairs are isolated worktree changes, not completed source fixes.

## Remaining decisions and limits

URL parser-versus-wire literal controls are a policy gap, not demonstrated scheme bypass. Wider NUL/DEL/phone/subject/credential-control acceptance remains unresolved; no blanket normalization/rejection or risk waiver. Actual native input normalization, WiFi association and vCard/calendar/scanner import behavior are untested. SVG-logo and vendor logging findings remain open. No new task/agent/automation, commit/push/deploy, secret or database access.
