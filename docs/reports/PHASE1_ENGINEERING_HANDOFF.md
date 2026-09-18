# Nexora QR Phase 1 — Engineering Handoff

Date: 2026-08-31 (Asia/Bangkok)  
Status: **SUPERSEDED by [PHASE1_ENGINEERING_HANDOFF_FINAL.md](PHASE1_ENGINEERING_HANDOFF_FINAL.md)**  
Launch status: **BLOCKED — use the final handoff for current evidence**

## 1. Delivered candidate

- Authoritative checkout: `/Users/sarawutjuntasang/Nexora/QRCODE`
- Historical baseline: `NQR-P1-6982907ed8d9c48124f2`
- Current assembled identity: **121 code/config/asset paths**
- Digest algorithm: `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`
- Current digest: `046153ef96d98e8fa71e062d33ea8c218a5f34483676b0054f1ad2611e2fdcd6`
- Current release-build artifact is synthetic-origin evidence only: build id `or5yQ30082f3WSG07VWPT`, artifact digest `26fc874f0ff9484211cd71c85dd2de8483ccc5ad0da9b0834d046aee47a29568`.
- No commit, tag, push, deploy, production change, paid service, real-domain contact or database migration was performed.

The Phase 1 static generator remains browser-only and covers URL, text, WiFi, vCard, email, SMS, telephone, geo, event and PromptPay in Thai and English. Phase 2/3 auth, dynamic QR, analytics, billing and short-domain work remain out of scope.

## 2. Engineering work completed

The reviewed/integrated hardening includes:

- UTF-8-safe QR rendering for Thai, emoji, combining characters and multilingual data without changing `result.data`.
- Conservative gradient/contrast safety and strict opaque hex color admission before preview/export vendor boundaries.
- Current validated-payload continuity, stale async result rejection and safe localized export failures.
- Generic privacy-preserving default filenames in UI and convenience export APIs.
- Removal of misleading footer placeholder destinations.
- Structured vCard/Event newline escaping and exact preservation of accepted nonblank WiFi passwords.
- Reusable renderer fail-closed state after failed or superseded updates.
- Fixed private renderer failure codes with bounded pinned-vendor capacity classification.
- Generator-owned render revision/pending state; only exact-current confirmed capacity failures block Test Scan and PNG/SVG/PDF, with safe Thai/English recovery guidance.
- Production origin gate, offline migration drift check, CI/runtime requirements, artifact verification and release-build scripts.

### Changed source/config areas relative to the Phase 1 baseline

- Generator/UI: `DownloadBar.tsx`, `Generator.tsx`, `Generator.test.tsx`, `QualityPanel.tsx`, `payload.ts`, `qualityMessages.ts`, `strings.ts`.
- Footer: `site-footer.tsx` and `site-footer.test.tsx`.
- Payload/quality: `encode.ts`, `encode.test.ts`, `quality.ts`, `quality.test.ts`.
- Renderer: `QrPreview.tsx`, `colors.ts`, `engine.ts`, `errors.ts`, `export.ts`, `filename.ts`, `index.ts`, `options.ts` and focused Unicode/security/failure/status/filename tests.
- SEO/origin: `src/seo/site.ts`, `src/seo/metadata.test.ts`, `next.config.ts`, `.env.example` and `README.md`.
- Release/CI: `package.json`, `package-lock.json`, `.github/workflows/ci.yml` and seven `scripts/*.mjs` implementation/test files.

Exact hashes and per-delta preimages are recorded in the integration and independent-review reports linked in §7.

## 3. Verification actually completed

| Gate | Result on the assembled candidate |
|---|---|
| PM integrated source tests | 824/824 application + 119/119 script tests PASS |
| Typecheck / lint / diff check | PASS |
| QA cross-layer tests | 513/513 PASS |
| QA independent offline review | SCOPED PASS; no actionable defect |
| Real pinned encoder/matrix probes | Numeric, alphanumeric, ASCII, Thai, emoji and combining data across L/M/Q/H boundaries PASS |
| Capacity/recovery component probes | Exact-current block, pending/stale/superseded/unmount recovery and all export formats PASS with documented inert IO |
| No-env build | 27/27 static pages PASS |
| Synthetic explicit-origin release build | 27/27 static pages PASS |
| Origin/artifact verifier | 22 generator-bearing routes, sitemap/hreflang and robots PASS |
| Production missing-origin negative gate | Rejected as expected |
| Bundle boundary | QR/PDF dynamic targets absent from all 22 initial script sets |

