# Phase 2A disposable local MariaDB runtime — iteration 2

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-068` / BACKEND / local-runtime iteration 2  
Verdict: **DONE — SCOPED PASS WITH COMPLETE DISPOSABLE CLEANUP**

The exact reviewed Phase 2A session-adapter candidate was exercised through
the real installed Better Auth 1.7.2, Drizzle, mysql2 and Next.js 16.3.1
source-runtime paths against an isolated MariaDB 10.11.19 process. Independent
TL/Security and QA reviewers tested the same live runtime before teardown and
both returned scoped passes.

This is local synthetic runtime evidence only. It is not a build, Plesk,
external Google OAuth, deployment or production approval.

## Authority and frozen identity

Iteration 2 used the authorized absolute Homebrew binaries under
`/opt/homebrew/opt/mariadb@10.11/bin/`. The formula remained unlinked. No
`brew services`, global link, port 3306/33060, existing MySQL service, build,
external network, real OAuth, Plesk, source/package/schema edit, deployment or
production mutation was used.

The complete reviewed five-file candidate digest matched throughout:

`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |

Unchanged persistence and package guards:

| Boundary | SHA-256 |
| --- | --- |
| `src/db/index.ts` | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| `src/db/schema.ts` | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| `drizzle/0000_shallow_vision.sql` | `13b765dd3558c9355f6fc7c1d1e23472e4dd8fa950ebd980f47001ae658c89ee` |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |

## Isolated setup

The runtime used a uniquely named mode-0700 data directory, local socket,
PID/log paths and loopback-only high ports:

- MariaDB 10.11.19: `127.0.0.1:33368`;
- Next source runtime: `127.0.0.1:30168`;
- mode-0600 synthetic environment handoff;
- uniquely named disposable database and `127.0.0.1`-only application user.

The exact reviewed migration was applied once. Offline drift verification
passed at **10 application tables / 29 SQL statements**. Runtime inspection
found the ten expected application tables, one migration metadata row and no
unexpected table. A raw setup connection reported MariaDB's `SYSTEM` time
zone, while the actual application-owned `getDb()` pool reported `+00:00` as
required. Schema-typed reads returned finite `Date` instances for session
expiry/create/update fields, exact owner linkage and an empty persisted raw IP.

## BACKEND runtime evidence

BACKEND exercised real signed synthetic session cookies and real HTTP/DB
boundaries:

| Boundary | Result |
| --- | --- |
| Persisted session | current authenticated; missing, expired and revoked returned unauthenticated; restoration recovered |
| Dashboard | authenticated continuity and two-user ownership isolation passed |
| Saved QR CRUD | create, rename, duplicate and delete passed; foreign operations returned indistinguishable 404 |
| Saved Static quota | from 24 records, concurrent create/duplicate returned `[201,409]`; final count exactly 25 |
| Session-table failure | get-session 500, dashboard fixed safe unavailable copy, mutation fixed no-store 500 |
| User-table failure | get-session 500 with the fixed user-read category; restoration recovered |
| Full DB disconnect | get-session 500, dashboard safe 200, mutation fixed no-store 500; post-restart session recovered |
| Privacy | no raw IP persisted and no secret/raw SQL/driver marker appeared in checked bodies or logs |

The controlled table-fault paths were restored in `finally` cleanup. The
runtime log exposed only fixed categories (`session_read_failed` and
`user_read_failed`) and no secret, SQL or driver-error indicator.

## Independent review on the same runtime

After a sanitized mode-0600 `ready.json` and `runtime-ready` marker were
published, NQR-069 and NQR-070 independently exercised the same live runtime.
BACKEND kept both processes alive until both required completion markers were
present.

### TL/Security — scoped pass

NQR-069 independently confirmed the exact engine/migration, restricted
application-account authority, application UTC session, complete Better Auth
session mapping, SQL-injection-like token parameterization, revoke/expiry,
two-user ownership, CRUD, quota contention, controlled session/user faults,
fixed log cardinality and zero observed non-loopback connections. Its report:

