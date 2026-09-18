import assert from "node:assert/strict";
import test from "node:test";
import { verifyHtmlOrigin, verifySitemapOrigin, routePaths } from "./verify-origin-artifacts.mjs";

const origin = "https://origin-fixture.nqr-ci.com";
const html = `<link rel="canonical" href="${origin}/en/qr/url">
  <meta property="og:url" content="${origin}/en/qr/url">
  <link rel="alternate" hreflang="th" href="${origin}/th/qr/url">
  <link rel="alternate" hreflang="en" href="${origin}/en/qr/url">
  <link rel="alternate" hreflang="x-default" href="${origin}/th/qr/url">
  <script type="application/ld+json">${JSON.stringify({ "@type": "SoftwareApplication", url: `${origin}/en/qr/url`, publisher: { url: `${origin}/en` } })}</script>
  <script type="application/ld+json">${JSON.stringify({ "@type": "BreadcrumbList", itemListElement: [{ item: `${origin}/en` }, { item: `${origin}/en/qr/url` }] })}</script>`;
test("HTML artifact checks origin and language counterparts", () => {
  verifyHtmlOrigin(html, origin, "/en/qr/url");
  assert.throws(() => verifyHtmlOrigin(html.replaceAll(origin, "http://localhost:3000"), origin, "/en/qr/url"));
  assert.throws(() => verifyHtmlOrigin(html.replace('hreflang="en"', 'hreflang="de"'), origin, "/en/qr/url"));
  assert.throws(() => verifyHtmlOrigin(html.replace('"publisher":{"url"', '"publisher":{"missing"'), origin, "/en/qr/url"));
});
test("home metadata without JSON-LD remains valid per existing baseline", () => {
  const homeHtml = html.replaceAll("/qr/url", "").replace(/<script[\s\S]*?<\/script>/g, "");
  verifyHtmlOrigin(homeHtml, origin, "/en");
});
test("sitemap checks exact URLs and alternate sets, not just host substrings", () => {
  const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${routePaths.map((route) =>
    `<url><loc>${origin}${route}</loc>${["th", "en", "x-default"].map((lang) =>
      `<xhtml:link rel="alternate" hreflang="${lang}" href="${origin}/${lang === "x-default" ? "th" : lang}${route.slice(3)}"/>`).join("")}</url>`).join("")}</urlset>`;
  verifySitemapOrigin(xml, origin);
  assert.throws(() => verifySitemapOrigin(xml.replaceAll(origin, "http://localhost:3000"), origin));
  assert.throws(() => verifySitemapOrigin(xml.replace('<loc>', '<wrong>'), origin));
});
