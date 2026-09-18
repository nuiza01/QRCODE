# Phase 2A Session Repair — QA Gate Design

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-063`  
Role: QA  
Verdict: **GATE DEFINED — NO CANDIDATE VERDICT**

This document defines the independent acceptance gate for a bounded repair of
the production Better Auth session failure. It is not evidence that a repair
exists or works. QA performed only local read-only inspection and wrote this
report; no test, build, browser, network, database, Plesk, secret, deployment or
production action was performed.

## Evidence and current contract

The production evidence establishes only this much:

- Google returned successfully to the production callback/dashboard flow.
- Better Auth's `get-session` stage returned HTTP 500 for the authenticated
  cookie.
- The one-shot redacted diagnostic observed an outer generic `Error` with only
  `stack` and `message` keys. It exposed no safe `code`, `sqlState`, `errno` or
  `cause` and therefore did not identify a database or adapter root cause.
- Diagnostics were disabled and the 626-byte startup file plus rollback BUILD_ID
  `m1fxDjFEQxdLlI91m1Czx` were restored. Phase 2A remains rolled back.

Installed local dependency contracts are Better Auth and its Drizzle adapter
`1.7.2`, Drizzle ORM `0.45.2`, mysql2 `3.24.2`, and Next.js `16.3.1`. In the
installed Better Auth code, `get-session` resolves a token through
`internalAdapter.findSession`; that operation asks for a session plus user.
With the application setting `advanced.database.joins: false`, the core adapter
uses separate fallback reads rather than handing a native join to Drizzle.
This explains which stages need coverage; it does **not** establish which stage
failed in production.

The read-only reference identities at design time are:

- `src/lib/auth.ts`:
  `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f`
- `src/lib/auth-runtime.test.ts`:
  `364ba2ef011bc3cc6f5f539f8299dad95a51f4a2bd62d0fa48656c1d693c59b2`
- `src/lib/request-auth.ts`:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- `src/db/index.ts`:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- `src/db/schema.ts`:
  `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a`
- auth route:
  `d7e8a20cc8416f68e830749b2af109398926dafea1551119ca6887cc5e8ce6d3`
- package lock:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- initial MariaDB SQL:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Drizzle snapshot and journal:
  `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
  and
  `7fa4345ae477f77b0f0c3d4b09ea7a26d233d2e307d0179c389b20074d7a3361`

These are design inputs, not the future candidate freeze. PM/TL must publish
the exact allowed delta, preimages, postimages and candidate digest before
independent review.

## Safe category contract

A repair may identify failure by **where its own control flow is executing**,
not by inspecting the thrown value. The accepted internal diagnostic category
must be a closed, reviewed string enum such as separate fixed values for the
session read, joined/fallback user read, adapter initialization, and an
unclassified `get-session` boundary. Exact names are an implementation choice,
but all of the following are mandatory:

1. Category selection occurs before or around a known adapter operation and is
   independent of `error.name`, `message`, `stack`, `code`, `sqlState`,
   `errno`, `cause`, prototype or enumerable keys.
2. Unknown thrown values are never coerced, stringified, logged, retained or
   attached to a replacement error. The original object must not reach Better
   Auth's logger or a direct `console.*` call.
3. A diagnostic record may contain only a timestamp, a fixed stage and one
   allowlisted category. It contains no SQL, parameters, DSN, hostname,
   database/user name, token, cookie, Google subject, email, IP, payload, stack
   or raw exception.
4. The category is internal evidence only. It must not appear in response JSON,
   response headers, cookies, HTML, client state or localized UI.
5. Diagnostics are disabled by default or bounded to the separately authorized
   one-shot mechanism. Enabling them cannot change session authorization.

## Offline automation matrix — mandatory before review

