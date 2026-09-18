# Phase 2A — HostAtom/Plesk Hosting Runtime Contract

Date: 2026-08-31 (Asia/Bangkok)  
Review type: read-only source/runtime compatibility assessment  
Status: **NEEDS_PROVIDER_CONFIRMATION — current shared-host capability is not yet proven**

This report defines what the authoritative Phase 2A source requires from
Plesk/HostAtom. It does not claim that the current package provides those
capabilities. No provider page, network, browser, database, credential,
deployment or production state was accessed or changed.

## Frozen inputs

- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`
- package lock: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- `next.config.ts`: `7a89ae350680a79e56da569b930f35f3d37327c0eebf7799a93f6255e630e800`
- release builder: `8a58863db9a0fda009118572d288b1a5bcc230908bc60953a6c5ebf59062cf4c`
- MariaDB runtime: `0499ed3493298830acf96df11407388828420b1959119381be15f90ffad8cf68`
- account limiter: `5275f89eb8882a38ff0806cf4ca6ef7de9fc31e0cb2ae3a79183b90ea595867c`
- environment example: `41bbfafb12bb4a5939038c6b695973df7013dfe2dcae53ba161cfab1300348d0`

Installed review machine: Node `24.14.1`, npm `11.11.0`, Next.js `16.3.1`,
Better Auth `1.7.2`, mysql2 `3.24.2`, Drizzle ORM `0.45.2`. The review machine
is macOS arm64; that does not prove the HostAtom Linux architecture/runtime.

The bundled Next.js 16.3.1 deployment and self-hosting guides were read from
`node_modules/next/dist/docs/`. They require a Node server for full framework
features and recommend a reverse proxy in front of `next start`.

## Hard compatibility result

Phase 2A **cannot be hosted as files in `httpdocs` or as a static export**.
It contains Node.js Route Handlers for Better Auth and saved-QR mutations, a
dynamic account dashboard, request headers/cookies, MariaDB access, runtime
redirects, and explicitly `runtime = "nodejs"` routes. Next's static-export
mode does not support those features, and this repository does not configure
`output: "export"`.

The required hosting shape is:

```text
public HTTPS nqr.orenvis.com
        |
Plesk/HostAtom reverse proxy + TLS + source controls
        |
one persistent Node 24 process running `npm run start`
        |
