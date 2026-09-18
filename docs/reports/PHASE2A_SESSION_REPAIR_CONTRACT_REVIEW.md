# Phase 2A session repair contract review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: NQR-062 / TL + Security / iteration 1  
Verdict: **CONTRACT READY**

This verdict means that the offline diagnostic/repair boundary, privacy rules,
red regressions and independent review gate are sufficiently precise for a
candidate to be frozen and reviewed. It does **not** identify the production
root cause, approve or review the still-unfrozen NQR-061 candidate, authorize a
build or database access, or approve another production activation.

## Scope and frozen review inputs

This was a read-only contract review of the authoritative working tree and the
installed dependency code. No application source, package, schema, migration,
candidate or production state was changed. No Plesk, browser, network, real
database, build, deployment, production or secret access was performed.

The following initial inputs were read and independently hashed where
applicable:

| Input | Version or SHA-256 |
| --- | --- |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |
| `src/lib/auth.ts` | `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f` |
| `src/db/index.ts` | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| `src/db/schema.ts` | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| `drizzle/0000_shallow_vision.sql` | `13b765dd3558c9355f6fc7c1d1e23472e4dd8fa950ebd980f47001ae658c89ee` |
| production diagnostic report | `b52e03c643c06f9081d82c1fb1bf1bb7f0ab63a4eff02fd9952a7de75bcffc98` |
| deployment/rollback report | `0944a4f46b91863107d71e7734d2a573a2db29e9ee22a1f1d4672fed450eaa48` |
| Better Auth | `1.7.2` |
| `@better-auth/core` | `1.7.2` |
| `@better-auth/drizzle-adapter` | `1.7.2` |
| Drizzle ORM | `0.45.2` |
| mysql2 | `3.24.2` |

Installed-code evidence was tied to these exact files:

- Better Auth session route:
  `node_modules/better-auth/dist/api/routes/session.mjs`, SHA-256
  `831a00b6e144c1560c21406de1db586a67089630ad58fb2f3c7dcd3c5c963d57`;
- Better Auth internal adapter:
  `node_modules/better-auth/dist/db/internal-adapter.mjs`, SHA-256
  `dff06457e141795b3abfa0072b4fed57dd7ff6d5773ede2a3dc91dcfd1f1fdc8`;
- Better Auth adapter factory:
  `node_modules/@better-auth/core/dist/db/adapter/factory.mjs`, SHA-256
  `a29c8924fe90d19e25120017669edbe16e903dc7fff4cadd66b95221a665f795`;
- Drizzle adapter:
  `node_modules/@better-auth/drizzle-adapter/dist/index.mjs`, SHA-256
  `d0bd019ad1db62906b3b1a4c9ec21d4eb204f300a8fe204fc2b5e01b3c1c1`.

No NQR-061 bytes, digest or report were available as a frozen review input.
This report deliberately makes no candidate verdict.

### Concurrent source activity

During final report verification, `src/lib/auth.ts` changed from the reviewed
preimage `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f`
to `34a834fef3020a17533c4d2b624934425577c308d9e91f00236ae0bd80372be4`.
This is consistent with the separately assigned, concurrent NQR-061 work, but
this review does not attribute authorship from a hash. TL/Security did not read
or assess those moving bytes and made no source edit. Package, lock, DB
initialization, schema, migration and the two production evidence reports kept
the exact hashes in the table above. The contract verdict is tied to the
initial authoritative preimage plus pinned dependency evidence; candidate
review must wait for PM to freeze and identify the final NQR-061 bytes.

## What the evidence establishes

The production evidence establishes only the following facts:

1. A Google callback returned to the dashboard, while the application still
   showed the sign-in control and the fixed saved-QR load failure.
2. Ordinary access evidence recorded authenticated
   `GET /api/auth/get-session` responses returning HTTP 500.
3. The one-shot wrapper observed the first Better Auth
   `INTERNAL_SERVER_ERROR` at the `get-session` stage. Its outer value was a
   generic `Error` with only `stack` and `message` as own keys. It had no own
   `code`, `sqlState`, `errno` or `cause`.
4. Direct administrative checks reported one user, four active non-orphan
   sessions, expected DDL and successful direct reads. Those checks did not
   identify which sub-operation failed for the request token.