| ID | Scenario | Required evidence and expected result |
|---|---|---|
| O-01 | Successful `getSession` | A valid signed session token resolves the same session and user fields as the pre-repair API. `disableCookieCache: true` and `disableRefresh: true` remain in authoritative application reads. No diagnostic category is emitted. |
| O-02 | Missing/invalid/expired session | Missing or invalid tokens remain unauthenticated; an expired session follows Better Auth's existing cleanup semantics. No synthetic user, stale cookie snapshot or failure category is treated as success. |
| O-03 | Generic `Error` in session read | Inject a generic `Error` at the exact session adapter read. The fixed session-read category is emitted once; the raw object is not inspected or retained; the public result is the existing generic fail-closed response. |
| O-04 | Generic `Error` in fallback user read | Let the session row succeed and inject a generic `Error` only in the user read. The user-read category, not the session category, is emitted once. No session is returned without its authoritative user. |
| O-05 | Hostile non-Error values | Repeat O-03/O-04 with a Proxy whose `get`, `getPrototypeOf`, `ownKeys`, descriptors, coercion and string conversion traps fail the test. Expected trap count is zero. Include string, number, `null`, symbol and accessor-bearing objects. |
| O-06 | Marker non-disclosure | Use unique markers resembling a MariaDB DSN, SQL, cookie, token, email and QR payload in thrown values. Capture response body/headers, custom logger and every `console.*` call. No marker or raw value may appear anywhere. Only the fixed category may be recorded. |
| O-07 | Category cardinality | One failed adapter operation emits at most one bounded record. Retry/render cycles cannot create an unbounded diagnostic loop. Success and ordinary unauthenticated results emit none. |
| O-08 | MariaDB separate-read compatibility | Exercise the actual Better Auth 1.7.2 + Drizzle adapter path with `provider: "mysql"`, `transaction: true`, UUID generation and `joins: false`. Prove session lookup followed by user lookup, correct token/user predicates and result mapping. Reject any `LATERAL`, PostgreSQL-only `RETURNING`, or other non-MariaDB SQL path. |
| O-09 | MariaDB values | Verify MariaDB/mysql2 date, boolean, UUID and nullable session fields map to Better Auth's expected runtime values. UTC driver/session initialization remains unchanged and failure destroys the connection. |
| O-10 | Adapter initialization failure | Missing schema/model/connection setup fails closed with one safe fixed category and no raw adapter/config value. It must not silently switch to cookie authority or a different database mode. |
| O-11 | Google callback/session continuity | Using an offline Better Auth harness or provider stub, a verified Google callback creates/links the same user/account/session contract, emits the existing signed cookie, and the following `get-session` resolves that user. Returning-user and new-user paths are covered. No real Google request is made. |
| O-12 | Public auth API compatibility | `getAuth`, auth route GET/POST exports, `/api/auth/*` paths, callback URL, cookie prefix/security flags, Google-only identity policy, OAuth token encryption, database-backed state, session duration and client `createAuthClient` contract remain unchanged. No internal category is added to public types or payloads. |
| O-13 | Fail-closed dashboard | Session failure returns no user and performs no saved-QR list. Dashboard renders only fixed localized unavailable copy; it does not inspect or echo the error/category. |
| O-14 | Fail-closed mutations | For create, rename, duplicate and delete, missing/failing session prevents body IO and DAL calls. Same-origin, complete auth config and authoritative persisted-user gates retain their order. |
| O-15 | Saved-QR success ownership | A valid session passes only its authoritative user ID into list/create/rename/duplicate/delete. A second user cannot observe or mutate the first user's rows; missing and foreign IDs remain indistinguishable. |
| O-16 | Quota/rate regression | The saved-Static limit remains 25 for create and duplicate under the owner-row transaction lock; concurrent slot 25 has one winner. The account-keyed 30/minute boundary and fixed 429/`Retry-After` behavior remain unchanged. |
| O-17 | Request/error privacy | Bounded JSON, auth-before-body, fixed no-store API errors, safe Thai/English dashboard/Save copy, no raw IP persistence, encrypted provider tokens and absent account-token cookies retain their existing tests. |
| O-18 | Schema/migration/package freeze | `npm run check:drift` passes offline at 10 tables/29 statements. The reviewed SQL, snapshot, journal, package manifest and lock remain byte-identical unless a separately reviewed change is explicitly authorized. Non-DDL relation metadata must not cause a migration rewrite. |
| O-19 | Full regression | Run the exact focused auth/session/DB/saved-QR suites, then the complete application and 119 script suites, typecheck, lint and `git diff --check`. Record exact counts and candidate hashes; passing historical counts are not evidence for the new candidate. |

Tests for O-03 through O-07 must exercise the actual repair boundary, not a
mock that bypasses it. O-08 must use the installed version-pinned adapter code;
source-string assertions alone are insufficient. No engineer who writes the
repair may provide the final QA verdict.

## Future local runtime gate — separate from offline automation

