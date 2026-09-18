import type { Bundle } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";

/**
 * The content model behind every SEO surface.
 *
 * Copy lives here rather than in the page components for two reasons. First,
 * the same strings feed three different consumers — the rendered page, the
 * `<head>` metadata, and the JSON-LD graph — and a page that says one thing in
 * its `<h1>` and another in its `FAQPage` block is exactly the mismatch that
 * gets a rich result withdrawn. Second, copy is the part a non-engineer needs
 * to edit; keeping it in typed data files means editing it never means editing
 * JSX.
 *
 * Both locales are required by `Bundle`, so a half-translated type is a type
 * error rather than an English string quietly shipping to a Thai user.
 */

/** One question/answer pair. Feeds both the visible accordion and `FAQPage`. */
export interface SeoFaq {
  question: string;
  answer: string;
}

/** One step of the "how to use" sequence. Rendered as an ordered list. */
export interface SeoStep {
  title: string;
  body: string;
}

/**
 * A prose block below the generator. Optional — most types need none, and
 * padding a page with filler sections to hit a word count is the 2012 playbook.
 */
export interface SeoSection {
  heading: string;
  body: string;
}

export interface SeoContent {
  /**
   * `<title>`, **without** the brand. Something appends ` · Nexora QR` before
   * this reaches a SERP — the locale layout's title template for the type
   * pages, or `buildHomeMetadata` itself for the home page, which the template
   * cannot reach. Either way, budget for the ~13 extra characters here and
   * never write the brand into this string.
   */
  title: string;
  /** `<meta name="description">`. Written to be clicked, not to be complete. */
  description: string;
  /** The single `<h1>`. Matches the frozen H1 target in `docs/ROUTES_AND_SEO.md`. */
  h1: string;
  /** One paragraph under the H1, before the generator. Answers "am I in the right place". */
  lead: string;
  /** Short label for cards, nav and breadcrumbs. */
  shortLabel: string;
  /** The "how to use" sequence. Three to five steps; nobody reads more. */
  steps: SeoStep[];
  /** Extra prose. Present only where the type genuinely has more to explain. */
  sections: SeoSection[];
  /**
   * Real questions only. An empty array is a valid, intentional answer and
   * suppresses the `FAQPage` block entirely — see `buildFaqPageJsonLd`.
   */
  faqs: SeoFaq[];
  /**
   * The privacy line. Every type gets one, phrased for what that type actually
   * puts at risk — a WiFi password and a national ID are not the same promise.
   */
  privacyNote: string;
}

/** A type's full SEO record: its frozen slug plus content in both locales. */
export interface QrTypeSeo {
  type: QrContentType;
  /**
   * URL segment under `/[locale]/qr/`. English in both locales, per the frozen
   * table in `docs/ROUTES_AND_SEO.md` — Thai-script URLs percent-encode into
   * unreadable strings in the chat apps where Thai users actually share links.
   */
  slug: string;
  content: Bundle<SeoContent>;
}
