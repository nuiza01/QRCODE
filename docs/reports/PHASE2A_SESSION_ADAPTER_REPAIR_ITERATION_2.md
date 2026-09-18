# Phase 2A session adapter repair — iteration 2

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-061` / BACKEND / iteration 2  
Verdict: **DONE — OFFLINE BOUNDED CANDIDATE FOR INDEPENDENT REVIEW**

This report supersedes the rejected iteration-1 candidate. It does not claim
that the still-unknown production failure is repaired and it does not
authorize a build, database connection, Plesk access, deployment or production
diagnostic.

## Scope and reviewed inputs

Work was limited to the local checkout and installed dependencies. No browser,
network, real database, credentials, build, deploy or production action was
performed. Schema, migrations, package files, database initialization,
request-auth behavior, API bodies, quota and privacy-retention contracts were
not changed.

Before implementation, the full NQR-064 TL/Security report and NQR-065 QA
report were read and identity-checked:

- `PHASE2A_SESSION_ADAPTER_TL_SECURITY_REVIEW.md`:
  `a8581817ecf8eb758f176477c5502c9a38975d98e02e83b2fc285fa652cb3663`;
- `PHASE2A_SESSION_ADAPTER_QA_REVIEW.md`:
  `c3665b05ba672760a89c8b373709593ff73d3c68548dc82ebe662c102b6774d0`.

The installed Next.js 16.3.1 authentication and data-security guides and the
installed Better Auth, Drizzle adapter, Drizzle mysql2 and mysql2 paths were
also read before finalizing the repair.

## Repair design

### F1 — replace a low-level rejection before Better Auth tracing

The rejected wrapper called `adapter.findOne()` for session and user, so a raw
rejection crossed the installed Better Auth adapter factory's `withSpan`
boundary before the outer catch could replace it.

The revised wrapper intercepts only the exact, Better Auth-controlled
`session` lookup with `join: { user: true }`. For this one lookup it performs
two schema-typed Drizzle selects using the already configured database:

1. session by the exact requested token;
2. user by the validated session `userId`.

Each select has a catch immediately outside Drizzle. The original mysql2 or
Drizzle rejection is discarded and replaced with a privately branded fixed
`session_read_failed` or `user_read_failed` value before the promise returns to
Better Auth's installed factory/tracer, logger or HTTP handler. The installed
Better Auth low-level adapter is not invoked for this exact joined read. Every
unrelated adapter method and lookup continues to delegate unchanged.

The pinned Drizzle mysql2 path wraps a driver rejection in
`DrizzleQueryError`, but it does not trace or log that value. The NQR boundary
does not read the wrapper's message, query, params or cause and does not retain
or forward it. The fixed error has no cause and runtime classification trusts
only a private `WeakMap`, not a mutable public property.

### F2 — validate complete own-data rows and identity linkage

Before assembly, the wrapper now validates and copies only ordinary own data
properties. Accessors are rejected without calling their getters.

- Session requires non-empty `id`, exact requested `token`, non-empty
  `userId`, finite `expiresAt`, `createdAt` and `updatedAt` Dates, and own
  nullable-string `ipAddress` / `userAgent` fields.
- User requires `id` exactly equal to `session.userId`, string `name`,
  non-empty `email`, boolean `emailVerified`, own nullable-string `image`, and
  finite `createdAt` / `updatedAt` Dates.
- Missing session and missing user remain unauthenticated `null`. A malformed
  non-null session or user maps to `session_result_invalid` or
  `user_result_invalid`.

The normalized objects are fresh minimal objects; arbitrary row properties,
accessors and prototypes are not forwarded into the authenticated result.

### F3 — classify adapter initialization

The installed adapter factory invocation is now inside a no-inspection catch.
Any initialization rejection is replaced with the fixed private category
`adapter_initialization_failed`; the original value is neither read nor
forwarded.

## Semantic red and final evidence

The new installed-chain suite was written against the iteration-1 candidate
before the production repair. Its initial run was **11 failed / 0 passed**:
hostile session/user rejections reached installed tracing, initialization was
unclassified, malformed non-null rows were accepted or returned the wrong
category, and the new direct installed-Drizzle success seam did not exist.

The final suite uses Better Auth 1.7.2's actual `createAdapterFactory`, actual
`createInternalAdapter`, actual `betterAuth().handler`, the installed Drizzle
adapter, the actual Drizzle mysql2 query path and an inert mysql2 client. It is
not a direct wrapper-only mock.

Final results:

- focused installed/auth/request tests: **28/28 PASS**, 4 files;
- full Vitest: **996/996 PASS**, 41 files;
- release/script tests: **119/119 PASS**;
- `npm run typecheck`: PASS;
- full `npm run lint`: PASS;
- `npm run check:drift`: PASS, 10 tables / 29 SQL statements, offline;
- `git diff --check` for the candidate files: PASS.

Installed-chain coverage includes:

- hostile session and user mysql2 rejections with `get`, `has`, prototype,
  own-key and descriptor trap arrays remaining exactly empty;
- no invocation of the installed Better Auth low-level `findOne` for the
  intercepted joined lookup, and no native Drizzle relational `findFirst`;
- initialization failure with a fixed category and zero hostile traps;
- missing required fields, invalid dates, token mismatch, user-ID mismatch,
  invalid verification type and accessor-bearing session/user values;
- complete success, missing session, orphan user, expired and revoked HTTP
  behavior, plus concurrent isolated reads for two accounts;
- real Better Auth HTTP get-session failure returning fixed HTTP 500, exactly
  one `[NQR_AUTH] session_read_failed` console event and no raw marker in the
  response or console.

The actual installed-Drizzle success probe used two ordinary selects, returned
the complete matching pair and confirmed that both relational query methods
remained unused. The actual hostile mysql2 probes produced the two fixed read
categories without any hostile trap firing.

## Exact identity

Digest method: SHA-256 of compact, path-sorted JSON objects with keys
`after`, `before`, `path`; `before: null` means the path was absent.

Iteration-2 delta digest:
`aad7f5bb504edb8070b10788c09d954c785e2edfbc7129c6348482ce36867868`

| Path | Iteration-1 before | Iteration-2 after |
| --- | --- | --- |
| `src/lib/auth-session-adapter-installed.test.ts` | absent | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `14ac731398a9daacbb795fefceba3160f99a580d527148bd456b7ce7b56560be` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `1f6952b2fb399a114bb0fc7db68da7ba014c08de5b72d17b83610f6a131f3a90` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth.ts` | `34a834fef3020a17533c4d2b624934425577c308d9e91f00236ae0bd80372be4` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |

