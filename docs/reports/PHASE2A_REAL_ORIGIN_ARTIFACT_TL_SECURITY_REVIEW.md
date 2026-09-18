# Phase 2A real-origin artifact — TL + Security review

Date: 2026-09-01 (Asia/Bangkok)  
Assignment: `NQR-072` / TL + SECURITY / artifact iteration 1  
Verdict: **REVIEW_FAILED — REQUEST CHANGES; DO NOT DEPLOY THIS ARTIFACT**

The frozen build and source identities are internally consistent, the baked
origin and secret-disclosure checks pass, and normal MariaDB-backed auth/CRUD
behavior reached the expected boundaries. Two independent findings nevertheless
make this artifact unsuitable for deployment:

1. the initial browser script set contains the QR renderer and QR vendor
   implementation on every route, despite the submitted audit identifying an
   additional lazy chunk; and
2. a controlled session-table read failure left the production artifact
   process globally unresponsive even after the table was restored and the
   probe client was stopped.

No Plesk, DNS, external OAuth, deployment, production database or production
mutation was used.

## Frozen identities and review boundary

The mode-`0600` handoff described an exact local-only runtime using MariaDB
10.11.19, the production Next artifact and synthetic identities. The source,
active artifact and preserved frozen copy independently recomputed to:

| Boundary | Count | Digest / ID |
| --- | ---: | --- |
| reviewed five-file session candidate | 5 | `5642ba2cc4e8ebed16935d43eaaeae790fb795931b9cd3e4208206fda2db1f52` |
| authoritative source manifest | 185 | `557a80a2807fef275c28c15d1a8471aee381f4635bad0a0548ee71a74394182b` |
| active `.next` artifact manifest | 546 | `ac4d14bd61ff4345db95932579f4ddabcc0bd8aa096d624612d02ec5fe84a5d2` |
| preserved frozen artifact manifest | 546 | `ac4d14bd61ff4345db95932579f4ddabcc0bd8aa096d624612d02ec5fe84a5d2` |
| active and frozen BUILD_ID | — | `Gg64LFGQcClo_70kqyHFi` |

Every manifest entry was independently rehashed rather than trusting only the
builder's aggregate. The same identities remained exact after testing and
after cleanup. `npm run check:drift` passed at 10 tables / 29 SQL statements,
offline, and `git diff --check` passed. This review did not change source,
package, schema, migration or artifact bytes.

## Gates that passed

### Real-origin metadata and artifact privacy

The existing origin verifier independently passed all 22 emitted HTML routes,
sitemap/hreflang and robots against exactly
`https://nqr.orenvis.com`. Active and frozen artifacts had identical bytes and
BUILD_ID.

Before secret cleanup, an independent byte scan compared the actual mode-0600
runtime values against all 546 frozen artifact files. It found zero occurrences
for:

- `DATABASE_URL`;
- Better Auth secret;
- Google client secret;
- disposable database password;
- both synthetic session tokens;
- Google client ID, disposable database/user names, synthetic session IDs and
  synthetic user IDs.

No `NQR071`, synthetic-origin fixture or local-runtime marker appeared in the
artifact. No browser/public source map exists under `.next/static` or
`public`. Server-only maps exist under `.next/server`; the reviewed local
`next start` boundary did not expose them as public assets.

Bounded listener/socket inspection saw the artifact process communicating
only with loopback MariaDB and local clients; no external socket was observed.
No production hostname was contacted by the review.

### Normal auth and persistence path before the failure window

The independent runtime harness used actual signed Better Auth cookies, real
HTTP handlers and the disposable MariaDB, not a wrapper mock. It progressed
through all normal assertions before entering the controlled failure window:

- MariaDB `10.11.19-MariaDB`, 10 application tables plus one migration
  metadata table, one metadata row matching the exact MariaDB migration;
- exact current A/B user and session ID/token mapping, absent token failing
  closed, and `no-store` session responses;
- owner create/rename/duplicate/delete and indistinguishable foreign
  patch/duplicate/delete `404` responses;
- slot-25 concurrency from 24 saved Static rows returned one `201` and one
  `409`, with final count exactly 25 and the fixed quota error;
- a loopback URL embedded in saved payload data received zero requests before
  the harness entered its fault window.

All TL-created rows and held-table aliases were removed after the failure.

## Finding NQR072-F1 — QR/vendor code is in the universal initial bundle

Severity: **P2 / Medium — performance and lazy-boundary regression**

All 22 routes contain the same 12 initial script tags. One of those scripts is:

`/_next/static/chunks/2vu7agsgxk1gr.js`

- file size: **501,473 bytes**;
- SHA-256:
  `5b60d5c3d4d4b08a9816696bd27078b35515d741b2166a336112d5bc635f0d9d`;
