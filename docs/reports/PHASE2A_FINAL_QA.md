# Phase 2A Final Independent QA

Date: 2026-08-31 (Asia/Bangkok)  
Assignment: `NQR-P2A-FINAL-QA`  
Verdict: **SCOPED PASS — FINAL CODE/OFFLINE CANDIDATE**

This verdict approves the reviewed candidate for the already authorized empty
MariaDB bootstrap and live acceptance testing. It is not OAuth, database,
backup, deployment or launch approval.

## Scope and identity

QA inspected the authoritative current working tree after the saved-Static
quota implementation and privacy iteration 2. No application source,
dependency, migration or environment file was changed. This report is the only
file written by QA.

Frozen identities, unchanged after verification:

- `package-lock.json`:
  `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- MariaDB schema:
  `e4c5a6210a2fb151ad654342f39be534115e8529730c3c4f8aa7e30e6bfe02a1`
- initial MariaDB SQL:
  `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`
- Drizzle snapshot:
  `41a0a4ca4c32e7913f71b5752c8665dcf8de9c9648365c729a43cb94e14a0c2e`
- database runtime:
  `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- auth runtime:
  `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- authoritative request auth:
  `edc1e427c243fde9ce853e3244134a5172bb32d58420e73ac293aa7ec049852e`
- bounded JSON reader:
  `22262053cec26a3acb0d5ed1fb341b77ce1167965b2c2afb84e534e42372e5b1`
- saved-Static policy:
  `4c2b07681e79dccf4289b4de1bc9f6ae846b0d22feccd2df5116a9334b652be5`
- saved-QR contracts:
  `9985950abb51b7dd0152263d09bb043796aa55354450628f7c404ba800f01570`
- saved-QR DAL:
  `fc1652845bc01e37d45eeeb061e0b11c31fd4288dca63c25f806b45f40f21919`
- create route:
  `132854367dba1ce0f50f1bf86213c6dbfab49779642f476a3b1e6632d4e5034f`
- duplicate route:
  `835c64e3cb7f7f67ad3c88295c9496f6e9dc44f8eac69ae9eb3f10c739acb26b`
- Thai/English legal strings:
  `fc54e6fe9dff1bdc654907465d0752110db71def4a24ae6cc83966ac04034b1b`

## Fresh evidence

- `npm test`: **36 files / 959 application tests PASS** and **119 script
  tests PASS**.
- Focused no-environment run: **17 files / 501 tests PASS**. MariaDB, Better
  Auth and Google variables were removed. Coverage included Generator and Save
  UI, dashboard actions, legal copy, auth configuration/policy/runtime,
  authoritative session reads, bounded JSON, UTC pool initialization,
  saved-QR contracts/DAL, create/rename/duplicate routes and SEO copy.
- `npm run typecheck`: PASS after Next route type generation.
- `npm run lint`: PASS.
- `npm run check:drift` without `DATABASE_URL`: PASS — **10 tables / 29 SQL
  statements**, entirely offline and without a connection.
- `git diff --check`: PASS.

No build was run in this final assignment. Earlier normal build attempts remain
separate evidence and were blocked by the host's Turbopack/PostCSS internal
port restriction; this review does not convert them into a successful build.

## Saved-Static quota review

The prior unbounded-storage finding is closed in this code/unit scope:

1. The Free saved-Static limit is one server-owned constant: **25**. It is
   separate from the inactive Phase 2B Dynamic limit of 5.
2. Both create and duplicate start a MariaDB transaction, lock the durable
   authenticated user row with `FOR UPDATE`, count that user's Static records,
   and insert only while the count is below 25. Both insertion paths use the
   same lock order.
3. Foreign/nonexistent source records remain indistinguishable and cannot be
   duplicated into another account.
4. The stable server response is HTTP 409 with
   `saved_static_qr_quota_exceeded` and limit 25. Save and dashboard clients map
   it to localized safe copy without displaying the internal code.
5. Independent tests prove 24 becomes 25 and the next create fails. A
   concurrent create plus duplicate for the only remaining slot yields one
   created result and one quota result in the transaction model.
6. Privacy, terms, generator Save copy and dashboard copy consistently state
   25 saved Static QR records and keep the future five-Dynamic allowance
   inactive.

The concurrency test is a deterministic transaction model, not MariaDB
execution evidence. The live gate must reproduce the two-connection race at
HostAtom before application enablement.

## Other reviewed contracts

- Account authorization uses an authoritative MariaDB session read with
  cookie-cache and refresh bypassed. Better Auth's user-snapshot cache is
  disabled.
- OAuth token encryption is enabled, provider-token account cookies are
  disabled, and OAuth state is database-backed.
- The session-create hook prevents a raw request IP from reaching persistent
  session storage. Actual inserted rows must still be checked live.
- Create and rename use the shared streamed-byte JSON limit, exact JSON media
  type and fatal UTF-8 decoding. Same-origin and persisted-user gates remain in
  place for every mutation.
- Every new DB connection queues UTC session initialization and is destroyed if
  that initialization fails.
- Anonymous generation remains independent of DB/auth configuration; account
  controls and Save UI are absent when the complete gate is not configured.
- Thai and English policy text now names Google and HostAtom/MariaDB, explains
  explicit saved payload/style storage, distinguishes local generation,
  discloses deletion limitations and does not promise immediate backup erasure.

No actionable defect was found in the assigned code/offline scope.

## Mandatory live and operational gates

Before enabling the DB-backed build, the same immutable candidate must still
pass:

1. MariaDB 10.11 execution/inventory of all 29 statements on the dedicated
   empty database and a rollback/restore test;
2. `@@session.time_zone`, `NOW()`, JavaScript Date and `timestamp(3)` round
   trips;
3. encrypted provider-token and empty raw-session-IP storage inspection;
4. Google login, authoritative revocation, logout and reauthentication;
5. two-user list/create/rename/duplicate/delete isolation;
6. real two-connection create/duplicate contention at slots 24/25/26;
7. least-privilege runtime grants, off-host backup identifier and published
   backup retention/deletion process;
8. a fresh successful build and browser/runtime QA before any separate deploy
   authorization.

A per-account/API request-rate boundary remains recommended defense in depth
before public traffic. The hard 25-record transaction limit bounds persistent
storage per account, but it does not replace operational abuse monitoring.
Also record the 25 saved-Static decision in the canonical Phase 2 plan during
the final documentation handoff; the implemented UI, policy and terms already
agree on that value.

No DB, browser, OAuth, Plesk, credential, DNS or deployment action occurred in
this QA assignment.
