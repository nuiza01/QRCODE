# Phase 2A Independent QA Re-review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-QA`  
Iteration: 2  
Verdict: **REVIEW_FAILED for enabling the DB-backed application**  
Infrastructure disposition: **the unchanged empty-database migration remains
eligible for the separately authorized schema bootstrap only**

## Scope and frozen identity

QA rechecked the assembled Phase 2A source after the auth, bounded-body, UTC
and privacy-copy repairs. No database, OAuth account, Plesk setting, browser or
production service was used. QA did not edit application source; this report
is the only file written by the assignment.

Key inputs before and after verification:

- package lock:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- MariaDB schema:
  `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- initial MariaDB SQL:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- database runtime:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- auth runtime:
  `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- authoritative request auth:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- bounded JSON reader:
  `22262053cec26a3acb0d5ed1fb341b77ce1167965b2c2afb84e534e42372e5b1`
- create endpoint:
  `4c6032573a2b28b9eb00a19694db4623861c1ee08410c2b36c1f1b4944ed959c`
- rename/delete endpoint:
  `ca0e14ee5a119f887c0730fda5477c7532156b9c2cc225645e0de9f14c8b0303`
- legal strings:
  `3c63f148ab7568c369f12e3e85b507ef983009400e14e06ac0a390890c22e8b3`
- generator strings:
  `74a8dafb886259f9e07c37b001d441d20fd4eb677e21c696a943af4849b31042`
- saved-QR DAL, unchanged from iteration 1:
  `9fcf3cbd654865ad8522292f2ed46bb5861bcd0b67aa6c1bdb2eeaa468ae18f5`

## Fresh verification

- `npm test`: **32 files / 945 application tests PASS** and **119 script
  tests PASS**.
- Focused no-environment run with MariaDB, Better Auth and Google environment
  variables removed: **12 files / 479 tests PASS**. It covered Generator,
  auth menu/config/policy/runtime, authoritative request auth, bounded JSON,
  MariaDB connection initialization, saved-QR contracts, create/rename routes
  and SEO/privacy content.
- `npm run typecheck`: PASS after Next route type generation.
- `npm run lint`: PASS.
- `npm run check:drift` without `DATABASE_URL`: PASS — **10 tables / 29 SQL
  statements**, offline and without a connection.
- `git diff --check`: PASS.
- One normal no-environment `npm run build` reached Next 16.3.1 Turbopack and
  failed at the known host boundary when the PostCSS worker tried to bind an
  internal port (`Operation not permitted`) while writing the sitemap
  endpoint. No permission or toolchain bypass was attempted. This is not
  successful build evidence.

## Repaired controls — scoped pass

1. Protected reads and mutations now request an authoritative database session
   with cookie-cache and refresh paths disabled. Better Auth's session cookie
   cache is disabled globally.
2. Provider tokens are configured for encryption, account-token cookie
   duplication is disabled, and OAuth state uses the database.
3. The session-create hook replaces the request IP with an empty value before
   adapter persistence. The code/unit evidence supports the no-raw-IP storage
   contract; an actual MariaDB row check remains required.
4. One shared streamed JSON reader enforces actual bytes, exact JSON media type
   and fatal UTF-8 decoding. Create and rename use it, including understated
   and chunked-length regressions.
5. New MariaDB pool connections enqueue `SET SESSION time_zone = '+00:00'`
   and destroy the connection on initialization error. This is code/unit
   evidence, not the required live `@@session.time_zone` and timestamp probe.
6. Thai and English generator/landing copy now distinguish local generation
   and download from the explicit Save QR action. The privacy page now
   describes persisted account/session/provider records, saved QR payloads,
   deletion limitations and backup caveats.
7. With account configuration absent, the server leaves the account menu and
   Save QR card unmounted; anonymous local generation remains DB-independent.

## Remaining actionable findings

### QA-P2A-001 — HIGH — saved Static QR storage is still unbounded

The assembled candidate retains the iteration-1 DAL unchanged. Both
`createSavedQrCode` and `duplicateSavedQrCode` insert another server-stored
record without a per-account count, stored-byte or request-rate boundary. The
existing 5-record constant is only for future Dynamic QR codes. Static
generation may remain free and unlimited in the browser, but that does not
make unlimited shared MariaDB storage safe. Each accepted saved record can be
close to 800,000 bytes, so one valid Google account can consume shared-host
storage repeatedly.

Required before enabling the DB-backed app:

- record a Product/PM limit for Free saved Static records and/or stored bytes;
- enforce create and duplicate atomically in MariaDB so concurrent requests
  cannot bypass it;
- return one stable quota result and add boundary plus concurrency tests;
- add a defensive per-account request-rate control separate from the future
  Dynamic limit.

This finding does not alter or invalidate the empty initial schema SQL. It
blocks public account/save enablement and deployment.

### QA-P2A-002 — MEDIUM — hosting processor remains generic in public copy

The revised policy names Google and accurately describes the current data
categories, but it refers only to a generic “hosting provider”. The approved
plan identifies HostAtom as the initial MariaDB/hosting processor, and the
prior TL/SECURITY disposition required that processor relationship to be
stated accurately before exposure. Name HostAtom (and its relevant role/link
once verified) rather than leaving the material processor implicit. Publish
the actual off-host backup retention/deletion process before enabling saved
data, as the current copy correctly says this is still pending.

## Coverage still required

Even after the two findings above are repaired, final Phase 2A acceptance
requires the same immutable candidate to pass live MariaDB 10.11 migration
inventory, UTC/timestamp precision, encrypted-token and no-raw-IP row checks,
Google login/revocation/logout, two-user CRUD isolation, quota concurrency,
Save QR/dashboard runtime, backup/restore and rollback evidence. The current
suite still has no direct automated route test for duplicate/delete and is not
a substitute for that multi-user evidence.

No source, dependency, migration, database, credential, DNS or deployment
state was changed by QA.
