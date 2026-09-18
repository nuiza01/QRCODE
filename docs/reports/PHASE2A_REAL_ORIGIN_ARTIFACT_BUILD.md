# Phase 2A real-origin artifact build

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-071` / BACKEND + BUILD / artifact iteration 1  
Disposition: **BUILD COMPLETE / ARTIFACT REJECTED — DO NOT DEPLOY**

The authorized immutable real-origin build completed and its source/artifact
identity remained stable. Independent TL/Security and QA review nevertheless
found two release-blocking defects: QR renderer/vendor code is present in a
universal initial browser chunk, and a controlled session-table read failure
left the built Next process globally unresponsive after the table was restored.
This artifact is therefore rejected and was not deployed or promoted.

No Plesk, DNS, external OAuth runtime, production database/data, deployment or
production mutation was used. This report finalizes existing evidence only; no
rebuild or repair was attempted after independent review failed.

## Authorized boundary

The assignment allowed one fresh `https://nqr.orenvis.com` release build,
offline/local artifact verification, and an isolated loopback-only MariaDB
10.11.19 plus built Next runtime using synthetic identities. It prohibited
deployment, HostAtom/Plesk changes, DNS, external OAuth, production database
access, production mutation and source/package/schema edits.

The reviewed session repair remained exact:

| File | SHA-256 |
| --- | --- |
| `src/lib/auth.ts` | `300699c117d6d72b222bcdfbd19b00871eba04bd2e6e4c512990f85c122222d0` |
| `src/lib/auth-runtime.test.ts` | `6db4d51186bd7a2108a04fddb4488a407181509588dc424c9c6a4090fec446f8` |
| `src/lib/auth-session-adapter.ts` | `312ffff7271fba3d41dac12c55d89cbfe249b3b98a01bbcfcd254f9c9d8f8232` |
| `src/lib/auth-session-adapter.test.ts` | `cb62214a645fe370119bea3157a3e171542e9817ef46dfe791f7cea0551d8f36` |
| `src/lib/auth-session-adapter-installed.test.ts` | `77bc5a50098294061c20c3420b962c36387bb982a22b01b99acd1ca1c13d4da5` |

The compact five-file digest was
`5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52`.
Database, schema and package guards also remained exact:

- `src/db/index.ts`: `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`;
- `src/db/schema.ts`: `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a`;
- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`;
- `package-lock.json`: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`.

## Frozen source and pre-build verification

The canonical source manifest excludes VCS, dependencies, generated build
output, reports, secret environment files, `next-env.d.ts`, TypeScript build
state and platform metadata. It contained 185 paths with digest
`557a80a2807fef275c28c15d1a8471aee381f4635bad0a0548ee71a74394182b`;
the manifest file SHA-256 was
`1958db7800a7a624cd2eef698462a8c7985996efb3a2fe37a8950e4209fc522b`.
Independent reviewers rehashed every entry before and after runtime testing
and cleanup with zero missing files or mismatches.

The first draft manifest included Next-generated `next-env.d.ts`, which Next
type generation legitimately rewrote. The harness was corrected to exclude
that generated file; the canonical 185-path manifest then matched before and
after the build. No source file was changed to obtain that match.

Pre-build verification passed:

- TypeScript typecheck;
- ESLint;
- Vitest: 996/996 tests across 41 files;
- script tests: 119/119;
- offline migration drift check: 10 application tables / 29 SQL statements;
- `git diff --check`;
- release admission for exactly `https://nqr.orenvis.com`.

The prior `.next` artifact was preserved recoverably at
`/private/tmp/nqr071-prior-next-aFVpsqom-nIep7puSZKEk-20260901` with BUILD_ID
`aFVpsqom-nIep7puSZKEk` before the authorized replacement.

## Build execution and immutable artifact

The first sandboxed release-build attempt failed only because Google Fonts for
Inter, JetBrains Mono and Noto Sans Thai could not be fetched. Its log is
`/private/tmp/nqr071-artifact-runtime/build-sandbox-failed.log`, SHA-256
`f37975c97b7e5399040458f421c3f625ab52eb1628862dbc0818d02a4e6e7a3e`.

The separately approved font-network retry ran one
`npm run build:release` with `NEXT_PUBLIC_APP_URL=https://nqr.orenvis.com`.
Next 16.3.1 compiled, typechecked and emitted 33/33 static pages; the release
origin verifier passed all 22 product routes. Its log SHA-256 is
`4b2475347c8f501e5f50fd724e6e9ff4ac76b2d2a8ac5651c2813f08ec747c2a`.
No production API, database or OAuth endpoint was contacted.

| Artifact boundary | Value |
| --- | --- |
| BUILD_ID | `Gg64LFGQcClo_70kqyHFi` |
| scoped artifact paths | 546 |
| scoped artifact digest | `ac4d14bd61ff4345db95932579f4ddabcc0bd8aa096d624612d02ec5fe84a5d2` |
| artifact manifest SHA-256 | `398b8a67496a41db4a4c551cfeac9042488885a455328b162a4b1eb8fb301d06` |
| frozen copy | `/private/tmp/nqr071-frozen-next-Gg64LFGQcClo_70kqyHFi` |

Active and frozen copies remained byte-identical after review and cleanup.
Origin checks found exactly `https://nqr.orenvis.com` across canonical, Open
Graph, hreflang, sitemap and robots output for all 22 routes. Artifact and build
log scans found no synthetic-runtime or secret markers.

### Builder audit limitation