5. A prior candidate replaced the `session -> user` lookup with two explicit,
   MariaDB-portable reads and kept `advanced.database.joins: false`; its
   authenticated `get-session` still returned 500 and it was rolled back.
6. The active production application was restored to rollback BUILD_ID
   `m1fxDjFEQxdLlI91m1Czx`; no repair candidate is presently accepted as live.

The installed request chain explains why the existing evidence is not more
specific:

- `get-session` reads the signed session cookie and returns `null` if no valid
  token is available (`session.mjs:38-40`).
- It calls `internalAdapter.findSession(token)` inside one broad route-level
  `try` (`session.mjs:38-225`). The catch logs the received error and converts
  it to Better Auth's fixed `FAILED_TO_GET_SESSION` API error.
- `findSession` asks the database adapter for model `session`, selected by the
  token, with `{ user: true }` (`internal-adapter.mjs:322-358`).
- With application option `advanced.database.joins: false`
  (`src/lib/auth.ts:67-76`), the adapter factory withholds the join from the
  Drizzle adapter, performs the base session select and then resolves the user
  as a separate fallback lookup (`factory.mjs:179-210, 341-389, 540-573`).
- A join passed directly to the Drizzle adapter would use Drizzle's relational
  `findFirst({ with: ... })` path (`drizzle-adapter/index.mjs:312-351`). The
  authoritative schema currently exports the corresponding Drizzle relation
  descriptors (`src/db/schema.ts:95-115`), but the current `joins: false` path
  does not ask Drizzle to execute that relational query.

The route-level diagnostic therefore cannot distinguish cookie processing,
the session select, fallback user select, output transformation/date parsing,
or later session route work. The next evidence must be derived from explicit
operation boundaries, not from inspecting the unknown thrown value.

## Root-cause hypotheses and disposition

### Supported enough to test, not established as production cause

| Hypothesis | Evidence-based disposition |
| --- | --- |
| The failure is inside Better Auth's `get-session` execution | Supported by the one-shot stage record and HTTP 500. This remains broader than the database adapter. |
| Base session read fails | Plausible. It is the first database operation on the authoritative path, but the outer error does not identify it. |
| Separate user read fails | Plausible. Better Auth performs this fallback when `joins: false`; current installed code has a dedicated catch at that boundary. Production evidence does not say this is the failing phase. |
| Adapter output transform or session/user parsing fails | Plausible. These operations are inside the same broad route catch and were not separately observed. |
| Driver connection, per-connection UTC initialization, date conversion or a request-specific query condition fails | Plausible but unsupported. Callback writes and administrative reads make a total database outage unlikely; they do not prove that every pooled read connection or request-token query succeeds. |
| Runtime/artifact/package skew | Possible but unsupported. The failed candidate and rollback BUILD_IDs were read back, but the diagnostic did not inventory loaded module bytes in the running process. |

### Not supported as a conclusion

- **MariaDB `LEFT JOIN LATERAL` is the production root cause:** the source
  intentionally has `joins: false`, and the installed factory uses separate
  reads in that mode. A previous explicit two-read candidate also failed in
  production. LATERAL incompatibility remains a reason not to enable native
  Drizzle relational joins on HostAtom, not an identified cause of this 500.
- **Missing Drizzle relation descriptors are the cause:** the current schema
  exports the descriptors, while the active `joins: false` fallback does not
  send the join to Drizzle. No production trace points to relation lookup.
- **The user or every session row is absent/orphaned:** direct evidence reported
  one user and four non-orphan active sessions. This does not prove the exact
  token selected by the failed request, so row-level mismatch remains testable
  but must not be asserted.
- **A missing/invalid signed cookie alone explains the 500:** Better Auth
  returns `null` when no signed session token is available. It does not enter
  `findSession` merely because a cookie is absent. Malformed-cookie behavior
  and all other work inside the broad catch remain test cases.
- **Wrong secret, OAuth client, grants, schema, timezone or connection pool is
  the cause:** none is established by the redacted outer error. Successful
  callback persistence and direct reads make some total-failure variants less
  likely, but are not proof against request-path or per-connection faults.
- **The previous two-read candidate proves the adapter path is correct:** it
  proves only that its offline suite passed and the production symptom
  remained. It neither identifies the failing phase nor validates a repeat of
  the same repair without stronger boundary evidence.

## Acceptable bounded repair boundary

