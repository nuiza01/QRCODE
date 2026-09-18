# Phase 2A — Final Combined TL and Security Review

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-TL-SEC-FINAL`, iteration 1  
Verdict: **REVIEW_FAILED for DB-backed application activation**  
Infrastructure disposition: **SCOPED PASS for the unchanged empty MariaDB migration**

The reviewed candidate closes the saved-Static storage-exhaustion defect with
an atomic 25-record allowance and preserves the earlier authentication, UTC,
bounded-body, ownership and privacy repairs. Three activation defects remain:
unauthenticated requests still consume the full body allowance before session
authorization and there is no saved-QR rate boundary; database exceptions can
carry private bound parameters into the unhandled server error path; and the
canonical Phase 2 implementation plan has not recorded the approved 25-record
decision. None of these findings invalidates applying the exact initial SQL to
an empty, disconnected, least-privilege database under the user's separate
authority. They prohibit enabling the DB-backed account/Save feature or
deploying this candidate.

## Frozen identity

The review inventory contains 41 Phase 2A source/config/migration/package paths.
It is path-sorted, hashes every file with SHA-256 and has manifest digest:

- candidate manifest: `b5a8058a14c6267817d06f5ad7e007930c5886f000b844f7bb1107eb8646bc6e`
- schema: `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- initial MariaDB SQL: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- migration snapshot: `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- package lock: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- saved-Static policy: `4c2b07681e79dccf4289b4de1bc9f6ae846b0d22feccd2df5116a9334b652be5`
- saved-QR DAL: `fc1652845bc01e37d45eeeb061e0b11c31fd4288dca63c25f806b45f40f21919`
- DAL quota tests: `e753c2bf65587f13b3757ba36434887568fbb2935feb2d93cef52118ae397572`
- create route: `132854367dba1ce0f50f1bf86213c6dbfab49779642f476a3b1e6632d4e5034f`
- duplicate route: `835c64e3cb7f7f67ad3c88295c9496f6e9dc44f8eac69ae9eb3f10c739acb26b`
- auth runtime: `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- authoritative request auth: `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- MariaDB runtime: `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- bounded JSON reader: `22262053cec26a3acb0d5ed1fb341b77ce1167965b2c2afb84e534e42372e5b1`
- privacy/terms strings: `fc54e6fe9dff1bdc654907465d0752110db71def4a24ae6cc83966ac04034b1b`
- canonical Phase 2 plan: `bba95b0d53877027ef2931adb2ee40069349bd8efe4837e402bd3db21bcf08d2`

No real credential or `.env` file was present in the reviewed tree. Only the
documented placeholders and clearly synthetic test values matched the secret/DSN
scan.

## Controls that pass in code/unit scope

### MariaDB schema and migration

The MySQL/MariaDB schema, snapshot, journal and exact initial SQL agree. The
offline drift checker regenerated 10 tables and 29 statements and detected no
schema, metadata, SQL, chain or file-set drift. The migration remains an empty
initial migration; this review did not execute it or claim MariaDB 10.11 runtime
compatibility.

### Better Auth and session authority

Better Auth 1.7.2 is gated on a complete Google, secret, origin and MariaDB
configuration. Protected reads use the database session with cookie-cache and
refresh bypasses. Session snapshot caching and the provider-account cookie are
disabled, OAuth tokens are configured for encryption, OAuth state is durable,
and the session-create hook replaces the raw IP before adapter persistence.
The verified-Google-only identity policy and same-origin mutation boundary are
preserved. Live login/revoke/token-row checks remain required.

### UTC connection initialization

The mysql2 pool uses UTC Date conversion and enqueues
`SET SESSION time_zone = '+00:00'` on every new raw connection, destroying a
connection whose initialization fails. The unit seam confirms both branches.
A live HostAtom check of `@@session.time_zone`, defaults, millisecond precision
and JavaScript Date round-trip is still required.

### Owner isolation and atomic saved-Static quota

Create and duplicate execute in transactions and acquire `FOR UPDATE` on the
durable Better Auth user row before counting and inserting. Every insert path
therefore shares one per-owner lock; the count is owner-scoped and Static-only.
Record lookup and rename/delete/duplicate mutations retain both record ID and
authenticated owner ID. The boundary allows count 24 to become 25 and returns
the fixed `saved_static_qr_quota_exceeded` result for the next create or
duplicate. The concurrent unit harness confirms that one create plus one
duplicate contending for slot 25 produces exactly one insert. This is valid
architecture/code evidence; the final guarantee still requires a real MariaDB
10.11 two-connection race after migration.

