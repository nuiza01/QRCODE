# Phase 2A session adapter independent QA review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-065` / QA / iteration 1  
Verdict: **REQUEST_CHANGES — DO NOT ADVANCE NQR-061**

This was an offline, read-only review of the frozen NQR-061 candidate. QA did
not edit application source or tests and did not access a database, browser,
network, Plesk, secrets, build tooling, deployment or production. The only
project write is this report; the independent executable probe lived under
`/private/tmp` and is not part of the candidate.

## Frozen identity

The worker report SHA-256 is
`7ebb60e3cb3e8424dbbaeac0db1156ee578eb23efaebfd690c26492980732343`.
The four postimages exactly match the report:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter.test.ts` | `14ac731398a9daacbb795fefceba3160f99a580d527148bd456b7ce7b56560be` |
| `src/lib/auth-session-adapter.ts` | `1f6952b2fb399a114bb0fc7db68da7ba014c08de5b72d17b83610f6a131f3a90` |
| `src/lib/auth.ts` | `34a834fef3020a17533c4d2b624934425577c308d9e91f00236ae0bd80372be4` |

Using the documented compact path-sorted JSON method and the published
preimages, QA independently recomputed candidate digest
`80aafe6581eecdb47710f95dab755cd9454193636acadec9ff4fb98ad069ea7b`.
Package and lock hashes remain
`237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`
and
`163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`.

Pinned installed evidence used by the independent probe:

- Better Auth adapter factory:
  `a29c8924fe90d19e25120017669edbe16e903dc7fff4cadd66b95221a665f795`;
- Drizzle adapter:
  `d0bd019ad1db62906b3b1a4c9ec21a8cc18a46d1ee282b7592442ad86b59a15e`;
- Better Auth internal adapter:
  `dff06457e141795b3abfa0072b4fed57dd7ff6d5773ede2a3dc91dcfd1f1fdc8`;
- Better Auth session route:
  `831a00b6e144c1560c21406de1db586a67089630ad58fb2f3c7dcd3c5c963d57`.

## Blocking findings

### NQR065-QA-F1 — raw adapter rejection is observed before the wrapper catches it

The wrapper is outside the adapter returned by Better Auth's installed
`createAdapterFactory`. Its session and user reads call that inner adapter at
`src/lib/auth-session-adapter.ts:82-85` and `103-106`. The inner adapter wraps
the low-level read with `withSpan` at installed `factory.mjs:559-567`.

On rejection, installed Better Auth 1.7.2 calls `span.recordException(err)` and
reads `err?.message` at installed `instrumentation/tracer.mjs:18-28` before the
promise returns to the candidate catch. Therefore the catch does replace what
reaches the Better Auth logger, but it is too late to satisfy the mandatory
zero-inspection/no-retention boundary.

QA exercised the actual chain
`createInternalAdapter.findSession -> NQR wrapper -> installed
createAdapterFactory -> low-level adapter` with
`advanced.database.joins:false`. A hostile Proxy rejection at the session read
recorded exactly `get:message`; the same rejection at the user read also
recorded exactly `get:message`. Both expected zero traps and failed. The fixed
`session_read_failed` / `user_read_failed` values still emerged afterward and
the core fallback logger and `console.error` remained unused, but that does not
undo the earlier observation. An enabled OpenTelemetry span can additionally
receive the original rejection through `recordException`.

The candidate tests do not reveal this because their mocked adapter rejection
returns directly to the outer wrapper and bypasses the installed factory.

Required repair: put the raw-error replacement on the low-level side of the
installed factory/instrumentation boundary, or otherwise prove with the same
actual version-pinned path that the original rejection reaches no property
read, span, logger or console. Direct wrapper-only mocks are not acceptable.

### NQR065-QA-F2 — adapter initialization failure escapes unclassified

`createMariaDbSessionAdapter` calls `drizzle(options)` at
`src/lib/auth-session-adapter.ts:75-76` outside any fixed-category boundary.
Using the actual installed `createAdapterFactory` with a failing low-level
adapter constructor, QA observed the original hostile value escape unchanged;
`readSessionAdapterFailureCode` returned `null`, not the candidate's fixed
`auth_internal_error`. The hostile value was not inspected in this particular
probe, but O-10 requires initialization to fail closed with one safe fixed
category rather than expose the original adapter/config failure.

Required repair: add a bounded initialization category around the actual
factory construction without inspecting, retaining or forwarding the unknown
value, then exercise it through the installed path.

## What did pass

The independent `/private/tmp` probe ran seven cases: **4 PASS / 3 FAIL**. The
four passing cases establish that:

1. actual `createInternalAdapter.findSession` reaches the wrapper's joined
   lookup and the low-level factory sees exactly two no-join reads, session by
   token then user by ID;
2. the installed Drizzle adapter with provider `mysql`, transaction enabled,
   UUID generation and `joins:false` uses two ordinary select paths and never
   invokes its relational `query.*.findFirst` path;
3. a missing session and an orphaned user both remain unauthenticated `null`;
4. the actual Better Auth HTTP `get-session` error path returned HTTP 500,
   exposed no private marker, and emitted exactly one bounded
   `[NQR_AUTH] session_read_failed` console record.

Thus the candidate does bypass Better Auth's fallback-join logger and preserves
success/null/orphan mapping and public generic failure behavior. The verdict is
blocked specifically by the earlier raw-error observation and unclassified
initialization path, not by a LATERAL query or public marker leak found in this
offline run.

## NQR-063 matrix disposition

| Gate | Offline disposition |
| --- | --- |
| O-01 success | PASS through actual internal adapter and installed Drizzle path |
| O-02 missing/orphan | PASS; expiry was not separately runtime-exercised |
| O-03 session failure | **FAIL**: correct fixed category, but one raw `message` read before catch |
| O-04 user failure | **FAIL**: correct fixed category, but one raw `message` read before catch |
| O-05 hostile values | **FAIL** on the actual installed path; direct candidate mocks are insufficient |
| O-06 marker non-disclosure | Public response/logger/console PASS, but dependency instrumentation receives/reads the raw rejection; gate not met |
| O-07 cardinality | PASS in actual HTTP harness: exactly one bounded record |
| O-08 MariaDB separate-read | PASS offline with installed factory and installed Drizzle adapter; no relational/LATERAL path invoked |
| O-09 MariaDB values | Existing automation unchanged; real MariaDB/mysql2 runtime NOT RUN |
| O-10 initialization | **FAIL**: original value escapes with no fixed category |
| O-11 callback continuity | Existing offline regression only; no real provider/runtime |
| O-12 public auth contract | PASS by focused/full regression and narrow auth diff |
| O-13–O-17 dashboard/mutations/ownership/quota/privacy | Existing regression suites PASS; no database or browser runtime |
| O-18 freeze/drift | PASS: 10 tables / 29 statements, offline, no DB |
| O-19 full regression | PASS, counts below; does not override F1/F2 |

## Verification results

- focused auth/session/request-auth: **9/9 PASS** across 3 files;
- full Vitest: **977/977 PASS** across 40 files;
- release/script suite: **119/119 PASS**;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run check:drift`: PASS, 10 tables / 29 SQL statements, offline;
- `git diff --check`: PASS.

One preliminary command incorrectly appended Vitest file paths to `npm test`.
Vitest itself passed 977 tests, but npm then forwarded those three TypeScript
paths to Node's script-test runner, producing three expected module-resolution
errors alongside the genuine 119 script passes. QA discarded that malformed
harness invocation and reran the focused command and exact `npm test`; the
counts above are from the clean reruns.

## Next action

Do not integrate, build or deploy digest
`80aafe6581eecdb47710f95dab755cd9454193636acadec9ff4fb98ad069ea7b`.
Return NQR-061 for a bounded revision addressing F1 and F2, publish new exact
hashes/digest, then repeat this independent actual-factory probe and the full
offline gate. Disposable MariaDB/runtime and any production check remain
separate, later-authorized gates.
