# Phase 2A session adapter iteration 2 — TL + Security review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-066` / TL + SECURITY / iteration 1  
Verdict: **SCOPED PASS — no actionable defect in the frozen five-file candidate**

This is an independent exact-byte, code/unit and inert-driver review. It does
not establish the still-unknown production root cause, exercise HostAtom
MariaDB, authorize a build or deployment, or claim that the live session issue
is repaired.

## Frozen identity

The worker report remained exactly:

- `docs/reports/PHASE2A_SESSION_ADAPTER_REPAIR_ITERATION_2.md`:
  `d91a9af83c0d967aa14d182cb9790d650de07cb89226c94b92b78ceaf2e964a4`.

The complete five-file digest was independently recomputed with the documented
compact, path-sorted JSON method and matched:
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

The iteration-2 delta digest independently matched:
`aad7f5bb504edb8070b10788c09d954c785e2edfbc7129c6348482ce36867868`.

Final candidate hashes matched before and after review:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |

## Findings disposition

### F1 — raw rejection containment: closed

The revised boundary intercepts only Better Auth's exact `session` lookup with
`join: { user: true }`. An independent probe used the installed Better Auth
1.7.2 adapter factory and internal adapter, the installed Drizzle adapter, the
actual Drizzle mysql2 execution path and an inert mysql2 client. With
`advanced.database.joins: false`, `findSession()` reached this wrapper with the
documented joined lookup and did not invoke the installed low-level adapter or
relational query builder for it.

Hostile values rejected by both the session and user mysql2 reads were replaced
at the direct Drizzle boundary with `session_read_failed` or
`user_read_failed`. Their `get`, `has`, prototype, own-key and descriptor traps
remained at zero. The original value therefore did not cross into Better
Auth's adapter-factory span, logger or handler.

The independent actual Better Auth HTTP probe returned fixed status 500 and
emitted exactly one console event:
`[NQR_AUTH] session_read_failed`. The hostile raw value triggered zero traps,
was not forwarded as a cause, and did not appear in response or logging.
`readSessionAdapterFailureCode()` relies on the private `WeakMap`, while the
public fixed code is non-writable and non-configurable.

### F2 — malformed joined rows: closed

The session result now requires ordinary own data values for non-empty ID,
exact requested token, non-empty user ID, three finite Dates, and the two
nullable string fields. The user result requires the exact session user ID,
ordinary name/email/verification/image values and two finite Dates. Accessors
are rejected from descriptors without invocation. Dates are read through the
built-in `Date.prototype` and copied. Successful output is a fresh minimal
session/user object; arbitrary properties, prototypes and accessors are not
forwarded.

Independent malformed token, invalid session Date, mismatched user ID and
invalid verification-type cases produced only their fixed result categories.
The focused installed suite additionally covered missing required fields,
both accessor-bearing row stages, invalid user dates and complete successful
rows. A missing session and orphaned/missing user remain unauthenticated
`null`, rather than producing a partially authenticated object.

### F3 — initialization classification: closed

The installed adapter-factory call is inside the wrapper's catch. An
independent hostile initialization rejection produced only
`adapter_initialization_failed`, with zero property/prototype/enumeration
traps and no retained cause.

## Direct Drizzle bypass and session semantics

The narrow bypass is acceptable for the reviewed single-instance Phase 2A
scope:

- the first select is constrained by the requested session token and
  `.limit(1)`; the second is constrained by the already validated session
  user ID and `.limit(1)`;
- captured installed mysql2 calls contained SQL placeholders and no token or
  user-ID literal. Each call passed the predicate value and limit as separate
  parameters, confirming parameterization rather than interpolation;
- `session.token` remains protected by the frozen unique index, and user data
  can only be assembled for the exact validated session owner;
- if either of the two reads disappears, the result fails closed to `null`;
  malformed or cross-ID rows fail closed to a fixed error;
- the actual Better Auth HTTP path kept expired and revoked sessions
  unauthenticated; concurrent reads for two accounts returned their own
  token/user pairs without shared mutable state;
- unrelated `findOne` calls and every other adapter method remain delegated to
  the installed adapter unchanged.

The two reads are not a snapshot transaction, but the only intervening states
are a matching validated owner or fail-closed missing/mismatched data; no
cross-owner fallback exists. No actionable isolation defect was found.

## Verification performed

- focused installed/auth/request suite: **28/28 PASS**, 4 files;
- full Vitest: **996/996 PASS**, 41 files;
- release/script tests: **119/119 PASS**;
- independent actual factory/Drizzle/mysql2/HTTP probe: PASS — 2
  parameterized selects, 2 hostile read stages, 0 hostile traps, 4 independent
  malformed-row rejections, fixed initialization category, 1 unchanged
  unrelated delegation, HTTP 500 and 1 fixed log event;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run check:drift`: PASS — 10 tables / 29 statements, offline and no DB;
- candidate `git diff --check`: PASS.

The first sandboxed `tsx` probe attempt could not create its temporary IPC
socket (`EPERM`) and executed no assertions. The approved local-only retry ran.
Two preliminary harness assertions assumed mysql2 parameters lived on the SQL
config and then assumed only one parameter; inspection of the installed path
showed the real signature is `(queryConfig, params)` with predicate plus
`.limit(1)`. The temporary probe was corrected to that installed contract and
then passed. No candidate or dependency file was changed by these harness
corrections.

## Unchanged guards

The following security and persistence boundaries remained exact:

| Boundary | SHA-256 |
| --- | --- |
| `src/lib/request-auth.ts` | `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e` |
| `src/db/index.ts` | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| `src/db/schema.ts` | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| MariaDB migration | `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf` |
| MariaDB snapshot | `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e` |
| MariaDB journal | `7fa4345ae477f77b0f0c3d4b09ea7a26d233d2e307d0179c389b20074d7a3361` |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |

The pinned installed factory, tracer, session route, internal adapter, Drizzle
adapter, mysql2 session, MySQL query boundary and fixed query-error wrapper
also matched the worker's recorded hashes. Database initialization remains a
five-connection mysql2 pool with UTC driver conversion and per-connection UTC
session initialization; this review did not open that pool.

## Limits and next gate

No network, browser, build, Plesk, real database, migration execution, secret,
deployment or production mutation was used. Inert-driver call order and fixed
failure containment cannot determine the production root cause or prove live
MariaDB/TLS/timezone behavior. The exact reviewed candidate may proceed to the
separate QA/integration gate, followed only by an explicitly authorized live
diagnostic or deployment workflow.
