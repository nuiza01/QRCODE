# Phase 2A real-origin production artifact QA

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-073` / QA / artifact iteration 1  
Verdict: **REQUEST CHANGES / REVIEW FAILED**

QA independently tested the exact NQR-071 production artifact locally with
the disposable MariaDB 10.11.19 handoff and a real in-app Chromium session.
The gate found two actionable release-candidate defects: the production
runtime did not recover after a controlled, fully restored session-table
failure, and a 501,473-byte QR renderer/vendor chunk is eagerly included in
every generator route instead of remaining lazy.

No source, package, schema, migration or artifact file was edited. No rebuild,
install, Plesk, DNS, external OAuth, deployment, production database or
production mutation was performed. All browser navigation remained on
`127.0.0.1`; no real Google account was used. The only project write from this
assignment is this report.

## Frozen identity

| Identity | Verified value |
| --- | --- |
| reviewed session-adapter digest | `5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52` |
| authoritative source | 185 paths, `557a80a2807fef275c28c15d1a8471aee381f4635bad0a0548ee71a74394182b` |
| production artifact | 546 paths, `ac4d14bd61ff4345db95932579f4ddabcc0bd8aa096d624612d02ec5fe84a5d2` |
| build ID | `Gg64LFGQcClo_70kqyHFi` |
| baked public origin | `https://nqr.orenvis.com` |
| local artifact runtime | `http://127.0.0.1:30171` |
| disposable database | MariaDB `10.11.19-MariaDB`, loopback port `33371` |

QA recomputed every hash in both the 185-file source manifest and the
546-file artifact manifest before testing: zero missing files, zero hash
mismatches, and both compact manifest digests matched. `.next/BUILD_ID` and
the independently frozen artifact copy carried the exact assigned build ID.

After cleanup, QA independently recomputed the source artifact and frozen-copy
manifests again. All three identities remained exact with zero mismatches.

## Browser and static checks completed before the fault window

QA read and used the installed browser-control skill and exercised the built
artifact in a real in-app Chromium browser.

- English desktop `1280x800`: an unauthenticated `/en/dashboard` request
  redirected locally to `/en`; the localized Google sign-in state, all ten QR
  content types and anonymous generator were present; horizontal overflow was
  zero.
- Thai mobile `390x844`: `/th/dashboard` redirected locally to `/th`; the Thai
  sign-in state and generator were present; horizontal overflow was zero.
- Filling a valid local test URL produced a real preview and enabled PNG, SVG
  and PDF actions. No console warning or error was recorded.
- On `/en` and `/th`, canonical and Open Graph URLs were exactly
  `https://nqr.orenvis.com/<locale>`. The three hreflang values were baked only
  to the same real origin while the live navigation URL remained loopback.
- Page-asset inspection observed only loopback Next assets, local RSC/auth
  requests and the favicon. No production or other external origin was
  requested.

These results preserve useful pre-fault evidence, but they do not override the
two release-blocking findings below.

## Finding NQR-073-F1 — runtime remains globally unresponsive after restored fault

Severity: **P1 / High**  
Owner: Auth/runtime integration with DEVOPS reproduction

During the coordinated peer fault window, the disposable `session` table was
made unavailable and then restored. The fault emitted only the intended fixed
category, and the reviewer restored the table, removed all held/synthetic rows
and stopped its probe client. MariaDB remained alive with sleeping
connections. Nevertheless, the built Next artifact then stopped responding to
all requests, including the otherwise static `/en` page.

QA did not inject another fault or mutate shared state. It independently sent
one bounded read-only request after restoration:

- `GET http://127.0.0.1:30171/en`: timed out after **5.006 seconds**, HTTP
  `000`, zero response bytes;
- Next still listened on `127.0.0.1:30171`;
- MariaDB still listened on `127.0.0.1:33371` and accepted a connection
  preface.

