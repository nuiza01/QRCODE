# Route scheme & SEO spec (PM-owned, frozen for the cycle)

FORMS and SEO both build against this. Neither invents a URL.

## URL scheme

```
/                       → redirect to /th  (next.config.ts redirects)
/[locale]               home — heading, copy and one link into the generator
/[locale]/qr/[type]     per-type SEO landing page, links to the generator preset to that type
/[locale]/create        the generator itself — requires a signed-in session, noindex, not in the sitemap
```

**Amended 2026-09-18 (Product Owner):** creating a QR code requires an account.
The generator moved out of the two public page types and into `/[locale]/create`,
which reads the session on the server and never sends the form to an anonymous
request. The public pages keep their copy, FAQ and JSON-LD and stay prerendered,
so the 22 crawlable URLs and the sitemap are unchanged. `/[locale]/create` carries
`?type=<slug>` so a visitor who arrives for PromptPay still gets PromptPay after
signing in.

`locale` ∈ `th | en`. Thai is the default and is **not** omitted from the path —
`/th/...` and `/en/...` both exist, so hreflang has two real, crawlable URLs.

### Type slugs

Slugs are English in both locales. Thai-script URLs percent-encode into
unreadable strings when copied into chat apps and social posts, which is where
Thai users actually share links. The Thai targeting lives in the page copy,
`<title>` and headings — which is what ranks anyway.

| `QrContentType` | slug | Thai H1 target | English H1 target |
|---|---|---|---|
| `url` | `url` | สร้าง QR Code จากลิงก์ | URL QR code generator |
| `text` | `text` | สร้าง QR Code จากข้อความ | Text QR code generator |
| `wifi` | `wifi` | สร้าง QR Code WiFi | WiFi QR code generator |
| `vcard` | `vcard` | สร้าง QR Code นามบัตร | vCard QR code generator |
| `email` | `email` | สร้าง QR Code อีเมล | Email QR code generator |
| `sms` | `sms` | สร้าง QR Code SMS | SMS QR code generator |
| `tel` | `tel` | สร้าง QR Code เบอร์โทร | Phone QR code generator |
| `geo` | `geo` | สร้าง QR Code พิกัดแผนที่ | Location QR code generator |
| `event` | `event` | สร้าง QR Code นัดหมาย | Event QR code generator |
| `promptpay` | `promptpay` | สร้าง QR Code พร้อมเพย์ รับเงิน | PromptPay QR code generator |

**`promptpay` is the priority page.** It is the one query where we can beat the
international competitors outright, and it is the reason a Thai user picks us
over a generic generator. Give it the most depth: how to read the code with a
banking app, mobile vs national ID vs e-wallet, what happens with and without a
fixed amount, and an explicit note that a code with an amount is single-use.

## Per-page requirements

Each `/[locale]/qr/[type]` page must have:

- A working generator preset to that type — **not** a marketing page that links
  to the generator. The user landed to make a code; make one.
- `generateMetadata` with a locale-specific title and description, `alternates.canonical`,
  and `alternates.languages` covering both locales.
- One `<h1>`, genuinely localized copy, and a short "how to" section.
- JSON-LD: `SoftwareApplication` on the generator, plus `FAQPage` where the page
  has real questions. Do not fabricate FAQs to farm the rich result — write
  questions a Thai user actually asks, or omit the block.
- `generateStaticParams` over locale × type, so all 20 pages prerender.

## Sitemap & robots

`src/app/sitemap.ts` covers both locales × home + 10 types = 22 URLs, each with
`alternates.languages`. `src/app/robots.ts` allows everything and points at the
sitemap. Both must derive absolute URLs from the environment, never a hardcoded domain —
the production domain is not registered yet (`PLAN.md` §4, Phase 0 open item).

Origin resolution order (PM decision, 2026-08-19):
1. `NEXT_PUBLIC_APP_URL` — explicit, always wins
2. `VERCEL_PROJECT_PRODUCTION_URL` — makes preview deploys self-configuring
3. `http://localhost:3000` — dev fallback, must never reach production

Unset origin in production is a silent failure: the sitemap ships pointing at
localhost and nothing errors. `hasConfiguredOrigin()` exists so DEVOPS can turn
that into a loud one.

## Not this cycle

No `/pricing`, `/docs`, `/privacy`, `/terms` pages. The footer links to them as
inert text. Billing copy is Phase 3 and writing pricing pages before the paid
tier exists just creates pages we would have to retract.
