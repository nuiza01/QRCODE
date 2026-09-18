# Nexora QR — Phase 2 Implementation Plan

Status: **Phase 2A rolled back; fresh real-origin artifact rejected; bounded source repair requires authorization**
Product decision update (2026-09-19): **Google sign-in is required before using the QR generator or saving QR codes.**
Canonical product origin: `https://nqr.orenvis.com`  
Database target: HostAtom MariaDB 10.11 (initial production database)

This document is the current implementation contract for Phase 2. Where it
conflicts with the historical roadmap in `PLAN.md`, this document wins.

## Product decisions

- Static QR generation remains free and unlimited, but the generator now requires
  Google sign-in before use. This is a product decision; it does not grant
  permission to deploy or bypass the Phase 2A release gate.
- A Free account may hold at most **25 saved Static QR codes** at one time.
  Creating Static QR codes without saving them remains unlimited.
- Account sign-in uses Google only. Email magic links are not part of Phase 2A.
- The Free plan allows **5 active Dynamic QR codes per account**.
- Dynamic links use the existing origin: `https://nqr.orenvis.com/r/[code]`.
- Free-plan raw scan analytics are retained for **30 days**.
- The first production database is the MariaDB service already included with
  HostAtom. PostgreSQL is a later migration option after the product earns
  revenue; Phase 2 code must not depend on MariaDB-only business semantics.
- All application timestamps are handled as UTC. JSON payload/style documents
  remain portable and are validated at the application boundary.
- Raw IP addresses are never persisted. Any future visitor linkage uses a
  server-secret salted hash and follows the published retention policy.

## Phase 2A — accounts and saved QR codes

Deliverables:

1. Replace the parked PostgreSQL database adapter and migration with MariaDB
   equivalents, while retaining the old Phase 1 migration as historical
   evidence rather than applying it.
2. Persist Better Auth users, sessions, Google accounts, and verification
   records in MariaDB.
3. Add a protected, localized dashboard where a signed-in user can list,
   rename, duplicate, and delete saved QR codes.
4. Let a signed-in user save the currently valid generator payload and style.
5. Enforce authorization and input validation on every server mutation.
6. Enforce the Free saved-Static limit of 25 on every insert path, including
   duplicate, with a server-side transaction boundary.
7. Define the Free Dynamic QR limit as a server-side policy constant (5), so
   Phase 2B cannot rely on a client-only quota check.

Phase 2A does **not** activate public dynamic redirects, scan collection,
analytics, billing, bulk generation, or a DB-backed production deployment.
On 31 August 2026 the Product Owner separately authorized creating one empty,
least-privilege MariaDB database/user in Plesk and applying the reviewed Phase
2A migration. That authority does not include storing application environment
credentials, DNS changes, deployment, or any other production mutation.

## Phase 2B — dynamic redirects

- Create and edit URL-only Dynamic QR records.
- Allocate collision-resistant short codes under `/r/[code]`.
- Use HTTP 302 and fail closed for disabled/unknown records.
- Record every destination change for audit and rollback.
- Add abuse controls, destination policy checks, per-account/IP rate limits,
  report-and-suspend workflow, and a new-account interstitial policy before
  enabling public redirects.
- Enforce the Free limit of 5 active Dynamic QR records in a transaction.

No Redis dependency is required for the initial HostAtom release. Add caching
only after measured redirect traffic justifies another service.

## Phase 2C — analytics and retention

- Record scan events without storing raw IP addresses.
- Aggregate daily counts for dashboard queries.
- Purge Free-plan raw events after 30 days and verify the purge with a scheduled
  job report.
- Add CSV export and transparent retention wording.

## Deployment and data gates

Code completion is not authority to mutate production. Before the first real
database migration, PM must obtain one action-time confirmation covering the
exact Plesk database/user target and migration input. Credentials must be
entered directly into Plesk environment configuration and must never be
committed, copied into reports, or echoed in terminal output.

That one-time provisioning authority was exercised on 31 August 2026. The
reviewed initial schema and Drizzle migration metadata are present in the empty
HostAtom database; see `docs/reports/PHASE2A_PLESK_MARIADB_PROVISIONING.md`.
Runtime activation was later authorized separately. PM rotated the exposed
runtime credentials, added the protected MariaDB DSN in Plesk, reduced the
nginx body limit to 1 MB, restarted Node.js, and proved one fresh Google login
through the exact production callback. No secret value is recorded. Evidence:
`docs/reports/PHASE2A_LIVE_OAUTH_RUNTIME_ACTIVATION.md`.

The Product Owner later authorized a guarded Phase 2A build/deployment with
rollback and post-deploy QA. The real-origin candidates built and passed the
offline suite, but production Better Auth session resolution still failed
after a successful Google callback. PM rolled production back to BUILD_ID
`m1fxDjFEQxdLlI91m1Czx`; Phase 2A dashboard/API, ownership and quota behavior
is not accepted as live. Evidence: `docs/reports/PHASE2A_PRODUCTION_DEPLOYMENT.md`.

