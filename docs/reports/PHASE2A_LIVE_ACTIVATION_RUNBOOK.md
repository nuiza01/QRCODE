# Phase 2A — Plesk live-activation runbook

Date: 2026-08-31 (Asia/Bangkok)  
Review type: authoritative-source environment and secret-lifecycle review  
Status: **READY AS A RUNBOOK — no live activation, secret change or deployment performed**

This document defines the exact Plesk environment contract, secret-rotation
impact and the tests that are safe before deployment. It deliberately contains
no credential value. No browser, network, Plesk, MariaDB, OAuth, build,
application source or production state was accessed or changed during this
review.

## Frozen inputs and fresh local checks

- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`
- package lock: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- `.env.example`: `41bbfafb12bb4a5939038c6b695973df7013dfe2dcae53ba161cfab1300348d0`
- `next.config.ts`: `7a89ae350680a79e56da569b930f35f3d37327c0eebf7799a93f6255e630e800`
- release builder: `8a58863db9a0fda009118572d288b1a5bcc230908bc60953a6c5ebf59062cf4c`
- origin gate: `bc1fc5a836f84f69dd2c5a3ec8c3c0a009d1a4f02959e2956ddde937f1cc2aae`
- auth admission: `14158cad477469c898069fbb92e97f45f9be80bbe42aa6fdb0b038613b3464e6`
- auth runtime: `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`
- server environment parser: `015f42a1adb941cadf3700325c22c449b7a2ebd2efba347a36b39d8180dd473f`
- MariaDB pool: `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- migration: `8401ff9f5b6df284a0e5440c454b3bea25778c9cd499dfc1d3410b6f9e993bbf`

Fresh no-environment verification passed: three focused Vitest files / 19
tests and the origin-gate Node suite / 101 tests. These validate parser and
boundary behavior only; they are not Plesk, MariaDB or Google evidence.

The installed Better Auth `1.7.2` implementation was also read directly for
cookie signing, OAuth-token encryption and provider refresh behavior. This is
version-specific evidence and must be rechecked after any dependency update.

## Exact Phase 2A environment set

Enter values in Plesk's protected Node application environment. Do not create
an `.env` file under the application/document root, paste values into a shell
command or ticket, or record them in screenshots/reports. Plesk currently
shows administrators environment values in clear text, so restrict control
panel access and rotate values that have been exposed.

| Variable | Classification | Phase 2A build | Runtime | Required value/constraint |
|---|---|---:|---:|---|
| `NEXT_PUBLIC_APP_URL` | public | required | keep set | exactly `https://nqr.orenvis.com` |
| `BETTER_AUTH_URL` | public origin | required | required | exactly `https://nqr.orenvis.com`; no path, query, fragment or credentials |
| `DATABASE_URL` | secret | required for an account-enabled artifact | required | reviewed local MariaDB DSN below |
| `BETTER_AUTH_SECRET` | secret | required for an account-enabled artifact | required | one high-entropy value, at least 32 characters |
| `GOOGLE_CLIENT_ID` | identifier | required for an account-enabled artifact | required | approved Web client ID ending `.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | secret | required for an account-enabled artifact | required | matching secret for the same Google Web client |
| `NODE_ENV` | mode | Next build sets production | required | `production` |
| `PORT` | provider control | no | provider-injected | private Node listener consumed by the Plesk startup process |
| `HOSTNAME` | provider control | no | provider-dependent | only the bind value required behind the reverse proxy |

`NEXT_PUBLIC_SHORT_URL` and `SCAN_IP_SALT` belong to parked Dynamic/analytics
work and are not Phase 2A activation inputs. Do not add them merely to make the
environment look complete. `NQR_DEPLOY_TARGET` is set by `build:release` for
the build subprocess and is not a persistent runtime secret.

### Why secrets are present during the build

The prerendered home pages, QR type pages and shared header call
`isAccountAuthConfigured(process.env)`. That all-or-nothing gate requires the
Google configuration and MariaDB DSN and bakes whether account/Save controls
exist. A build made without the complete set can later receive runtime secrets
yet still omit those controls.

The build does not intentionally open MariaDB: database parsing and pool
creation are lazy. Nevertheless, the Phase 2A release environment must contain
the complete configuration so the artifact and runtime agree. Secrets remain
server-only and must never appear in a client asset or release report.

Changing from incomplete to complete configuration, changing the public
origin, or changing account-feature availability requires a new reviewed
build. Rotating only a valid secret value while completeness and the origin
stay unchanged does not alter the baked boolean, but it still requires a full
process restart. Rebuilding the frozen artifact as part of an operational
rotation is prudent but is not a substitute for that restart.

## MariaDB DSN contract

The reviewed production shape is:

```text
mysql://orenvis_nqr_app:<PERCENT_ENCODED_PASSWORD>@localhost:3306/orenvis_nqr_phase2
```

The password field above is a placeholder, never a literal. Percent-encode the
username/password as URL components, especially `%`, `:`, `/`, `@`, `?` and
`#`; do not percent-encode the entire DSN. Do not surround a Plesk environment
value with shell quotes or add whitespace/newlines. The current parser requires
the `mysql:` scheme, non-empty username, password, host and database path, and
rejects fragments. The reviewed local topology uses `localhost:3306`; changing
the host or adding query parameters is a new connection contract and should be
reviewed rather than guessed.

