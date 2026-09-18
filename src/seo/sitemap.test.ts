import { afterEach, beforeEach, describe, expect, it } from "vitest";

import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { locales } from "@/i18n/config";
import { qrTypeSeoList } from "@/seo/content";

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

describe("sitemap", () => {
  it("emits 2 locales x (home + 10 types) = 22 URLs", () => {
    expect(sitemap()).toHaveLength(22);
  });

  it("emits exactly the expected URL set", () => {
    const expected = new Set<string>();
    for (const locale of locales) {
      expected.add(`${ORIGIN}/${locale}`);
      for (const entry of qrTypeSeoList) {
        expected.add(`${ORIGIN}/${locale}/qr/${entry.slug}`);
      }
    }

    const actual = sitemap().map((entry) => entry.url);
    expect(new Set(actual)).toEqual(expected);
    // No duplicates — a duplicated <loc> is a crawl-budget bug.
    expect(actual).toHaveLength(new Set(actual).size);
  });

  it("gives every URL a complete, self-referencing hreflang set", () => {
    for (const entry of sitemap()) {
      const languages = entry.alternates?.languages as Record<string, string> | undefined;
      expect(languages, entry.url).toBeDefined();
      expect(Object.keys(languages!).sort()).toEqual(["en", "th", "x-default"]);
      // The URL must appear in its own alternate set.
      expect(Object.values(languages!)).toContain(entry.url);
      // x-default tracks Thai, matching the / -> /th redirect.
      expect(languages!["x-default"]).toBe(languages!.th);
    }
  });

  it("pairs each Thai URL with its English counterpart", () => {
    for (const entry of sitemap()) {
      const languages = entry.alternates?.languages as Record<string, string>;
      expect(languages.en).toBe(languages.th.replace(`${ORIGIN}/th`, `${ORIGIN}/en`));
    }
  });

  it("derives every URL from NEXT_PUBLIC_APP_URL", () => {
    setOrigin({ NEXT_PUBLIC_APP_URL: "https://another.test" });
    for (const entry of sitemap()) {
      expect(entry.url.startsWith("https://another.test/")).toBe(true);
    }
  });

  it("ranks the two home pages highest and promptpay above its siblings", () => {
    const entries = sitemap();
    const home = entries.filter((entry) => !entry.url.includes("/qr/"));
    expect(home).toHaveLength(2);
    for (const entry of home) expect(entry.priority).toBe(1);

    const promptpay = entries.filter((entry) => entry.url.endsWith("/qr/promptpay"));
    const others = entries.filter(
      (entry) => entry.url.includes("/qr/") && !entry.url.endsWith("/qr/promptpay"),
    );
    expect(promptpay).toHaveLength(2);
    for (const entry of promptpay) {
      for (const other of others) {
        expect(entry.priority!).toBeGreaterThan(other.priority!);
      }
    }
  });

  it("stamps a lastModified on every entry", () => {
    for (const entry of sitemap()) {
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe("robots", () => {
  it("allows every crawler everywhere", () => {
    const rules = robots().rules as { userAgent?: string; allow?: string; disallow?: string };
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toBe("/");
    expect(rules.disallow).toBeUndefined();
  });

  it("points at the sitemap with an absolute URL from the environment", () => {
    expect(robots().sitemap).toBe(`${ORIGIN}/sitemap.xml`);
    setOrigin({ NEXT_PUBLIC_APP_URL: "https://another.test" });
    expect(robots().sitemap).toBe("https://another.test/sitemap.xml");
  });

  it("never hardcodes a domain", () => {
    expect(JSON.stringify(robots())).not.toMatch(/nexoraqr|nxq\.to/);
  });
});