A candidate is contract-compliant only if all conditions below hold.

1. It may wrap only the Better Auth database-adapter operation
   `findOne({ model: "session", join: { user: true } })` and resolve that one
   join as a session select followed by a user select. All unrelated adapter
   models and methods must delegate byte-for-behavior to the pinned Drizzle
   adapter.
2. It must not route this lookup through Drizzle's native relational/LATERAL
   path on MariaDB 10.11. It must also avoid Better Auth 1.7.2's installed
   fallback-join error handler for this operation: that handler logs the
   transformed `where` value and calls `console.error(error)`
   (`factory.mjs:380-386`). A fixed public response alone is not sufficient
   privacy containment.
3. It must derive diagnostics from code-controlled phase boundaries, with an
   exact allowlist such as `session_select_failed`, `user_select_failed` and,
   only if the candidate validates its own assembled output,
   `session_result_invalid`. It must never infer a class by reading the
   unknown thrown value.
4. An absent session must remain ordinary unauthenticated `null`. An absent
   referenced user must also fail closed as `null`, never return a partial
   session. A query/runtime failure must not be converted to `null`; it must
   remain a fixed internal failure so an outage cannot masquerade as logout.
5. The wrapper must preserve Better Auth's returned shape and parsing,
   database-authoritative session expiry/revocation, cookie cache disabled,
   `disableCookieCache` and `disableRefresh` on protected reads, UUID fields,
   encrypted provider tokens, durable OAuth state, secure cookie behavior and
   the no-raw-IP persistence hook.
6. The candidate must cover both Better Auth's `/api/auth/get-session` handler
   and application callers of `auth.api.getSession`. A repair only in
   `getRequestUser` is insufficient because the auth route itself is part of
   the observed failure.
7. It must not change the MariaDB schema, migration, grants, records,
   `DATABASE_URL`, package versions, installed dependency files, OAuth
   configuration, secrets, session lifetime, quota, ownership or API error
   contracts. No cache or signed-cookie snapshot may become the authorization
   fallback.
8. It must be removable as one narrow adapter wrapper plus tests. It must not
   monkey-patch `node_modules`, console globals, the mysql2 pool or the
   generated server artifact.

This boundary is acceptable for an offline candidate, but the prior failed
two-read experiment means it is not by itself evidence that production is
fixed. A later live diagnostic may be considered only after exact-byte review,
fresh immutable build evidence and separate deployment authority.

## Privacy contract for internal classification

The classifier and its sink must satisfy all of the following:

- Classification is derived exclusively from the wrapper's current phase.
  Catch the unknown value without coercing, stringifying, serializing,
  spreading, reflecting, checking `instanceof`, reading its prototype or any
  property (`message`, `stack`, `code`, `errno`, `sqlState`, `cause`, getters
  included), or passing it to another logger.
- The event has a compile-time closed shape. Permitted data is only a fixed
  event name, a fixed phase enum and an optional coarse schema version. It
  must contain no timestamp precise enough to correlate a person unless that
  has a separately reviewed retention purpose.
- Prohibited data includes cookie and session tokens, cookie headers, user or
  account IDs, email/name/image, OAuth tokens/state, IP or user agent, SQL,
  table/column/value/`where`, DSN/host/database/user/password, request body,
  payload/style, unknown error fields, stack, source path and correlation ID
  returned to the client.
- Emit at most one classification event for one failed get-session request.
  The sink must be bounded, synchronous/non-throwing from the caller's point of
  view, and unable to change the authentication result if it fails.
- Tests may use an injected in-memory sink. Production must default to either
  no sink or a separately reviewed constant-only sink. No filesystem,
  database, analytics, external network or browser persistence is allowed by
  this candidate.
- Public behavior remains Better Auth's fixed, non-secret internal failure and
  `Cache-Control: no-store`; the internal enum must not appear in the response,
  redirect, cookie, header or localized UI.
- Console and Better Auth logger spies must prove zero forwarding of the
  original throwable. Throwing a new application-owned error is acceptable
  only if its message/name/own properties are fixed and contain no cause; the
  independent review must account for Better Auth's route-level logging of
  that replacement object.

## Exact red regressions required before implementation

The implementation report must show the following tests failing against the
authoritative preimage for the expected reason, then passing after the patch.
They must exercise the pinned installed Better Auth/adapter chain where stated,
not a reimplementation of its behavior.

