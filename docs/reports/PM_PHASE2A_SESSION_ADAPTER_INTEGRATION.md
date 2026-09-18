# Phase 2A session adapter — PM offline integration checkpoint

Date: 2026-09-01 (Asia/Bangkok)  
Verdict: **SCOPED PASS — REVIEWED OFFLINE SOURCE; DO NOT BUILD OR DEPLOY**

PM accepted only the exact NQR-061 iteration-2 five-file candidate after
independent TL/Security and QA review. Because the worker tasks share the
authoritative checkout, acceptance consisted of verifying the reviewed bytes
already present in source; no candidate worktree, package file, database,
secret, build artifact or production file was copied.

## Frozen identity

- complete five-file digest:
  `5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`;
- BACKEND report:
  `d91a9af83c0d967aa14d182cb9790d650de07cb89226c94b92b78ceaf2e964a4`;
- TL/Security report:
  `e3263d89ce775f2204c2e5e100865b30846939e92c9fa028de73de73a19b7f30`;
- QA report:
  `6b4a7e2a4ff770c4bfc657c8ccf5e056a0e6ffbbd0ffc5a121e8d1468b0c580e`.

Candidate postimages:

| Path | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |

PM independently recomputed the complete digest from the documented compact,
path-sorted JSON of `after`, `before`, `path`; it matched exactly.

## Independent review disposition

Both independent reviews returned SCOPED PASS. They exercised the installed
Better Auth 1.7.2 adapter factory/internal adapter, installed Drizzle adapter
and mysql2 execution path with an inert local client. The reviewed boundary:

- replaces session/user read failures before Better Auth tracing or fallback
  logging can inspect the raw value;
- emits only fixed privately branded categories, including adapter
  initialization failure;
- validates and copies complete own-data session/user rows, exact token and
  matching user identity, and rejects accessors or invalid dates;
- keeps missing, orphaned, expired and revoked sessions unauthenticated;
- uses two parameterized reads for the exact joined session lookup and
  delegates unrelated adapter operations unchanged.

## PM assembled verification

Executed from `/Users/sarawutjuntasang/Nexora/QRCODE` on the exact reviewed
bytes:

- focused installed/auth/request tests: **28/28 PASS**, 4 files;
- full Vitest: **996/996 PASS**, 41 files;
- script tests: **119/119 PASS**;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run check:drift`: PASS — 10 tables / 29 SQL statements, offline;
- `git diff --check`: PASS.

Unchanged guards remained exact: `request-auth.ts` `edc1e427…852e`, database
initialization `0499ed3…f68`, schema `733674e…6a`, migration SQL
`13b765d…89ee`, package `237ae72…9b0` and lock `1632895…2f1a`.

## Limits and next gate

This checkpoint proves the reviewed offline code and inert-driver behavior; it
does **not** identify the historical production root cause or prove HostAtom
MariaDB, Google OAuth callback, browser, build, Plesk or production behavior.
Production remains rolled back to BUILD_ID `m1fxDjFEQxdLlI91m1Czx`, with
diagnostics disabled.

The next safe gate is a separately authorized disposable local MariaDB 10.11
plus local Next runtime validation on this exact source. A fresh immutable
build and any deployment remain later, separate approvals.
