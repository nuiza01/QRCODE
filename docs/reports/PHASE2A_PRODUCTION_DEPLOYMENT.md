# Phase 2A production deployment and rollback

Date: 2026-09-01 (Asia/Bangkok)  
Target: `https://nqr.orenvis.com` on HostAtom/Plesk  
Final production state: **ROLLED BACK — Phase 2A is not accepted for production**

## Outcome

The Product Owner explicitly authorized a Phase 2A build and deployment with a
recoverable rollback and post-deploy QA. The deployment was attempted, but the
authenticated session gate still failed after a successful Google OAuth
callback. The candidate was therefore removed from the active `.next` path and
the prior production build was restored immediately.

The public Static QR application is healthy after rollback. Phase 2A saved-QR
features, authenticated dashboard behavior and the 25-record quota are **not**
claimed as live or production-verified.

No DNS, TLS, database schema/data, MariaDB grants, OAuth client configuration,
or production secrets were changed during this attempt.

## Candidate identity and pre-deploy evidence

The bounded experiment wrapped only Better Auth's `session -> user` lookup in
two explicit MariaDB-portable reads. It retained the fail-closed behavior and
`advanced.database.joins: false`.

- Candidate BUILD_ID: `aFVpsqom-nIep7puSZKEk`
- Scoped `.next` ZIP, excluding build cache:
  `/private/tmp/nqr-phase2a-next-scoped-aFVpsqom-nIep7puSZKEk.zip`
- Scoped ZIP SHA-256:
  `f747cce7a6991c6064277471290d1caffb72d2bd90fd3a2850f47d088c994309`
- Scoped artifact inventory: 569 files
- Source-parity ZIP SHA-256:
  `0e6258288a0e0946814401d61312a04f9f28aed0960ebcb7d1ef56eba087b5b7`
- Candidate source hashes:
  - `src/lib/auth.ts`: `8757f71fed920f965a180c043ea944c07935ce4960dc1eff80766dffc124fef2`
  - `src/lib/auth-runtime.test.ts`: `c6ae0cc5411e9ddf6cf0dac9b1ddcb04608d9b408921230d69301e69ec60eb6b`

Fresh verification before deployment:

- application tests: **973/973 PASS** across 39 files;
- release/script tests: **119/119 PASS**;
- typecheck: PASS;
- lint: PASS;
- `git diff --check`: PASS;
- explicit-origin production build: PASS;
- origin artifact verifier: PASS for 22 HTML pages plus sitemap, hreflang,
  canonical, Open Graph and robots outputs.

The first uploaded archive accidentally included the disposable Turbopack
cache. It was never extracted or activated. It remains in Plesk as
`nqr-phase2a-next-aFVpsqom-nIep7puSZKEk.zip` (about 107.9 MB) because deleting
cloud data requires a separate action-time confirmation. The activated archive
was the smaller scoped archive above.

## Deployment and post-deploy QA

Before activation, the prior `.next` directory was renamed to
`.next.rollback-before-session-wrapper-m1fxDjFEQxdLlI91m1Czx`. The scoped
candidate and its source-parity archive were extracted, BUILD_ID
`aFVpsqom-nIep7puSZKEk` was read back from Plesk, and the Node.js application
was restarted.

The real production browser then exercised `/th/dashboard` and a fresh Google
OAuth account-selection callback. The provider returned successfully to
`https://nqr.orenvis.com/th/dashboard`, but the application still rendered the
Google sign-in control and the fixed localized dashboard load-failure alert.
The saved-QR list was not exposed and no CRUD fixture was created.

Direct browser navigation to Better Auth's session endpoint was blocked by the
browser client and was not bypassed. Prior Plesk/phpMyAdmin diagnostics had
already shown one user, four non-orphan active sessions, expected user/session
DDL and successful direct reads; ordinary Plesk access logs showed authenticated
`GET /api/auth/get-session` responses returning HTTP 500 but did not expose a
server stack trace. The wrapper therefore lacked production evidence and was
not kept active despite its passing offline suite.

## Rollback and final verification

The failed candidate was renamed to
`.next.failed-session-wrapper-aFVpsqom-nIep7puSZKEk`. The rollback directory
was restored to `.next`, the application was restarted, and Plesk read back
active BUILD_ID `m1fxDjFEQxdLlI91m1Czx`.

The Thai public landing page then rendered its expected heading and title with
an empty browser error log. The experimental local wrapper was removed from
the source candidate. A source-parity rollback archive was also extracted in
Plesk:

- archive: `nqr-phase2a-session-wrapper-source-rollback-m1fxDjFEQxdLlI91m1Czx.zip`
- SHA-256:
  `e7e620f38913d8a36053cf8ed26998303df3a83ff81a67454206ae0f5a73e020`
- restored `src/lib/auth.ts` SHA-256:
  `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f`
- restored `src/lib/auth-runtime.test.ts` SHA-256:
  `364ba2ef011bc3cc6f5f539f8299dad95a51f4a2bd62d0fa48656c1d693c59b2`

The local `.next` directory still contains the failed candidate build for
forensic comparison; it must not be treated as matching the restored source or
as a deployable release artifact.

## Required next gate

The authorized one-shot diagnostic is complete; see
`docs/reports/PHASE2A_PRODUCTION_SESSION_DIAGNOSTIC.md`. It confirmed the
failure occurs at Better Auth `get-session`, but the captured outer exception
was only a generic `Error` with no non-secret database or adapter code, and the
Passenger browser retained no final item. The temporary wrapper was disabled,
the original 626-byte `server.js` was restored byte-for-byte, Node.js was
restarted, and rollback BUILD_ID `m1fxDjFEQxdLlI91m1Czx` remained active.

Do not attempt another production patch from this evidence alone. The bounded
adapter-level repair subsequently passed exact-byte TL/Security and QA review,
PM offline verification and a disposable MariaDB 10.11 source-runtime gate.
The later fresh immutable real-origin artifact was nevertheless rejected: its
universal initial browser bundle contains the QR renderer/vendor, and its built
Next process failed to recover after a controlled session-table fault was
restored. See
`docs/reports/PM_PHASE2A_REAL_ORIGIN_ARTIFACT_REVIEW.md`.

BUILD_ID `Gg64LFGQcClo_70kqyHFi` must not be deployed or promoted. A bounded
two-finding source repair, exact-byte independent review, a new immutable build
and repeated local artifact QA are required before any new deployment request.
Production activation remains a separate authority followed by the same
Google callback/session and saved-QR CRUD/quota/ownership acceptance gates.