Quota responses use one fixed code, status 409 and the public limit only. Thai
and English Save/dashboard actions display localized messages and do not render
the server code. Dashboard reads are bounded by the same maximum of 25 rows.
Privacy and terms copy name HostAtom and MariaDB, distinguish the 25 saved
Static allowance from the inactive future Dynamic allowance of five, and keep
anonymous generation/download local.

## Actionable findings

### NQR-P2A-FINAL-001 — MEDIUM — pre-auth body work and no saved-QR rate boundary

`POST /api/qr-codes` performs `readBoundedJson()` before `getRequestUser()`.
Consequently a caller without a valid session can repeatedly make the shared
host read, retain and decode almost 800,000 bytes per request. The Origin check
is a CSRF boundary, not source authentication: a non-browser client can supply
that header. Create, duplicate, rename and delete also have no application or
provider-enforced saved-QR request-rate contract. The 25-row transaction safely
bounds durable storage but does not bound request CPU, memory, connections or
lock contention.

Required before activation:

1. resolve the authoritative session before consuming the large create body;
2. add and document a bounded per-account mutation rate plus a defensive
   source/provider rate, returning a fixed `429` response and `Retry-After`;
3. do not trust a client header as account/source identity; and
4. test unauthenticated large-body rejection, account boundaries and concurrent
   quota/rate interaction on the same MariaDB-backed candidate.

### NQR-P2A-FINAL-002 — MEDIUM — private QR parameters can enter unhandled error logs

The four saved-QR routes let DAL/Drizzle exceptions escape. Installed
Drizzle ORM 0.45.2 constructs `DrizzleQueryError` messages as the SQL plus
`params`, and an independent in-memory probe confirmed that a synthetic WiFi
password in a bound JSON parameter appears in `.message`. Because the route
does not catch the exception, the framework/server error path can log that
object. Client responses are normally generic, but that does not establish the
required no-raw-payload logging boundary.

Required before activation: catch datastore failures at one reviewed boundary,
return a fixed non-sensitive response, never log/stringify/coerce the thrown
value or its cause/params, and if operational telemetry is needed emit only a
fixed event plus an independently generated correlation ID. Add create,
duplicate, rename and delete regressions using hostile thrown values and raw
payload markers.

### NQR-P2A-FINAL-003 — LOW — canonical product plan omits the approved limit

The user approved **25 saved Static QR records** and the code, UI and legal copy
implement that number. `docs/PHASE2_IMPLEMENTATION_PLAN.md` still lists the
five future Dynamic records but does not record the 25-record Phase 2A product
decision. This leaves the canonical implementation contract behind the code it
governs and fails the earlier requirement that PM record the storage decision.

Required: add the 25 saved-Static allowance to Product decisions and Phase 2A,
explicitly separate it from unlimited local generation/download and the future
five Dynamic records, then freeze the updated plan hash.

## Independent verification

- Focused no-environment review: 14 files / 74 tests PASS.
- Full no-environment Vitest: 36 files / 959 tests PASS.
- Script suite: 119/119 PASS.
- MariaDB drift: 10 tables / 29 statements PASS, offline/no DB.
- Next route type generation and TypeScript: PASS.
- ESLint: PASS.
- `git diff --check`: PASS.
- Drizzle exception probe: bound private marker was present in
  `DrizzleQueryError.message`, confirming the logging-risk premise without a DB.

The manifest and key hashes were rechecked after these commands. This review
did not modify application source, package files, migration files or credentials
and did not access a database, Plesk, OAuth/browser sessions, network, backup,
DNS, deployment or production. This report is the only file written.

## Next action

PM may complete the separately authorized creation of an empty least-privilege
MariaDB database and apply only migration SHA-256 `8401ff9f…` while keeping it
disconnected from the application. Route FINAL-001/002 plus the plan correction
to implementation, then repeat TL/SECURITY and QA on a frozen candidate. Before
any later deployment, run migration inventory, least-privilege grants, UTC,
encrypted-token/no-raw-IP, auth revocation, two-user ownership, real atomic
quota/rate, CRUD, backup/restore and rollback checks against that same candidate.
