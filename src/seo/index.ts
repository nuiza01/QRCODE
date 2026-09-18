/**
 * Public surface of the SEO layer. Other roles import from `@/seo`.
 */
export type {
  QrTypeSeo,
  SeoContent,
  SeoFaq,
  SeoSection,
  SeoStep,
} from "@/seo/types";

export {
  homeSeo,
  isQrTypeSlug,
  qrTypeBySlug,
  qrTypeOrder,
  qrTypeSeo,
  qrTypeSeoList,
} from "@/seo/content";

export {
  buildHomeMetadata,
  buildPageMetadata,
  buildTypeMetadata,
  type PageMetadataInput,
} from "@/seo/metadata";

export {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildSoftwareApplicationJsonLd,
  jsonLdScriptProps,
  serializeJsonLd,
  type JsonLd,
} from "@/seo/jsonld";

export {
  hasConfiguredOrigin,
  languageAlternates,
  localePath,
  localeUrl,
  siteOrigin,
  siteOriginUrl,
} from "@/seo/site";
