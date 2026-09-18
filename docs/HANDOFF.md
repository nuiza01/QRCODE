# Handoff — Nexora QR

**Date:** 2026-08-28 · **Branch:** `main` (all work uncommitted) · **Cycle:** Phase 1

---

## 1. Status in one line

Phase 1 (static QR generator) is **functionally complete and verified**. Release
engineering is **not** finished, and QA never started.

| Check | State |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean |
| `npm test` | **337 passing**, 11 files |
| `npm run build` | clean — 27 pages prerendered |

Nothing is committed. The entire cycle is sitting in the working tree.

---

## 2. What exists now

Phase 0 (inherited) was the domain layer: encoders for 10 content types,
PromptPay EMVCo + CRC16, zod schemas, scan-quality rules, full DB schema for
Phases 1–3, CI. This cycle added everything above it.

```
src/qr/            domain layer — encoders, schemas, quality rules, messages
src/qr/render/     QR renderer + PNG/SVG/PDF exporters (client-only)
src/components/ui/ 15 hand-written primitives (shadcn-style, Radix + cva)
src/components/generator/  the generator: 10 forms, style editor, quality panel
src/seo/           content for 10 types × 2 locales, metadata + JSON-LD builders
src/app/[locale]/  root layout, home, and /qr/[type] × 20
src/i18n/          locale contract (colocated `Bundle` pattern, zero deps)
```

**Routes:** `/` → 307 → `/th`. `/th` and `/en` home. 20 landing pages at
`/[locale]/qr/[type]`. `sitemap.xml` (22 URLs) and `robots.txt`. Invalid locale
or type → 404 (`dynamicParams = false`).

Everything generates in the browser. No payload reaches a server — that is a
deliberate product claim, stated in user-facing copy, and must stay true.

---

## 3. Bugs found and fixed this cycle

The valuable part of this handoff. All were silent failures — code that renders
correctly on screen and fails in the field.

| # | Bug | Consequence if shipped |
|---|---|---|
| 1 | `escapeWifi` omitted the backslash from its own escape class | SSID `Cafe\Guest` decodes as `CafeGuest` — WiFi never connects, nothing warns |
| 2 | All-day events converted through UTC | Every all-day event created in Thailand (UTC+7) landed **one day early** |
| 3 | All-day `DTEND` emitted as written | RFC 5545 makes it exclusive: a one-day event encoded as zero-length and strict calendars drop it |
| 4 | `imageOptions.imageSize` treated as a width fraction | It is a fraction of the **error-correction budget**. Passing `0.25` under ECC H renders a **27.4%** logo, over the cap `quality.ts` exists to enforce |
| 5 | Quiet zone passed in modules to a pixel API | 4px quiet zone on a 1024px export — one sixth of a single module |
| 6 | Validation messages hardcoded Thai | English users saw Thai errors throughout the form |
| 7 | `promptPayPayloadSchema` only checked length 9–20 | A 10-digit national ID passed validation and threw at encode; Phase 2 server validation would have accepted it |
| 8 | Dialog scrim used `bg-foreground/40` | In dark mode that is a 40% **white** veil — brightens the page instead of dimming it |
| 9 | Home page emitted no canonical and no hreflang | The two highest-value pages were the only ones without an hreflang cluster |
| 10 | Radix `Accordion` proposed for FAQs | Closed panels unmount, so FAQ answers would be **absent from prerendered HTML** while `FAQPage` JSON-LD asserted they were present — a rich-result withdrawal risk, invisible in a browser |

Bugs 2, 3 and 4 are the ones that would have reached printed material before
anyone noticed.

**Independent verification of PromptPay.** Payloads were decoded field-by-field
with a TLV walker and CRC written fresh, importing nothing from the encoder.
Tags `00/01/29(00,01|02)/53/54/58/63` all correct, tag `01` flips `11`→`12` when
an amount is set, phone formatting is stripped to `0066` + last 9 digits, CRC
matched on every case. **This proves spec conformance, not real-world
acceptance** — see the gates in §6.

---

## 4. Work still open

### 4.1 DEVOPS — started, mostly incomplete
Hit an account usage limit. **Completed:** renamed `vitest.config.ts` →
`vitest.config.mts`, which removed the Vite CJS/ESM warning from every test run.
That was the low-risk choice over `"type": "module"`, which would have changed
resolution for `postcss.config.mjs`, `eslint.config.mjs`, `drizzle.config.ts`
and `next.config.ts`.

**Not done, in priority order:**

