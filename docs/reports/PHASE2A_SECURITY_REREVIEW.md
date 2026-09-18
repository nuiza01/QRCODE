# Phase 2A MariaDB — Security Re-review

Date: 2026-08-31 (Asia/Bangkok)  
Reviewer: SECURITY / NQR-P2A-SEC / iteration-2  
Verdict: **SCOPED PASS for SEC-P2A-001/003/004/005 repairs**  
Overall Phase 2A activation status: **BLOCKED by open SEC-P2A-002 product/storage decision**

This was an independent defensive source and focused-test re-review. It did
not modify application source, connect to MariaDB, access Plesk or credentials,
run OAuth/browser flows, apply a migration, deploy, or change production.

## Candidate identity

- Original SECURITY report SHA-256:
  `fe919ff2150116b250baf45857051d46e993a3c409362d4a9517c747c37a5b9a`
- `src/lib/auth.ts`:
  `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- `src/lib/request-auth.ts`:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- `src/lib/bounded-json.ts`:
  `22262053cec26a3acb0d5ed1fb341b77ce1167965b2c2afb84e534e42372e5b1`
- `src/app/api/qr-codes/route.ts`:
  `4c6032573a2b28b9eb00a19694db4623861c1ee08410c2b36c1f1b4944ed959c`
- `src/app/api/qr-codes/[id]/route.ts`:
  `ca0e14ee5a119f887c0730fda5477c7532156b9c2cc225645e0de9f14c8b0303`
- `src/app/[locale]/legal-strings.ts`:
  `3c63f148ab7568c369f12e3e85b507ef983009400e14e06ac0a390890c22e8b3`
- `src/db/index.ts`:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- Package lock remains:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- MariaDB migration remains:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Saved-QR contract/DAL remain unchanged from iteration-1:
  `e9031a90805abfe37957e8ff501718de7ebf2d11bf4df4b7c73f1ce5a23a10b7`
  / `9fcf3cbd654865ad8522292f2ed46bb5861bcd0b67aa6c1bdb2eeaa468ae18f5`

## Re-reviewed findings

### SEC-P2A-001 — CLOSED in code/unit scope

The seven-day JWE authorization snapshot is removed:

- `session.cookieCache.enabled` is false.
- The server authorization primitive calls `getSession()` with
  `disableCookieCache: true`, so protected dashboard/API reads must resolve the
  current MariaDB session rather than a client snapshot.
- `disableRefresh: true` prevents an authorization check from extending a
  session as a side effect.

Inspection of Better Auth 1.7.2 confirms the no-cache path resolves the signed
opaque session token through the internal session adapter. The focused test
also freezes the authoritative query options. A real revoke test against
MariaDB remains mandatory before deployment, but no code-review gap from the
original finding remains.

### SEC-P2A-003 — CLOSED in code/unit scope

Persistent account configuration now sets:

- `encryptOAuthTokens: true`, invoking Better Auth 1.7.2's symmetric token
  encryption before database storage;
- `storeAccountCookie: false`, so durable provider token material is not
  duplicated into the browser account cookie; and
- database-backed OAuth state storage.

The installed implementation was inspected to confirm that the option routes
non-empty tokens through Better Auth's encrypted token utility. Production
OAuth sign-in/refresh/sign-out, encrypted-at-rest inspection, secret rollover,
and restore are still runtime gates rather than claims from this review.

### SEC-P2A-004 — CLOSED in code/disclosure scope

A Better Auth `session.create.before` database hook overwrites `ipAddress` with
an empty value before adapter persistence. Inspection of Better Auth's hook
merging order confirms the returned value replaces the raw address assembled
by its session creator. IP may still be used by Better Auth's short-lived
in-memory rate limiter; it is not retained in the session row by this path.

Thai and English privacy disclosures now agree with Phase 2A behavior:

- anonymous creation/preview/download remain local;
- Save QR is an explicit action and sensitive payload categories are named;
- user/session/Google provider records and tokens are disclosed as persistent;
- current QR deletion and missing self-service account deletion are stated;
- raw session IP and inactive analytics boundaries are stated;
- backup retention is not falsely represented as immediate erasure; and
- Google revocation is correctly distinguished from Nexora data deletion.

The schema retains a nullable `ip_address` compatibility column. The no-raw-IP
guarantee therefore depends on the tested auth hook; future session creation
paths must keep that hook or add a database constraint. A live-row inspection
after Google sign-in remains a release gate.

### SEC-P2A-005 — CLOSED in code/unit scope

Both create and rename JSON mutations use one `readBoundedJson()` boundary.
It validates exact `application/json`, treats declared length only as an early
hint, counts actual `Uint8Array` bytes from the stream, cancels best-effort as
soon as the cap is crossed, rejects malformed UTF-8/JSON, and never hands an
oversized value to Zod or the DAL.

Regressions cover chunked input, understated/oversized `Content-Length`, exact
boundary, malformed UTF-8/JSON, consumed bodies, unsupported media types, and
route-level no-mutation behavior. A matching Plesk/reverse-proxy body limit is
still defense in depth. Low advisory: create currently performs the bounded
read before session lookup; when SEC-P2A-002 adds rate controls, prefer an
early authenticated/rate-limited gate before consuming the full allowed
800,000 bytes.

## Remaining finding

### SEC-P2A-002 — OPEN / PRODUCT DECISION REQUIRED

There is still no per-account count or stored-byte quota for saved Static QR
records, and create/duplicate remain unbounded in record count. This was not
part of the iteration-2 code delta because PM must first record what “free and
unlimited Static QR” means for server storage rather than browser generation.

Until that decision exists, the DB-backed application must not be enabled for
public account saves. Recommended minimum contract:

1. Keep local Static QR generation/download unlimited without login.
2. Give saved Static QR storage an explicit Free count and/or byte allowance.
3. Enforce create and duplicate atomically, including concurrent requests.
4. Add per-account plus defensive source-rate controls and stable quota errors.
5. Preserve the separate future Free Dynamic limit of five in its Phase 2B
   transaction.

An empty database and reviewed migration may remain infrastructure-only
preparation under separate PM/user authority, but they do not close this gate
or authorize the DB-backed build.

## Additional control observed

`src/db/index.ts` now configures both mysql2 Date conversion and each MariaDB
server session for UTC. New pooled connections enqueue
`SET SESSION time_zone = '+00:00'` and are destroyed on initialization failure.
This closes an earlier consistency gap between driver conversion and MariaDB
`TIMESTAMP`/default evaluation. It is not a substitute for a live HostAtom UTC
probe.

## Verification

- Focused Vitest: 10 files / 60 tests PASS.
- Type generation and TypeScript: PASS.
- Focused ESLint over repaired production/test paths: PASS.
- Script suite: 119/119 PASS.
- Offline MariaDB drift: 10 tables / 29 statements PASS; no DB connection.
- Installed Better Auth 1.7.2 source inspected for cookie-cache bypass,
  database hooks, and OAuth token encryption/account-cookie behavior.
- Post-check migration, package lock, original review, and saved-QR
  contract/DAL hashes remained unchanged.

Not performed: full Vitest/build, dependency vulnerability audit, live
MariaDB/session revocation, OAuth, encrypted-row inspection, concurrency,
proxy-size behavior, backup/restore, Plesk, credentials, browser, deploy, or
production mutation.

## Next sequence

1. PM obtains the saved-Static storage decision from the user.
2. BACKEND implements atomic create/duplicate quota and rate controls.
3. TL/SECURITY independently review that frozen delta.
4. QA uses one immutable MariaDB-backed candidate for revoke, encrypted token,
   no-raw-IP, cross-owner, quota race, bounded-body, CRUD, backup/restore and
   rollback verification before a separate deployment approval.