The authorized one-shot diagnostic confirmed the failure at Better Auth
`get-session`, but the redacted outer exception was a generic `Error` without a
non-secret database/adapter code and did not establish root cause. Diagnostics
were disabled immediately, the original production `server.js` was restored
byte-for-byte, and rollback BUILD_ID `m1fxDjFEQxdLlI91m1Czx` remained active.
Evidence: `docs/reports/PHASE2A_PRODUCTION_SESSION_DIAGNOSTIC.md`.

The bounded adapter-level repair now has exact-byte TL/Security and QA SCOPED
PASS results and fresh PM assembled verification: focused 28, full 996,
script 119, typecheck, lint, offline drift and diff-check all pass. Evidence:
`docs/reports/PM_PHASE2A_SESSION_ADAPTER_INTEGRATION.md`. This establishes only
the reviewed source and inert-driver behavior; it does not identify the prior
production root cause or prove the live MariaDB session path.

The disposable local MariaDB 10.11 plus local Next source-runtime gate passed
on the exact reviewed source. PM then received separate authority for one
fresh immutable real-origin build and local artifact QA, without deployment or
production mutation. The build completed as BUILD_ID
`Gg64LFGQcClo_70kqyHFi`, but independent TL/Security and QA rejected it:
QR renderer/vendor code is eager in every route's initial script set, and the
built Next process did not recover after a controlled session-table failure was
fully restored. Evidence:
`docs/reports/PM_PHASE2A_REAL_ORIGIN_ARTIFACT_REVIEW.md`.

The next implementation gate is therefore a bounded source repair for those
two findings, followed by exact-byte independent review. Only a reviewed
repair may receive separate authority for another immutable build and local
artifact QA. Deployment, Plesk and production mutation remain later, separate
approvals.

The first authorized attempt stopped safely before creation because this Mac
has only MySQL 9.7.1 and no installed/cached MariaDB 10.11 or container
runtime. BACKEND, TL/Security and QA independently returned BLOCKED; reports:
`docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME.md`,
`docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME_TL_SECURITY_REVIEW.md` and
`docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME_QA.md`. No database, user, secret,
runtime, build or external action occurred. Resume requires separately scoped
authority to install/download exact MariaDB 10.11 locally or an already
installed verified 10.11 runtime; MySQL is not accepted as a substitute.

PM subsequently obtained narrowly scoped Homebrew installation authority.
MariaDB 10.11.19 was installed unlinked and the resumed disposable gate passed
BACKEND, independent TL/Security and independent QA on the exact reviewed
source. Runtime evidence covers real installed Better Auth/Drizzle/mysql2,
session states, dashboard continuity, two-user CRUD ownership, slot-25
contention, fixed failure privacy and recovery. All disposable database/user,
process, secret and data artifacts were removed and independently verified;
MySQL 9.7.1 remained untouched. Evidence:
`docs/reports/PM_PHASE2A_LOCAL_MARIADB_RUNTIME_ACCEPTANCE.md`.

The fresh immutable real-origin build/local-artifact gate was later authorized
and completed, but its artifact was rejected as described above. BUILD_ID
`Gg64LFGQcClo_70kqyHFi` must not be deployed or promoted. Source repair and
review now require new authority; deployment must not be inferred from a
successful build or source-runtime result.

The off-host backup/restore gate was exercised on the same date. Plesk export
required a narrowly approved temporary `LOCK TABLES` privilege, which was
removed immediately after export. The downloaded artifact was restored into a
local-only temporary database, matched the source at 11 tables / 400 KB, and
the temporary database/user were then deleted. Evidence and the HostAtom
runtime audit are in
`docs/reports/PHASE2A_HOSTATOM_RUNTIME_BACKUP_RESTORE.md`. This does not add a
runtime `DATABASE_URL`, deploy the application, or approve launch.

Before launch of a DB-backed build:

- create a least-privilege MariaDB database user scoped to one database;
- take and verify an off-host backup/restore artifact (completed 2026-08-31;
  repeat immediately before any later production mutation);
- apply only the reviewed migration to an empty database;
- run authentication, ownership-isolation, quota, CRUD, rollback, and build
  checks against the same immutable candidate;
- confirm that enabling persistence may require existing stateless sessions to
  sign in again;
- preserve a rollback build and database backup identifier.

## Portability rules

- IDs are application-generated UUID strings (`varchar(36)`), not engine-side
  UUID defaults.
- Business enums are represented with stable string values.
- JSON documents have explicit TypeScript/Zod contracts.
- SQL access is isolated behind the Drizzle/DAL boundary.
- Database connection timezone is UTC.
- No database hostname, username, password, or control-panel detail appears in
  client bundles or logs.
