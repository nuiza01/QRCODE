# Phase 2A disposable local MariaDB runtime gate

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-068` / BACKEND / local-runtime iteration 1  
Verdict: **BLOCKED — MARIADB 10.11 IS NOT LOCALLY AVAILABLE**

The gate stopped before database, user, migration, secret or application
runtime creation. The assignment explicitly prohibits substituting another
engine/version or installing dependencies, so the existing local MySQL 9.7.1
service was not used.

## Authorized boundary

The Product Owner authorized only a uniquely named disposable local MariaDB
10.11 database/user and local Next source runtime on reviewed candidate digest
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.
No build, package installation, network, Plesk, external OAuth, deployment,
source/schema/package edit, secret access or production mutation was
authorized.

Before checking runtime availability, the following were read in full:

- `AGENTS.md`;
- `docs/ENGINEERING_LOOP.md`;
- `docs/TEAM_REPORTING.md`;
- `docs/reports/PHASE2A_SESSION_REPAIR_QA_GATE.md`;
- `docs/reports/PHASE2A_SESSION_ADAPTER_ITERATION_2_TL_SECURITY_REVIEW.md`;
- `docs/reports/PHASE2A_SESSION_ADAPTER_ITERATION_2_QA_REVIEW.md`;
- `docs/reports/PM_PHASE2A_SESSION_ADAPTER_INTEGRATION.md`;
- installed Next.js 16.3.1 authentication, data-security, route-handler and
  Vitest guides.

## Frozen candidate and migration guards

The complete five-file candidate digest was recomputed from current source
using the reviewed compact path-sorted JSON method and matched:

`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

Relevant identities remained exact:

| Boundary | SHA-256 |
| --- | --- |
| TL/Security review | `e3263d89ce775f2204c2e5e100865b30846939e92c9fa028de73de73a19b7f30` |
| QA review | `6b4a7e2a4ff770c4bfc657c8ccf5e056a0e6ffbbd0ffc5a121e8d1468b0c580e` |
| PM integration report | `fce246cb7deee18a7cc008a4abf7e3e705a3b80839ff5d0668dacf73396e448d` |
| MariaDB migration | `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf` |
| MariaDB snapshot | `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e` |
| MariaDB journal | `7fa4345ae477f77b0f0c3d4b09ea7a26d233d2e307d0179c389b20074d7a3361` |
| `src/db/index.ts` | `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68` |
| `src/db/schema.ts` | `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a` |
| `package.json` | `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0` |
| `package-lock.json` | `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a` |

Offline migration drift still passes at **10 tables / 29 statements**. This
does not replace the blocked real MariaDB application step.

## Availability evidence and stop decision

Local availability checks found:

- no `mariadb` or `mariadbd` executable on `PATH`;
- no Homebrew `mariadb` or `mariadb@10.11` installation or linked 10.11
  directory;
- no Docker or Podman executable and no locally available container image;
- no MariaDB binary under the checked Homebrew, `/usr/local`, Applications,
  project or temporary roots;
- the only installed/listening database engine is a pre-existing Homebrew
  MySQL **9.7.1** process on local ports 3306/33060.

MySQL 9.7.1 is not MariaDB 10.11. The assignment explicitly says to report
BLOCKED instead of substituting another engine/version. No connection was made
to that service and it was not stopped or modified because it predates and is
outside NQR-068.

Because no compliant engine existed, none of these operations began:

- database or database-user creation;
- migration application or metadata insertion;
- synthetic identity/session/QR seeding;
- environment-secret file creation;
- MariaDB or Next process startup;
- HTTP, CRUD, quota/contention, failure-injection or peer runtime testing.

## Coordination and cleanup evidence

The required coordination directory exists at
`/private/tmp/nqr068-local-runtime` with mode `0700`. A sanitized
`blocked.json` and `cleanup.done` have mode `0600`. No `ready.json` or
runtime-ready marker was published because doing so would falsely represent a
usable MariaDB 10.11 runtime. TL/Security and QA were directly notified not to
wait for readiness.

Cleanup is complete by non-creation:

- disposable database created: no;
- disposable user created: no;
- NQR MariaDB/Next process or listener started: no;
- synthetic secret file created: no;
- source/package/schema/migration changed: no.

The pre-existing MySQL 9.7.1 listener remains untouched and is not an NQR-068
resource.

## Required next action

Resume this gate only after the Product Owner separately makes MariaDB 10.11
available locally, for example by authorizing installation or providing an
already installed local 10.11 runtime/image. That action is outside the current
no-install/no-network authority. The rerun must use the same reviewed digest or
repeat exact-byte review if source changes; it must not use MySQL 9.7.1 as a
compatibility substitute.

No build, deployment or production action is authorized by this report.