- contains `QrRenderer.updateVendorMatrix` and the actual QR vendor
  implementation, including matrix construction and repeated
  `getModuleCount` implementations.

The submitted artifact audit reports another non-initial chunk containing
`getModuleCount`, but proving that a marker also exists in a lazy chunk does
not prove it is absent from the initial set. The independent test checked the
contents of every initial script and found QR renderer/vendor code in this
universal 501 KB chunk. PDF and svg2pdf markers remained outside the initial
set, but the QR boundary did not.

Required repair and regression:

1. restore a real dynamic boundary so QR renderer/vendor implementation is not
   included in the 22-route initial script set;
2. make the release audit fail when any initial script contains the pinned
   renderer/vendor markers, instead of checking only that a separate lazy file
   exists;
3. produce a fresh artifact and rerun route-set, marker and runtime QA on its
   new exact digest.

## Finding NQR072-F2 — controlled session-read failure hangs the artifact

Severity: **P1 / High — availability and recovery failure**

After the normal matrix passed, TL/Security temporarily renamed only the
disposable `session` table. The first get-session call emitted exactly the
fixed public-safe category:

`[NQR_AUTH] session_read_failed`

The subsequent production-artifact request did not settle. The table was
restored and independent MariaDB inspection confirmed both `session` and
`user` existed, no held alias remained, and the database process list
contained only sleeping connections. The exact TL probe client was then
stopped, releasing its loopback sentinel and pending request.

Despite those restorations, a new unauthenticated `GET /en` against the same
artifact process timed out after five seconds with zero response bytes. The
process remained bound to `127.0.0.1:30171`, but was not serving requests.
A one-second read-only process sample captured sustained uncaught-exception /
error-reporting activity; its SHA-256 is
`91ee6caadcf368ba2195d03807379f88c8bf622ec409ed1b12b697e118794918`.
That sample supports the observed hang but is not sufficient to claim a more
specific root cause.

The intended three session categories, one user category and recovery matrix
therefore did not complete: only the first fixed session category was emitted
before the process became unusable. Privacy remained fail-closed for the one
completed failure response/log event, but availability and recovery did not.

Required repair and regression:

1. reproduce this against the built production server with bounded request
   deadlines and preserve the first internal error without raw public output;
2. contain the error path so a failed session read cannot block the Node event
   loop or unrelated public routes;
3. require get-session, dashboard and mutation failure responses to settle,
   then restore the table/database and prove recovery without restarting Next;
4. add a post-failure unauthenticated route health check and a process-level
   request timeout to the artifact acceptance gate;
5. freeze a new build and repeat independent TL/Security and QA artifact
   runtime review. Restart-only recovery is insufficient for this gate.

## Harness disclosure

The first TL runtime invocation was denied by the default sandbox before it
connected; the approved loopback-only retry was used. Its first active run
stopped before mutations because a raw mysql2 setup connection reported
MariaDB `SYSTEM` time zone; unlike the application `getDb()` hook, that
connection does not set `+00:00`. The harness was corrected not to treat the
setup connection as application-pool evidence.

The second active run passed the normal matrix and then became pending in the
failure window described in NQR072-F2. It produced no final result file. The
exact client PID was stopped only after both held tables were independently
confirmed restored. A separate cleanup query found zero TL rows and zero held
aliases. These harness corrections did not change source or artifact bytes.

## Completion marker and cleanup

TL/Security wrote the required mode-`0600` review marker:

- `tl.artifact.done` SHA-256:
  `d4b8caf68a3978035bcafdcc30ae213438cf4ddfcc662951d27381affeae4143`.

After both peer markers existed, PM performed the exact authorized teardown.
Sanitized cleanup evidence:

| Evidence | SHA-256 |
| --- | --- |
| `cleanup.json` | `518aadcdfdf0093c440d76ad9cd262c00b08420c0da0aa9e73eb8604e8ee1d27` |
| `cleanup.done` | `98199b2e793369c631915194171aec826fb722fb59587aecfe1760f4d6b89b4d` |

Independent post-cleanup verification confirmed:

- the exact disposable database and user had zero remaining matches;
- listeners `30171`, `33371` and TL sentinel `39972` were absent;
- runtime env, MariaDB PID/socket and unique data directory were absent;
- the active and frozen artifact remained byte-identical at digest
  `ac4d14bd…a5d2` and BUILD_ID `Gg64LFGQcClo_70kqyHFi`;
- the pre-existing MySQL 9.7.1 PID/listeners on 3306/33060 remained unchanged;
- MariaDB 10.11.19 remained installed but unlinked.

## Final disposition

Do not deploy BUILD_ID `Gg64LFGQcClo_70kqyHFi`. The real-origin metadata,
artifact identity and disclosure checks pass, but NQR072-F1 and NQR072-F2
require source/audit repair, a new immutable build and independent re-review.
Production rollback and no-deploy boundaries remain authoritative.
