# Phase 2A HostAtom runtime and backup/restore verification

Date: 2026-08-31 (Asia/Bangkok)  
Scope: Plesk runtime audit plus MariaDB backup/restore proof  
Deployment: **not performed**

## Outcome

**SCOPED PASS** for the approved no-deploy checks.

- The existing `nqr.orenvis.com` subscription exposes Node.js 24.19.0 with npm,
  production application mode, application root `/nqr.orenvis.com`, document
  root `/nqr.orenvis.com/public`, and startup file `server.js`.
- The deployed `server.js` is a persistent Next.js HTTP entrypoint that binds
  the Plesk-provided host/port and delegates requests to Next. The deployed
  `package.json` declares Node 24/npm 11 and `start: next start`.
- TLS support and the HTTP-to-HTTPS 301 redirect are enabled with the existing
  `nqr.orenvis.com` Let's Encrypt certificate. nginx proxy mode and smart static
  processing are enabled; nginx caching and direct static-file serving are
  disabled.
- Plesk exposes no instance-count control on the inspected page. Phase 2A must
  therefore begin with one persistent Node process unless HostAtom confirms a
  different topology. The current process-local limiter is not multi-instance
  coordinated.
- SSH access is forbidden. The configured nginx request-body limit is 2 GB,
  which is much broader than the application's bounded request contracts and
  should be reduced before a public DB-backed launch.
- Auth/origin environment variable names are present in Plesk, but
  `DATABASE_URL` is absent. No secret values are recorded here. The page
  presents secret values in clear text to an authenticated administrator, so
  rotating auth/OAuth secrets remains a separate recommended security action.

The independent source/runtime contract is recorded in
`docs/reports/PHASE2A_HOSTING_RUNTIME_CONTRACT.md`.

## Backup evidence

The database `orenvis_nqr_phase2` initially contained 11 tables and Plesk
reported 400 KB. Its application user remained scoped to that database and to
local connections.

Plesk's first export attempt failed because the CRUD-only application user did
not have `LOCK TABLES`. Under explicit Product Owner approval, PM:

1. added only `LOCK TABLES` temporarily;
2. exported and downloaded the dump;
3. immediately removed `LOCK TABLES`; and
4. rechecked that SELECT/INSERT/UPDATE/DELETE remained the only enabled data
   privileges and that local-only access remained selected.

Off-host artifact:

- path: `/Users/sarawutjuntasang/Downloads/orenvis_nqr_phase2_2026-08-31_17-26-25.sql.zip`
- SHA-256: `67711a734a57573fc5157e7dca28845cf759220f932724ca4fd0aaa61780a53e`
- ZIP size: 2,574 bytes
- contained SQL size: 13,899 bytes
- contained SQL: one file with 11 `CREATE TABLE` statements, including the
  Drizzle migration metadata table

The server-side export copy remains in the Plesk account root as a second copy;
it was not deleted because deletion was not part of this verification.

## Restore proof and cleanup

PM created temporary local-only database/user pair
`orenvis_nqr_restore_test`, uploaded the exact off-host artifact, imported it
without recreating the database, refreshed Plesk statistics, and observed:

- restore status: success;
- tables: 11;
- reported size: 400 KB; and
- source and restored table/size counts: equal.

After verification, PM deleted `orenvis_nqr_restore_test`. Plesk also removed
its associated temporary user. User Management then showed exactly one
remaining database user: `orenvis_nqr_app` on `orenvis_nqr_phase2`.

## Remaining launch gates

Subsequent state: the runtime secret/body-limit/OAuth items below were later
completed under separate authority; see
`docs/reports/PHASE2A_LIVE_OAUTH_RUNTIME_ACTIVATION.md`. This section preserves
the remaining-gate view at the time of the backup audit.

- Add the MariaDB connection secret directly in Plesk at build and runtime;
  never commit or copy it into reports.
- Rotate auth/OAuth secrets because the Plesk administrator UI displayed them
  in clear text during the audit.
- Reduce the edge request-body limit and confirm the Plesk/Passenger process
  lifecycle, health/restart behavior, and single-instance topology.
- Run the immutable Phase 2A build and live auth, ownership-isolation, quota,
  CRUD and rollback checks against the restored/provisioned schema.
- Obtain separate deployment authority. This report is not deployment or
  production-launch approval.
