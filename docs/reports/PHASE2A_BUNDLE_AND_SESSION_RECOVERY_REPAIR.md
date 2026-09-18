# Phase 2A bundle and session-recovery source repair

Date: 2026-09-04 (Asia/Bangkok)
Disposition: **CANDIDATE READY FOR INDEPENDENT REVIEW — NOT BUILT / NOT DEPLOYABLE**

## Outcome

The Product Owner authorized a bounded source-and-test repair for the two
findings that rejected BUILD_ID `Gg64LFGQcClo_70kqyHFi`. This candidate:

1. removes production static imports of the `@/qr/render` barrel from the
   generator shell, loads preview/Test Scan through top-level `next/dynamic`,
   and loads exporters only from a download event;
2. adds a release-build gate that enumerates all 22 frozen public route HTML
   entrypoints, reads every referenced initial Next chunk, and fails if any
   pinned QR renderer/vendor or PDF marker is present;
3. removes the non-writable public `code` property from server-side
   `SessionAdapterFailure` while retaining its private WeakMap category;
4. bounds Better Auth route and authoritative session operations at five
   seconds, contains synchronous/async/late failures without preserving raw
   values, and returns a fixed no-store 503 from the auth route;
5. adds finite MariaDB connection acquisition controls: five-second connect
   timeout, ten-request queue limit and explicit waiting behavior.

This is a source candidate only. It does not claim that the initial bundle or
built-runtime recovery finding is closed: both require a fresh immutable build
and independent built-artifact/MariaDB runtime review under separate authority.

## Frozen identity

The 21 candidate code/test/script files have path-sorted compact JSON
`[{after,path}]` digest:

`95d1f708af89698d4e1a12de092994229f1f2680fec30d80fbe3c271eb10c555`

Immediately before this report/control-document update, the canonical source
manifest used by NQR-071's method (excluding VCS, dependencies, `.next*`,
reports, secret environment files, `next-env.d.ts`, TypeScript build state and
platform metadata) contained 190 paths with path-sorted `[{hash,path}]` digest:

`1a6d44bedc8fe53c53e4da98646b208b45f52195aa4004cd29cee69cf8a1c8e5`

Package/schema guards remained unchanged:

- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`;
- `package-lock.json`: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`;
- `src/db/schema.ts`: `733674eebec9b3eb4571802015f671aad273aeb46414201fe50cc128be535b6a`.

The six new source/test paths are:

- `src/qr/render/export-options.ts`;
- `scripts/verify-initial-bundle-boundary.mjs`;
- `scripts/verify-initial-bundle-boundary.test.mjs`;
- `src/lib/auth-operation.ts`;
- `src/lib/auth-operation.test.ts`;
- `src/app/api/auth/[...all]/route.test.ts`.

The remaining files in the digest are narrow import, gate wiring, auth route,
session adapter, pool configuration and regression-test adjustments. No
dependency, schema, migration, QR payload, logo policy, quota or production
configuration changed.

## Bundle repair and gate

`Generator`, `DownloadBar`, `TestScanDialog` and `QualityPanel` no longer have
a static production import from the renderer barrel. Constants and types needed
by the initial shell come from small direct modules. `QrPreview` and
`TestScanCard` use literal top-level `dynamic()` imports, while PNG/SVG/PDF
renderers are imported inside the already guarded click operation.

The build script now invokes `verifyInitialBundleBoundary()` after every
successful Next build. The verifier reads all 22 route HTML files, requires at
least one initial script per route, deduplicates and reads every referenced
chunk, and rejects `qr-code-styling`, `updateVendorMatrix`, `getModuleCount`,
`svg2pdf` or `jsPDF` in any initial chunk. Its synthetic test places a marker
only in the last route's extra script to prove that no route or initial script
is sampled away.

As a negative control, the gate was run against the existing rejected local
artifact. It rejected
`/_next/static/chunks/2vu7agsgxk1gr.js` for the pinned
`qr-code-styling` marker, reproducing the independent finding. No build was run.

## Session recovery repair

The earlier built-runtime root cause was not proven. The candidate therefore
does not describe the public `code` collision as established causality. It
removes that hazardous server-side shape because the classification already
lives in a private WeakMap and framework error machinery may annotate an Error.
Regression coverage proves that a diagnostic `code` can be added without a
throw while the private fixed category remains unchanged.

`withAuthOperationDeadline()` replaces unknown rejection objects with a new,
fixed, extensible Error with no `cause`, does not inspect the rejected value,
settles non-cooperative operations after five seconds and attaches a rejection
continuation that absorbs late failure. The auth route contains both
synchronous and asynchronous failures and returns only
`authentication_unavailable` with `Cache-Control: no-store`. Consecutive
failure/recovery tests prove that a failed call does not poison the next call.
Protected request session reads use the same deadline; their existing API and
dashboard boundaries continue to fail closed.

## Verification actually run

- focused regression: 271/271 PASS, then final changed focus 246/246 PASS;
- full Vitest: 1000/1000 PASS across 43 files;
- script tests: 122/122 PASS, including the new all-route bundle gate tests;
- `next typegen && tsc --noEmit`: PASS;
- ESLint: PASS;
- `git diff --check`: PASS;
- production source audit: only three dynamic `import("@/qr/render")` calls,
  with zero static production imports of that barrel;
- rejected-artifact analyzer negative control: EXPECTED REJECT.

## Explicit limits and next gate

No fresh build, MariaDB process/database/user, local Next server, browser,
network, Plesk, DNS, OAuth, deployment, production data or production mutation
was used. Production remains on rollback BUILD_ID
`m1fxDjFEQxdLlI91m1Czx`, and rejected BUILD_ID
`Gg64LFGQcClo_70kqyHFi` remains prohibited.

Next, an independent TL/Security review should freeze and review this exact
21-file candidate. Only after that scoped pass should the Product Owner decide
whether to authorize a fresh real-origin build plus disposable MariaDB/built
runtime recovery test. Deployment remains a still-later, separate decision.