local-only HostAtom MariaDB 10.11
```

If the current HostAtom plan has only PHP/static hosting, lacks Node 24, or
accepts only a mandatory startup-file field with no npm start command, it is
not compatible with the current source. The repository has no custom
`server.js`; one must not be invented during deployment without code review.

## Node, npm and application mode

Required:

- Node **24.x**, enforced by `>=24.0.0 <25`.
- npm **11.x**, enforced by `>=11 <12`.
- Next.js production Node-server mode, not `next dev`, static export, PHP, or a
  plain Apache document root.
- A process manager that can start from the application root with an injected
  `PORT`, restart on failure, preserve environment variables, and send
  `SIGTERM`/`SIGINT` with a 10–30 second graceful drain.
- One application process/instance for the first release unless the limiter,
  caches and rollout controls are redesigned for multiple instances.

The provider must confirm the exact Node binary used by both npm install/build
and the long-running application. Selecting Node 24 in an interactive shell
but running an older Passenger/process-manager binary is not sufficient.

## Install, build and start commands

The reviewed sequence is conceptually:

```sh
npm ci --engine-strict
npm run typecheck
npm run lint
npm test
npm run check:drift
npm run build:release
npm run start
```

The required production origin and complete account configuration must be
present before `build:release`; the server variables must remain present for
`start`. `build:release` performs the production origin gate, invokes
`next build`, then verifies generated canonical/hreflang/sitemap/robots
artifacts. `npm run start` is only `next start`; it does not build or migrate.

Do not use `npm run dev`, `db:push`, an automatic migration-on-start hook, a
direct static upload, or a no-environment `.next` artifact. Do not run
`npm prune` or omit devDependencies before the release build: the build and
artifact verifier use build-time/dev packages. Any post-build pruning/runtime
packaging procedure needs its own frozen test because `output: "standalone"`
is not configured.

The current config has neither `output: "standalone"` nor a custom server.
Therefore the default deployment expects the project/package files, `.next`,
`public`, and compatible runtime `node_modules`. If Plesk requires a small
standalone bundle, the source needs a separately reviewed output-mode change.

## Build-time versus runtime environment

The following values are secrets except where marked public. They belong in
Plesk's protected application environment, never in the repository, public
document root, client bundle, logs, screenshots, or reports.

| Variable | Build | Runtime | Contract |
|---|---:|---:|---|
| `NEXT_PUBLIC_APP_URL` | required | keep set | public, exact `https://nqr.orenvis.com`; baked into client/SEO artifacts |
| `BETTER_AUTH_URL` | required/recommended explicit | required | exact `https://nqr.orenvis.com`, no path/query/fragment |
| `BETTER_AUTH_SECRET` | required | required, same value | at least 32 high-entropy characters; secret |
| `GOOGLE_CLIENT_ID` | required | required | ends `.apps.googleusercontent.com`; identifier, not a password |
| `GOOGLE_CLIENT_SECRET` | required | required | secret |
| `DATABASE_URL` | required | required | secret `mysql:` URL to the one application database; password URL-encoded |
| `NODE_ENV` | Next build sets production | required `production` | must not run production with development behavior |
| `PORT` | no | provider-injected | internal listener port consumed by `next start` |
| `HOSTNAME` | no | provider-dependent | bind only as required by the reverse proxy; do not expose Node directly |
| `NQR_DEPLOY_TARGET` | set by `build:release` | no | direct `next build` on a provider must still be marked production |

`NEXT_PUBLIC_SHORT_URL` and `SCAN_IP_SALT` are not required for Phase 2A;
they belong to parked Dynamic/analytics phases. Vercel variables are not a
HostAtom substitute.

Why the secrets are also needed while building: the prerendered home/type
pages and header call `isAccountAuthConfigured(process.env)` and bake whether
the Google account/Save UI exists. A build without the complete Google and
database configuration can start later with runtime secrets but still omit
the account UI. Secret *values* must remain server-only, but configuration
completeness is a build input. After any disabled-to-enabled change, rebuild;
do not attempt to repair it with runtime variables alone.

## Reverse proxy and process manager

The public server should terminate TLS and proxy to the private Node port. It
must preserve the original `Host`, HTTPS scheme and forwarding headers so
Better Auth sees the exact trusted origin and emits secure cookies. It must
route `/api/auth/**`, `/api/qr-codes/**`, `/[locale]/dashboard`, `/_next/**`
and all page routes to the same release.

Required proxy controls before activation:

- reject malformed/slow requests before Node;
- an explicit request-body ceiling just above the application's 800,000-byte
  saved-QR ceiling (for example 1 MiB), while the app remains authoritative;
- source-level rate limiting for auth and saved-QR APIs;
- no shared/proxy caching for auth, dashboard or API responses;
- adequate header/cookie limits for the Better Auth session;
- logs protected and rotated without request bodies, cookies, DSNs or secrets;
- health/restart monitoring and graceful drain rather than a hard kill; and
- no direct public access to the internal Node port.

Next recommends disabling proxy buffering for full App Router streaming. The
current account flows do not rely on streaming for correctness, but buffering
behavior should still be verified rather than assumed.

## Filesystem and capacity

Runtime server-side user uploads are not written to disk: the browser prepares
logos and an explicit Save stores validated JSON in MariaDB. Source/public
files and runtime dependencies may be read-only after release. Next's local
cache under `.next/cache` needs a private writable directory for a normal
single-instance `next start`; it must not be exposed under the web document
root. Build output and logs also need private storage.

Measured on the review machine, the current `.next` directory is about 166 MiB
and `node_modules` about 710 MiB, including platform-specific optional and dev
packages. Linux sizes will differ and these numbers are not a deployment
artifact promise. An in-place server build also needs temporary space and room
for a last-known-good rollback. Confirm quota before building; roughly 2 GiB
free is a prudent minimum for this non-standalone build workflow, subject to a
measured Linux install/build.

