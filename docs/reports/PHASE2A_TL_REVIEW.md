# Phase 2A MariaDB — Independent TL Review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-TL`  
Verdict: **REQUEST_CHANGES** for the complete Phase 2A application candidate

The MariaDB schema/migration itself receives a **SCOPED PASS** for application
to a newly created empty database under PM-controlled credentials. This review
does not approve enabling or deploying the DB-backed account application until
the findings below are repaired and independently rechecked.

## Frozen identity

- Canonical plan: `bba95b0d53877027ef2931adb2ee40069349bd8efe4837e402bd3db21bcf08d2`
- Initial MariaDB SQL: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Drizzle snapshot: `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- Schema: `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- Package lock: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- Auth configuration: `39ba93483f4b797bcd2b86754a2dddb2ee25ef5d23248d0d357fcba1d316cbb4`
- Request-auth helper: `2aa433c3ea23f61fa3fc2718542f7553f1a9880585f4eb4f1e71210c5eec856c`
- DB runtime: `ad515c9727095c97238b17737fba804e6033098120af32252b424ce2cf8dbbf6`
- Legal strings: `2014e6e529ce2e69c192d91bd81d7ef2beb1f15c11577dc9877595917451f8b9`

## Findings

### F1 — HIGH — Protected CRUD accepts the seven-day cookie cache instead of an authoritative DB session

`src/lib/auth.ts:41-48` enables Better Auth's cookie cache for the complete
seven-day session lifetime and refreshes it without a database query.
`src/lib/request-auth.ts:6-8` then calls `api.getSession` without
`disableCookieCache`. Every Dashboard read and saved-QR mutation depends on
that helper.

Better Auth 1.7.2 explicitly returns a valid cached session before querying the
database when cookie cache is enabled. Consequently, deleting/revoking the
server-side session does not reliably revoke access to saved payloads until the
cache expires. This undermines the purpose of persistent server-side sessions
for authorization.

Required repair: make authorization-sensitive reads bypass the cookie cache
(`disableCookieCache: true`) and add a regression proving a revoked DB session
cannot list/create/rename/duplicate/delete. The ordinary header account display
may use a short cache, but a seven-day self-refreshing authorization cache is
not acceptable.

### F2 — HIGH — The implementation violates its raw-IP and privacy contracts

The canonical plan says raw IP addresses are never persisted. However,
`src/db/schema.ts:42-63` includes `session.ipAddress` and `src/lib/auth.ts:55-61`
does not set Better Auth's `advanced.ipAddress.disableIpTracking`. In the
installed Better Auth 1.7.2 adapter, session creation assigns `getIP(headers)`
to `ipAddress`, so a raw address can be written on login.

The public policy is also materially stale: `src/app/[locale]/legal-strings.ts`
still says there is no account database and session/provider data exists only
in encrypted cookies (`:29` and `:61`). QR landing copy, for example WiFi at
`src/seo/content/wifi.ts:45-47,60-61`, says payloads are never uploaded or
stored, while the new explicit Save action stores the complete payload,
including a WiFi password.

Required repair: disable Better Auth IP tracking (the schema column may remain
nullable for adapter compatibility), add a no-raw-IP auth regression, and
update Thai/English privacy and conditional per-type wording before the feature
is exposed. The copy must distinguish ordinary local generation from the
user-initiated Save action and describe account/session/provider-token storage,
retention/deletion, and the HostAtom processor accurately.

### F3 — MEDIUM — OAuth tokens are stored plaintext on shared hosting

`src/db/schema.ts:75-77` persists access, refresh and ID tokens. The
`account` configuration at `src/lib/auth.ts:50-54` does not enable
`encryptOAuthTokens`; Better Auth 1.7.2 documents that its default is plaintext
and provides AES-256-GCM encryption using the auth secret.

Required repair: set `account.encryptOAuthTokens: true`, add a storage-boundary
regression that plaintext fixture tokens do not reach the adapter/database,
and document secret rotation/backup implications. This does not require a
schema change.

### F4 — MEDIUM — UTC is claimed but not established for the MariaDB session

`src/db/index.ts:18-27` sets mysql2's client conversion option
`timezone: "Z"`. That option controls JavaScript date formatting/parsing; it
does not issue `SET time_zone = '+00:00'` to MariaDB. Meanwhile the migration
uses database-side `now()` defaults throughout. If HostAtom's session timezone
is not already UTC, generated default timestamps can be interpreted with the
wrong offset while the driver assumes UTC.

Required repair: establish and verify UTC on every new pool connection (or use
a proven database-account/session default), then add a live MariaDB probe for
`@@session.time_zone`, `NOW()`, round-trip `Date`, and `timestamp(3)` precision.

### F5 — LOW — Body-size protection relies on a client-supplied Content-Length

`src/app/api/qr-codes/route.ts:19-29` rejects a declared oversized request but
calls `request.json()` without a bounded read when the header is absent or
understated. Zod rejects the parsed value later, but only after the whole JSON
body was allocated.

Recommended repair before public scale: enforce a byte-limited streaming/text
read or a reviewed reverse-proxy request-body limit, with chunked and false
`Content-Length` tests.

## Scope that passed review

- Drizzle schema, snapshot and 29-statement initial SQL agree offline across
  ten tables; the old PostgreSQL migration remains separate.
- MariaDB-compatible UUID strings, JSON documents, nullable unique short code,
  foreign keys, indexes and Better Auth table shapes are coherent for an empty
  database.
- Google auth is all-or-nothing with the MariaDB DSN; no secret crosses a
  client boundary in the reviewed source.
- Saved-QR create validation accepts only Static mode in Phase 2A and validates
  the complete discriminated payload/style contracts.
- Record mutations scope both ID and owner ID, return minimal DTOs, use
  same-origin checks, and do not expose DB errors or payloads in responses.
- Dashboard is request-time-only, localized, noindex and redirects anonymous
  requests. Static generation remains available without account configuration.
- The Free Dynamic limit is frozen at five server-side; Dynamic redirects and
  analytics remain disabled.
- Next.js 16.3.1 conventions were checked against the installed authentication,
  data-security and Route Handler guides. The route/DAL split is structurally
  sound, subject to the authoritative-session finding.

## Independent verification

- `npm test`: 26 files / 918 Vitest tests PASS; 119 script tests PASS.
- `npm run check:drift`: PASS, 10 tables / 29 statements, offline/no DB.
- `npm run typecheck`: PASS (`next typegen` and `tsc --noEmit`).
- `npm run lint`: PASS.
- `git diff --check`: PASS.
- Package tree resolved with `mysql2@3.24.2`, `drizzle-orm@0.45.2`,
  `drizzle-kit@0.31.10`, `better-auth@1.7.2` and `next@16.3.1`; six previously
  disclosed platform/WASM packages remain labeled extraneous.

No database connection, credential read/write, browser operation, deployment,
DNS/TLS change, source edit, dependency install, or production mutation was
performed by this review. The only new file is this report.

## Next action

PM may treat the exact frozen SQL as reviewed for an **empty-database schema
bootstrap only** if separately authorized and if no application is pointed at
it. Assign bounded repairs for F1-F4, review the revised auth/legal/DB-runtime
delta, then run live MariaDB schema/auth/revocation/ownership/CRUD/timezone
tests. F5 can follow in the same hardening pass. Do not deploy or enable the
DB-backed account feature from this candidate.