The runtime account remains local-only and scoped to
`orenvis_nqr_phase2` with SELECT/INSERT/UPDATE/DELETE. It must not regain DDL,
global or routine/event privileges after activation. A five-connection mysql2
pool is created per Node process, and every new pool connection queues
`SET SESSION time_zone = '+00:00'`. Changing `DATABASE_URL` or its password
requires restarting every Node process; an already-created pool does not
reread the environment.

## Restart and rebuild matrix

| Change | Rebuild | Restart all Node processes | User/session effect |
|---|---:|---:|---|
| add/remove any member of the complete six-variable account set | yes | yes | account UI and runtime availability change |
| change `NEXT_PUBLIC_APP_URL` or `BETTER_AUTH_URL` | yes | yes | origin, OAuth callback, trusted-origin and cookies must be revalidated |
| rotate `BETTER_AUTH_SECRET` only | not technically required if completeness is unchanged | **yes** | destructive to current signed cookies; provider-token caveat below |
| rotate Google client secret for the same client ID | not technically required if completeness is unchanged | **yes** | current Nexora sessions remain valid; OAuth exchange/refresh paths change |
| rotate MariaDB password / DSN only | not technically required if completeness is unchanged | **yes** | existing pools must be drained and recreated |
| change Google client ID/provider project | yes, treat as a new release input | yes | new consent/audience/account-linking review required |

`getAuth()`, the Better Auth handlers, `getEnv()` and the MariaDB pool are
cached in a Node process. Updating a Plesk value without restarting leaves an
old process using old credentials. For the approved initial topology, stop or
drain the single process, update the protected values, start exactly one new
process and prove the old PID is gone. Do not run mixed old/new-secret workers.

## Secret rotation consequences

### `BETTER_AUTH_SECRET`

The reviewed application supplies a single `secret` to Better Auth. It is used
to verify the signed session-token cookie and OAuth state cookie and, because
`account.encryptOAuthTokens` is enabled, to encrypt/decrypt provider access,
refresh and ID tokens stored in MariaDB.

Replacing that one value has these consequences:

1. existing browser session cookies no longer verify, even though durable
   session rows may remain in MariaDB; users must sign in again;
2. any OAuth flow started before rotation cannot safely complete after it;
3. provider tokens encrypted with the old value cannot be decrypted by the
   singular new value, so refresh/account-token operations can fail until the
   account obtains fresh tokens through reauthentication; and
4. every application process must restart because the auth instance is cached.

Better Auth 1.7.2 contains a versioned-secret mechanism, but this project does
not document or test `BETTER_AUTH_SECRETS` as an application environment
contract. In addition, signed session cookies are verified with the current
secret rather than the encryption-key ring. Do not introduce that undeclared
variable as an operational shortcut without a separate code/config review.

