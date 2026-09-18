# PM integration — reviewed DevOps hardening

Date: 2026-08-28, Asia/Bangkok. Status: **Integrated and local code checks PASS; fresh build, browser, remote CI and launch acceptance remain pending.**

## Review evidence

- DEVOPS implementation: `/Users/sarawutjuntasang/.codex/worktrees/e81b/QRCODE/docs/reports/DEVOPS_HARDENING.md`.
- TL independent code/artifact review: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/TL_REVIEW_AND_GRADIENT.md`, part A, PASS; 119 script tests and 22 existing output-page checks.
- BACKEND independent drift review: `/Users/sarawutjuntasang/.codex/worktrees/c715/QRCODE/docs/reports/BACKEND_DRIFT_REVIEW.md`, NQR-016, PASS within initial-migration consistency scope; 15 focused and 66 independent checks. PM received the callback, confirmed completion and read the review before integration.
- Baseline `NQR-P1-6982907ed8d9c48124f2`; reviewed DevOps delta `edfa6e2968e10c10a2d867105680b821cb4a08f3e1f962237076ac68d06b1d2f`.

## Integrity and scope

PM read the installed Next environment-variable/config-phase guides and inspected the build entrypoints, package scripts, origin gate, CI and drift checker. A pre-apply guard recomputed the 13-file candidate digest, required all six modified source preimages to match the immutable snapshot, and required all seven new script paths to be absent. It also compared the complete package and lockfile structures: only package scripts/engines and lock root engines differ; dependency graph, versions and integrity fields are unchanged.

Applied only the 13 reviewed files with `apply_patch`:

- Modified `.env.example`, `.github/workflows/ci.yml`, `README.md`, `next.config.ts`, `package.json`, `package-lock.json`.
- Added `scripts/origin-gate.mjs`, `build.mjs`, `verify-origin-artifacts.mjs`, `check-migration-drift.mjs` and the three reviewed `*.test.mjs` files.

Post-apply source digest matched the reviewed DevOps delta exactly. Existing gradient/Unicode changes were preserved. No dependency installation, schema/migration change, real environment-file read/write, database connection, git commit/push, deployment or remote workflow execution occurred.

## Actual source verification

Commands from `/Users/sarawutjuntasang/Nexora/QRCODE`, after integration at 17:58 Bangkok:

| Check | Result |
|---|---|
| `npm test` | Exit 0: 382 application tests / 12 files, then 119 script tests; zero failures |
| `npm run typecheck` | Exit 0: Next route type generation + tsc |
| `npm run lint` | Exit 0 |
| `npm run check:drift` | Exit 0: 7 tables / 28 statements, offline; no SQL execution |
| Post-apply 13-file digest | Matches reviewed candidate |

Script tests include synthetic config-loader/CLI admission and mutation fixtures, not a fresh production build. Their temporary fixture cleanup is part of the reviewed tests; no project source was removed.

## Limits and remaining gates

The source now combines gradient, Unicode and DevOps patches, but FORMS/security follow-ups are not yet integrated. Earlier build/server artifacts are stale for this source. A fresh assembled-candidate build and output verification must run through normal permissions; no build/browser workaround was attempted here.

The drift check validates consistency of the single initial generated migration. It does not pin immutable migration history or prove PostgreSQL execution/live DB state; coherent rewrites can pass, so source preimage/review controls remain necessary. Production origin configuration does not prove domain ownership, DNS/TLS or launch approval. Security findings SEC-001/002 and real export/network/scanner verification remain open.
