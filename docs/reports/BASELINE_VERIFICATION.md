# Phase 1 inherited baseline — fresh preflight

Date: 2026-08-28. Performed by Project Manager in `/Users/sarawutjuntasang/Nexora/QRCODE`.

Baseline: `NQR-P1-6982907ed8d9c48124f2` (Tech Lead snapshot); original Git HEAD `fe6755b`. No application-code changes were made during this preflight. This is the inherited candidate, not final signoff after hardening.

| Command | Actual result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | exit 0; 337 tests in 11 files; Vitest 4.1.11; duration 1.90s |
| `npm run build` | final attempt exit 0; Next.js 16.3.1 / Turbopack; 27 pages generated |

The initial sandboxed build failed to fetch the three Google Fonts. An escalated retry encountered a cached Turbopack PostCSS worker error (local port binding denied). With no development server listening on port 3000, the generated `.next` directory was moved, not deleted, to `/private/tmp/nqr-build-cache.n098RV/next-cache`. A fresh escalated build passed. No application code or font policy was changed to make these checks pass.

The successful output includes `/th`, `/en`, twenty localized type pages, `robots.txt`, `sitemap.xml`, and the framework not-found output. This is not a claim of 27 user-facing content URLs; the content sitemap contract remains 22 URLs.

For QA, PM started `npm run start -- --hostname 127.0.0.1 --port 3000` from the successful source build. Local URL: `http://127.0.0.1:3000`. Session id: `57889` (operational metadata only, not a persistent availability guarantee). No public deployment took place.

Browser behavior, export files, accessibility, real scans and payload network behavior are not covered by these four command results. QA owns runtime evidence and must rerun relevant checks on the integrated candidate after repairs. Real Thai bank acceptance remains user-owned.
