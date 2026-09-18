# Phase 2A Final Independent QA — Iteration 2

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-FINAL-QA`, iteration 2  
Verdict: **SCOPED PASS — FINAL CODE/OFFLINE CANDIDATE**

This review covers the authoritative working tree after the saved-QR API
hardening and canonical Phase 2 plan update. It is independent code, unit,
component and offline migration evidence. It does not approve or claim a live
MariaDB migration, Google OAuth acceptance, browser QA, deployment or launch.

## Identity and scope

QA did not modify application source, dependencies, migrations, environment
configuration or production state. This report is the only file written by QA.

The path-sorted SHA-256 inventory of the 153 files under `src`, `scripts`,
`drizzle-mariadb` and `drizzle` was
`b43396556aef706a90ad7f45a1b593240551a5c29959c2ad3351b55cbe5c79df`
after verification. Important frozen identities were:

- package lock:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- MariaDB schema:
  `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- initial MariaDB SQL:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Drizzle snapshot:
  `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- Drizzle journal:
  `7fa4345ae477f77b0f0c3d4b09ea7a26d233d2e307d0179c389b20074d7a3361`
- DB runtime:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- saved-QR API boundary:
  `86b6d4763f9429369e96878682fd52eaa7a0929ff61c8ef2d97d7d8aa9bf171a`
- saved-QR limiter:
  `5275f89eb8882a38ff0806cf4ca6ef7de9fc31e0cb2ae3a79183b90ea595867c`
- saved-Static quota and DAL:
  `4c2b07681e79dccf4289b4de1bc9f6ae846b0d22feccd2df5116a9334b652be5`
  and
  `fc1652845bc01e37d45eeeb061e0b11c31fd4288dca63c25f806b45f40f21919`
- create, item and duplicate routes:
  `d295d6306f75d96e578bc5ba98f235439c6cffeaad3fa7c99e798cb05437f2f1`,
  `2146999eabe1170621430c1402746e7216b2df13485f49b71f3a34a0117e0d78`
  and
  `96a49fc3aa7da245fcbd3faf1c0f962a1cd862ba59fa7721bc016003c903051c`
- Phase 2 implementation plan:
  `c20b320cbd3e9bba14ce6bbb10f601550adf12beb30c4acc00d67b15d5b4dadc`

## Fresh verification

- `npm test`: **38 files / 970 application tests PASS**, followed by
  **119/119 script tests PASS**.
- Focused run with `DATABASE_URL` absent: **18 files / 326 tests PASS**.
  This included the anonymous Generator, account UI, dashboard, all saved-QR
  routes, auth gates, bounded JSON, UTC database adapter, saved-QR contracts,
  quota/DAL and limiter.
- `npm run typecheck`: PASS after Next route type generation.
- `npm run lint`: PASS.
- `env -u DATABASE_URL npm run check:drift`: PASS — **10 tables / 29 SQL
  statements**, offline with no database connection.
- `git diff --check`: PASS.

No build was requested or run in this assignment.

## API hardening review

No actionable defect was found in the assigned scope:

1. Every saved-QR mutation enters the shared fail-closed boundary. Unknown DAL
   or runtime failures are caught without property access, coercion,
   stringification, logging or echo and return only fixed
   `saved_qr_operation_failed` JSON with `Cache-Control: no-store`.
2. The complete account configuration gate, exact-origin gate and
   authoritative persisted-session lookup run before request-body IO. A Proxy
   body regression proves unauthenticated requests do not touch the body.
3. Create and rename retain exact JSON media-type checks, streamed byte limits,
   fatal UTF-8 decoding and schema validation. Understated `Content-Length`
   does not bypass the actual-byte boundary.
4. Authenticated mutations use the shared account-keyed process-local limiter:
   30 requests per 60 seconds. The 31st response is fixed HTTP 429 with
   `saved_qr_rate_limited`, numeric bounded `Retry-After` and `no-store`.
   The map is capped at 10,000 tracked accounts and stores no IP address.
5. Hostile Proxy failures from create and duplicate produce zero inspection
   traps. Drizzle messages, connection strings and submitted payload markers
   are absent from responses. Rename and delete use the same fixed boundary.
6. Save QR, dashboard actions and dashboard page map failures to fixed localized
   Thai/English copy. They do not render internal error codes, database errors
   or unknown rejection values.

The rate limiter is explicitly process-local defense in depth, not a global
distributed guarantee. Multi-process production must replace it with an
atomic shared limiter or enforce an equivalent provider boundary before the
product relies on a global 30/minute claim. This limitation does not weaken the
authoritative transaction-backed saved-record quota.

## Quota, privacy and migration regression review

- The Free saved-Static limit remains the server-owned value **25**, separately
  from the inactive Phase 2B Dynamic limit of 5. The canonical Phase 2 plan now
  records 25.
- Create and duplicate both transaction-lock the durable owner row with
  `FOR UPDATE`, count that owner's Static records and insert only below 25.
  Independent deterministic tests again prove 24 to 25, rejection of the next
  insert, one winner in concurrent create-plus-duplicate contention, and
  cross-owner isolation.
- Stable HTTP 409 quota responses and localized clients remain unchanged.
- Authoritative session lookup, Google-only auth gate, OAuth token protections,
  raw-session-IP suppression, legal/privacy copy, UTC pool initialization and
  anonymous no-environment generation all passed the full/focused regression
  sets.
- Schema, initial SQL, snapshot and package lock match the prior reviewed
  hashes. The offline checker regenerated the MariaDB model and found no drift.

## Remaining live gates

Before enabling the DB-backed application, the same immutable candidate still
needs the separately authorized operational checks:

1. execute and inventory the 29 statements on the dedicated empty MariaDB 10.11
   database, then record rollback/restore evidence;
2. verify UTC session/default/round-trip behavior and encrypted-token plus empty
   raw-IP storage in actual rows;
3. complete Google sign-in, revocation, logout and reauthentication tests;
4. run two-user CRUD/ownership isolation and a real two-connection quota race;
5. record least-privilege grants, off-host backup identity and recovery result;
6. run a fresh build and browser/runtime acceptance before any separate deploy
   authorization; and
7. choose shared/provider enforcement before describing the 30/minute limiter
   as global in a multi-process deployment.

No database, browser, OAuth, Plesk, credential, build or deployment action was
performed by QA.
