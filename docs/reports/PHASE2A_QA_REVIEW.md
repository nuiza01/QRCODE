# Phase 2A Independent QA Review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-QA`  
Role: QA  
Verdict: **SCOPED PASS — CODE/OFFLINE ONLY**

## Scope and identity

This review inspected the authoritative Phase 2A candidate in
`/Users/sarawutjuntasang/Nexora/QRCODE` without connecting to a database and
without editing application source. The only file written by QA is this
report.

Frozen inputs rechecked before verification:

- `package-lock.json`: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- `src/db/schema.ts`: `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- MariaDB migration: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Phase 2 plan: `bba95b0d53877027ef2931adb2ee40069349bd8efe4837e402bd3db21bcf08d2`

## Fresh verification

- `npm test`: **26 files / 918 application tests PASS** and **119 script
  tests PASS**.
- Focused no-environment run with `DATABASE_URL`, Better Auth and Google
  variables removed: **6 files / 274 tests PASS**. The selection covered the
  Generator, auth menu/config/policy, saved-QR contracts and create endpoint.
- `npm run typecheck`: PASS after Next route type generation.
- `npm run lint`: PASS.
- `npm run check:drift` with `DATABASE_URL` removed: PASS — **10 tables / 29
  SQL statements**, offline with no connection attempt.
- `git diff --check`: PASS.
- `npm ls --depth=0`: exit 0. It continues to label the six previously
  disclosed WASM/platform transitive packages as extraneous; QA did not prune
  or reinstall them.
- One ordinary no-environment `npm run build` attempt reached Next 16.3.1
  Turbopack and failed when its PostCSS worker attempted to bind an internal
  port (`Operation not permitted`, while writing the sitemap endpoint). QA did
  not change the builder, request broader permission or use a workaround. This
  is not successful build evidence.

## Contract review

### Anonymous/no-environment behavior

- Both localized generator entry points derive `accountEnabled` from the
  all-or-nothing account-auth gate; the Generator also defaults it to false.
- When the gate is false, neither the account menu nor Save QR card is mounted.
  Ordinary local QR validation, preview and export remain independent of the
  MariaDB adapter.
- The auth API returns a fixed no-store 503 before constructing Better Auth
  when the persistent configuration is incomplete.

### Authentication configuration

- Account auth requires a valid Google configuration and a `mysql:` DSN with
  username, password, host and database name. Production auth origin must be
  an HTTPS origin without credentials, path, query or fragment.
- Better Auth uses the Drizzle MySQL adapter, the reviewed schema and UUID
  application IDs. Secrets remain server-side.
- Every saved-QR mutation checks the account-auth gate, exact configured
  same-origin request and persisted authenticated user before reaching data
  access.

### Save QR, dashboard and ownership

- Create accepts JSON only, validates name/payload/style with Zod, rejects
  Dynamic mode in Phase 2A and supplies the authenticated user ID to the DAL.
- The Free Dynamic policy constant is exactly 5; no Dynamic redirect is
  activated by this candidate.
- Rename, delete and duplicate validate record UUIDs. DAL reads use the pair
  `(record id, authenticated user id)`, and update/delete predicates repeat
  both values. Duplication can only copy a record returned by that owned read.
- The dashboard is a force-dynamic, Node.js, no-index route. It redirects when
  account auth or a persisted session is absent and lists records filtered by
  the current user.
- Save UI is shown only when the server enabled accounts, discloses that the QR
  payload/style will be uploaded, blocks invalid/capacity-failed output, and
  sends only the current payload/style plus a bounded name and Static mode.

No actionable defect was found in this code/offline scope.

## Required live gates and limitations

This verdict is sufficient only to proceed with the separately authorized
creation of an empty least-privilege MariaDB database/user and application of
the frozen migration. It is **not** database, OAuth, deployment or launch
approval.

The next live verification must use the migrated HostAtom MariaDB database and
cover:

1. exact MariaDB 10.11 execution of all 29 statements, table/column/index/FK
   inventory and an empty-database rollback/restore path;
2. Better Auth Google login, session persistence, logout and expected
   reauthentication behavior;
3. two distinct users proving list/create/rename/duplicate/delete ownership
   isolation and same-origin rejection;
4. Save QR and dashboard success, validation/recovery and data persistence;
5. least-privilege database grants without exposing the DSN in output;
6. a fresh build and runtime QA on the same immutable candidate before any
   deployment authorization.

Current automated tests directly exercise the create endpoint and portable
contracts. Rename/delete/duplicate, dashboard and Save QR were independently
reviewed from source in this assignment but still require the live multi-user
and runtime evidence above. No MariaDB server, Google account, Plesk setting,
DNS, production service or deployment was touched by QA.