This is a production-artifact availability failure. The prior source-runtime
gate recovered from the same class of controlled failure, so the built
artifact cannot be accepted until the artifact-specific lifecycle/pool hang is
root-caused and fixed.

Acceptance criteria for the repair:

1. repeat the exact built-artifact session-table and database-disconnect
   windows with bounded requests;
2. restore the database and prove session, dashboard, saved-QR API and `/en`
   all recover within a fixed timeout without restarting Next;
3. preserve one fixed safe category per failed request, no raw throwable/SQL
   disclosure and fail-closed mutations;
4. verify connection and request counts return to a bounded healthy baseline.

## Finding NQR-073-F2 — QR renderer/vendor is in the initial generator bundle

Severity: **P2 / Medium**  
Owner: RENDER / Next bundle boundary

Independent parsing of the frozen artifact's pre-rendered HTML found exactly
22 generator routes (two locale homes plus twenty localized QR-type routes).
All 22 share one identical 12-script initial set, and every set includes:

`/_next/static/chunks/2vu7agsgxk1gr.js`

The file is **501,473 bytes** and contains both the installed
`qr-code-styling` marker and `getModuleCount`/renderer implementation markers.
The real browser page-asset inventory also observed this chunk before a QR
payload was entered. Only the later renderer chunk appeared after valid input.

This contradicts the NQR-071 artifact audit's `lazyHeavy` classification and
the established release expectation that QR/PDF heavy implementations remain
out of every initial generator script set.

Acceptance criteria for the repair:

1. no QR renderer/vendor or PDF implementation marker in any initial script
   set across the 22 generator routes;
2. the appropriate renderer chunk appears only after a valid generator state,
   with PDF chunks only on PDF use;
3. analyzer logic fails if a known heavy chunk is both present in an initial
   set and labeled lazy;
4. rerun desktop/mobile generator, console and local-only network checks on the
   newly frozen artifact.

## Deferred matrix

QA intentionally stopped all shared DB, quota and fault work immediately after
the peer finding, as directed by PM. Therefore this artifact iteration does
not independently accept current/absent/expired/revoked/orphan sessions,
two-user CRUD ownership, slot-25 contention, 401/403/413/no-store, fixed
failure recovery or authenticated desktop/mobile dashboard behavior. Those
contracts passed the prior exact source-runtime gate, but must be rerun on the
repaired immutable artifact.

A mode-0600 `qa.artifact.done` coordination marker was written with
`REVIEW_FAILED`; no QA DB harness was executed after the peer fault.

## Cleanup verification

After both independent completion markers existed, PM removed the exact
disposable database/user, stopped Next and MariaDB, deleted the unique data
directory and runtime secret environment, and preserved the failed immutable
artifact for analysis.

QA independently verified:

- no listener on `30171` or `33371`;
- `runtime.env` and the disposable data directory are absent;
- cleanup evidence reports the exact database and user counts as zero;
- pre-existing MySQL 9.7.1 remains PID 1277 on `3306` and `33060`;
- MariaDB 10.11.19 remains installed but unlinked;
- source, active artifact and frozen artifact identities are unchanged.

Cleanup evidence is mode `0600`:

- `cleanup.json`: `518aadcdfdf0093c440d76ad9cd262c00b08420c0da0aa9e73eb8604e8ee1d27`;
- `cleanup.done`: `98199b2e793369c631915194171aec826fb722fb59587aecfe1760f4d6b89b4d`.

## Limits and disposition

This review used one loopback-only built artifact and synthetic local state. It
does not cover real Google OAuth, HostAtom/Plesk, DNS/TLS, deployment,
production MariaDB, a physical scanner or production rollback. Those gates
remain separate and must not proceed on this failed artifact.

**Disposition: do not deploy or promote BUILD_ID
`Gg64LFGQcClo_70kqyHFi`. Repair F1 and F2, produce a fresh immutable
real-origin artifact, and rerun the full NQR-073 matrix.**
