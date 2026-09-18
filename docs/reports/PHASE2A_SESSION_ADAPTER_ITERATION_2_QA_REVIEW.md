# Phase 2A session adapter iteration-2 independent QA review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-067` / QA / iteration 1  
Verdict: **SCOPED PASS — OFFLINE CANDIDATE ONLY**

QA independently reviewed the frozen NQR-061 iteration-2 candidate. This
verdict closes the three rejected offline findings on the exact reviewed bytes;
it is not evidence of the unknown production root cause, a real MariaDB repair,
a Google callback, build, deployment or launch readiness.

No application source or test was edited. No database, browser, network,
Plesk, secret, build, deployment or production action was used. The only
project write is this report; the independent executable harness was kept
under `/private/tmp` and is not a candidate file.

## Frozen identity

Worker report SHA-256:
`d91a9af83c0d967aa14d182cb9790d650de07cb89226c94b92b78ceaf2e964a4`.

QA independently recomputed:

- complete five-file digest:
  `5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`;
- iteration-2 four-file delta digest:
  `aad7f5bb504edb8070b10788c09d954c785e2edfbc7129c6348482ce36867868`.

Final postimages remained exact before and after verification:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |

Unchanged guards also matched the worker report: `request-auth.ts`
`edc1e42…852e`, DB initialization `0499ed3…f68`, schema `733674e…6a`,
migration SQL `13b765d…89ee`, package `237ae72…9b0` and lock
`1632895…2f1a`. Snapshot and journal remained
`d69ec2a…00c` and `2cc7aef…f1a`.

Pinned installed hashes matched Better Auth factory `a29c892…795`, tracer
`86c429e…9e`, internal adapter `dff0645…fc8`, session route
`831a00b…d57`, Drizzle adapter `d0bd019…15e` and Drizzle mysql2 session
`f02ee63…794`.

## Independent installed-chain result

QA built a separate nine-case harness around the candidate and the installed
dependencies. It did not reuse the candidate's direct wrapper mocks. Result:
**9/9 PASS**.

The exercised chain included actual Better Auth 1.7.2
`createInternalAdapter`, actual `createAdapterFactory`, actual
`betterAuth().handler`, the installed Better Auth Drizzle adapter and the
installed Drizzle mysql2 database/query implementation with an inert local
mysql2 client. `advanced.database.joins:false`, MySQL provider, transaction
support and UUID generation were active.

### F1 — raw rejection containment

For both the session select and user select, the inert mysql2 client rejected
with a hostile Proxy instrumented for `get`, `has`, descriptor, prototype and
own-key operations. Every trap list stayed exactly empty. The raw value reached
no Better Auth span, dependency logger or `console.error`; the public failure
contained no marker. The candidate returned only the privately branded
`session_read_failed` or `user_read_failed` value before Better Auth's factory
tracing boundary.

The low-level Better Auth adapter and Drizzle relational `findFirst` methods
were not invoked for the intercepted session+user lookup. Two ordinary mysql2
selects ran instead. Captured query text contained the session and user tables
and contained neither `LATERAL` nor `RETURNING`.

This closes NQR065-QA-F1 in the assigned offline scope.

### F2 — strict result validation

Complete matching rows produced the expected session/user pair. Independent
negative cases covered missing session ID, token mismatch, missing nullable
session fields, mismatched user ID, invalid verification type, non-finite
session/user dates, and accessor-backed session/user fields. Malformed session
rows produced only `session_result_invalid`; malformed user rows produced only
`user_result_invalid`. Accessor getters were never called, arbitrary row
properties were not forwarded, and the installed low-level adapter remained
unused for the intercepted query.

Missing session and orphan user remained `null`. Expired and revoked sessions
returned HTTP 200 with a null body. Concurrent token reads for two different
users returned only their matching session/user identities.

This closes the malformed/mismatched identity finding from NQR-064.

### F3 — initialization category

An actual installed adapter factory whose low-level construction rejected with
a hostile Proxy produced only `adapter_initialization_failed`; the Proxy trap
list stayed empty. No original initialization value escaped.

This closes NQR065-QA-F2 in the assigned offline scope.

### HTTP/logger/public contract

The installed Better Auth handler with a signed synthetic session cookie and a
hostile database failure returned the existing generic HTTP 500. The response
and captured console contained no raw marker. Exactly one event was emitted:
`[NQR_AUTH] session_read_failed`. Success, ordinary unauthenticated results and
unrelated adapter operations emitted no diagnostic event; an unrelated user
lookup continued to delegate to the installed adapter.

The `auth.ts` delta only supplies the already configured database to the narrow
wrapper. Google-only identity admission, OAuth provider/client contract,
callback/base URL, cookie prefix/security, database state, encrypted tokens,
seven-day session duration, disabled cookie cache and no-raw-IP persistence
remain semantically unchanged and their existing tests pass.

## NQR-063 offline matrix disposition

| Gate | Disposition on frozen candidate |
| --- | --- |
| O-01 success | PASS through actual internal adapter + Drizzle/mysql2 path |
| O-02 missing/invalid/expired | PASS for missing, orphan, expired and revoked behavior |
| O-03 session failure | PASS; fixed category and zero raw traps/span/logger/console |
| O-04 user failure | PASS; fixed category and zero raw traps/span/logger/console |
| O-05 hostile values | PASS on the actual installed path; candidate direct mocks were not used as proof |
| O-06 marker non-disclosure | PASS for fixed error, handler response, dependency logger and console |
| O-07 cardinality | PASS; exactly one event on failed HTTP request, none on success/null |
| O-08 MariaDB separate reads | PASS offline through installed Drizzle/mysql2 code; two selects, no relational/LATERAL/RETURNING path |
| O-09 MariaDB values | Date/boolean/nullable/UUID mapping PASS through inert mysql2 rows; real MariaDB timezone/connection destruction remains a later runtime gate |
| O-10 initialization | PASS with fixed category and zero raw traps |
| O-11 Google continuity | Existing offline/provider contract regression PASS; real Google callback NOT RUN |
| O-12 public auth API | PASS; route/client/cookie/OAuth configuration unchanged |
| O-13 dashboard | Existing fail-closed/localized regression PASS |
| O-14 mutations | Existing auth-before-body/fail-closed regression PASS |
| O-15 ownership | Existing ownership plus independent concurrent cross-user session isolation PASS; no real DB |
| O-16 quota/rate | Existing quota-25/concurrency and fixed-rate regression PASS; no real DB |
| O-17 privacy | Existing bounded-body/safe-copy/token/IP tests plus new installed-handler marker check PASS |
| O-18 freeze/drift | PASS: packages/schema/migration/DB init unchanged; 10 tables / 29 statements |
| O-19 full regression | PASS with exact counts below |

## Verification

- independent installed-chain harness: **9/9 PASS**;
- focused installed/auth/request suite: **28/28 PASS**, 4 files;
- full Vitest: **996/996 PASS**, 41 files;
- release/script tests: **119/119 PASS**;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run check:drift`: PASS, 10 tables / 29 SQL statements, offline;
- `git diff --check`: PASS;
- final candidate, package, schema, migration and installed-dependency hashes:
  unchanged.

## Limits and next gate

This SCOPED PASS permits PM to continue exact-byte review/integration workflow
for digest `5642ba2c…1f52`; it does not authorize a build or production action.
No real MariaDB 10.11 server, pool/TLS/timezone, Google callback, browser,
artifact, Plesk or production behavior was tested. The NQR-063 disposable
local-MariaDB/runtime gate remains separate, and any build/deployment or
one-shot production verification still requires the later explicit authority
and rollback controls already documented by PM.
