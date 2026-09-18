# Phase 2A disposable local MariaDB runtime — TL + Security review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-069` / TL + SECURITY / local-runtime iteration 1  
Verdict: **BLOCKED — exact MariaDB 10.11 runtime is not locally available**

The authorized runtime gate could not begin. This machine has a pre-existing
Homebrew MySQL 9.7.1 service, but MySQL is not MariaDB 10.11 and substitution
was explicitly prohibited. No candidate defect was found by this blocked
preflight, and no claim is made about real MariaDB behavior.

## Reviewed authority and inputs

The review used the current `AGENTS.md`, `ENGINEERING_LOOP.md`,
`TEAM_REPORTING.md`, the installed Next.js 16.3.1 authentication and
data-security guidance, the NQR-063 runtime gate, NQR-066/NQR-067 reviews and
the PM integration report. Their relevant identities matched:

| Evidence | SHA-256 |
| --- | --- |
| NQR-063 gate | `b4568b464b7f6fb9dc230c608446b73babe00a9a9dcdd11fd28bd0e846b96852` |
| NQR-066 TL/Security | `e3263d89ce775f2204c2e5e100865b30846939e92c9fa028de73de73a19b7f30` |
| NQR-067 QA | `6b4a7e2a4ff770c4bfc657c8ccf5e056a0e6ffbbd0ffc5a121e8d1468b0c580e` |
| PM integration | `fce246cb7deee18a7cc008a4abf7e3e705a3b80839ff5d0668dacf73396e448d` |
| NQR-068 BACKEND blocker | `286273ba16c5d710ece08bc93ffee9a334bcb214c04869133bf01240100419c2` |

The authorization allowed only an exact MariaDB 10.11 disposable database,
local user and local Next source runtime with synthetic identities. It did not
allow installing software, using network/container downloads, substituting a
different engine, accessing Plesk or external OAuth, building, deploying, or
changing source/package/schema/migration files.

## Independent availability result

Read-only checks independently established:

- `mariadbd`, `mariadb` and `mariadb-install-db` are absent from `PATH`;
- no MariaDB server binary exists in the checked Homebrew, `/usr/local`,
  Applications or temporary roots;
- Homebrew has only `mysql 9.7.1`; both `mysqld --version` and
  `mysql --version` report 9.7.1;
- Docker, Podman and Colima are absent, so no already-local container runtime
  can provide the required engine;
- the only database listeners are the pre-existing MySQL process on
  `127.0.0.1:3306` and `127.0.0.1:33060`;
- no listener whose working directory is this QRCODE project or the NQR-068
  coordination directory exists.

The existing MySQL service was neither queried nor stopped. Using it would
invalidate the explicit MariaDB 10.11 compatibility gate.

## Candidate and migration preflight

The complete reviewed five-file digest was independently recomputed and still
matched:
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

Candidate postimages remained exact:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |

Persistence and package guards also remained exact:

| Boundary | SHA-256 |
| --- | --- |
| DB initialization | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| schema | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| MariaDB migration | `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf` |
| MariaDB snapshot | `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e` |
| MariaDB journal | `7fa4345ae477f77b0f0c3d4b09ea7a26d233d2e307d0179c389b20074d7a3361` |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |

Safe static verification passed:

- focused installed auth/session/request suite: **28/28 PASS**, 4 files;
- offline migration drift: **PASS**, 10 tables / 29 SQL statements;
- Node 24.14.1 and npm 11.11.0 were observed; no install or build ran.

These results preserve the reviewed source identity but do not substitute for
the blocked real MariaDB tests.

## Coordination and cleanup verification

BACKEND correctly published no `ready.json` and no `runtime-ready` marker.
Instead it published sanitized `blocked.json` and `cleanup.done` under
`/private/tmp/nqr068-local-runtime`:

- directory mode: `0700`;
- file modes: `0600`;
- `blocked.json` SHA-256:
  `d2bdb49cca1cf4ba45a7b374f0eb96da42e27e2d5adb65ad01e688da7ff5a69c`;
- `cleanup.done` SHA-256:
  `68123e9d0b982b62f064cae48aca2a773add5f8bc457e98754741000577168d4`.

The sanitized blocker records that no database, user, process or secret file
was created. Independent post-checks found only those two coordination files,
no nested handoff directory, no ready/credential artifact, no MariaDB binary
or listener, and no QRCODE/NQR-068 Next listener. Therefore there is no named
disposable database/user or runtime secret to clean up. The pre-existing MySQL
9.7.1 service remains untouched and out of scope.

Because runtime setup never occurred, `tl.runtime.done` was deliberately not
written: such a marker would falsely imply that the runtime matrix had run.
The existing `cleanup.done` was nevertheless independently checked.

## Unexecuted mandatory runtime matrix

The following remain **NOT RUN**, not failed and not waived:

- migration application and 10-table/metadata verification on MariaDB 10.11;
- real pool UTC and failed-UTC-connection destruction behavior;
- installed Better Auth/Drizzle/mysql2 separate session/user reads against
  MariaDB, including parameterization and strict date/boolean/null mapping;
- local Next get-session/dashboard continuity and fixed failure categories;
- raw-marker/log/privacy and unexpected-outbound runtime observation;
- fail-closed mutations, two-user ownership isolation and quota-25 concurrent
  create/duplicate contention;
- runtime teardown of an actually created disposable database/user/process.

## Exact unblock requirement

Resume this gate only after the Product Owner separately authorizes one of:

1. installing MariaDB 10.11 locally (including any required package download),
   or
2. providing an already installed, verified local MariaDB 10.11 binary or
   already-local runtime image plus its approved execution mechanism.

The rerun must keep the same frozen source digest, or repeat exact-byte reviews
if source changes. MySQL 9.7.1, remote HostAtom/Plesk and production are not
acceptable substitutes. No build, deploy or production authority follows from
this blocked review.
