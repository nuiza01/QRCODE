import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { locales } from "@/i18n/config";
import type { QrContentType } from "@/qr/types";
import { homeSeo, qrTypeSeo, qrTypeSeoList } from "@/seo/content";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  jsonLdScriptProps,
  serializeJsonLd,
} from "@/seo/jsonld";
import { buildHomeMetadata, buildPageMetadata, buildTypeMetadata } from "@/seo/metadata";
import { hasConfiguredOrigin, languageAlternates, localePath, localeUrl, siteOrigin } from "@/seo/site";

const ORIGIN = "https://example.test";

/**
 * Both origin sources are controlled, not just the first. Leaving
 * `VERCEL_PROJECT_PRODUCTION_URL` to whatever the machine happens to export
 * would make the localhost-fallback assertions pass locally and fail in CI.
 */
const ORIGIN_VARS = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL"] as const;
const original = Object.fromEntries(
  ORIGIN_VARS.map((name) => [name, process.env[name]]),
) as Record<(typeof ORIGIN_VARS)[number], string | undefined>;

function setOrigin(vars: Partial<Record<(typeof ORIGIN_VARS)[number], string>>) {
  for (const name of ORIGIN_VARS) {
    const value = vars[name];
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

beforeEach(() => {
  setOrigin({ NEXT_PUBLIC_APP_URL: ORIGIN });
});

afterEach(() => {
  for (const name of ORIGIN_VARS) {
    if (original[name] === undefined) delete process.env[name];
    else process.env[name] = original[name];
  }
});

describe("site origin", () => {
  it("derives every URL from NEXT_PUBLIC_APP_URL", () => {
    expect(siteOrigin()).toBe(ORIGIN);
    expect(localeUrl("th", "/qr/wifi")).toBe(`${ORIGIN}/th/qr/wifi`);
  });

  it("normalizes a trailing slash or stray path away", () => {
    setOrigin({ NEXT_PUBLIC_APP_URL: "https://example.test/" });
    expect(siteOrigin()).toBe(ORIGIN);
    setOrigin({ NEXT_PUBLIC_APP_URL: "https://example.test/some/path" });
    expect(siteOrigin()).toBe(ORIGIN);
  });

  it("falls back to localhost rather than throwing when nothing is set", () => {
    setOrigin({});
    expect(siteOrigin()).toBe("http://localhost:3000");
    expect(hasConfiguredOrigin()).toBe(false);
  });

  it("falls back to VERCEL_PROJECT_PRODUCTION_URL, adding the missing scheme", () => {
    setOrigin({ VERCEL_PROJECT_PRODUCTION_URL: "nexora-qr-abc123.vercel.app" });
    expect(siteOrigin()).toBe("https://nexora-qr-abc123.vercel.app");
    expect(hasConfiguredOrigin()).toBe(true);
  });

  it("lets NEXT_PUBLIC_APP_URL win over the platform variable", () => {
    setOrigin({
      NEXT_PUBLIC_APP_URL: ORIGIN,
      VERCEL_PROJECT_PRODUCTION_URL: "nexora-qr-abc123.vercel.app",
    });
    expect(siteOrigin()).toBe(ORIGIN);
  });

  it("skips a malformed value instead of throwing", () => {
    setOrigin({ NEXT_PUBLIC_APP_URL: ":::not a url:::" });
    expect(siteOrigin()).toBe("http://localhost:3000");

    setOrigin({
      NEXT_PUBLIC_APP_URL: ":::not a url:::",
      VERCEL_PROJECT_PRODUCTION_URL: "nexora-qr-abc123.vercel.app",
    });
    expect(siteOrigin()).toBe("https://nexora-qr-abc123.vercel.app");
  });

  describe.each(ORIGIN_VARS)("%s warning redaction", (varName) => {
    it.each([
      { label: "line injection", raw: ":::SYNTHETIC_INVALID\r\nSYNTHETIC_LOG_LINE" },
      {
        label: "credentials and query",
        raw: "https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@[invalid]?token=SYNTHETIC_QUERY",
      },
      {
        label: "data URI in a malformed URL",
        raw: "https://[invalid]?logo=data:image/svg+xml,SYNTHETIC_DATA",
      },
    ])("redacts $label while retaining fallback and caching", ({ raw }) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      try {
        setOrigin({ [varName]: raw });
        expect(siteOrigin()).toBe("http://localhost:3000");
        // A second read uses the cache without repeating the warning.
        expect(siteOrigin()).toBe("http://localhost:3000");
        const logged = warn.mock.calls.flat().join(" ");
        expect(logged).not.toMatch(/SYNTHETIC_|data:image|[\r\n]/);
        expect(warn.mock.calls).toEqual([
          [`[seo] ${varName}: invalid_absolute_url; ignoring it.`],
        ]);
      } finally {
        warn.mockRestore();
      }
    });
  });

  it("redacts an invalid explicit value while using the Vercel fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      setOrigin({
        NEXT_PUBLIC_APP_URL: ":::SYNTHETIC_EXPLICIT\nSYNTHETIC_LINE",
        VERCEL_PROJECT_PRODUCTION_URL: "example.test",
      });
      expect(siteOrigin()).toBe(ORIGIN);
      expect(warn.mock.calls).toEqual([
        ["[seo] NEXT_PUBLIC_APP_URL: invalid_absolute_url; ignoring it."],
      ]);
    } finally {
      warn.mockRestore();
    }
  });

  it("does not warn about an invalid Vercel value when the explicit origin wins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      setOrigin({
        NEXT_PUBLIC_APP_URL: ORIGIN,
        VERCEL_PROJECT_PRODUCTION_URL: ":::SYNTHETIC_UNUSED",
      });
      expect(siteOrigin()).toBe(ORIGIN);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("reports a configured origin when one is set", () => {
    expect(hasConfiguredOrigin()).toBe(true);
  });

  it("builds locale paths with the locale always present", () => {
    expect(localePath("th")).toBe("/th");
    expect(localePath("en")).toBe("/en");
    expect(localePath("th", "/qr/promptpay")).toBe("/th/qr/promptpay");
    // Accepts a path with or without a leading slash.
    expect(localePath("en", "qr/url")).toBe("/en/qr/url");
  });
});

