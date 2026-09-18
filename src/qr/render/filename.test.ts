import { describe, expect, it } from "vitest";
import { qrFilename, sanitizeFilenamePart } from "@/qr/render/filename";

describe("sanitizeFilenamePart", () => {
  it("slugifies ordinary text", () => {
    expect(sanitizeFilenamePart("Cafe Guest WiFi")).toBe("cafe-guest-wifi");
  });

  it("cannot produce a path", () => {
    expect(sanitizeFilenamePart("../../etc/passwd")).toBe("etc-passwd");
    expect(sanitizeFilenamePart("C:\\Windows\\System32")).toBe("c-windows-system32");
    expect(sanitizeFilenamePart("/absolute/path")).toBe("absolute-path");
  });

  it("cannot produce a hidden or extension-shadowing file", () => {
    expect(sanitizeFilenamePart(".bashrc")).toBe("bashrc");
    expect(sanitizeFilenamePart("invoice.pdf.exe")).toBe("invoice-pdf-exe");
  });

  it("strips characters Windows refuses in a filename", () => {
    expect(sanitizeFilenamePart('a<b>c:d"e|f?g*h')).toBe("a-b-c-d-e-f-g-h");
  });

  it("escapes Windows reserved device names", () => {
    // "CON" and friends are unusable as basenames on Windows, extension or not.
    expect(sanitizeFilenamePart("CON")).toBe("con-qr");
    expect(sanitizeFilenamePart("lpt1")).toBe("lpt1-qr");
    expect(sanitizeFilenamePart("console")).toBe("console");
  });

  it("drops control characters and bidi overrides", () => {
    // U+202E flips the rendering of what follows, so "qr\u202Egnp.exe" displays
    // as "qr exe.png" in a file manager. It never reaches the filename.
    expect(sanitizeFilenamePart("qr\u202Egnp.exe")).toBe("qr-gnp-exe");
    expect(sanitizeFilenamePart("bad\u0000name\u0007")).toBe("bad-name");
  });

  it("keeps Thai, which is a first-class locale here", () => {
    expect(sanitizeFilenamePart("ร้านกาแฟ")).toBe("ร้านกาแฟ");
    expect(sanitizeFilenamePart("ไวไฟ ร้าน")).toBe("ไวไฟ-ร้าน");
  });

  it("keeps accented Latin as one character after composing", () => {
    expect(sanitizeFilenamePart("Café Renée")).toBe("café-renée");
    // Decomposed input composes first, so the combining marks are not stripped.
    expect(sanitizeFilenamePart("Cafe\u0301")).toBe("café");
  });

  it("replaces everything else, emoji included", () => {
    expect(sanitizeFilenamePart("☕ Coffee ☕")).toBe("coffee");
  });

  it("truncates without leaving a trailing dash", () => {
    const slug = sanitizeFilenamePart(`${"a".repeat(39)} tail`);
    expect(slug).toHaveLength(39);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string when nothing usable survives", () => {
    expect(sanitizeFilenamePart("!!!")).toBe("");
    expect(sanitizeFilenamePart("   ")).toBe("");
  });

  it("omits Thai punctuation or combining marks without dropping meaningful Thai labels", () => {
    expect(sanitizeFilenamePart("๏๚๛")).toBe("");
    expect(sanitizeFilenamePart("ั่")).toBe("");
    expect(sanitizeFilenamePart("ร้าน๚กาแฟ")).toBe("ร้าน๚กาแฟ");
    expect(sanitizeFilenamePart("๑๒๓")).toBe("๑๒๓");
  });
});

describe("qrFilename", () => {
  it("builds the documented shape", () => {
    expect(qrFilename({ contentType: "wifi", variant: 1024, extension: "png" })).toBe(
      "nexora-qr-wifi-1024.png",
    );
  });

  it("folds in a label", () => {
    expect(
      qrFilename({ contentType: "wifi", label: "Cafe Guest", variant: 1024, extension: "png" }),
    ).toBe("nexora-qr-wifi-cafe-guest-1024.png");
  });

  it("drops parts that sanitise away rather than leaving a gap", () => {
    expect(qrFilename({ contentType: "vcard", label: "☕", extension: "svg" })).toBe(
      "nexora-qr-vcard.svg",
    );
  });

  it("survives a hostile label", () => {
    const name = qrFilename({
      contentType: "wifi",
      label: '../../../etc/passwd\u0000<script>',
      variant: 2048,
      extension: "png",
    });
    expect(name).toBe("nexora-qr-wifi-etc-passwd-script-2048.png");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("\u0000");
    expect(name.split(".")).toHaveLength(2);
  });

  it("labels a PDF by its print width", () => {
    expect(qrFilename({ contentType: "promptpay", variant: "50mm", extension: "pdf" })).toBe(
      "nexora-qr-promptpay-50mm.pdf",
    );
  });
});
