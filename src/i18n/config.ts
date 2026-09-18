/**
 * Locale contract.
 *
 * Deliberately dependency-free. The pattern is "colocated bundles": every
 * module that renders copy exports its own `Bundle` next to itself
 * (`strings.ts`) instead of everyone editing one giant dictionary file. That
 * keeps translations next to the code that uses them, and keeps two people
 * working on different features out of each other's way.
 */
export const locales = ["th", "en"] as const;

export type Locale = (typeof locales)[number];

/** Thai first — this product is aimed at the Thai market before anywhere else. */
export const defaultLocale: Locale = "th";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** One value per locale. Both locales are required, so a missing translation is a type error. */
export type Bundle<T> = Record<Locale, T>;

export function t<T>(bundle: Bundle<T>, locale: Locale): T {
  return bundle[locale];
}

/** `lang` attribute / `Intl` tag for a locale. */
export const htmlLang: Bundle<string> = { th: "th-TH", en: "en-US" };
