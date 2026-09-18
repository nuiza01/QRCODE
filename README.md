# Nexora QR — Phase 1

Thai/English static QR generator: URL, text, WiFi, vCard, email, SMS, phone,
location, calendar event and PromptPay. Preview and PNG (512/1024/2048), SVG and
PDF export run in the browser; QR payloads are not sent to a generation server.
Accounts, dynamic QR, redirects, analytics, billing and live DB operations are
out of scope. This repository is an engineering candidate, not launch approval.

## Local development

Use Node **24.x** and npm **11.x** (CI uses Node 24). Next 16.3.1 alone accepts
20.9+, but the locked Vite/jsdom toolchain requires newer versions; the supported
project runtime is deliberately one tested major. Windows ia32 is not supported
by this runtime policy (its optional sharp binary has a Node 20-only engine).

```sh
npm ci --engine-strict
npm run dev
```

Open http://localhost:3000: `/` redirects 307 to `/th`. Homes `/th`, `/en` and
20 landing pages `/[locale]/qr/[type]` all include the generator. There are no
marketing-only landing routes. Each locale has 11 sitemap URLs (22 total).
No `.env` file or database is needed for Phase 1 development or CI.
`.env.example` documents optional settings; do not copy real secrets between worktrees.

Read `AGENTS.md` and the installed `node_modules/next/dist/docs/` before framework
changes. Root layout is `src/app/[locale]/layout.tsx`; i18n uses colocated bundles,
not next-intl. `PLAN.md` is historical, not an instruction to downgrade the stack.

## Verification

```sh
npm run typecheck     # next typegen first, then tsc (works on a fresh checkout)
npm run lint
npm test              # original Vitest suite + Node tests for hardening scripts
npm run check:drift   # offline; no dotenv/config/DB connection or migration write
npm run build        # normal no-env build; NOT a production release artifact
```

CI uses clean jobs for no-env and synthetic production-origin builds and does
not restore `.next` caches. When reproducing a fresh build locally, move your
generated `.next` directory aside first; never delete source or migration files.
Build needs network access for the existing Google font integration and may need
local process/port permission for Turbopack. No DB credentials are needed.

The Phase 1 drift checker uses the locked `drizzle-kit/api` generator in memory:
schema → snapshot comparison (excluding generated UUID identity), then empty
schema → initial SQL byte comparison ignoring only CRLF/final whitespace. It
also checks journal/chain and the exact one-migration file set. This catches
schema, snapshot and SQL-only edits without executing SQL. It is **not** a live
database audit, migration application test or general multi-migration runner.
Future migrations/custom SQL require an explicitly reviewed checker redesign;
do not fix failures by running `db:push`, `db:migrate` or rewriting the baseline.

## Origin and release admission

Resolver behavior stays explicit `NEXT_PUBLIC_APP_URL` →
`VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3000` for local/dev consumers.
Deployment admission is separate and stricter:

- Production requires explicit `NEXT_PUBLIC_APP_URL`, HTTPS, a multi-label public
  DNS hostname, no credentials, path/query/fragment, IP literals, local/reserved
  suffixes, trailing hostname dot or non-default port. IDNA/default :443 normalize.
- Vercel fallback alone **cannot** admit production. Preview may use a valid
  fallback only if the explicit variable is absent; bad/blank explicit fails.
- `NODE_ENV=production` is not a deployment signal: plain PR/no-env builds work.
  `VERCEL_ENV=production`, `VERCEL_TARGET_ENV=production` or
  `NQR_DEPLOY_TARGET=production` trigger the gate even on direct `next build`.
  Unknown deployment targets and preview downgrades of production fail closed.
- No raw invalid config/credentials are logged by the gate. It does no DNS/HTTP
  lookup. Syntax PASS does not prove public DNS, ownership, TLS or intended domain.

After the user approves a domain, the authorized pipeline must export its
`NEXT_PUBLIC_APP_URL` in the **build process environment**, then run:

```sh
npm run release:validate  # configuration check only; does not build or deploy
npm run build:release    # gate → Next build → 22 HTML + sitemap + robots checks
```

`build:release` propagates the validated origin to Next with higher priority than
`.env*`. `build:preview` provides the equivalent preview path. Vercel's default
`npm run build` is auto-gated by its target signals and checks the built output;
the config guard also catches build-command overrides to direct `next build`.
For other providers, use `build:release` or export `NQR_DEPLOY_TARGET=production`;
an unmarked local build cannot be distinguished from ordinary CI. There is no
deployment command/workflow here. Provider settings remain an explicit launch check.

`NEXT_PUBLIC_*` and static SEO URLs are baked into the artifact: never promote a
no-env/preview build by changing runtime env alone. Rebuild with the approved
origin. Keep devDependencies during the build (artifact validation uses jsdom).
`npm start` serves an existing local production-mode build; it does not certify it.

## Bundle audit

```sh
npm run audit:bundle  # installed Turbopack analyzer, no added dependencies
```

Output: `.next/diagnostics/analyze`. This analysis does not replace `next build`.
Inspect route/client import chains and dynamic boundaries, then use a cold
browser context to distinguish (1) HTML/initial scripts, (2) preview-triggered
QR library chunks and (3) PDF export-triggered jsPDF/svg2pdf chunks. A default
valid payload may load preview immediately after hydration: lazy is not “never
loaded on first visit.” SSR safety alone says nothing about transferred bytes.

## Release / rollback checklist (no deployment authorized by this document)

1. TL reviews assigned deltas; QA verifies one integrated candidate and records
   hashes, runtime, checks, browser/keyboard/export evidence and remaining defects.
2. User chooses the domain and authorizes deployment. In that authorized context,
   verify DNS A/AAAA/CNAME targets, TLS, redirects and effective build env. Do not
   request or paste credentials in chat. Offline origin admission is not this check.
3. Build a fresh gated artifact, verify 22 page origins and bundle boundaries;
   retain candidate identity, origin and check logs with the last known-good artifact.
4. User validates PromptPay payee/amount using at least three Thai bank apps,
   canceling before transfer. Repository tests cannot discharge this gate.
5. Only after approval, deploy the verified artifact and perform authorized smoke
   checks. No schema migration accompanies Phase 1. Short-domain registration is
   Phase 2, not a Phase 1 blocker.
6. If rollback is needed and authorized, restore the previous verified artifact
   built for the same approved origin, then recheck locale routes/SEO and exports.
   Do not repair a baked-in origin by changing runtime env or running migrations.