The safest moment for the first rotation is **before the first real user**.
First prove `user`, `session`, `account` and `verification` are empty, take the
identified backup, generate a new high-entropy value outside logs/history,
place it directly in Plesk and restart once. If these tables are not empty,
stop and approve a user sign-out/reauthentication and provider-token migration
plan rather than silently rotating.

### Google client secret

The Google client secret is used by the provider for authorization-code
exchange and refresh. It does not sign Nexora session cookies and is not the
key that encrypts provider tokens at rest. Rotating it for the **same client
ID** therefore does not by itself revoke an already valid Nexora database
session. It does affect in-flight/new OAuth callbacks and provider refresh
requests, and the cached auth instance requires a process restart.

Use provider overlap where Google permits it: create the new secret, enter it
in the protected Plesk environment, restart all processes, pass one fresh
login and a refresh/reauthentication check, then revoke the old secret. Do not
revoke the old value first while an old process or callback is active. Google
console overlap/revocation behavior is an external provider fact and was not
verified in this offline review.

## Exact safe no-deploy test matrix

“No deploy” means no public proxy switch, no replacement of the active `.next`
artifact, no DNS/TLS change and no public OAuth callback. Tests below are
separated so a passing preparatory check cannot be mistaken for live launch
evidence.

| ID | Test | State change | Expected result / evidence | Cleanup or stop condition |
|---|---|---|---|---|
| ND-01 | Recompute frozen source, migration, schema, package and plan hashes | none | exact reviewed identities; no unknown source drift | stop on any mismatch |
| ND-02 | Node 24/npm 11, `npm ci --engine-strict`, focused/full tests, typecheck, lint and offline drift in an isolated private release directory | private files/cache only | all reviewed gates pass; drift reports 10 tables / 29 statements without DB access | discard failed candidate; do not touch active root |
| ND-03 | Validate Plesk env by **presence/format booleans only** | none | six account variables complete; two origins equal canonical HTTPS; no value printed | stop if a validator, terminal, screenshot or log displays a secret |
| ND-04 | Read-only live DB inventory through Plesk | none | MariaDB 10.11; 11 tables total; one migration metadata row with reviewed hash/timestamp; InnoDB/FKs/indexes present | stop on table/hash/schema drift |
| ND-05 | Read-only runtime grants and capacity | none | local-only app user; only CRUD on its DB; `max_allowed_packet` exceeds 800,000 bytes plus protocol overhead; connection allowance exceeds one five-slot pool plus admin work | stop on DDL/global grants or insufficient limits |
| ND-06 | Read-only emptiness check before first-secret rotation | none | `user`, `session`, `account`, `verification`, `qr_codes` all zero | any nonzero count requires explicit data/session migration decision |
| ND-07 | Session-timezone permission probe in a disposable DB session: set session `+00:00`, then compare `@@session.time_zone`, `NOW(3)` and UTC | session-local only | `+00:00` accepted and millisecond timestamp behavior coherent | close session; this proves permission, not the app pool hook |
| ND-08 | Fresh `build:release` with complete real-origin configuration in an **isolated non-active directory** | new private artifact | 27 pages/origin verifier pass; account/Save UI is present; secret-marker scan finds none | preserve identity; never copy over active artifact under no-deploy authority |
| ND-09 | Bundle/server-output scan: synthetic marker build first, then a sealed exact-value scanner that reads real secrets only from the process environment and emits counts/paths without matched text | none | zero exact secret-value matches in all output; public assets also contain no server-only env value | destroy artifact and rotate any value if leakage is found |
| ND-10 | Backup identity/restore evidence | backup/test DB only | off-host artifact and restore inventory match; app user still lacks `LOCK TABLES` afterward | use existing artifact `67711a…`; repeat immediately before later production mutation |

For ND-04/05/06, record only PASS/FAIL, counts, versions and non-secret grant
classes. Never paste `SHOW GRANTS`, connection strings or control-panel pages
containing credentials into the evidence pack.

### Conditional private-runtime matrix (still no public deploy)

