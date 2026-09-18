# Team & ownership map — Nexora QR

> Current operating plan (2026-08-28): see [ENGINEERING_LOOP.md](ENGINEERING_LOOP.md)
> for the one-role/one-task registry, standby state, coordinator, assignments,
> review/QA loop and user approval gates. The waves below describe the original
> implementation cycle; the current cycle starts with remaining release hardening.

PM assigns work in waves. Within a wave, roles own disjoint paths so two people
never edit the same file. Shared contracts (`package.json`, `src/i18n/config.ts`,
`src/lib/cn.ts`, DB schema, `src/qr/*` domain layer) are owned by the PM and are
frozen for the wave unless the PM changes them.

| Role | Code | Owns |
|---|---|---|
| Design Lead / UI foundation | `DS` | `src/app/globals.css`, `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`, `src/app/page.tsx`, `src/components/ui/**` |
| QR rendering engineer | `RENDER` | `src/qr/render/**` |
| Frontend feature engineer | `FORMS` | `src/components/generator/**`, `src/app/[locale]/page.tsx` |
| SEO & i18n engineer | `SEO` | `src/app/[locale]/qr/**`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/seo/**` |
| QA engineer | `QA` | `src/**/*.test.ts(x)`, verification reports |
| DevOps / release | `DEVOPS` | `.github/**`, `next.config.ts`, `README.md`, `.env.example` |

## Waves

- **Wave 1 — foundation (parallel):** `DS`, `RENDER`
  Nothing else can be built until there are UI primitives and a renderer.
- **Wave 2 — features (parallel):** `FORMS`, `SEO`
  Both consume Wave 1 output; they do not touch each other's paths.
- **Wave 3 — hardening (parallel):** `QA`, `DEVOPS`
  Tests, accessibility, build health, release docs.

## Definition of done for the cycle

- All 10 content types encode and render a scannable code.
- Style editor with live preview; quality rules enforced, not merely suggested.
- PNG (512/1024/2048), SVG, and PDF export all work.
- Thai and English routes both render, with per-type SEO pages.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` all pass.

## Pre-launch gates this team cannot discharge

These are owned by the product owner, not by any engineering role. They must not
be marked done by anyone here.

- **PromptPay validated against at least 3 real Thai bank apps** (`PLAN.md` §5).
  Our encoder is tested against the EMVCo spec and its own CRC, but no test in
  this repo proves a real bank app accepts the output. Generate a code for a real
  PromptPay-linked number, scan it with 3 different banks, and confirm the payee
  name and amount resolve correctly. Cancel at the confirmation screen — no
  transfer is needed to verify.
- **Short domain registered** for `/r/[code]` and `NEXT_PUBLIC_SHORT_URL` set
  (`PLAN.md` §4, Phase 0). Not needed for Phase 1, blocking for Phase 2.
- **`NEXT_PUBLIC_APP_URL` set in the production environment.** Unset, the sitemap
  and robots.txt silently emit `http://localhost:3000` on the live site.
