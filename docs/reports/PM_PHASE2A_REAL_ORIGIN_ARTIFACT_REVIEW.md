# Phase 2A real-origin artifact — PM checkpoint

Date: 2026-09-01 (Asia/Bangkok)  
Disposition: **ARTIFACT REJECTED — DO NOT DEPLOY**

## Outcome

The Product Owner authorized one fresh immutable real-origin build and local
artifact QA on the reviewed session-adapter candidate only. The build completed
successfully and was not deployed, uploaded to Plesk or used to mutate
production. Independent TL/Security and QA review rejected the resulting
artifact because of two release blockers:

1. QR renderer/vendor code is present in a universal initial browser chunk
   instead of remaining behind the intended lazy boundary; and
2. after a controlled session-table read failure was fully restored, the built
   Next process remained bound but stopped responding even to a fresh public
   route request.

Production remains on rollback BUILD_ID `m1fxDjFEQxdLlI91m1Czx`, with
diagnostics disabled. This checkpoint is an engineering rejection, not launch
or deployment authority.

## Frozen identities

| Boundary | Identity |
| --- | --- |
| reviewed five-file candidate | `5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52` |
| authoritative source | 185 paths, `557a80a2807fef275c28c15d1a8471aee381f4635bad0a0548ee71a74394182b` |
| rejected BUILD_ID | `Gg64LFGQcClo_70kqyHFi` |
| rejected artifact | 546 paths, `ac4d14bd61ff4345db95932579f4ddabcc0bd8aa096d624612d02ec5fe84a5d2` |
| frozen artifact copy | `/private/tmp/nqr071-frozen-next-Gg64LFGQcClo_70kqyHFi` |

PM independently rehashed every source and artifact manifest entry after
review and cleanup. Both manifests had zero missing or mismatched files. The
active local artifact and frozen copy retained the same BUILD_ID and digest.

After that freeze check, PM updated `docs/ENGINEERING_LOOP.md` and
`docs/PHASE2_IMPLEMENTATION_PLAN.md` to record this rejection. Those two
post-build control-document changes are intentionally outside the frozen build
identity; application, package, schema and artifact bytes remain unchanged.

## Build gates that passed

- TypeScript typecheck and ESLint;
- 996/996 application tests across 41 files;
- 119/119 script tests;
- offline migration drift at 10 application tables / 29 SQL statements;
- `git diff --check`;
- real-origin release admission for `https://nqr.orenvis.com`;
- one fresh Next 16.3.1 build producing 33/33 pages;
- origin verification across all 22 product routes;
- artifact and build-log scans with zero secret or synthetic-runtime markers.

The first sandbox attempt failed only while fetching Google Fonts. One
separately approved font-network retry produced the frozen artifact above.

## Release blockers

### NQR072-F1 / NQR073-F2 — eager QR/vendor initial bundle

All 22 routes include the initial script
`/_next/static/chunks/2vu7agsgxk1gr.js`. It is 501,473 bytes, SHA-256
`5b60d5c3d4d4b08a9816696bd27078b35515d741b2166a336112d5bc635f0d9d`,
and contains the renderer plus pinned QR vendor implementation. The builder's
audit found a separate lazy QR-marked chunk but did not prove that the same
implementation was absent from every initial script.

Required repair: restore a real dynamic boundary and make the analyzer fail
when any initial script contains the pinned renderer/vendor markers.

### NQR072-F2 / NQR073-F1 — built runtime does not recover

Normal MariaDB-backed session, ownership CRUD and slot-25 quota behavior passed
before the fault window. TL/Security then temporarily made only the disposable
`session` table unavailable. The first failure emitted the fixed safe category.
After the table, aliases and synthetic rows were fully restored, MariaDB was
healthy and the probe client was stopped, a fresh unauthenticated `/en` request
still timed out after five seconds with zero bytes while Next remained bound.
QA independently reproduced that post-restoration timeout.

Required repair: bound and contain session-read failure so session, dashboard,
mutation and unrelated public-route requests settle, then prove recovery after
database restoration without restarting Next.

## Independent review evidence

| Assignment | Verdict | Report | SHA-256 |
| --- | --- | --- | --- |
| NQR-071 BACKEND/BUILD | BUILD COMPLETE / ARTIFACT REJECTED | `docs/reports/PHASE2A_REAL_ORIGIN_ARTIFACT_BUILD.md` | `b8984bf4d18a32b7044ccd568f69173b3041267a8ba24a7285fcae5e0266f631` |
| NQR-072 TL/Security | REVIEW_FAILED | `docs/reports/PHASE2A_REAL_ORIGIN_ARTIFACT_TL_SECURITY_REVIEW.md` | `43a87bf843d89c820e6d673d9db23b873035909528bae7c8b1e986950bfda06a` |
| NQR-073 QA | REVIEW_FAILED | `docs/reports/PHASE2A_REAL_ORIGIN_ARTIFACT_QA.md` | `4649c90c42e13d3c09d548ab3e58dfb751f87b720b89ae65a35f233557277af2` |

## Cleanup and production boundary

PM removed the exact disposable database/user, stopped local Next and MariaDB,
and removed the temporary runtime environment, socket, PID and data directory.
Independent post-checks confirmed no listeners on 30171, 33371, 39968 or
39972. Pre-existing MySQL 9.7.1 remained PID 1277 on 3306/33060; installed
MariaDB 10.11.19 remains unlinked.

Cleanup evidence is mode `0600`:

- `/private/tmp/nqr071-artifact-runtime/cleanup.json` —
  `518aadcdfdf0093c440d76ad9cd262c00b08420c0da0aa9e73eb8604e8ee1d27`;
- `/private/tmp/nqr071-artifact-runtime/cleanup.done` —
  `98199b2e793369c631915194171aec826fb722fb59587aecfe1760f4d6b89b4d`.

No Plesk, DNS, external OAuth, deployment, production database/data or other
production mutation occurred.

## Next authorization required

Source repair was outside the build/QA authority and has not begun. The next
safe authorization is a bounded source-repair and test/review gate for both
findings. A new build, Plesk access, deployment and production mutation remain
separate later approvals.
