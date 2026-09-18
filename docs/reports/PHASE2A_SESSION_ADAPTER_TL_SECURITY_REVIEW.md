# Phase 2A session adapter TL/Security review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-064` / TL + Security / iteration 1  
Verdict: **REQUEST_CHANGES**

Do not integrate or build frozen NQR-061 digest
`80aafe6581eecdb47710f95dab755cd9454193636acadec9ff4fb98ad069ea7b`.
The outer wrapper does receive Better Auth's `join: { user: true }` request and
does prevent the installed fallback-join logger from handling the reviewed
path, but two independent installed-chain probes found contract violations in
raw-error isolation and malformed-result handling.

This is an offline exact-byte code/test review. It is not a production root
cause finding and provides no DB, browser, build, deployment, Plesk or
production authority.

## Frozen identity

The worker report SHA-256 matched the assignment:

- `docs/reports/PHASE2A_SESSION_ADAPTER_REPAIR.md`:
  `7ebb60e3cb3e8424dbbaeac0db1156ee578eb23efaebfd690c26492980732343`

The four candidate hashes matched before and after review:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `34a834fef3020a17533c4d2b624934425577c308d9e91f00236ae0bd80372be4` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter.ts` | `1f6952b2fb399a114bb0fc7db68da7ba014c08de5b72d17b83610f6a131f3a90` |
| `src/lib/auth-session-adapter.test.ts` | `14ac731398a9daacbb795fefceba3160f99a580d527148bd456b7ce7b56560be` |

The candidate digest was independently recomputed from compact, path-sorted
JSON objects with keys `after`, `before`, `path` and matched
`80aafe6581eecdb47710f95dab755cd9454193636acadec9ff4fb98ad069ea7b`.

Unchanged guards also matched:

- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`;
- `package-lock.json`: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`;
- `src/db/index.ts`: `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`;
- `src/db/schema.ts`: `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a`;
- `drizzle/0000_shallow_vision.sql`:
  `13b765dd3558c9355f6fc7c1d1e23472e4dd8fa950ebd980f47001ae658c89ee`.

Installed review inputs were Better Auth/core/Drizzle adapter `1.7.2`, Drizzle
ORM `0.45.2` and mysql2 `3.24.2`. Relevant installed hashes stayed:

- core adapter factory:
  `a29c8924fe90d19e25120017669edbe16e903dc7fff4cadd66b95221a665f795`;
- core Node tracer:
  `86c429ed27f477545f0fe6977e1e042d71dad0d68dfca47506e11a094f0ffe9e`;
- Better Auth session route:
  `831a00b6e144c1560c21406de1db586a67089630ad58fb2f3c7dcd3c5c963d57`;
- Better Auth internal adapter:
  `dff06457e141795b3abfa0072b4fed57dd7ff6d5773ede2a3dc91dcfd1f1fdc8`;
- Drizzle adapter:
  `d0bd019ad1db62906b3b1a4c9ec21a8cc18a46d1ee282b7592442ad86b59a15e`.

## Finding F1 — original adapter errors reach installed tracing before containment

Severity: **P1 / security and diagnostic-contract blocker**

The candidate wraps the already-created Better Auth/Drizzle adapter
(`auth-session-adapter.ts:72-123`). Its session and user reads call
`adapter.findOne` and catch only after that promise rejects
(`auth-session-adapter.ts:80-109`). That inner adapter is the installed Better
Auth core factory. Before it rejects back to the candidate, the factory runs
the raw adapter operation inside `withSpan` (`factory.mjs:559-567`).

The installed Node tracer catches the original value first. Its
`endSpanWithError` checks error properties using the `in` operator, passes the
value to `span.recordException`, reads `err?.message`, and may coerce it with
`String(...)` (`instrumentation/tracer.mjs:13-29`). Therefore the candidate's
outer `catch { ... }` cannot truthfully guarantee that the original thrown
value was never inspected or forwarded before classification.

An independent probe used the exact candidate around the installed core
adapter factory. A hostile raw session-read value trapped property-existence,
property-read and prototype operations. Before the candidate mapped it to the
fixed `session_read_failed` category, the installed tracer triggered the
hostile `has` trap once:

```json
{"hostileRawErrorTraps":{"get":0,"has":1,"prototype":0},"mappedCategory":"session_read_failed"}
```

This directly contradicts NQR-062's zero-inspection contract and the worker
report's statement that the original value is never inspected or forwarded.
The probe did not configure or contact an external telemetry exporter, so it
does not claim observed production disclosure. The code-level path is enough
to reject the privacy guarantee: an enabled OpenTelemetry span receives the
raw value before the wrapper.

Required repair: replace the error at a boundary **inside** the installed
factory/tracing call, before any Better Auth `withSpan` receives it. A logger
override outside that boundary is insufficient. The revised implementation
must prove zero `has`, `get`, `getPrototypeOf`, own-key, descriptor, coercion
and serialization traps through the actual pinned factory for both session
and user reads, and must prove that no raw value is passed to a span, logger or
console. Do not patch `node_modules` or disable application-wide tracing as a
workaround.

## Finding F2 — malformed non-null session/user rows authenticate as a truthy pair

Severity: **P1 / fail-closed identity-contract blocker**

The candidate validates only a non-empty own `session.userId`
(`auth-session-adapter.ts:91-99`). For the user it checks only that the result
is a non-array object (`auth-session-adapter.ts:101-119`). It does not require
the core session fields, core user fields, valid Date values, or that returned
`user.id` equals the selected session's `userId`.

An independent installed-chain probe made the raw adapter return
`{ userId: "user-id" }` for session and `{}` for user. The installed factory
transformed both into ordinary objects; the candidate accepted them; and the
actual Better Auth `internalAdapter.findSession` returned a truthy session/user
pair with every tested required field absent:

```json
{"malformedPairAccepted":true,"sessionIdPresent":false,"sessionTokenPresent":false,"sessionExpiryIsDate":false,"userIdPresent":false,"userEmailPresent":false}
```

This violates the candidate report's claim that malformed session and user
results become fixed categories. It also violates NQR-062's fail-closed
contract. In application code, a truthy malformed `session.user` can pass the
`session?.user ?? null` boundary even though its authoritative identity is
missing.

Required repair: validate the transformed core result before assembly using
safe own-data-field checks. A session must have the required Better Auth core
identity/token/user/date fields with valid types and dates; a user must have
the required core identity/email/verification/date fields; and `user.id` must
exactly equal the selected `session.userId`. Missing session and missing user
rows remain ordinary unauthenticated `null`; malformed non-null records map to
`session_result_invalid` or `user_result_invalid`. Add actual installed-factory
regressions for missing fields, invalid dates, accessor-bearing values and a
mismatched returned user ID.

## Installed call order, logger and public-path results that passed

The independent probe SHA-256 was
`763039daa43cc4425b94372dbfb2d97ae9faa008a7824ff7689f0cafff5681dd`.
It used Better Auth's actual `internalAdapter.findSession`, actual core adapter
factory, actual API method and actual handler with a synthetic signed cookie.
No real DB, provider or network was involved.

The following scoped behaviors passed:

- The outer wrapper did receive the high-level session-plus-user lookup despite
  `advanced.database.joins: false`. Successful internal and API reads each
  produced session then user inner calls with no `join` passed to the inner
  factory. This proves the candidate does not rely only on its direct unit
  seam.
- A raw user-read `Error` marker did not appear in the HTTP 500 body, console
  capture or category. The handler emitted exactly one
  `[NQR_AUTH] user_read_failed` record for that request.
- The installed Better Auth success path returned the expected synthetic
  session and user through `auth.api.getSession` with refresh disabled.
- Missing rows and unrelated direct operations covered by the submitted unit
  suite retain the expected delegation/null behavior.
- The category's public property is non-writable/non-configurable and the
  private WeakMap remains the runtime authority.

These passing results do not override F1/F2.

## Verification performed

- Focused candidate/auth/request tests: **9/9 PASS**, 3 files.
- Complete application suite: **977/977 PASS**, 40 files.
- Release/script suite: **119/119 PASS**.
- Typecheck: PASS.
- Lint: PASS.
- `git diff --check` for the four candidate files: PASS.
- Independent installed-chain probe: call-order, public logger/response and
  success compatibility PASS; F1 and F2 reproduced as above.

One preliminary command incorrectly appended three TypeScript test paths after
`npm test -- --run`. Vitest itself completed 977/977 and the 119 script tests
passed, after which Node's script-test runner correctly rejected the three
non-script TypeScript paths. This was a reviewer command-shape error, not a
candidate failure. The focused command and an exact clean `npm test` were then
run separately and passed at the counts above.

The first unapproved `tsx` probe attempt was blocked by the sandbox before the
script ran because its temporary IPC socket could not bind. The normal approved
retry ran locally. No browser, network, DB, Plesk, build, deployment,
production or secret operation was performed.

## Required iteration-2 gate

BACKEND must publish a new frozen digest and report after addressing both
findings. Independent re-review must include:

1. exact preimage/postimage hashes and unchanged package, lock, schema,
   migration, DB initialization and installed dependency hashes;
2. a semantic red-before proof for F1 using both session-read and user-read
   hostile values through the installed factory, with every trap count zero
   after repair and no raw span/logger/console value;
3. semantic red-before proof for F2 covering missing required session fields,
   invalid session dates, missing required user fields, invalid user dates and
   returned `user.id !== session.userId`, all through actual
   `internalAdapter.findSession`;
4. successful installed-chain session/user call order with no native Drizzle
   relational query and no Better Auth fallback logging;
5. one-event-per-failed-request, fixed HTTP error, no marker disclosure and
   successful installed API/handler compatibility;
6. missing/orphan/expired/revoked/concurrent cross-user preservation and all
   NQR-062 security/privacy guards; and
7. focused/full/script/typecheck/lint/diff/drift results on the same frozen
   bytes.

Until that iteration passes exact-byte TL/Security and QA review, Phase 2A
remains rolled back and the production root cause remains unknown.
