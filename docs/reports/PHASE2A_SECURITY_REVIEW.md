# Phase 2A MariaDB — Independent Security Review

Date: 2026-08-31 (Asia/Bangkok)  
Reviewer: SECURITY / NQR-P2A-SEC  
Verdict: **REQUEST_CHANGES — DO NOT ENABLE THE DB-BACKED BUILD YET**

This is a defensive source, configuration, migration, and focused-test review.
It did not access Plesk, create a database/user, read credentials, connect to a
database, run a browser, migrate data, deploy, or change application source.

The empty MariaDB schema is internally consistent, but the DB-backed
application must not be made public until the P1 findings below are fixed and
independently retested. A separately authorized empty-database creation and
migration can remain infrastructure preparation only; it is not permission to
enable authentication or saved-QR endpoints.

## Reviewed identity

- Phase 2A plan: `docs/PHASE2_IMPLEMENTATION_PLAN.md`
- Implementation report: `docs/reports/PHASE2A_MARIADB_IMPLEMENTATION.md`
- MariaDB migration SHA-256:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- `package-lock.json` SHA-256:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- `src/lib/auth.ts` SHA-256:
  `39ba93483f4b797bcd2b86754a2dddb2ee25ef5d23248d0d357fcba1d316cbb4`
- `src/features/saved-qr/contracts.ts` SHA-256:
  `e9031a90805abfe37957e8ff501718de7ebf2d11bf4df4b7c73f1ce5a23a10b7`
- `src/features/saved-qr/data.ts` SHA-256:
  `9fcf3cbd654865ad8522292f2ed46bb5861bcd0b67aa6c1bdb2eeaa468ae18f5`
- `src/app/[locale]/legal-strings.ts` SHA-256:
  `2014e6e529ce2e69c192d91bd81d7ef2beb1f15c11577dc9877595917451f8b9`

## Findings

### SEC-P2A-001 — HIGH — Revoked persistent sessions can remain authorized for seven days

`src/lib/auth.ts:41-48` enables the Better Auth JWE cookie cache with
`maxAge` equal to the full seven-day session lifetime and `refreshCache: true`.
`src/lib/request-auth.ts:6-8` then authorizes dashboard/API requests through
`getSession()` without `disableCookieCache: true`.

The installed Better Auth 1.7.2 implementation returns a valid cached session
without querying MariaDB while that cache is current. Its official session
documentation explicitly warns that revoked sessions remain active until the
cache expires. The current settings are the documented stateless-session
pattern carried into a persistent-database design, not a short-lived cache.

Impact: a copied `session_data` plus session-token cookie can continue reading
and mutating saved QR data after server-side revocation, account response, or
administrative session deletion, for up to seven days.

Required repair:

1. Disable cookie caching or reduce it to a deliberately short lifetime (the
   official example is five minutes, with a shorter value where needed).
2. Make the server authorization primitive used by dashboard and mutations
   force a database-backed session lookup (`disableCookieCache: true`).
3. Add a regression that creates a cache, revokes/deletes the DB session, and
   proves the protected API rejects it before the original cache expiry.

Reference: <https://better-auth.com/docs/concepts/session-management>

### SEC-P2A-002 — HIGH — One account has unbounded stored-QR growth

`POST /api/qr-codes` accepts repeated records and
`createSavedQrCode()` inserts each one without a per-account saved-record or
stored-byte quota. `duplicateSavedQrCode()` also inserts without a quota or
rate boundary. Each create can carry nearly `800,000` bytes. The documented
Free limit of five applies only to future Dynamic QR records; Phase 2A has no
server limit for saved Static records.

Impact: one valid Google account can exhaust the shared HostAtom database and
affect every tenant/user. “Static generation is unlimited” is a browser
generation promise and must not silently imply unlimited server storage.

Required repair:

1. Product/PM must choose an explicit saved-Static count and/or stored-byte
   allowance for the Free plan.
2. Enforce create and duplicate atomically in MariaDB, so concurrent requests
   cannot pass a count-then-insert race.
3. Add per-account and defensive request-rate controls; return stable quota
   errors and test the boundary plus concurrent attempts.
4. Keep the existing future Dynamic limit of five, but enforce that separately
   in the Phase 2B transaction.

### SEC-P2A-003 — MEDIUM — OAuth token material is stored in plaintext and duplicated to a browser cookie

The `account` table includes access, refresh, and ID-token columns.
`src/lib/auth.ts:50-54` does not enable `encryptOAuthTokens`, whose Better Auth
default is false, and sets `storeAccountCookie: true` even though MariaDB is now
the durable account store. Better Auth documents that this cookie can contain
provider token material.

Google scopes are currently narrow, which limits impact, but a database dump,
backup exposure, or unnecessary account-cookie exposure should not reveal
usable provider tokens.

Required repair: set `account.encryptOAuthTokens: true`, disable
`storeAccountCookie` for the persistent configuration unless a reviewed flow
demonstrates a need, and verify sign-in/refresh/sign-out plus secret-rotation
and backup/restore behavior. Avoid requesting or retaining refresh access that
the product does not use.

### SEC-P2A-004 — MEDIUM / PRIVACY RELEASE BLOCKER — Raw session IP and public policy contradict the approved contract

