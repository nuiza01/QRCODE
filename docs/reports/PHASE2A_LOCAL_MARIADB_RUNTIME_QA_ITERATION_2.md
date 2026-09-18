# Phase 2A local MariaDB runtime QA — iteration 2

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-070` / QA / local-runtime iteration 2  
Verdict: **SCOPED PASS — DISPOSABLE LOCAL MARIADB/NEXT RUNTIME**

QA independently exercised the exact reviewed session-adapter candidate
through a real local Next.js 16.3.1 source runtime and disposable MariaDB
10.11.19. The requests traversed the installed Better Auth 1.7.2, Drizzle and
mysql2 paths; direct wrapper mocks were not used as acceptance evidence.

No source, package, schema or migration file was edited. No build, install,
external network, real Google OAuth, Plesk, deployment or production action
was performed. All identities and cookies were synthetic. The only project
write from this assignment is this report.

## Frozen identity

The documented compact path-sorted candidate digest matched before and after
runtime testing:

`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |

Database initialization `0499ed3…f68`, schema `733674e…b6a`, MariaDB
migration `8401ff9…bbf`, package `237ae72…9b0` and lock
`1632895…2f1a` also remained exact. Final `git diff --check` passed.

The mode-0600 handoff identified candidate `5642ba2c…1f52`, MariaDB
`10.11.19-MariaDB`, a loopback-only source runtime and no external-network,
build, real-OAuth or source-mutation authority. QA never printed or retained
the mode-0600 synthetic environment values.

## Database and source-runtime identity

Independent database queries and the source `getDb()` pool established:

- exact engine: `10.11.19-MariaDB`;
- exact ten application tables:
  `account`, `folders`, `qr_codes`, `qr_target_history`, `scan_daily`,
  `scans`, `session`, `subscriptions`, `user`, `verification`;
- migration metadata table present with exactly one applied row;
- no unexpected application table;
- source pool session time zone: `+00:00`;
- source pool selected the disposable database and returned a UTC timestamp.

The direct mysql2 setup connection initially reported `SYSTEM`, as expected;
the important application-owned pool hook independently reported `+00:00`.

## Real HTTP and persisted-session matrix

All requests below were sent to the local Next source runtime using only
signed synthetic session-token cookies.

| Case | Result |
| --- | --- |
| Current persisted session | HTTP 200; exact matching synthetic user/session ownership |
| Absent token | HTTP 200 with `null` |
| Expired persisted session | HTTP 200 with `null` |
| Revoked session after durable deletion | HTTP 200 with `null` |
| Orphan session with missing user | HTTP 200 with `null` |
| Authenticated English dashboard | HTTP 200 with stable Saved QR heading and current records |
| Recovery after every fault | current session returned HTTP 200 with its matching owner |

The auth route's current and absent responses were `no-store`. No cookie
snapshot, stale identity or orphaned record became authoritative.

## Saved-QR ownership and quota

QA created separate synthetic users so the review did not reuse BACKEND or TL
fixtures.

- both users created a saved Static QR through real HTTP;
- each dashboard listed only its owner's record;
- a foreign rename, duplicate and delete each returned indistinguishable HTTP
  404 and did not mutate the owner record;
- the owner rename, duplicate and delete each succeeded;
- all mutation responses used `Cache-Control: no-store`;
- cross-origin mutation returned 403;
- unauthenticated mutation returned 401;
- an authenticated 810,000-byte body returned 413 without echoing the marker;
- the stable error bodies contained no raw database, cookie, payload or
  synthetic secret material.

For quota contention, QA inserted exactly 24 Static QR rows for a separate
synthetic owner, then concurrently issued one real create and one real
duplicate. Results were exactly `[201, 409]`; the fixed quota body reported
limit 25, and the final persisted Static count was exactly 25. Thus only one
contender claimed slot 25.

A loopback sentinel URL was deliberately placed in the saved payloads. The
sentinel observed **zero requests**, confirming that list/create/duplicate
operations did not fetch user-provided QR content. No external endpoint was
contacted.

## Controlled failures and fixed logging

After TL completed its runtime probe, QA used exclusive bounded fault windows
and restored every table before proceeding.

### Session-table failure

With only the disposable `session` table temporarily unavailable:

