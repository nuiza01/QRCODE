# Phase 2A MariaDB Implementation Report

Date: 2026-08-31 (Asia/Bangkok)  
Status: **CODE/UNIT READY — DATABASE AND DEPLOYMENT NOT APPLIED**

## Authorized scope

The user authorized Phase 2A on MariaDB with these binding decisions: Google
sign-in only, existing `nqr.orenvis.com` origin, five Free Dynamic QR records,
30-day Free raw-analytics retention, and HostAtom MariaDB until revenue
justifies a later PostgreSQL migration.

## Implemented

- Added the canonical plan at `docs/PHASE2_IMPLEMENTATION_PLAN.md` and marked
  the older `PLAN.md` as historical where the two disagree.
- Replaced the parked PostgreSQL runtime adapter with `mysql2`/Drizzle MySQL,
  UTC connection handling, application UUID strings, JSON payload/style
  columns, and ten MariaDB tables including Better Auth persistence.
- Generated a new, separate initial migration under `drizzle-mariadb/`; the
  historical PostgreSQL migration remains untouched and is not applicable to
  HostAtom.
- Converted the offline drift checker to MySQL/MariaDB semantics. It imports no
  database config and opens no connection.
- Connected Better Auth 1.7.2 to the Drizzle MySQL adapter. Account auth is
  advertised only when Google configuration and a valid MariaDB DSN are both
  present; anonymous Static QR generation remains available without either.
- Added same-origin, authenticated saved-QR endpoints. Every rename, duplicate,
  and delete is scoped by both record ID and authenticated owner ID.
- Added a localized protected dashboard and explicit Save QR control. The UI
  discloses that saving uploads the payload/style; ordinary generation remains
  local.
- Defined the server-side Free Dynamic QR boundary as five. Phase 2A still
  accepts only Static saves; redirects and analytics remain Phase 2B/2C gates.

## Frozen evidence

- Plan SHA-256: `bba95b0d53877027ef2931adb2ee40069349bd8efe4837e402bd3db21bcf08d2`
- Migration SHA-256: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Snapshot SHA-256: `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- Schema SHA-256: `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- Package lock SHA-256: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`

## Verification

- Vitest: 26 files / 918 tests PASS.
- Script tests: 119 PASS.
- MariaDB drift: 10 tables / 29 SQL statements PASS, offline/no DB.
- ESLint PASS.
- Next type generation and TypeScript PASS.
- `git diff --check` PASS.
- Default and approved build attempts both reached Next/Turbopack and were
  blocked by the host security boundary when the PostCSS worker attempted to
  bind an internal port (`Operation not permitted`). No alternative build tool
  or permission bypass was used.
- An isolated local MySQL 9.7 initialization attempt crashed inside the vendor
  server binary before a database existed. Its dedicated temporary directory
  was removed; it did not touch the project or HostAtom and is not MariaDB
  compatibility evidence.

## Explicitly not performed

- No Plesk database, database user, password, or environment variable was
  created or changed.
- No migration was applied to HostAtom.
- No production build was deployed and no DNS, TLS, OAuth, or live-site state
  was changed.
- No Dynamic redirect, scan ingestion, analytics, billing, or retention job was
  activated.

## Next gated action

After action-time user confirmation, create one empty least-privilege MariaDB
database/user in Plesk, store the DSN without exposing it, apply only the frozen
initial migration, and run live schema/auth/ownership/CRUD tests. Deployment
remains a later, separate approval after build and runtime QA pass.