Bundle inspection measured the common initial script set at 280,171 gzip-comparison bytes excluding the `nomodule` polyfill. The QR preview chunk was 20,637 bytes and the PDF-only immediate increment was 159,047 bytes by local gzip comparison. No performance budget was approved, so these are measurements rather than a performance signoff.

## 4. Reproduction and release preparation

From the authoritative checkout with the recorded Node/npm engines and lockfile:

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Production-like admission must use an explicit HTTPS origin. The synthetic fixture used for evidence was:

```sh
NEXT_PUBLIC_APP_URL=https://origin-fixture.nqr-ci.com npm run build:release
```

Do not deploy that synthetic-origin artifact. After the Product Owner selects the real domain, an authorized operator must set `NEXT_PUBLIC_APP_URL` in the approved production environment, rebuild, rerun `npm run release:validate`, and verify the generated canonical/hreflang/sitemap/robots output.

The checkout is intentionally uncommitted under the current authorization. Before deployment, authorize and create an immutable reviewed revision or release archive. Rollback must redeploy the last known-good immutable revision/artifact; do not treat the current dirty working tree or `/private/tmp` snapshots as a production rollback mechanism.

## 5. Remaining gates and known risks

These items prevent a launch-ready claim but do not invalidate the conditional engineering handoff:

1. **Browser/runtime QA:** the existing localhost security denial prevented real browser paint, responsive, keyboard, screen-reader, network and download checks. It was not bypassed.
2. **Actual artifacts and scanners:** real PNG/SVG/PDF serialization, saved-file inspection/decode, OS filenames, camera/scanner/ECI interoperability and physical print remain unverified.
3. **Logo security policy:** SEC-001 MEDIUM and SEC-003 LOW remain open for arbitrary uploaded SVG external-resource/PDF-annotation reachability and malformed/oversize logo recovery. Recommended product choice: accept a documented passive SVG subset and locally rasterize only the logo while keeping the QR vector. Strict passive-vector sanitization is the alternative; unrestricted resource-dependent SVG cannot be claimed both fully faithful and no-network-safe.
4. **Network/privacy runtime evidence:** source and offline boundaries pass, but a real browser network capture with synthetic payloads/logo is still required before closing privacy/security signoff.
5. **Production domain:** no real domain has been selected or configured; DNS/TLS/redirect/effective environment are unverified.
6. **PromptPay UAT:** the Product Owner must test a real linked account with at least three Thai bank apps, verify displayed payee and amount, then cancel before transfer. Repository tests cannot replace this.
7. **Release authority:** commit/tag/archive, deploy, production access and any external change require separate approval.

## 6. Acceptance choices and communication

The **Project Manager in this task is the only team member who needs to speak with the Product Owner**. Specialists report to PM; the user does not need to relay messages between them.

The Product Owner may now:

- accept this conditional engineering handoff while keeping launch blocked by §5;
- request revisions; or
- authorize the next runtime QA step and choose the logo policy described in §5.3.

Acceptance of this handoff does not authorize deployment. Deployment and production-domain configuration remain separate actions.

## 7. Primary evidence

- [Engineering loop](../ENGINEERING_LOOP.md)
- [Product acceptance checklist](PRODUCT_ACCEPTANCE.md)
- [Capacity foundation integration](PM_CAPACITY_FOUNDATION_INTEGRATION.md)
- [Capacity eligibility integration](PM_CAPACITY_ELIGIBILITY_INTEGRATION.md)
- QA: `/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/ASSEMBLED_CAPACITY_QA.md`
- DEVOPS: `/Users/sarawutjuntasang/.codex/worktrees/e81b/QRCODE/docs/reports/RELEASE_CANDIDATE_BUILD.md`
- Security: `/Users/sarawutjuntasang/.codex/worktrees/7b9b/QRCODE/docs/reports/SECURITY_REVIEW.md`

This handoff freezes the engineering evidence for digest `046153ef…cd6`. Any source/config/package change creates a new candidate and requires proportionate review, QA and build evidence.
