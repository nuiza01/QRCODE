# Phase 2A local MariaDB runtime QA

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-070` / QA / local-runtime iteration 1  
Verdict: **BLOCKED — REQUIRED MARIADB 10.11 RUNTIME WAS NOT AVAILABLE**

QA could not begin the authorized real-runtime acceptance matrix because the
machine has no MariaDB 10.11 server, client, installation, container runtime or
cached local provision. The only installed SQL server is Homebrew MySQL 9.7.1;
the assignment explicitly prohibits substituting MySQL for MariaDB 10.11.

No behavioral runtime verdict is claimed. No build, install, network, Plesk,
external OAuth, deployment, source/package/schema edit or production mutation
was performed. The only project write from QA is this report.

## Instructions and references checked

Before preflight, QA read:

- repository `AGENTS.md`;
- `docs/ENGINEERING_LOOP.md` and `docs/TEAM_REPORTING.md`;
- the NQR-063 gate in
  `docs/reports/PHASE2A_SESSION_REPAIR_QA_GATE.md`;
- NQR-066/NQR-067 independent reviews and
  `docs/reports/PM_PHASE2A_SESSION_ADAPTER_INTEGRATION.md`;
- the installed Next.js 16.3.1 route-handler and authentication guides under
  `node_modules/next/dist/docs/`.

The reviewed boundary requires a disposable **MariaDB 10.11** database, real
Next source runtime, synthetic identities and actual installed Better Auth,
Drizzle and mysql2 execution. A direct wrapper mock or MySQL substitution is
not acceptable evidence.

## Frozen source identity

QA independently recomputed the documented compact path-sorted digest. It
matched the exact reviewed candidate:

`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |

Unchanged guards also matched the reviewed values: request auth
`edc1e427…852e`, database initialization `0499ed3…f68`, schema
`733674e…b6a`, migration SQL `13b765d…89ee`, package `237ae72…9b0` and
lock `1632895…2f1a`.

Safe offline preflight results:

- `npm run check:drift`: **PASS — 10 tables / 29 SQL statements; offline**;
- `git diff --check`: **PASS**.

Full/unit/typecheck/lint were not repeated because NQR-070 is specifically the
missing real-runtime gate, the candidate bytes did not change, and rerunning
the already-reviewed offline suite cannot replace MariaDB evidence.

## Runtime readiness and blocker evidence

QA first waited for the required coordination artifacts. Neither
`ready.json` nor `runtime-ready` appeared. BACKEND then published a sanitized
blocker at `/private/tmp/nqr068-local-runtime/blocked.json` and a cleanup
marker at `/private/tmp/nqr068-local-runtime/cleanup.done`.

The blocker is mode `0600` inside a mode `0700` directory and records:

- candidate digest matches `5642ba2c…1f52`;
- `runtimeReady: false`;
- MariaDB 10.11 is not installed or otherwise locally available;
- no database, user, process or secret file was created;
- cleanup completed.

Independent local preflight corroborated the blocker:

| Requirement | Observed result |
| --- | --- |
| `mariadbd` | absent |
| `mariadb` client | absent |
| Homebrew MariaDB / `mariadb@10.11` | absent |
| Docker / Podman / Colima | absent |
| MariaDB-labelled process or TCP listener | absent |
| Existing SQL installation | MySQL 9.7.1 only; intentionally not used |
| Runtime ready markers | absent |
| Secret/env artifact in coordination directory | absent |
| Cleanup marker | present, mode `0600` |

Because no MariaDB server existed and setup stopped before allocation, no
disposable database or user name was created or published. Therefore there is
no named MariaDB database/user to query or remove. QA additionally confirmed
that no MariaDB process/listener or secret file remained. The directory
contains only the sanitized blocker and cleanup marker.

`qa.runtime.done` was deliberately not written: that marker is valid only
after the runtime matrix executes, and no runtime became ready.

## Acceptance matrix retained for the resumed gate

Once an exact local MariaDB 10.11 runtime is available, QA must execute the
same reviewed candidate through real HTTP and the installed
Better Auth/Drizzle/mysql2 path, covering:

1. migration applies once; exact application/migration table counts and UTC
   session behavior match the gate;
2. seeded current, absent, expired, revoked and orphaned sessions behave
   fail-closed, while a complete current session preserves dashboard
   continuity;
3. controlled session-read, user-read and disconnect failures emit one fixed
   category, do not inspect/echo a hostile marker and do not authenticate or
   mutate;
4. synthetic Google callback/session continuity remains compatible without a
   real provider or external request;
5. two synthetic users can list/create/rename/duplicate/delete only their own
   records through real HTTP;
6. create and duplicate contention enforce the shared slot-25 quota without
   exceeding it;
7. request bodies and responses remain bounded, safe and `no-store` where
   required;
8. an outbound sentinel observes no unexpected request;
9. source/runtime identities and exact counts remain frozen;
10. after `qa.runtime.done`, BACKEND cleanup removes the named database/user,
    listener and mode-0600 synthetic env, and QA independently verifies their
    absence.

## Required authority to resume

One of the following is required; neither is granted by the current task:

1. provide an already-installed, locally reachable MariaDB **10.11** runtime
   or an already-cached approved container image/runtime; or
2. grant narrowly scoped authority to install/download MariaDB 10.11 (and, if
   chosen, the required container runtime) solely for this disposable local
   gate.

Authority to use the existing MySQL 9.7.1 service is not a valid substitute.
Build, deploy, Plesk, production, real Google OAuth and external-network
authority remain out of scope.