Plesk application root should be private. Only public HTTP traffic should pass
through the proxy; `.env*`, package files, source, `.next/server`, logs and
database artifacts must not be directly downloadable from `httpdocs`.

## MariaDB contract

- MariaDB target: 10.11, InnoDB tables, `utf8mb4` database/connection support.
- The Node process must reach the database address in `DATABASE_URL`. A
  local-only `localhost:3306` account works only if Node runs in the same host
  namespace; it will not work from an external/container host without an
  approved network design.
- The password must be URL-encoded in the `mysql:` DSN. The runtime user is
  scoped to this database and needs data/transaction privileges, not ongoing
  global or DDL authority. Migration authority should be transient/separate.
- mysql2 opens a pool of at most **5 connections per Node process**. Plesk's
  per-user and server connection allowances must exceed that plus separate
  administrative/migration sessions. With `N` processes the application can
  use up to `5 × N` pooled connections.
- Every new connection executes `SET SESSION time_zone = '+00:00'`; the user
  must be allowed to set its session timezone. Failed initialization destroys
  that connection.
- MariaDB `max_allowed_packet` must exceed the 800,000-byte JSON boundary plus
  SQL/protocol overhead; verify rather than assuming the server default.
- Foreign keys and the per-user `SELECT ... FOR UPDATE` quota lock require
  transactional InnoDB behavior. Verify engine, constraints and indexes after
  migration.
- No migration runs automatically on `npm start`. Apply the reviewed migration
  once under the separate authorization, verify inventory, then use the
  least-privilege runtime account.

The real database gate still includes UTC/timestamp round-trip, two-connection
slot-25 race, two-user ownership, auth token/IP row inspection, CRUD,
backup/restore and rollback evidence.

## Instance count and rate-limit consequences

For the initial topology, configure exactly **one Node application instance**.
The saved-QR mutation limiter is an in-memory Map allowing 30 authenticated
mutations per account per 60 seconds. It resets on restart and is not shared
between workers. With `N` instances it can admit about `30 × N` operations per
window, independently of load-balancer routing. Better Auth and Next also have
per-process memory/cache considerations.

The durable 25 saved-Static limit remains safe across processes because it is
enforced by a MariaDB transaction and per-user row lock. The process-local
rate limit is only availability defense. Before multiple instances or rolling
deployments, add a shared atomic limiter and address Next's multi-instance
build ID/version-skew, Server Function key and cache coordination guidance.

Even for one instance, configure proxy/provider source throttling because an
unauthenticated flood reaches origin/session checks before an account key
exists. A process restart must not be described as preserving rate history.

## Plesk/HostAtom confirmation checklist

Before any build or deployment, obtain non-secret answers/evidence for:

1. Node 24.x and npm 11.x are offered to both build and long-running process.
2. Plesk supports an npm/custom start command from a private application root;
   if it mandates a startup JS file, current source is blocked.
3. One process can remain resident and receives an internal `PORT`, restart,
   health and graceful-stop management.
4. Reverse proxy rules preserve HTTPS/Host, cap bodies, source-rate APIs and do
   not cache private routes.
5. Disk quota/free space can hold install, build, runtime and rollback copies.
6. Node can reach the local-only MariaDB endpoint and the DB user has at least
   five available connections plus administrative headroom.
7. MariaDB database charset/engine, packet size, session-timezone statement,
   foreign keys and transaction locks meet the contract.
8. Protected environment variables are available during both build and start
   without appearing in logs or public files.

Until these are confirmed, the included HostAtom MariaDB can remain useful for
the separately authorized empty schema bootstrap, but the current hosting plan
must not be treated as proven capable of running Phase 2A.

## Review boundaries

No source, package, lockfile, configuration, secret, database or provider state
was changed. No install, build, server, browser, network, migration, deployment
or production command was run. This report is the only file written.