- `get-session`: HTTP 500;
- dashboard: HTTP 200 with fixed localized unavailable copy;
- saved-QR mutation: HTTP 500, `no-store`, exact body
  `{"error":"saved_qr_operation_failed"}`;
- the three requests produced exactly three events, each the single fixed
  category `session_read_failed`;
- no table marker, database/user value, DSN, cookie token or password appeared
  in a response or the runtime log.

### User-table failure

With only the disposable `user` table temporarily unavailable, `get-session`
returned HTTP 500 and produced exactly one `user_read_failed` event. No raw
marker or secret appeared publicly or in the log. The table was restored and
the current session recovered.

### Database disconnect

BACKEND stopped only the disposable MariaDB process while keeping Next alive;
QA independently issued the same real HTTP checks:

- `get-session`: HTTP 500;
- dashboard: HTTP 200 with fixed unavailable copy;
- mutation: HTTP 500 with the fixed `no-store` body;
- exactly three one-per-request `session_read_failed` events;
- no raw database, DSN, user, password or token marker in body or log.

After BACKEND restarted MariaDB, QA independently confirmed HTTP 200 session
recovery, ten application tables, zero held fault tables, zero QA synthetic
users and zero QA saved-QR rows.

## Harness audit notes

Three preliminary failures were QA-harness issues, not candidate findings:

1. a table-list comparison assumed binary ordering, while MariaDB collation
   ordered `scans` and `scan_daily` differently; the check was corrected to a
   set comparison;
2. the first oversized fixture was 677,700 bytes, below the 800,000-byte
   contract; it was corrected to 810,000 bytes and returned 413;
3. the first fault-log slice used a byte offset on a decoded string; it was
   corrected to slice the raw Buffer before decoding.

Each attempt restored/removed its synthetic rows and fault tables. A sandboxed
tsx source-pool probe first hit the expected temp-socket denial and then a
missing React server condition; the approved local-only retry used the
installed `react-server` condition and passed. No application code or
toolchain was changed.

## Evidence identities

All runtime evidence was mode `0600`:

| Evidence | SHA-256 |
| --- | --- |
| sanitized ready handoff | `1739c5cb7f0291efed945c58a7c94b407fb26f7d0ce16a7895f00dc793ae5277` |
| QA source-pool probe | `8a5d8dd7f9e6faaf9ace84d9a7d8ac013e5b8264666d636421866ac1c8d3e930` |
| QA normal HTTP/DB matrix | `91295d2a9ce61ff6f43afa9c4214904eb7cb70f0c329d9839cd680966da22099` |
| QA session/user fault matrix | `b843c974d1c3889c43e9254e14b47f156676a623710c6117a05a761795d4decf` |
| QA disconnect matrix | `5daeec79be9965054e345b2675aba2e14306c22072d69c8fa552384d5a048e71` |
| QA recovery matrix | `e4ce728284dc26793c83d1d91656124a828d9f6264f3187596f357b7c9214be0` |
| QA completion marker | `ec8eb092409fab14bf233a8c6b6dc0342a35aa30e51855c070bc161a76b24a1a` |

## Cleanup verification

After both independent review markers were present, BACKEND published
mode-0600 cleanup evidence. QA independently verified:

- the unique disposable datadir is absent, which removes the named database
  and database user material;
- the runtime secret env, socket and PID files are absent;
- Next `30168`, MariaDB `33368` and the QA sentinel `39968` have no listener;
- retained non-secret evidence files are all mode `0600` inside a mode `0700`
  directory;
- pre-existing MySQL 9.7.1 remains the same PID listening on `3306` and
  `33060`;
- MariaDB 10.11.19 remains installed but unlinked: neither
  `/opt/homebrew/bin/mariadbd` nor `/opt/homebrew/bin/mariadb` exists.

Cleanup evidence SHA-256:

- `cleanup.json`: `b8b0f817f9bde0f20d5abed62dd473fc3325fb54416b0a3dbb37f0336551d955`;
- `cleanup.done`: `a207a003fc82c9e7f17c2f1af63d7e2d171d1200d1bbbcfe5df9da89a4cb634c`.

## Limits

This scoped pass proves the reviewed candidate against a disposable local
MariaDB 10.11.19 and local Next source runtime. It does not prove real Google
OAuth, HostAtom/Plesk, a production build, browser behavior, deployment or
production repair. Those remain separately authorized gates.