Complete iteration-1 + iteration-2 five-file candidate digest, measured from
the pre-NQR-061 source:
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`

| Path | Pre-NQR-061 before | Final after |
| --- | --- | --- |
| `src/lib/auth-runtime.test.ts` | `364ba2ef011bc3cc6f5f539f8299dad95a51f4a2bd62d0fa48656c1d693c59b2` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | absent | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | absent | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | absent | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth.ts` | `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |

Unchanged guards:

- `src/lib/request-auth.ts`:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`;
- `src/db/index.ts`:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`;
- `src/db/schema.ts`:
  `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a`;
- `drizzle/0000_shallow_vision.sql`:
  `13b765dd3558c9355f6fc7c1d1e23472e4dd8fa950ebd980f47001ae658c89ee`;
- `package.json`:
  `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`;
- `package-lock.json`:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`.

Installed path hashes remained unchanged:

- Better Auth core adapter factory:
  `a29c8924fe90d19e25120017669edbe16e903dc7fff4cadd66b95221a665f795`;
- Better Auth core tracer:
  `86c429ed27f477545f0fe6977e1e042d71dad0d68dfca47506e11a094f0ffe9e`;
- Better Auth session route:
  `831a00b6e144c1560c21406de1db586a67089630ad58fb2f3c7dcd3c5c963d57`;
- Better Auth internal adapter:
  `dff06457e141795b3abfa0072b4fed57dd7ff6d5773ede2a3dc91dcfd1f1fdc8`;
- Better Auth Drizzle adapter:
  `d0bd019ad1db62906b3b1a4c9ec21a8cc18a46d1ee282b7592442ad86b59a15e`;
- Drizzle mysql2 session:
  `f02ee630806edb530a87c9cbec5a906b0970e52e81eddd95827fccee6e9ea794`;
- Drizzle MySQL query boundary:
  `60aba8ed329c82c787d6679b966948db72d75bae0f8ac4fb4e0285044d1e8308`;
- Drizzle fixed query wrapper:
  `ca0578184ceea0af8abfc8b547a10c906e9e70d6c2d957668f12dc39ccac7144`.

## Limitations and next gate

- No real MariaDB/HostAtom behavior was exercised; the production root cause
  and repair status remain unknown.
- The inert mysql2 client proves installed call order and failure containment,
  not server SQL compatibility, TLS, timezone or production behavior.
- No Google callback, browser, build, artifact or deployment was run.
- Passing self-tests are not independent approval.

TL/Security and QA must independently freeze and review the exact complete
candidate, repeat the actual installed-chain hostile/error/result/HTTP probes,
and verify all unchanged guards. Any disposable MariaDB test, build or
production action remains a separately authorized later gate.
