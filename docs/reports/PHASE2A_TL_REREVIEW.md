# Phase 2A MariaDB — Independent TL Re-review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-TL`, iteration 2  
Verdict: **REQUEST_CHANGES for public activation; SCOPED PASS for F1-F5 repairs**

The iteration-2 candidate closes every actionable finding from the first TL
review in code/unit/disclosure scope. The remaining blocker is a separate
product and storage-control decision: saved Static QR storage is currently
unbounded. Therefore the reviewed empty MariaDB schema can remain an
infrastructure-only bootstrap, but the account/Save QR application must not be
enabled publicly from this candidate.

## Candidate identity

- Original TL report:
  `4b32c1be5f23a1816847b21a56e03749665dffd42e03ddc221122a8acba68d80`
- `src/lib/auth.ts`:
  `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- `src/lib/request-auth.ts`:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- `src/db/index.ts`:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- `src/lib/bounded-json.ts`:
  `22262053cec26a3acb0d5ed1fb341b77ce1167965b2c2afb84e534e42372e5b1`
- Create route:
  `4c6032573a2b28b9eb00a19694db4623861c1ee08410c2b36c1f1b4944ed959c`
- Rename/delete route:
  `ca0e14ee5a119f887c0730fda5477c7532156b9c2cc225645e0de9f14c8b0303`
- Thai/English legal strings:
  `3c63f148ab7568c369f12e3e85b507ef983009400e14e06ac0a390890c22e8b3`
- Schema/migration/package lock remain unchanged:
  `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
  / `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
  / `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`

## Original findings

### F1 — CLOSED in code/unit scope

`src/lib/auth.ts:41-46` disables the Better Auth session snapshot cache, and
`src/lib/request-auth.ts:6-16` explicitly asks for
`disableCookieCache: true` and `disableRefresh: true`. Protected Dashboard
reads and every saved-QR mutation use this helper, so MariaDB is the current
authorization authority and authorization checks do not extend the session.

Inspection of installed Better Auth 1.7.2 confirms the query bypasses the
cookie-cache early return and resolves the opaque session token through the
session adapter. Focused tests freeze these options. A real create/revoke/read
probe against HostAtom remains a live gate, not an unresolved code defect.

### F2 — CLOSED in code/disclosure scope

The Better Auth `session.create.before` hook at `src/lib/auth.ts:56-66`
overwrites the adapter-bound `ipAddress` with an empty string. Installed
Better Auth hook ordering was inspected: returned hook data is merged over the
session before adapter creation. The raw address may still key Better Auth's
short-lived in-memory auth rate limiter, but it is not persisted by this
session-create path.

Thai and English privacy copy now distinguishes local anonymous
generation/preview/download from the explicit Save action, names sensitive
payload categories, discloses persistent account/session/provider records,
states deletion and backup limitations, and does not claim immediate backup
erasure. All ten localized QR-content modules now condition their local-only
claim on not pressing Save; the WiFi FAQ explicitly discloses password storage.

The compatibility `session.ip_address` column remains nullable. A live login
row inspection is still required to prove that the current library/runtime
stores no raw IP.

### F3 — CLOSED in code/unit scope

`src/lib/auth.ts:48-55` enables Better Auth OAuth-token encryption, disables
the provider-account cookie and uses database-backed OAuth state. Inspection
of Better Auth 1.7.2 confirms non-empty access/refresh/ID tokens route through
its symmetric encryption helper before database storage. The database `text`
columns can hold the encrypted representation without a migration change.

Production Google login/refresh/sign-out, ciphertext-at-rest inspection,
secret rollover and backup/restore remain runtime/operational gates.

### F4 — CLOSED in code/unit scope

`src/db/index.ts:13-40` retains mysql2 UTC conversion and enqueues
`SET SESSION time_zone = '+00:00'` as the first command on every new raw pooled
connection, destroying the connection if initialization fails. Inspection of
mysql2 3.24.2 confirms its raw pool emits `connection` synchronously before the
borrower callback; the initialization query is therefore queued before the
first Drizzle query.

The unit probe freezes success/failure behavior. A HostAtom probe must still
verify `@@session.time_zone`, `NOW()`, `timestamp(3)` precision and a JavaScript
Date round trip before DB-backed deployment.

### F5 — CLOSED in code/unit scope

`readBoundedJson()` validates exact JSON media type, uses declared length only
as an early hint, counts actual streamed bytes before parsing, rejects malformed
UTF-8/JSON, and stops at the cap. Create and rename both use the shared helper.
Tests cover exact boundary, chunked/understated/oversized length, malformed
input, consumed bodies and unsupported media types.

Low advisory: create currently consumes up to the full allowed 800,000 bytes
before the authoritative session lookup. When the remaining quota/rate-control
work is implemented, authenticate and rate-limit before accepting the full
body; keep the stream boundary as defense in depth.

## Remaining blocker

### F6 — HIGH / PRODUCT DECISION REQUIRED — Saved Static storage is unbounded

The product promise in `docs/PHASE2_IMPLEMENTATION_PLAN.md` makes **local
Static generation/download** unlimited. It does not establish unlimited server
storage. The current account implementation has no saved-Static count or byte
allowance:

- `src/features/saved-qr/contracts.ts:5-22` allows each stored request to
  approach 800,000 bytes;
- `src/features/saved-qr/data.ts:31-46` inserts every create without a quota;
- `src/features/saved-qr/data.ts:78-97` duplicates the same potentially large
  payload without a quota;
- the create and duplicate routes have no per-account/request-rate boundary;
  and
- the dashboard lists every record without pagination.

One valid Google account can repeatedly save or duplicate logo-bearing records
until the shared HostAtom database or application memory is exhausted. The
future Free Dynamic limit of five does not protect saved Static rows.

Required before feature activation:

1. Product/PM records the Free saved-Static count and/or stored-byte allowance;
   local generation/download remains unlimited and separate.
2. BACKEND enforces create and duplicate atomically so concurrent requests
   cannot pass a count-then-insert race.
3. Add per-account and defensive source-rate controls, a stable quota response,
   localized UI behavior, and boundary/concurrency tests.
4. Bound/paginate dashboard reads consistently with that policy.
5. Keep the Dynamic limit of five as a separate Phase 2B transaction rule.

TL does not choose this product limit on the user's behalf. Until the decision
and reviewed implementation exist, Phase 2A account Save remains blocked from
public activation.

## Independent verification

- Focused repaired paths: 8 files / 218 tests PASS.
- Full `npm test`: 32 files / 945 Vitest tests PASS; 119 script tests PASS.
- `npm run check:drift`: PASS — 10 tables / 29 SQL statements, offline/no DB.
- `npm run typecheck`: PASS (`next typegen` + `tsc --noEmit`).
- `npm run lint`: PASS.
- `git diff --check`: PASS.
- Installed Better Auth 1.7.2 and mysql2 3.24.2 implementation order was
  inspected for cache bypass, database hooks, token encryption/account cookie,
  pool events and first-query ordering.

No source, database, credentials, Plesk, browser, OAuth account, migration,
backup, deployment, DNS/TLS or production state was changed by this re-review.
The only file written is this report.

## Next action

PM may continue an explicitly authorized **empty-database migration only** and
keep it disconnected from the application. Obtain the saved-Static policy,
implement F6, re-review its exact contract/DAL/API/UI delta, then run one live
MariaDB candidate through auth revocation, encrypted-token/no-raw-IP inspection,
two-user ownership, atomic quota race, bounded-body, CRUD, UTC, backup/restore
and rollback tests. Deployment requires a later explicit approval.