Run the following only if HostAtom provides a second private application root
and loopback-only port that cannot receive public traffic. The current audit
found forbidden SSH and no proven second-instance control, so this capability
is presently **NEEDS_PROVIDER_CONFIRMATION**. Starting the candidate in the
active root or routing `nqr.orenvis.com` to it is a deployment and is forbidden
by this runbook.

| ID | Private runtime test | Expected |
|---|---|---|
| PR-01 | Start exactly one candidate process with the complete env; probe only from the host | health/pages respond; no public listener; old PID/config absent |
| PR-02 | Exercise a new mysql2 pool connection | `@@session.time_zone = '+00:00'`; Date/`timestamp(3)` round trip is exact; pool stays within five connections |
| PR-03 | Anonymous auth/session and saved-QR mutation probes | no session is authoritative; mutations fail with fixed 401/403/503 as applicable, `no-store`, and body/auth boundaries hold |
| PR-04 | Dedicated synthetic `.invalid` fixture users through the actual DAL | list/create/rename/duplicate/delete are owner-scoped; foreign IDs are indistinguishable 404; responses never echo DSN/error markers |
| PR-05 | Slots 24/25/26 with two independent DB connections | one concurrent create/duplicate obtains slot 25; the other receives fixed 409 `saved_static_qr_quota_exceeded`; count never exceeds 25 |
| PR-06 | Process-local mutation limiter on one process | mutation 31 inside 60 seconds returns fixed 429 and numeric `Retry-After`; restart resets it as documented |
| PR-07 | Cleanup | delete only UUID-prefixed fixture users and rely on FK cascades; all five core-table counts return to the recorded baseline |

PR-04 through PR-07 are temporary live database writes and need explicit
fixture-test authority even though they are not a deployment. Take a fresh
backup first, use no real email/payload/person, record generated fixture UUIDs
before writing, and stop if the database is no longer at the expected baseline.
Do not hand-write rows to simulate Better Auth encryption/session behavior;
that would not test the actual runtime.

## Gates that cannot be closed without a reachable HTTPS candidate

Real Google login requires Google to return the browser to:

```text
https://nqr.orenvis.com/api/auth/callback/google
```

Therefore a true authorization-code exchange, encrypted provider-token row,
empty stored session IP, logout, database-session revocation,
reauthentication and Google refresh cannot be proven while the candidate is
neither deployed nor exposed at an approved staging HTTPS callback. A hosts
file override, self-signed certificate, tunnel or callback rewrite would test
a different trust/origin contract and must not be used as a workaround.

These remain post-deploy/staging gates:

1. two authorized Google test accounts sign in through the exact callback;
2. account token columns are non-plaintext/enveloped as expected and
   `session.ip_address` is empty, without copying token values;
3. each account can see and mutate only its own saved records;
4. deleting/revoking one database session invalidates that browser on its next
   request; logout and reauthentication succeed;
5. new Google-secret exchange/refresh works before the old provider secret is
   revoked; and
6. edge 1 MiB body ceiling, source throttles, no-cache, TLS/Host forwarding,
   monitoring and rollback are proven on the exact released artifact.

No-deploy evidence may mark these **PENDING**, never PASS.

## Activation order after separate deployment authority

1. Freeze candidate/build identities and confirm the last-known-good artifact
   plus database backup identifier.
2. Confirm core auth/data tables are empty; rotate the exposed auth and Google
   secrets before first use if empty.
3. Enter the exact environment in protected Plesk fields and verify it without
   displaying values.
4. Build in a private release directory; run ND-01 through ND-10.
5. If provider support exists, run PR-01 through PR-07 while the candidate is
   loopback-only; otherwise record the provider blocker.
6. Obtain explicit deployment authority. Only then switch the proxy/artifact,
   restart one Node process and run the reachable-HTTPS gates.
7. Roll back immediately on origin mismatch, secret leakage, DB/schema drift,
   raw token/IP persistence, owner isolation failure, count above 25, mixed
   process configuration or unexplained 5xx.

This runbook does not authorize any of those actions. It narrows the next
operator request and prevents local/build/database preparation from being
misreported as Google OAuth or production acceptance.