describe("language alternates", () => {
  it("covers both locales plus x-default", () => {
    expect(languageAlternates("/qr/wifi")).toEqual({
      th: `${ORIGIN}/th/qr/wifi`,
      en: `${ORIGIN}/en/qr/wifi`,
      "x-default": `${ORIGIN}/th/qr/wifi`,
    });
  });

  it("points x-default at Thai, matching the / -> /th redirect", () => {
    const alternates = languageAlternates();
    expect(alternates["x-default"]).toBe(alternates.th);
  });
});

describe("buildPageMetadata", () => {
  it("sets a self-referencing canonical for each locale", () => {
    for (const locale of locales) {
      const metadata = buildPageMetadata({
        locale,
        path: "/qr/url",
        title: "T",
        description: "D",
      });
      expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/${locale}/qr/url`);
    }
  });

  it("includes itself in its own hreflang set", () => {
    const metadata = buildPageMetadata({ locale: "en", path: "/qr/url", title: "T", description: "D" });
    const languages = metadata.alternates?.languages as Record<string, string>;
    expect(languages.en).toBe(metadata.alternates?.canonical);
  });

  it("derives metadataBase from the environment", () => {
    const metadata = buildPageMetadata({ locale: "th", title: "T", description: "D" });
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect((metadata.metadataBase as URL).origin).toBe(ORIGIN);
  });

  it("omits the brand by default so the layout title template can add it", () => {
    const metadata = buildPageMetadata({ locale: "th", title: "T", description: "D" });
    expect(metadata.title).toBe("T");
  });

  it("brands the title absolutely when asked, for pages the template cannot reach", () => {
    const metadata = buildPageMetadata({
      locale: "th",
      title: "T",
      description: "D",
      appendBrandToTitle: true,
    });
    // `absolute` rather than a plain string: a plain string would stack on any
    // inherited template and double the brand.
    expect(metadata.title).toEqual({ absolute: "T · Nexora QR" });
  });

  it("keeps the brand out of the social titles in both modes", () => {
    for (const appendBrandToTitle of [false, true]) {
      const metadata = buildPageMetadata({
        locale: "th",
        title: "T",
        description: "D",
        appendBrandToTitle,
      });
      // og:site_name already carries the brand; branding the OG title too
      // renders doubled on a share card.
      expect(metadata.openGraph?.title).toBe("T");
      expect(metadata.twitter?.title).toBe("T");
      expect(metadata.openGraph?.siteName).toBe("Nexora QR");
    }
  });
});

describe("buildTypeMetadata", () => {
  it.each(locales)("produces canonical and alternates per type in %s", (locale) => {
    for (const entry of qrTypeSeoList) {
      const metadata = buildTypeMetadata(entry.type, locale);
      const content = entry.content[locale];

      expect(metadata.title).toBe(content.title);
      expect(metadata.description).toBe(content.description);
      expect(metadata.alternates?.canonical).toBe(
        `${ORIGIN}/${locale}/qr/${entry.slug}`,
      );

      const languages = metadata.alternates?.languages as Record<string, string>;
      expect(languages.th).toBe(`${ORIGIN}/th/qr/${entry.slug}`);
      expect(languages.en).toBe(`${ORIGIN}/en/qr/${entry.slug}`);
      expect(languages["x-default"]).toBe(`${ORIGIN}/th/qr/${entry.slug}`);
    }
  });

  it("never emits a hardcoded production domain", () => {
    const serialized = JSON.stringify(
      locales.flatMap((locale) => qrTypeSeoList.map((e) => buildTypeMetadata(e.type, locale))),
    );
    expect(serialized).not.toMatch(/nexoraqr|nxq\.to|localhost/);
  });
});

describe("buildHomeMetadata", () => {
  it.each(locales)("canonicalizes /%s", (locale) => {
    const metadata = buildHomeMetadata(locale);
    expect(metadata.alternates?.canonical).toBe(`${ORIGIN}/${locale}`);
  });

  /**
   * The regression this guards: `title.template` does not apply to the page of
   * the segment that defines it, so the home page — which sits at `[locale]`,
   * the same segment as the layout holding the template — rendered with no
   * brand at all while all twenty type pages carried one.
   */
  it.each(locales)("brands its own title in %s, since the template skips it", (locale) => {
    const metadata = buildHomeMetadata(locale);
    const expected = `${homeSeo[locale].title} · Nexora QR`;
    expect(metadata.title).toEqual({ absolute: expected });
  });

  it.each(locales)("uses the same suffix shape as the type pages in %s", (locale) => {
    const home = buildHomeMetadata(locale);
    const typePage = buildTypeMetadata("promptpay", locale);

    const homeTitle = (home.title as { absolute: string }).absolute;
    // The type page's title is bare here and gains ` · Nexora QR` from the
    // layout template at render time; both therefore end the same way.
    expect(homeTitle.endsWith(" · Nexora QR")).toBe(true);
    expect(typePage.title).toBe(qrTypeSeo.promptpay.content[locale].title);
  });

  it.each(locales)("never doubles the brand in %s", (locale) => {
    const metadata = buildHomeMetadata(locale);
    const title = (metadata.title as { absolute: string }).absolute;
    expect(title.match(/Nexora QR/g)).toHaveLength(1);
    expect(homeSeo[locale].title).not.toMatch(/Nexora QR/);
  });
});

describe("SoftwareApplication JSON-LD", () => {
  it.each(locales)("describes the generator in %s", (locale) => {
    const node = buildSoftwareApplicationJsonLd({ locale, type: "promptpay" });
    expect(node["@type"]).toBe("SoftwareApplication");
    expect(node.url).toBe(`${ORIGIN}/${locale}/qr/promptpay`);
    // The name must be what the page's own <h1> says.
    expect(node.name).toBe(qrTypeSeo.promptpay.content[locale].h1);
    expect(node.isAccessibleForFree).toBe(true);
    expect(node.offers).toMatchObject({ price: "0", priceCurrency: "THB" });
  });

  it("works without a type, for the home generator", () => {
    const node = buildSoftwareApplicationJsonLd({ locale: "th" });
    expect(node.url).toBe(`${ORIGIN}/th`);
  });
});

describe("FAQPage JSON-LD", () => {
  it("returns null rather than an empty FAQPage", () => {
    expect(buildFaqPageJsonLd([])).toBeNull();
  });

  it("is emitted only for types that actually have questions", () => {
    for (const entry of qrTypeSeoList) {
      const node = buildFaqPageJsonLd(entry.content.th.faqs);
      if (entry.content.th.faqs.length === 0) {
        expect(node).toBeNull();
      } else {
        expect(node?.["@type"]).toBe("FAQPage");
        expect((node?.mainEntity as unknown[]).length).toBe(entry.content.th.faqs.length);
      }
    }
  });

  it("mirrors the visible copy exactly", () => {
    const faqs = qrTypeSeo.wifi.content.th.faqs;
    const node = buildFaqPageJsonLd(faqs);
    const questions = (node?.mainEntity as { name: string }[]).map((q) => q.name);
    expect(questions).toEqual(faqs.map((faq) => faq.question));
  });
});

describe("breadcrumbs", () => {
  it("goes home then type", () => {
    const node = buildBreadcrumbJsonLd("wifi", "th");
    const items = node.itemListElement as { position: number; item: string }[];
    expect(items).toHaveLength(2);
    expect(items[0].item).toBe(`${ORIGIN}/th`);
    expect(items[1].item).toBe(`${ORIGIN}/th/qr/wifi`);
  });
});

describe("JSON-LD serialization", () => {
  it("escapes < so copy can never close the script tag", () => {
    const html = serializeJsonLd({ "@type": "Thing", name: "</script><img>" });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");
  });

  it("produces spreadable script props", () => {
    const props = jsonLdScriptProps({ "@type": "Thing" });
    expect(props.type).toBe("application/ld+json");
    expect(JSON.parse(props.dangerouslySetInnerHTML.__html)).toEqual({ "@type": "Thing" });
  });

  it("round-trips every type's structured data", () => {
    for (const locale of locales) {
      for (const entry of qrTypeSeoList) {
        const type: QrContentType = entry.type;
        const app = buildSoftwareApplicationJsonLd({ locale, type });
        expect(() => JSON.parse(serializeJsonLd(app))).not.toThrow();
      }
    }
  });
});
