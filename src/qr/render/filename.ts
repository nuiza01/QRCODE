/**
 * Download filenames.
 *
 * Optional labels are explicitly chosen by callers, never derived from QR
 * payloads by default. They are untrusted: a slash turns into a path, a leading
 * dot hides the file, `CON` is undeletable on Windows, and a right-to-left
 * override can make `qr-gnp.exe` render as `qr-exe.png`. Everything below
 * exists to stop a filename from being anything other than a filename.
 * Sanitization is not anonymization; explicit labels can still be sensitive.
 */
import type { QrContentType } from "@/qr/types";

const PREFIX = "nexora-qr";

/**
 * Characters we keep: ASCII letters and digits, Latin letters with diacritics,
 * and the Thai block. Both product locales survive a round trip; everything
 * else — separators, quotes, emoji, control and bidi characters — collapses to
 * a dash rather than being decided case by case.
 */
const DISALLOWED = /[^a-zA-Z0-9\u00C0-\u024F\u0E00-\u0E7F]+/g;

/**
 * Windows refuses these as a basename, with or without an extension, and has
 * since DOS. A contact named "Aux" would otherwise produce a file the user
 * cannot save.
 */
const RESERVED_BASENAMES =
  /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

const DEFAULT_MAX_PART_LENGTH = 40;

/**
 * Reduces one user-supplied fragment to a safe, readable slug. Returns an empty
 * string when nothing usable survives, which callers treat as "omit this part"
 * rather than substituting a placeholder.
 */
export function sanitizeFilenamePart(
  value: string,
  maxLength: number = DEFAULT_MAX_PART_LENGTH,
): string {
  const slug = value
    // Compose accents first, so "é" is one kept character rather than an "e"
    // followed by a combining mark that would be stripped to a dash.
    .normalize("NFC")
    .replace(DISALLOWED, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, Math.max(1, maxLength))
    // Slicing can leave a trailing dash behind; trim again rather than before.
    .replace(/-+$/g, "")
    .toLowerCase();

  // The Thai block also contains punctuation and combining marks. Keep them
  // in readable labels, but omit fragments with no letter or number at all.
  if (!/[\p{L}\p{N}]/u.test(slug)) return "";

  return RESERVED_BASENAMES.test(slug) ? `${slug}-qr` : slug;
}

export type QrFileExtension = "png" | "svg" | "pdf";

export interface QrFilenameInput {
  contentType: QrContentType;
  /** Explicit caller-chosen label; sanitised here, never inferred from payload data. */
  label?: string;
  /** Distinguishes exports of the same code: `1024` for a PNG, `50mm` for a PDF. */
  variant?: string | number;
  extension: QrFileExtension;
}

/**
 * `nexora-qr-wifi-cafe-guest-1024.png`. Parts that sanitise away are dropped,
 * so the worst case is the still-meaningful `nexora-qr-wifi.png` rather than a
 * filename with an empty segment in the middle.
 */
export function qrFilename(input: QrFilenameInput): string {
  const parts = [PREFIX, input.contentType];

  const label = input.label ? sanitizeFilenamePart(input.label) : "";
  if (label) parts.push(label);

  const variant = input.variant === undefined ? "" : sanitizeFilenamePart(String(input.variant));
  if (variant) parts.push(variant);

  return `${parts.join("-")}.${input.extension}`;
}
