# Phase 2A — Final Combined TL and Security Re-review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-TL-SEC-FINAL`, iteration 2  
Verdict: **SCOPED PASS — prior FINAL-001/002/003 are closed in the assigned code/unit and no-deploy scope**

This is not live MariaDB, OAuth, Plesk, backup, browser, deployment or launch
approval. The new process-local mutation limiter is acceptable as a bounded
single-instance defense for the current disconnected/no-deploy candidate; it
is not a global or source-level rate guarantee and must not be represented as
one when deployment topology is selected.

## Frozen identity

The path-sorted Phase 2A review inventory contains 45
source/config/migration/package paths. Its SHA-256 manifest digest is:

- candidate manifest: `65998728e2241fb03119c3ae68e2f5c06437589431b6b954a00a3e2467051d1c`
- canonical Phase 2 plan: `c20b320cbd3e9bba14ce6bbb10f601550adf12beb30c4acc00d67b15d5b4dadc`
- shared saved-QR API boundary: `86b6d4763f9429369e96878682fd52eaa7a0929ff61c8ef2d97d7d8aa9bf171a`
- process-local limiter: `5275f89eb8882a38ff0806cf4ca6ef7de9fc31e0cb2ae3a79183b90ea595867c`
- limiter tests: `2c889d1a7843b6712b82423e6837389751eb146d7b610edea8d86db0edeaea9d`
- create route: `d295d6306f75d96e578bc5ba98f235439c6cffeaad3fa7c99e798cb05437f2f1`
- rename/delete route: `2146999eabe1170621430c1402746e7216b2df13485f49b71f3a34a0117e0d78`
- duplicate route: `96a49fc3aa7da245fcbd3faf1c0f962a1cd862ba59fa7721bc016003c903051c`

The database and dependency identities did not move during the repair:

- initial MariaDB SQL: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- schema: `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- migration snapshot: `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- package lock: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`

## Prior findings

### NQR-P2A-FINAL-001 — CLOSED in assigned scope

All four saved-QR mutation routes now share `authorizeSavedQrMutation()`. It
checks complete account configuration, same-origin policy, and an authoritative
Better Auth database session before accepting mutation work. In particular,
the create endpoint does not access the request body until authentication and
account-rate admission succeed. A hostile body accessor regression confirms an
unauthenticated request returns 401 without touching the body.

The authenticated account limiter allows 30 mutations per 60-second window,
isolates user IDs, retains at most 10,000 short-lived entries, returns the fixed
`saved_qr_rate_limited` code with status 429 and a numeric `Retry-After`, and
stores no IP address. Rate admission happens before create body parsing and
before every create/rename/delete/duplicate DAL call.

Limitation: the Map is process-local and resets on process restart. Multiple
Node workers can each admit 30 operations, and this code does not protect the
session lookup itself with a source-level boundary. That is explicitly stated
in source and is acceptable only because this assignment has no deployed app
and no proven multi-process topology. Before any deployment, PM/DEVOPS must
either prove the intended app is a single process and configure an authorized
provider/source throttle, or replace this guard with an atomic shared limiter.
Do not claim this code alone provides a global limit.

The durable 25-record quota remains the storage/correctness boundary. Create
and duplicate still acquire the same per-user `FOR UPDATE` lock before the
owner-scoped count and insert, so a process restart or second worker cannot
bypass the saved-record maximum.

### NQR-P2A-FINAL-002 — CLOSED in code/unit scope

Every saved-QR route executes inside `withSavedQrApiBoundary()`. Its `catch {}`
binding does not read, stringify, coerce, log, rethrow or echo the unknown
exception. It returns only fixed JSON `{ error: "saved_qr_operation_failed" }`,
status 500 and `Cache-Control: no-store`.

The same wrapper contains failures from authorization, parsing and every DAL
operation. Independent inspection found no route-local logging or alternate
unwrapped mutation path. Regressions cover create, duplicate, rename and delete,
including an unknown Proxy that throws on property/prototype inspection and a
raw DSN/payload marker; neither the marker nor the thrown value reaches the
response or an explicit application logger. This removes the former path by
which a parameter-bearing `DrizzleQueryError` could escape to the framework.

Operational telemetry is intentionally absent rather than logging a sensitive
error object. A future fixed-event/correlation-ID logger requires separate
review and must never receive the caught value.

### NQR-P2A-FINAL-003 — CLOSED

`docs/PHASE2_IMPLEMENTATION_PLAN.md` now records that a Free account may hold
25 saved Static QR codes, while unsaved local generation/download remains
unlimited. Phase 2A requires the 25 limit on create and duplicate and continues
to separate it from the inactive future five-Dynamic allowance. The plan also
records the user's narrow authority for an empty least-privilege Plesk database
and exact migration without extending that authority to credentials, DNS,
deployment or other production mutation.

## Preserved controls

- MariaDB schema, snapshot, journal and exact initial SQL still agree at 10
  tables / 29 statements; the checker stays offline and imports no DB config.
- Better Auth keeps database-authoritative sessions, cookie-cache/refresh
  bypass, encrypted OAuth-token configuration, no provider-account cookie,
  durable OAuth state and the no-raw-IP session-create hook.
- mysql2 keeps UTC Date conversion and per-connection
  `SET SESSION time_zone = '+00:00'` initialization with fail-closed destroy.
- Saved-QR DAL operations retain owner ID constraints. Create/duplicate retain
  the durable atomic 25-record transaction boundary and fixed quota result.
- Actual-body byte limits, fatal UTF-8/JSON parsing, stable localized quota/rate
  behavior, HostAtom/MariaDB disclosures and inactive Dynamic/analytics wording
  remain intact.

## Independent verification

- Focused no-environment review: 15 files / 84 tests PASS.
- Full no-environment Vitest: 38 files / 970 tests PASS.
- Script tests: 119/119 PASS.
- MariaDB drift: 10 tables / 29 statements PASS, offline/no DB.
- Next route type generation and TypeScript: PASS.
- ESLint: PASS.
- `git diff --check`: PASS.
- Candidate manifest and database/package hashes were recomputed after tests
  and remained unchanged.

This re-review did not edit application source, packages, migrations, secrets
or runtime configuration and did not access MariaDB, Plesk, OAuth/browser
sessions, network, backup, DNS, deployment or production. This report is the
only file written.

## Next action

PM may use this scoped review as code/unit evidence and continue only the
separately authorized empty-database bootstrap. Before enabling or deploying
the DB-backed application, use one frozen candidate to verify MariaDB 10.11
migration inventory, UTC/timestamp precision, encrypted-token/no-raw-IP rows,
session revocation, two-user ownership, real two-connection quota races,
limiter/topology/provider controls, CRUD, backup/restore and rollback. A later
deployment remains a separate user authorization.
