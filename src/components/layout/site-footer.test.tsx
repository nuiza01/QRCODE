import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/config";

import { SiteFooter } from "./site-footer";
import { layoutStrings } from "./strings";

describe.each(locales)("SiteFooter (%s)", (locale) => {
  const s = layoutStrings[locale];

  it("retains the footer landmark, privacy note and copyright", () => {
    render(<SiteFooter locale={locale} />);

    const footer = screen.getByRole("contentinfo");
    expect(footer.tagName).toBe("FOOTER");
    expect(within(footer).getByText(s.privacyNote)).toBeVisible();
    expect(
      within(footer).getByText(`© ${new Date().getFullYear()} ${s.rightsReserved}`),
    ).toBeVisible();
  });

  it("links only to the available privacy and terms destinations", () => {
    render(<SiteFooter locale={locale} />);

    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: s.footerNavLabel });
    expect(within(nav).getByRole("link", { name: s.nav.privacy })).toHaveAttribute(
      "href",
      `/${locale}/privacy`,
    );
    expect(within(nav).getByRole("link", { name: s.nav.terms })).toHaveAttribute(
      "href",
      `/${locale}/terms`,
    );
    expect(within(nav).queryByText(s.nav.pricing)).not.toBeInTheDocument();
    expect(within(nav).queryByText(s.nav.docs)).not.toBeInTheDocument();
  });
});
