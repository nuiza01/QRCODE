# Phase 2A Plesk MariaDB Provisioning

Date: 2026-08-31 (Asia/Bangkok)  
Operator: NQR Project Manager, acting under the Product Owner's explicit
authorization to create the MariaDB database/user and apply the reviewed Phase
2A migration. Deployment, DNS and application production mutation remained
out of scope.

## Result

**PASS — database provisioned and schema migration applied; application not
deployed or enabled.**

- Plesk subscription: `orenvis.com`
- Related site: `nqr.orenvis.com`
- Database server: local MariaDB 10.11 (`localhost:3306`)
- Database: `orenvis_nqr_phase2`
- Application user: `orenvis_nqr_app`
- Network boundary: local connections only
- Database scope: only `orenvis_nqr_phase2`, not every subscription database
- Final role: custom data-only access (`SELECT`, `INSERT`, `UPDATE`, `DELETE`)
- Structure/routine/event/trigger privileges: disabled after migration

The generated database password was not printed, copied into source, placed in
an environment file or included in this report. Before a later deployment, an
authorized operator may reset it directly in Plesk while configuring the
runtime environment.

## Migration identity and application

Reviewed migration:

- File: `drizzle-mariadb/0000_phase2a_mariadb.sql`
- SHA-256: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Drizzle journal timestamp: `1788161564610`
- Offline contract: 10 application tables / 29 SQL statements

Plesk imported the exact reviewed SQL into the empty database with database
recreation disabled. Plesk then reported 10 tables. A separate idempotent
operational SQL step created Drizzle's standard `__drizzle_migrations` table
and recorded the exact migration hash/timestamp above. This prevents a future
`drizzle-kit migrate` run from trying to apply the initial migration twice.

Final Plesk inventory:

- 10 application tables
- 1 Drizzle migration metadata table
- 11 tables total
- Displayed database size: 400 KB

The temporary metadata SQL file was removed from local temporary storage after
the successful import. No credential-bearing file was created.

## Verification

- Plesk displayed successful import status for the application migration.
- Plesk displayed successful import status for the migration metadata step.
- A fresh database-list reload displayed 11 tables.
- A fresh user-settings read showed the database-specific assignment,
  local-only access, custom role, four CRUD grants enabled and all displayed
  structure/routine/event/trigger grants disabled.
- Local `npm run check:drift` passed: 10 tables / 29 SQL statements, offline.
- The migration file hash remained unchanged after provisioning.

One harmless verification command used the nonexistent script name
`db:check`; npm rejected it before any database or file action. The correct
`check:drift` command was then run and passed.

## Explicit non-actions and remaining gates

This provisioning did **not**:

- store `DATABASE_URL` or other runtime secrets in Plesk;
- deploy or restart an application;
- alter DNS, TLS, redirects or the production website;
- enable Google sign-in or saved-QR features for users;
- run live OAuth, ownership-isolation or concurrent quota tests;
- create and restore an off-host database backup;
- bypass the existing local Turbopack worker port restriction.

Before any DB-backed deployment, the Product Owner must separately authorize
runtime-secret configuration and deployment. The release gate must also prove
the actual HostAtom application topology, select a shared/provider rate limit
if more than one process is used, complete backup/restore evidence, run live
MariaDB/OAuth/two-user CRUD and quota-concurrency checks, and obtain a fresh
successful production build/runtime result.
