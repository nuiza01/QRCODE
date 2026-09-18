# Phase 2A local MariaDB runtime — PM acceptance checkpoint

Date: 2026-09-01 (Asia/Bangkok)  
Verdict: **SCOPED PASS — LOCAL SYNTHETIC RUNTIME; BUILD/DEPLOY NOT AUTHORIZED**

PM accepts the exact reviewed session-adapter source for the disposable local
MariaDB runtime gate. BACKEND operated the runtime; TL/Security and QA tested
the same live candidate independently before teardown. No application source,
package, schema or migration file changed.

## Frozen identity and reports

Complete five-file candidate digest:
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

| Evidence | SHA-256 |
| --- | --- |
| BACKEND NQR-068 iteration 2 | `2a6766b2dcb56d9d30eb90ba3947ab5046462348f2baf664427026a0ef4de0e0` |
| TL/Security NQR-069 iteration 2 | `08d3c86e706bb52269bc14213a30768a58f057bdb685ba1292a64f5552e9c731` |
| QA NQR-070 iteration 2 | `0ffeb5fbe94fd261fc2929b7d4a8c90aabd4957a0f33e7b41d881d6e69f77382` |

Candidate, database initialization, schema, migration, package and lock hashes
matched the prior reviewed checkpoint before and after the gate. Final offline
drift passed at 10 tables / 29 SQL statements and `git diff --check` passed.

## Runtime provision

The initial attempt stopped safely because exact MariaDB 10.11 was absent.
PM then obtained narrowly scoped Homebrew installation authority. Homebrew
installed `mariadb@10.11` 10.11.19 and its required dependencies. The formula
was intentionally left unlinked because global links belong to pre-existing
MySQL 9.7.1; no link overwrite, MySQL stop or service mutation occurred.

The successful gate used only absolute MariaDB binaries, a mode-0700 unique
temporary data directory, mode-0600 synthetic environment handoff,
loopback-only MariaDB port 33368 and local Next source-runtime port 30168.
No real Google identity, production cookie, Plesk credential or production
data was used.

## Accepted runtime evidence

The same exact candidate passed:

- MariaDB 10.11.19 with 10 application tables and one migration metadata row;
- actual application pool session time zone `+00:00` and finite Date mapping;
- installed Better Auth 1.7.2, Drizzle and mysql2 session/user reads;
- current, absent, expired, revoked and orphaned session behavior;
- authenticated dashboard continuity and fail-closed unavailable behavior;
- two-user list/create/rename/duplicate/delete ownership isolation;
- concurrent slot-25 create/duplicate contention: one `201`, one `409`, final
  saved Static count exactly 25;
- cross-origin 403, unauthenticated 401, oversized-body 413 and fixed
  `no-store` failures;
- controlled session-table, user-table and full disconnect failures with only
  fixed categories, no raw marker/secret/SQL/driver disclosure, no write, and
  successful recovery;
- zero observed outbound requests/connections for the bounded synthetic
  payload/runtime probes.

TL/Security and QA both returned SCOPED PASS with no actionable defect. Their
harness-only corrections are disclosed in their reports and did not change
application code or the reviewed contract.

## Cleanup and PM post-check

After both independent runtime completion markers existed, BACKEND removed the
exact disposable database/user, stopped Next and MariaDB, deleted the unique
data directory, mode-0600 runtime environment, socket and PID artifacts, and
published sanitized cleanup evidence. Both reviewers independently verified
cleanup.

PM then independently confirmed:

- no listeners on 30168, 33368 or the QA sentinel 39968;
- no runtime env, MariaDB PID/socket or disposable data directory;
- pre-existing MySQL 9.7.1 remained PID 1277 on 127.0.0.1:3306/33060;
- MariaDB 10.11.19 remains installed but unlinked, with no global
  `mariadb`/`mariadbd` symlink;
- candidate and persistence/package hashes remain exact;
- final drift and diff-check pass.

MariaDB itself was not uninstalled because the authorization required only
deletion of the disposable database/user/runtime artifacts; retaining the
unlinked local engine avoids another download for future authorized tests and
does not start a service.

## Limits and next gate

This proves one disposable single-instance local MariaDB 10.11.19 plus Next
source runtime with synthetic identities. It does not prove HostAtom/Plesk,
external Google OAuth, production TLS/connection limits, a built artifact,
deployment, rollback or production repair.

The Product Owner explicitly withheld build, deploy and production mutation
authority for this gate. The next safe step is a separately authorized fresh
immutable real-origin build plus local artifact QA only. Deployment and any
production retest remain later, separate approvals.