After code review, but before any production build/deploy request, QA should use
a disposable local MariaDB 10.11 instance and non-secret synthetic identities:

1. apply the exact reviewed 29-statement migration to an empty database and
   verify the 10 application tables plus migration metadata;
2. establish the application pool, confirm `@@session.time_zone = '+00:00'`,
   and exercise the real Better Auth Drizzle/mysql2 session then user reads;
3. seed a synthetic current session and verify `/api/auth/get-session` success,
   absent/expired behavior and dashboard continuity through the real local
   Next runtime;
4. force session-query, user-query and disconnected-database failures through a
   controlled local seam, verifying fixed category selection, zero marker
   disclosure and fail-closed dashboard/mutations;
5. exercise two synthetic users through saved-QR list/create/rename/duplicate/
   delete isolation and the real two-connection slot-25 create/duplicate race;
6. verify no unexpected outbound requests and no raw diagnostic values in the
   server/browser console; and
7. destroy only the disposable local database after evidence is saved.

This local gate does not use real OAuth credentials, production cookies or
Plesk. A provider-stub callback proves application continuity; only the later
user-authorized production gate can prove the real Google callback.

## User-authorized production gate — not currently authorized by this report

Production work begins only after the exact candidate passes offline QA,
independent TL/Security review, local MariaDB/runtime QA, a fresh immutable
release build, and a new action-time Product Owner authorization. The
production runbook must name the candidate source digest, BUILD_ID, artifact
digest, rollback BUILD_ID, operator, allowed diagnostic category and evidence
location without containing secrets.

The authorized run should then be bounded as follows:

1. verify the rollback artifact and current production health before activation;
2. activate only the reviewed artifact and confirm its BUILD_ID;
3. perform one Product-Owner Google account-selection callback, then require
   `/api/auth/get-session` and the localized dashboard to show the same
   authenticated user without another sign-in prompt;
4. if session resolution fails, record only the one allowlisted stage/category,
   disable diagnostics, restore rollback immediately and stop—do not inspect the
   raw exception or attempt another speculative patch;
5. only after session success, and only with explicit data-mutation authority,
   run named disposable saved-QR CRUD fixtures, quota 24/25/26 contention and
   two-account ownership isolation; clean up only the named fixtures;
6. verify Google callback/session continuity, logout, revocation and
   reauthentication, along with empty raw-session-IP storage and encrypted
   provider-token storage; and
7. preserve a redacted evidence pack and obtain separate Product Owner launch
   acceptance. Technical success is not launch authority.

Stop and roll back on a BUILD_ID/hash mismatch, any raw marker in response/log,
unexpected schema/data/grant/OAuth change, session 500, wrong/missing category,
authentication bypass, ownership leak, quota failure or unavailable rollback.

## Candidate acceptance criteria

A candidate may advance from QA design to independent review only when all of
these are true:

- [ ] PM freezes the exact allowed files, preimages, postimages and digest; no
      unrelated source, package, schema or migration drift is present.
- [ ] The repair is at a bounded adapter/session boundary and does not replace
      Better Auth, weaken authoritative DB sessions, enable cookie cache or
      enable a MariaDB-incompatible native join.
- [ ] Success, absent-session, session-read failure and user-read failure are
      independently covered at the real boundary.
- [ ] Safe categories come solely from fixed control-flow stages; hostile
      thrown values cause zero inspection/coercion/logging and no raw value
      reaches dependency logging or public output.
- [ ] Google callback, cookies, OAuth/public API and Google-only admission are
      semantically unchanged.
- [ ] Dashboard and every saved-QR mutation remain fail closed; ownership,
      quota 25, concurrency and rate-boundary tests pass unchanged.
- [ ] MariaDB 10.11 separate-read compatibility is proved offline and then on a
      disposable local runtime; migration drift remains 10/29.
- [ ] Focused and full verification, typecheck, lint and diff check pass on the
      same frozen candidate, with exact counts recorded.
- [ ] TL and Security independently return PASS on the exact bytes; the repair
      owner does not self-approve final QA.
- [ ] No production claim is made until a separately authorized immutable
      deployment passes the one-shot Google session gate and required saved-QR
      acceptance, with rollback still available.

Until these criteria are met, the status remains **NEEDS_REVIEWED_REPAIR** and
the existing rollback build remains the production authority.