- `docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME_TL_SECURITY_REVIEW_ITERATION_2.md`
- SHA-256 `08d3c86e706bb52269bc14213a30768a58f057bdb685ba1292a64f5552e9c731`

### QA — scoped pass

NQR-070 independently confirmed current/absent/expired/revoked/orphan
sessions, dashboard continuity, cross-owner CRUD isolation, quota `[201,409]`
with final count 25, cross-origin 403, unauthenticated 401, 810,000-byte body
413, fixed no-store errors, zero outbound sentinel requests, session/user
faults, full disconnect fail-closed behavior and post-restart recovery. Its
report:

- `docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME_QA_ITERATION_2.md`
- SHA-256 `0ffeb5fbe94fd261fc2929b7d4a8c90aabd4957a0f33e7b41d881d6e69f77382`

## Harness disclosures

The first setup harness used a Drizzle configuration form that the installed
0.45.2 runtime did not accept without schema. The disposable database/user
were reset and the harness was corrected to use the installed mysql2 pool
form; this occurred before readiness and did not change application source.

The first MariaDB restart omitted `--no-defaults`, encountered an unrelated
local MySQL option and stopped before listening. It was immediately restarted
with the same isolated `--no-defaults` configuration used by the successful
runtime. No existing MySQL setting or service was changed.

Independent reviewers disclose their own bounded harness-only corrections in
their reports. None required an application, schema, migration or package
change.

## Evidence identities

All coordination evidence was mode 0600 inside a mode-0700 directory. The
secret environment values were never printed or retained after cleanup.

| Sanitized evidence | SHA-256 |
| --- | --- |
| setup | `3025315cca00b375c53586bc78c3c5790cc92c1633b29c8f1e7639a75f8b6cd2` |
| source schema/Date probe | `b98fbae8f1802f2ed9b78bd035ed701560db9f5cba5898b8863b15b9e4587a98` |
| BACKEND HTTP/DB matrix | `8b661268f7740d8451937d3a90d3cc5ed9aa4afe379f69c12b99f36305bbf993` |
| BACKEND disconnect matrix | `ebdb178e5aec5a408e92635d110ed4111da84bdf243e4197cb0d0b9b9ba49129` |
| BACKEND recovery | `2dba82318bd620df5827dc991ad994d2c2a5ab7cb39b2b76b19c0b3868b668f9` |
| BACKEND log scan | `43fe0fcd9b932b4262f8e886ef891ab6f1fc174bb785194702e8ba5ee3784551` |
| sanitized ready handoff | `1739c5cb7f0291efed945c58a7c94b407fb26f7d0ce16a7895f00dc793ae5277` |
| sanitized cleanup | `b8b0f817f9bde0f20d5abed62dd473fc3325fb54416b0a3dbb37f0336551d955` |
| cleanup marker | `a207a003fc82c9e7f17c2f1af63d7e2d171d1200d1bbbcfe5df9da89a4cb634c` |

The iteration-1 no-engine blocker report remains preserved at
`docs/reports/PHASE2A_LOCAL_MARIADB_RUNTIME.md`, SHA-256
`286273ba16c5d710ece08bc93ffee9a334bcb214c04869133bf01240100419c2`.

## Teardown

After both independent completion markers were present, BACKEND:

1. stopped the local Next runtime;
2. resolved and dropped only the exact disposable database and user;
3. verified both absent before stopping MariaDB;
4. stopped the disposable MariaDB process;
5. removed the mode-0600 secret environment, temporary harnesses/logs and the
   uniquely named MariaDB data directory;
6. verified no listener on 30168 or 33368;
7. verified the pre-existing MySQL 9.7.1 process remained on 3306/33060 and
   the MariaDB 10.11 formula remained unlinked.

Both independent reviewers repeated the cleanup verification. Only sanitized
evidence and completion markers remain in the coordination directory.

## Limits and next gate

This establishes the reviewed candidate on one disposable, single-instance
local MariaDB 10.11.19 and local Next source runtime. It does not establish
HostAtom/Plesk process configuration, TLS, real Google OAuth, production
connection limits, a production build, deployment, rollback or multi-instance
rate-limit sharing. Those remain separately authorized gates. No production
data or real user identity was used.
