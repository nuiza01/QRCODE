# Phase 2A disposable local MariaDB runtime — TL + Security review, iteration 2

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-069` / TL + SECURITY / local-runtime iteration 2  
Verdict: **SCOPED PASS — no actionable defect in the authorized local-runtime gate**

The exact reviewed Phase 2A candidate was exercised against an isolated,
loopback-only MariaDB 10.11.19 process and the real local Next source runtime.
Independent probes covered the installed Better Auth, Drizzle and mysql2 path,
strict session mapping, failure privacy, owner isolation and the shared
Saved Static quota of 25. The disposable database, user, processes, data
directory and secret handoff were removed afterward. The pre-existing MySQL
9.7.1 service was not used or modified.

This is a local synthetic runtime verdict. It is not Plesk, external Google
OAuth, deployment or production approval.

## Authority and frozen identities

The authorized boundary allowed only an exact disposable local MariaDB 10.11
database/user and a local Next source runtime. It prohibited build, external
network, real OAuth, Plesk, source/package/schema edits, deployment and
production mutation.

The complete reviewed five-file digest matched before and after the gate:

`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |

Current persistence and package guards also remained exact:

| Boundary | SHA-256 |
| --- | --- |
| `src/db/index.ts` | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| `src/db/schema.ts` | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| `drizzle/0000_shallow_vision.sql` | `13b765dd3558c9355f6fc7c1d1e23472e4dd8fa950ebd980f47001ae658c89ee` |
| `drizzle/meta/0000_snapshot.json` | `d69ec2a3fd6ae1f184e5084fb3c85b70913b271bfa61b7895f4227aa9177e00c` |
| `drizzle/meta/_journal.json` | `2cc7aef196d7b272606e8aa98b927e86d327139b84ebed0ab4587caa33b6879f` |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |

`npm run check:drift` passed at **10 application tables / 29 SQL
statements**, offline. `git diff --check` also passed. No source, schema,
migration or package file was edited by this review.

## Isolated runtime identity

The sanitized handoff in `/private/tmp/nqr068-local-runtime/ready.json` had
mode `0600`, matched the candidate digest, and identified:

- MariaDB `10.11.19-MariaDB` from the absolute unlinked Homebrew 10.11 path;
- database listener `127.0.0.1:33368` and local socket under the coordination
  directory;
- Next source runtime `http://127.0.0.1:30168`;
- a separate mode-`0600` runtime environment handoff whose values were never
  printed or copied into this report;
- `externalNetwork:false`, `realOAuth:false`, `build:false` and
  `sourceMutation:false`.

Process inspection independently confirmed that the MariaDB and Next PIDs
listened only on their assigned loopback ports. MariaDB's executable and open
database files resolved to the isolated 10.11.19 runtime and unique temporary
data directory. The existing Homebrew MySQL 9.7.1 process remained separately
bound to `127.0.0.1:3306` and `127.0.0.1:33060`.

## Independent runtime results

The independent probe imported the actual project `getAuth` and `getDb`
entrypoints and the installed Better Auth, Drizzle and mysql2 packages. It did
not rely only on BACKEND's results.

| Boundary | Independent result |
| --- | --- |
| Engine and migration | MariaDB 10.11.19; 10 app tables plus `__drizzle_migrations`; one migration metadata row whose stored hash matched the exact migration |
| Database authority | application account restricted to `127.0.0.1` and DML privileges (`SELECT`, `INSERT`, `UPDATE`, `DELETE`); no DDL, `ALL` or grant option |
| UTC | actual source pool reported `@@session.time_zone = '+00:00'` |
| Session mapping | current session returned exact session/user IDs and tokens, dates, booleans and nullable fields through the real Better Auth handler |
| Parameterization | a signed SQL-injection-like token returned unauthenticated; it did not alter the query or expose another session |
| Revocation and expiry | expired and revoked synthetic sessions were unauthenticated; a restored current session recovered normally |
| Owner isolation | two synthetic users could read and mutate only their own saved QR records; foreign targets returned not found without disclosure |
| CRUD | list, create, rename, duplicate and delete passed through real local HTTP and MariaDB |
| Quota contention | from 24 owned records, concurrent create and duplicate returned one `201` and one `409`; final Saved Static count was exactly **25** |
| Fail-closed session fault | controlled `session` table unavailability produced unauthenticated/`500` behavior, fixed unavailable responses, `no-store` mutation failure and no write; recovery passed after restoration |
| Fail-closed user fault | controlled `user` table unavailability failed closed and recovered after restoration |
| Privacy and cardinality | appended runtime log contained exactly three fixed `session_read_failed` events and one fixed `user_read_failed` event for the injected calls; no secret, SQL, driver detail or raw marker appeared in public bodies or the observed log segment |
| Outbound observation | bounded socket monitoring of both assigned runtime PIDs observed zero non-loopback connections |

The final independent probe result was:

```text
PASS: tables=11, migrationRows=1, UTC=true, sessionMapping=true,
parameterizedTokenProbe=true, revokedExpired=true, ownership=true, CRUD=true,
quotaStatuses=[201,409], quotaFinal=25, sessionCategories=3,
userCategories=1, outbound=0
```

All controlled table fault injections used `finally` restoration. A final
database check found zero retained TL-review users and QR records and zero
temporarily renamed tables.

### Probe-harness disclosure

The first harness invocation stopped before assertions because a script
outside the project could not resolve a package subpath. Imports were then
anchored to the already installed project modules. A later disclosure check
initially treated the fixed text `user_read_failed` as though it contained a
case-insensitive MySQL `ER_...` code. Inspection showed only the intended fixed
category; the harness was narrowed to a case-sensitive, word-bounded driver
code pattern and the complete probe passed. These were harness-only issues;
no application source or runtime policy was changed.

## Completion marker and teardown

After the bounded review, TL/Security wrote the required mode-`0600`
`tl.runtime.done` marker. Its SHA-256 is
`44bcefd7cdac1be64bd6f3dfa43936acda19197250da674f2f5565a4f0c24a32`.

BACKEND then published sanitized cleanup evidence:

| Evidence | SHA-256 |
| --- | --- |
| `ready.json` | `1739c5cb7f0291efed945c58a7c94b407fb26f7d0ce16a7895f00dc793ae5277` |
| `cleanup.json` | `b8b0f817f9bde0f20d5abed62dd473fc3325fb54416b0a3dbb37f0336551d955` |
| `cleanup.done` | `a207a003fc82c9e7f17c2f1af63d7e2d171d1200d1bbbcfe5df9da89a4cb634c` |

Independent post-cleanup checks confirmed:

- disposable database and user were absent before MariaDB stopped;
- no listener remained on `30168` or `33368`;
- the runtime environment file, MariaDB PID/socket and unique data directory
  were absent;
- the Homebrew MariaDB 10.11 formula remained unlinked;
- the pre-existing MySQL 9.7.1 PID and loopback listeners on 3306/33060 were
  unchanged.

The coordination directory retains only sanitized evidence/log artifacts and
peer completion markers; the secret handoff and disposable database storage
are gone.

## Limits and next gate

This scoped pass establishes the reviewed candidate's behavior on one
disposable, single-instance local MariaDB 10.11.19 and Next runtime. It does
not prove Plesk process configuration, HostAtom connection limits, TLS,
external Google OAuth, multi-instance rate-limit sharing, production database
behavior, build output, deployment or rollback. No external request, browser,
build, deploy or production mutation was performed.

The next authorized step, if any, must preserve the same source identity and
separately validate the intended Plesk/HostAtom runtime and deployment gates.