1. **`session select failure is fixed-classified without throwable access`** —
   make the delegated session select throw a hostile Proxy/thenable with traps
   on property, prototype, coercion and serialization access. Expect exactly
   `session_select_failed`, zero traps, zero raw logger/console calls and a
   fixed public failure.
2. **`user select failure does not enter Better Auth fallback logging`** — let
   the session select return a bounded fixture and make the user select throw.
   Expect exactly `user_select_failed`, no log of the fixture `userId`, no
   transformed `where`, zero raw `console.error`, and a fixed public failure.
   This must fail on the unwrapped 1.7.2 fallback because that code logs
   `where` and the caught error.
3. **`session-user lookup bypasses native and core fallback joins`** — through
   actual Better Auth `findSession`, assert two non-join delegated `findOne`
   operations in order and no Drizzle relational `findFirst({with: ...})` or
   core fallback-error path.
4. **`unknown primitive and accessor-bearing failures remain opaque`** — test
   `null`, strings, numbers, symbols, rejected thenables and accessor-bearing
   objects at each read boundary. Expect no inspection/coercion, one fixed enum
   and no raw output.
5. **`classification is fixed and bounded`** — concurrent failures must emit
   at most one closed-shape event per request, with no token, user fixture,
   SQL/DSN marker, timestamp/correlation marker or thrown marker anywhere in
   sink, console, logger, response or headers.

The following preservation regressions must be green in the same focused run:

6. Existing session and matching user return the exact Better Auth
   `{ session, user }` shape, with Date values/expiry behavior preserved.
7. Missing session returns `null` without querying user and without an error
   classification; missing user returns `null` without a partial identity.
8. Expired and revoked sessions do not authorize. Protected callers still use
   `disableCookieCache: true` and `disableRefresh: true`; a valid signed cookie
   cannot bypass a missing database session.
9. Two concurrent tokens for different users cannot cross-wire session/user
   pairs. The user lookup must use only the `userId` from its own selected
   session and remain parameterized.
10. The public `/api/auth/get-session` path and direct
    `auth.api.getSession` path both use the wrapper. Successful callback/session
    creation, session deletion/revocation and unrelated account operations
    retain the pinned adapter behavior.
11. No session token, user identifier or marker reaches diagnostics. The
    session-create hook still persists an empty IP, provider tokens remain
    encrypted, and no account/session snapshot cookie is enabled.
12. The exact package, lock, schema, migration and DB initialization hashes in
    this report remain unchanged. Full source drift must contain only the
    declared wrapper/test/report files.

## Independent re-review checklist

TL/Security must not review a moving NQR-061 worktree. PM must first freeze the
candidate and publish:

1. candidate root, authoritative preimage hashes, every changed/new path,
   per-file hashes, path-sorted delta digest and worker report hash;
2. unchanged package/lock, schema, migration, `src/db/index.ts`, installed
   Better Auth/core/Drizzle-adapter module hashes and declared dependency
   versions;
3. red-before and green-after output for tests 1-5 above, plus the complete
   preservation matrix 6-12;
4. exact diff proving the interception is limited to the session-with-user
   `findOne`, delegates all other operations unchanged, does not mutate input
   records and cannot enter native or Better Auth fallback join logging;
5. hostile-value evidence showing zero getters/proxy traps/coercion and spies
   showing no raw logger/console/error response leakage;
6. session semantics evidence for missing, expired, revoked, concurrent and
   cross-user fixtures through both installed Better Auth entry points;
7. focused tests, complete application tests, release/script tests, typecheck,
   lint, `git diff --check` and offline migration drift on the same frozen
   candidate. Build remains a later PM gate, not evidence to substitute for
   these checks;
8. post-test recomputation of all hashes/digest and an explicit statement that
   no DB, Plesk, browser, network, build, deploy, secret or production action
   occurred.

Any raw error inspection/logging, query-value logging, session cache fallback,
schema/migration/package change, unrelated adapter behavior change, incomplete
red proof, moving digest, or attempt to infer the production cause is
`REQUEST_CHANGES`.

## Closeout

The repair contract is ready for a frozen offline candidate and independent
exact-byte review. Production remains rolled back, the actual failure phase
inside `get-session` remains unknown, and this report provides neither a
candidate verdict nor production authority.