The builder audit recorded the same 12 initial scripts on every route and
found separate non-initial chunks containing `getModuleCount`, AcroForm and
svg2pdf markers. It incorrectly treated finding a separate QR-marked chunk as
proof that QR code was absent from the initial set. A preliminary harness also
had to narrow an over-broad `getModuleCount` uniqueness assumption. Neither
check inspected every initial script for the complete pinned renderer/vendor
boundary. Independent review exposed the missed eager bundle described below.

## Local built-artifact runtime evidence

Before the independent fault window, the isolated loopback runtime used
MariaDB `10.11.19-MariaDB`, the exact reviewed 29-statement migration, 10
application tables, one migration metadata row and two synthetic users. Raw IP
data was not persisted. Setup evidence SHA-256 is
`f694ded9231adf4b142c6252a0e3b060a40a0987d6ec2090dc47d0fbd74341f6`.

The first smoke attempt used the non-production cookie name and correctly did
not authenticate. The harness was corrected to use Better Auth's production
`__Secure-` cookie name without changing application or artifact bytes. The
bounded smoke then passed real-origin home metadata, persisted database-backed
session, `no-store`, dashboard access, create `201`, foreign delete `404` and
owner delete `200`. Evidence SHA-256 is
`a4a0de3d198e410eec98e42fdc1008995443228930e641a34b0098cc3143cbf6`;
the log scan SHA-256 is
`7a6d3aeade3a6a0327b292f65e870c177a3f52ebcc59cc66641b43376471aabe`.

These normal-path results are retained as evidence but do not override the
release-blocking independent findings.

## Independent review findings

### NQR072-F1 / NQR073-F2 — QR renderer/vendor is eager

Severity: **P2 / Medium**.

Every one of the 22 routes includes the initial script
`/_next/static/chunks/2vu7agsgxk1gr.js`. It is 501,473 bytes, SHA-256
`5b60d5c3d4d4b08a9816696bd27078b35515d741b2166a336112d5bc635f0d9d`,
and contains `QrRenderer.updateVendorMatrix`, `qr-code-styling`, matrix
construction and `getModuleCount` implementations. The QR renderer/vendor is
therefore eagerly present on every generator route. PDF/svg2pdf remained lazy,
but the QR lazy boundary and submitted analyzer assertion are invalid.

Required follow-up is a source-level dynamic-boundary repair, an analyzer that
fails whenever any known renderer/vendor marker occurs in an initial script,
and a fresh immutable build plus independent route/bundle/runtime review.

### NQR072-F2 / NQR073-F1 — restored session fault hangs built Next

Severity: **P1 / High**.

TL/Security temporarily renamed only the disposable `session` table. The
first get-session request emitted the fixed safe category
`[NQR_AUTH] session_read_failed`, but a subsequent request did not settle. The
table was restored, all held aliases and synthetic reviewer rows were removed,
MariaDB remained healthy, and the exact probe client was stopped. Even then a
new unauthenticated `GET /en` timed out after five seconds with zero response
bytes while Next remained bound to port 30171. QA independently reproduced the
post-restoration timeout. A bounded process sample SHA-256
`91ee6caadcf368ba2195d03807379f88c8bf622ec409ed1b12b697e118794918`
showed sustained error-reporting activity but is not sufficient to assert a
more specific root cause.

Required follow-up is to contain the built-runtime failure path, prove bounded
responses for session/dashboard/mutations and public routes during the fault,
and demonstrate recovery after restoration without restarting Next. A new
artifact must then repeat independent disconnect/recovery and health checks.

## Independent reports

| Review | Verdict | Report SHA-256 |
| --- | --- | --- |
| `NQR-072` TL + Security | `REVIEW_FAILED` | `43a87bf843d89c820e6d673d9db23b873035909528bae7c8b1e986950bfda06a` |
| `NQR-073` QA | `REVIEW_FAILED` | `4649c90c42e13d3c09d548ab3e58dfb751f87b720b89ae65a35f233557277af2` |

The reports are respectively
`docs/reports/PHASE2A_REAL_ORIGIN_ARTIFACT_TL_SECURITY_REVIEW.md` and
`docs/reports/PHASE2A_REAL_ORIGIN_ARTIFACT_QA.md`.

## Cleanup and final guards

The original orchestration instance disappeared after both peer failure
markers were written. PM therefore performed the already-authorized exact
teardown rather than leaving local services or credentials behind. No build,
repair or deploy was performed during that cleanup.

| Cleanup evidence | SHA-256 |
| --- | --- |
| `/private/tmp/nqr071-artifact-runtime/cleanup.json` | `518aadcdfdf0093c440d76ad9cd262c00b08420c0da0aa9e73eb8604e8ee1d27` |
| `/private/tmp/nqr071-artifact-runtime/cleanup.done` | `98199b2e793369c631915194171aec826fb722fb59587aecfe1760f4d6b89b4d` |

Both evidence files are mode `0600`. Cleanup and independent post-checks
confirmed:

- exact disposable database and user remaining counts are zero;
- listeners 30171 and 33371 are absent;
- runtime secret environment and unique MariaDB data directory are absent;
- the failed artifact is preserved and unchanged at 546 paths, BUILD_ID
  `Gg64LFGQcClo_70kqyHFi`, digest `ac4d14bd…a5d2`;
- pre-existing MySQL 9.7.1 and its 3306/33060 listeners were untouched;
- MariaDB 10.11.19 remains installed but unlinked.

## Final disposition

The build itself is complete and reproducibly tied to the reviewed source, but
the resulting artifact is rejected. **Do not deploy or promote BUILD_ID
`Gg64LFGQcClo_70kqyHFi`.** Repair of both findings, a new immutable real-origin
build, and fresh independent TL/Security and QA acceptance require a separate
assignment. Production, DNS, Plesk and external OAuth gates remain untouched.
