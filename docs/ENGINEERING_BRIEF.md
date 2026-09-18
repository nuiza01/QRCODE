# Engineering Brief — Nexora QR (read before writing code)

Everyone on the team reads this file first. It is the shared contract; deviating
from it is what makes two people's work fail to compose.

## Product target for this cycle

**Phase 1 of `PLAN.md`: the static QR generator, shipped and demoable.**
Everything is generated in the browser. No payload ever leaves the device — that
privacy property is a stated selling point, so do not add a server round-trip to
generate a code.

Out of scope this cycle: auth, dynamic QR, `/r/[code]`, analytics, billing.
The DB schema for those already exists and stays untouched.

## The framework is Next.js 16.3.1 — not what you remember

`AGENTS.md` is not boilerplate. Read the relevant guide under
`node_modules/next/dist/docs/` before writing framework code. Known traps:

- **Turbopack is the default** for `next dev` and `next build`. No `--turbopack` flag.
- **`params` and `searchParams` are Promises.** `const { locale } = await params`.
  Same for `cookies()`, `headers()`, `draftMode()`.
- Use the generated prop helpers: `PageProps<'/[locale]'>`, `LayoutProps<'/[locale]'>`.
  Run `npx next typegen` if a route's type is missing.
- `sitemap`/`opengraph-image` generator functions also receive `id` as a Promise.
- Tailwind is **v4** — configured in CSS via `@theme`, there is no `tailwind.config.js`.

## Hard rules

1. **`qr-code-styling` touches `document` at import time.** It must never be
   imported from a server component or from module scope in anything that gets
   prerendered. Load it with `dynamic(() => import(...), { ssr: false })` or a
   lazy `await import()` inside an effect/handler.
2. **Never bypass `src/qr/quality.ts`.** Call `normalizeStyle()` before rendering
   or exporting, and surface `inspectStyle()` issues in the UI. These rules are
   the difference between a code that looks right on screen and one that scans in
   a shop. `hasBlockingIssue()` must block download.
3. **Validate with the existing zod schemas** in `src/qr/schemas.ts`. Do not
   write a second set of validation rules in the form layer.
4. **Encoding lives in `src/qr/payload/encode.ts`.** Never build a QR string
   inline in a component.
5. **Thai and English are both first-class.** Colocate copy as a `Bundle` next to
   the module (see `src/i18n/config.ts`). No hardcoded user-facing English or
   Thai in JSX.
6. **Do not edit `package.json`.** If you need a dependency, stop and report it
   to the PM instead of installing it.

## i18n pattern

```ts
// src/components/foo/strings.ts
import type { Bundle } from "@/i18n/config";

export const fooStrings: Bundle<{ title: string }> = {
  th: { title: "สร้าง QR Code" },
  en: { title: "Create a QR code" },
};
```

```tsx
import { t } from "@/i18n/config";
const s = t(fooStrings, locale);
```

Routes live under `src/app/[locale]/...` with `locale` of `"th" | "en"`.
Thai is the default locale and `/` redirects to `/th`.

## Verification — required before you report done

Run all of these from the repo root and paste the real result in your report:

```
npm run typecheck
npm run lint
npm test
```

Do not report success on a step you did not run. If something fails and it is
outside your ownership, say so explicitly rather than editing another role's
files to work around it.

## Ownership

Touch only the paths you own. If you need a change in someone else's area,
report it to the PM — do not reach across the boundary.
