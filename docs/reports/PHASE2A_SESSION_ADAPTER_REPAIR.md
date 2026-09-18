# Phase 2A session adapter diagnostic boundary

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-061` / BACKEND / iteration 1  
Verdict: **DONE — OFFLINE BOUNDED CLASSIFICATION CANDIDATE; ROOT CAUSE AND DEPLOYMENT REMAIN OPEN**

## Authorized scope

This assignment was limited to the local checkout and installed packages. It
did not access Plesk, a browser, a network, a real database, credentials or
production. It did not build or deploy an artifact and did not change schema,
migrations, packages, the lockfile, API bodies, quota or privacy retention.

Required project control documents and the installed Next.js 16.3.1
authentication, data-security and route-handler guides were read before the
candidate was finalized. The installed implementations reviewed were Better
Auth 1.7.2, `@better-auth/drizzle-adapter` 1.7.2, Drizzle ORM 0.45.2 and mysql2
3.24.2.

## Installed-path diagnosis

The installed Better Auth `/get-session` endpoint reads the signed session
token and, with cookie cache disabled, calls
`internalAdapter.findSession(token)`. `findSession` asks the configured
adapter for `session` with `join: { user: true }`. With
`advanced.database.joins: false`, the Better Auth adapter factory executes a
base session read and a fallback user read.

The installed fallback catch logs a predicate and the original error before
rethrowing. The `/get-session` route then logs the original error and replaces
it with the generic `FAILED_TO_GET_SESSION` API error. This explains why the
authorized production diagnostic saw only a generic outer `Error`, but it
does **not** prove which database/adapter operation failed. The earlier
two-read production candidate also failed, so this report does not claim that
two reads alone repair the production defect.

Installed-source evidence frozen for this analysis:

| Installed file | SHA-256 |
| --- | --- |
| `node_modules/better-auth/dist/api/routes/session.mjs` | `831a00b6e144c1560c21406de1db586a67089630ad58fb2f3c7dcd3c5c963d57` |
| `node_modules/better-auth/dist/db/internal-adapter.mjs` | `dff06457e141795b3abfa0072b4fed57dd7ff6d5773ede2a3dc91dcfd1f1fdc8` |
| `node_modules/@better-auth/drizzle-adapter/dist/index.mjs` | `d0bd019ad1db62906b3b1a4c9ec21a8cc18a46d1ee282b7592442ad86b59a15e` |
| `node_modules/drizzle-orm/mysql2/session.js` | `f02ee630806edb530a87c9cbec5a906b0970e52e81eddd95827fccee6e9ea794` |

## Candidate behavior

`src/lib/auth-session-adapter.ts` wraps only the exact Better Auth session +
user lookup. All unrelated adapter operations pass through unchanged.

- The exact lookup is performed as two ordinary adapter reads: session by
  token and user by the returned `userId`.
- Missing session and missing user still return `null`; an orphan never
  authenticates.
- A session read failure, malformed session result, user read failure and
  malformed user result become one of four fixed internal categories.
- The original thrown value is never stringified, enumerated, retained as a
  cause or forwarded to the logger.
- Categories are privately branded in a `WeakMap`. The public `code` is fixed,
  enumerable, non-writable and non-configurable so a bounded later diagnostic
  can recognize it, while runtime decisions do not trust the public property.
- The Better Auth logger is set to error-only and emits only
  `[NQR_AUTH] <fixed-category>`. Every unrelated error becomes the fixed
  `auth_internal_error`; raw message, SQL, params, DSN, cookie and token values
  are not forwarded.
- Better Auth still converts the failure to its fixed generic HTTP session
  error. No internal category is added to an HTTP response.

This is primarily a diagnostic/privacy boundary. A later separately
authorized production check can distinguish the failing stage without copying
raw database details. It is not evidence that the existing production 500 is
fixed.

## Red and green evidence

The new focused suite was written first. Against the preimage, the initial run
failed before collection because `src/lib/auth-session-adapter.ts` did not
exist (`Cannot find module '/src/lib/auth-session-adapter'`). This accurately
records that the preimage had no bounded category boundary; it is not claimed
as a live MariaDB reproduction.

Final local results:

- focused auth tests: **9/9 PASS** across 3 files;
- full Vitest: **977/977 PASS** across 40 files;
- release/script tests: **119/119 PASS**;
- `npm run typecheck`: PASS;
- full `npm run lint`: PASS;
- `npm run check:drift`: PASS, 10 tables / 29 SQL statements, offline and no DB;
- `git diff --check`: PASS.

The focused cases cover session-read and user-read category separation,
malformed session fail-closed behavior, missing/orphan behavior, unrelated
adapter pass-through, fixed property descriptors and hostile Proxy errors.
Getter, own-key, prototype and coercion traps remain at zero; no raw marker or
token is present in the serialized fixed failure or emitted log.

## Exact delta identity

Digest method: SHA-256 of compact path-sorted JSON objects with keys
`after`, `before`, `path`; `before: null` means the path was absent.

Candidate digest:
`80aafe6581eecdb47710f95dab755cd9454193636acadec9ff4fb98ad069ea7b`

| Path | Before | After |
| --- | --- | --- |
| `src/lib/auth-runtime.test.ts` | `364ba2ef011bc3cc6f5f539f8299dad95a51f4a2bd62d0fa48656c1d693c59b2` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter.test.ts` | absent | `14ac731398a9daacbb795fefceba3160f99a580d527148bd456b7ce7b56560be` |
| `src/lib/auth-session-adapter.ts` | absent | `1f6952b2fb399a114bb0fc7db68da7ba014c08de5b72d17b83610f6a131f3a90` |
| `src/lib/auth.ts` | `0e2399f68027067f5d86c8604b69d9b25dcabd31cbf7151478e805833889b19f` | `34a834fef3020a17533c4d2b624934425577c308d9e91f00236ae0bd80372be4` |

Unchanged guards after verification:

- `src/lib/request-auth.ts`:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- `src/db/index.ts`:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- `package.json`:
  `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`
- `package-lock.json`:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`

## Limitations and next gate

- No real MariaDB query or HostAtom/Passenger runtime was exercised.
- No production stack, SQL, driver code or raw error was inspected.
- The production failure category and root cause remain unknown.
- Passing local tests do not authorize a build, deployment or production
  diagnostic.

TL and Security must independently review the exact four-file digest,
especially category immutability, raw-value non-observation, HTTP non-disclosure
and compatibility with the installed adapter contract. QA must validate the
frozen candidate offline. Only after those gates may PM request separate build
and production authority.