1. **Origin misconfiguration gate — highest value.** `src/seo/site.ts` resolves
   `NEXT_PUBLIC_APP_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `localhost:3000`.
   A production deploy with neither set **succeeds silently** and ships a
   sitemap, robots.txt and every canonical/hreflang pointing at the wrong
   origin. Since the Vercel fallback landed this emits plausible-looking
   `*.vercel.app` URLs rather than obviously-wrong localhost, so it will not be
   caught by eye. `hasConfiguredOrigin()` is exported for exactly this — wire it
   into CI or a predeploy script.
2. **Migration drift check.** Nothing proves `drizzle/0000_shallow_vision.sql`
   still matches `src/db/schema.ts`. Must not require a live database — CI
   deliberately runs without `DATABASE_URL`.
3. **CI hardening.** No `engines` field; Next 16 needs Node ≥ 20.9.
4. **`.env.example`** — predates this cycle, missing `VERCEL_PROJECT_PRODUCTION_URL`.
5. **`README.md`** — still create-next-app boilerplate.
6. **Bundle audit.** Confirm `qr-code-styling`, `jspdf` and `svg2pdf.js` stay out
   of the initial bundle on marketing-only routes. RENDER's `ssr.test.ts` locks
   the SSR boundary but not bundle weight.

### 4.2 QA — never started
No component test beyond what each role wrote for itself. Not yet done:
cross-role integration, keyboard/screen-reader passes, and **runtime verification
in a real browser** — no one has driven the actual UI end to end. Every claim in
§1 is static analysis and unit tests.

### 4.3 Deferred by decision, not oversight
- `PromptPayError` messages are codified, but that path is now unreachable in
  normal use — `superRefine` catches all three cases first.
- `tel` and `sms` are the thinnest landing pages (2–3 FAQs, no sections). Left
  unpadded deliberately. Watch them first in Search Console.
- `SoftwareApplication` JSON-LD claims price 0 THB. True today; **must change
  when the Pro tier lands in Phase 3** or it misrepresents to Google.
- No `/pricing`, `/docs`, `/privacy`, `/terms`. Footer links are inert.

---

## 5. Decisions worth not re-litigating

- **`src/app/[locale]/layout.tsx` IS the root layout.** There is no
  `src/app/layout.tsx` and no `src/app/page.tsx`. Root params are the dynamic
  segments *above* the root layout, so this is the documented Next 16 pattern
  (`next/root-params`, v16.3.0+). `/` → `/th` is a `next.config.ts` redirect
  because a page at `/` would have no root layout above it.
- **i18n has no dependency.** Each module colocates a `strings.ts` exporting a
  `Bundle<T>` requiring both locales, so a half-translated module is a *type
  error*. There is no central dictionary file to fight over.
- **Schemas carry codes, not sentences.** `src/qr/messages.ts` resolves them.
  A Phase 2 server route validating a bulk CSV has no locale in scope when a
  rule fires, so the schema states which rule broke and the caller picks the
  language. Unmapped codes fall through as themselves — an ugly visible code is
  a bug you can see; a blank field is one that ships.
- **Quality rules are enforced twice.** `normalizeStyle()` runs inside the
  renderer *and* every export path, and `hasBlockingIssue()` disables download.
  A user must not be able to export a code that will not scan.
- **The style in React state is the raw one, never normalized.** That is what
  makes "ECC was forced to H" visible instead of the UI silently self-healing.
- **FAQs use native `<details>`, not Radix `Accordion`** — see bug 10.
- **Type slugs are English in both locales.** Thai-script URLs percent-encode
  into unreadable strings in the chat apps where Thai users actually share links.
- **`bg-scrim` is the only correct way to tint a full-viewport overlay.** A tint
  of `--foreground` inverts in dark mode and the failure is invisible in light.

---

## 6. Pre-launch gates — owned by the product owner, not engineering

**These cannot be discharged by this team and must not be marked done by anyone
working in the repo.**

1. **PromptPay validated against ≥ 3 real Thai bank apps.** The encoder matches
   the EMVCo spec and its own CRC, and §3 confirms the payload decodes
   correctly — but **no test in this repo proves a real bank app accepts it.**
   Generate a code for a real PromptPay-linked number, scan with three different
   banks, confirm the payee name and amount resolve, and cancel at the
   confirmation screen. No transfer needed.
2. **`NEXT_PUBLIC_APP_URL` set in the production environment.** See §4.1 item 1.
3. **Short domain registered** for `/r/[code]`, with `NEXT_PUBLIC_SHORT_URL` set.
   Not needed for Phase 1; blocking for Phase 2. Shorter URL = fewer modules =
   easier scans. Set a long auto-renew — a lapsed short domain kills every
   printed dynamic code.

---

## 7. How to resume

```bash
npm install
npm run dev          # http://localhost:3000 → /th
npm test             # 337 passing
npm run build        # 27 pages
```

Recommended order:
1. **Commit the tree.** An entire cycle is uncommitted and one bad `git checkout`
   loses it. Note `AGENTS.md` contains a managed block that `next dev` rewrites —
   commit it with the work rather than fighting it.
2. Finish DEVOPS §4.1, starting with the origin gate.
3. Run QA §4.2 — particularly a real browser pass, which nobody has done.
4. Discharge gate 1 in §6 before any launch.

Team structure, path ownership and wave sequencing are in `docs/TEAM.md`.
Shared engineering constraints are in `docs/ENGINEERING_BRIEF.md`. The frozen
route and SEO spec is in `docs/ROUTES_AND_SEO.md`. Product roadmap is `PLAN.md`.
