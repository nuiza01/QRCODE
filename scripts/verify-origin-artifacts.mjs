import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JSDOM } from "jsdom";

// Frozen Phase 1 route contract, not discovered from possibly incomplete output.
export const typeSlugs = ["url", "text", "wifi", "vcard", "email", "sms", "tel", "geo", "event", "promptpay"];
export const locales = ["th", "en"];
export const routePaths = locales.flatMap((locale) => ["", ...typeSlugs.map((type) => `/qr/${type}`)]
  .map((suffix) => `/${locale}${suffix}`));

export function verifyHtmlOrigin(html, origin, route) {
  const { window } = new JSDOM(html); // No resource fetching or script execution.
  try {
    const doc = window.document;
    const locale = route.split("/")[1];
    const suffix = route.slice(locale.length + 1);
    const attr = (selector, name) => {
      const nodes = doc.querySelectorAll(selector);
      assert.equal(nodes.length, 1, `${route}: expected one ${selector}`);
      return nodes[0].getAttribute(name);
    };
    assert.equal(attr('link[rel="canonical"]', "href"), origin + route, `${route}: canonical`);
    assert.equal(attr('meta[property="og:url"]', "content"), origin + route, `${route}: Open Graph`);
    assert.equal(doc.querySelectorAll('link[rel="alternate"][hreflang]').length, 3, `${route}: hreflang count`);
    for (const language of [...locales, "x-default"]) {
      assert.equal(attr(`link[rel="alternate"][hreflang="${language}"]`, "href"),
        `${origin}/${language === "x-default" ? "th" : language}${suffix}`, `${route}: ${language}`);
    }
    const nodes = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent));
    const app = nodes.find((node) => node["@type"] === "SoftwareApplication");
    // Baseline home pages have no JSON-LD. The frozen contract requires it on
    // type landings; if home gains one, validate its origin too, without adding it.
    if (suffix || app) {
      assert.equal(app?.url, origin + route, `${route}: SoftwareApplication URL`);
      assert.equal(app?.publisher?.url, `${origin}/${locale}`, `${route}: publisher URL`);
    }
    if (suffix) {
      const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
      assert.deepEqual(breadcrumb?.itemListElement?.map((item) => item.item),
        [`${origin}/${locale}`, origin + route], `${route}: breadcrumb URLs`);
    }
  } finally { window.close(); }
}

export function verifySitemapOrigin(xml, origin) {
  const { window } = new JSDOM(xml, { contentType: "text/xml" });
  try {
    const entries = [...window.document.getElementsByTagName("url")];
    assert.deepEqual(entries.map((entry) => entry.getElementsByTagName("loc")[0]?.textContent).sort(),
      routePaths.map((route) => origin + route).sort(), "sitemap: exactly 22 expected URLs");
    for (const entry of entries) {
      const path = new URL(entry.getElementsByTagName("loc")[0].textContent).pathname;
      const suffix = path.slice(3);
      const links = [...entry.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "link")];
      assert.equal(links.length, 3, "sitemap: hreflang count");
      for (const language of [...locales, "x-default"]) {
        assert.equal(links.find((link) => link.getAttribute("hreflang") === language)?.getAttribute("href"),
          `${origin}/${language === "x-default" ? "th" : language}${suffix}`, "sitemap: hreflang URL");
      }
    }
  } finally { window.close(); }
}

export async function verifyOriginArtifacts(origin, buildDir = ".next") {
  const appDir = join(buildDir, "server/app");
  for (const route of routePaths) {
    verifyHtmlOrigin(await readFile(join(appDir, `${route.slice(1)}.html`), "utf8"), origin, route);
  }
  verifySitemapOrigin(await readFile(join(appDir, "sitemap.xml.body"), "utf8"), origin);
  const robots = await readFile(join(appDir, "robots.txt.body"), "utf8");
  assert.deepEqual(robots.split(/\r?\n/).filter((line) => /^sitemap:/i.test(line)),
    [`Sitemap: ${origin}/sitemap.xml`], "robots: sitemap origin");
  console.log("[origin-artifacts] PASS: 22 HTML pages, sitemap/hreflang and robots");
}
