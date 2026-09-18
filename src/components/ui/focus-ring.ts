/**
 * The single focus indicator for the whole product.
 *
 * One shared constant rather than a copy in each component, because a focus
 * ring that drifts between components is the fastest way to end up with a
 * control nobody can see when they tab to it. `globals.css` also sets a
 * `:focus-visible` outline as a safety net for anything not built here.
 *
 * `outline` rather than `ring`: outline is painted outside the border box and
 * is never clipped by `overflow-hidden` ancestors, and it survives Windows
 * high-contrast mode, where box-shadow-based rings vanish entirely.
 */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** For controls sitting flush inside a container, where an offset ring would clip. */
export const focusRingInset =
  "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring";