The approved plan says raw IP addresses are never persisted, but the schema
contains `session.ip_address` and Better Auth tracks session IP by default;
`advanced.ipAddress.disableIpTracking` is not set. Separately, the published
Thai and English privacy text at `src/app/[locale]/legal-strings.ts:29` and
`:61` says there is no account database and that provider/session data exists
only in encrypted cookies. Phase 2A instead stores user name/email/image,
session metadata, provider-account data, and user-requested QR payload/style in
MariaDB.

Required repair before enabling persistence:

1. Disable Better Auth IP tracking to honor the no-raw-IP contract, or obtain a
   new explicit policy decision and document lawful purpose, retention, and
   access controls. Disabling is the recommended Phase 2A choice.
2. Update Thai and English privacy disclosures before the DB-backed build is
   public: data categories, save action, purposes, HostAtom/Google processors,
   retention/deletion, account/QR deletion and rights-contact process, backup
   treatment, and the distinction between local anonymous generation and an
   explicit Save action.
3. Define and test expired-session cleanup; a seven-day session expiry is not
   by itself proof that old database rows/backups are deleted.

### SEC-P2A-005 — MEDIUM — Request-size enforcement trusts `Content-Length`

`POST /api/qr-codes` rejects a declared oversized body but calls
`request.json()` when `Content-Length` is absent, invalid, or understated.
The post-parse Zod byte check protects database content, not memory consumed
while buffering/parsing the request. Rename PATCH has neither content-type nor
body-size enforcement.

Required repair: use one bounded body reader that counts actual streamed bytes
before JSON parsing, apply it to every JSON mutation, configure a matching
reverse-proxy limit, and test missing, invalid, understated, and chunked length
cases. A proxy limit is defense in depth, not a replacement for the route
boundary.

## Controls that passed this review

- Google/auth configuration is all-or-nothing; production auth origin must be
  an exact HTTPS origin and secrets remain server-side.
- Better Auth's built-in origin/CSRF checks are not disabled. Application QR
  mutations additionally require an exact canonical `Origin` and a session.
- Every list/read/update/delete/duplicate path reviewed binds data access to the
  authenticated `userId`; update/delete repeat ownership in the mutation
  predicate. Unknown and foreign UUIDs converge on `404`.
- Phase 2A create accepts only `mode: static`; Dynamic redirects/analytics are
  not activated. The future Free Dynamic constant is five, but is not mistaken
  for an implemented transactional Phase 2B quota.
- QR payload/style/name values use server-side Zod validation; URL payloads are
  restricted to HTTP(S), stable field bounds exist, and response bodies use
  generic errors with `Cache-Control: no-store`.
- Database access uses parameterized Drizzle expressions; no raw SQL, DSN,
  token, password, or provider error logging was found in the reviewed app
  paths. The pool is server-only, uses UTC, and is capped at five connections.
- Migration/schema/snapshot drift verification passed offline: 10 tables and
  29 SQL statements. Foreign keys, owner indexes, session-token uniqueness,
  and cascade behavior are present.

## Operational MariaDB gate

For the separately approved Plesk preparation, do not expose any credential in
chat, terminal output, reports, screenshots, source, or client environment.
Use an empty dedicated database and a unique app user scoped only to that
database. Apply the reviewed migration using transient DDL authority, then
remove `CREATE`, `ALTER`, `DROP`, `INDEX`, and `REFERENCES` from the long-lived
runtime credential; runtime should retain only the data privileges it actually
uses (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). If Plesk cannot express this with
one account, use separate migration and runtime users.

Before any DB-backed deployment, record a restorable off-host encrypted backup
identifier and a rollback procedure without secrets. Localhost MariaDB traffic
may remain loopback-only; any future remote DB connection requires authenticated
TLS. Migration success alone is not auth, privacy, ownership, or launch proof.

## Verification performed

- Focused Vitest: 4 files / 33 tests PASS (auth config/policy, saved-QR
  contracts, create route).
- Script suite: 119/119 PASS.
- Offline MariaDB drift check: 10 tables / 29 statements PASS; no connection.
- Installed direct dependencies resolved: Better Auth 1.7.2, Drizzle ORM
  0.45.2, mysql2 3.24.2.
- Static inspection covered auth handler/config/policy, session authorization,
  saved-QR routes/contracts/DAL/UI, MariaDB schema/SQL/drift, environment
  parsing, privacy/terms copy, and credential/error logging paths.

Not performed: full application suite/build, dependency vulnerability audit,
live MariaDB semantics, concurrency, browser cookies/OAuth, Plesk, credentials,
backup/restore, migration/rollback, deploy, or production traffic.

## Required next sequence

1. AUTH fixes SEC-P2A-001 and SEC-P2A-003.
2. BACKEND/FORMS fixes SEC-P2A-002 and SEC-P2A-005 after PM records the saved
   Static storage policy.
3. PRODUCT/LEGAL fixes SEC-P2A-004, with SECURITY verifying that source,
   behavior, retention, and public copy agree.
4. Independent TL/SECURITY re-review the frozen deltas.
5. QA runs MariaDB-backed revocation, cross-user isolation, quota/race,
   bounded-body, CRUD, OAuth, privacy-copy, backup/restore, and rollback tests
   on one immutable candidate before any deployment approval.

