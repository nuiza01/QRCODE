# Nexora QR Phase 1 — Final Engineering Handoff

Date: 2026-08-31 (Asia/Bangkok)  
Engineering status: **ACCEPTED BY PRODUCT OWNER — 2026-08-31**  
Launch status: **BUILD-READY ONLY — DO NOT DEPLOY**

## 1. Frozen delivered candidate

- Authoritative checkout: `/Users/sarawutjuntasang/Nexora/QRCODE`
- Historical baseline: `NQR-P1-6982907ed8d9c48124f2`
- Final assembled identity: **125 code/config/asset paths**
- Digest algorithm: `SHA-256(path-sorted sha256 + two spaces + relative path + newline)`
- Final source digest: `bbc142d769336abab45e649595d22780fbbc2ace59264693b4896ec823a55237`
- Final local release artifact: **245 scoped files**, BUILD_ID `T3MeNepghBvK2zTkCfX1n`
- Final artifact digest: `04fd46b5f2550586a7cee16f67ffa1e0a898c7ef7cc2a3bcfdc0ca5986ae25a0`
- Package guards: `package.json` `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1`; `package-lock.json` `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`.
- No commit, tag, push, deployment, production mutation, domain purchase, paid service, real database operation or bank transaction was performed.

The final artifact was built with the synthetic origin `https://origin-fixture.nqr-ci.com` solely for deterministic admission/artifact verification. **Do not deploy this synthetic-origin artifact.** A real approved origin requires a new build from an immutable copy of the same reviewed source.

Phase 1 remains a browser-only static QR generator for URL, text, WiFi, vCard, email, SMS, telephone, geo, event and PromptPay in Thai and English. Accounts, dynamic QR, redirects, analytics, billing, API and short-domain work remain Phase 2/3 and are not part of this handoff.

## 2. Delivered engineering hardening

The reviewed and integrated result includes:

- UTF-8-safe Thai, emoji, combining-character and multilingual QR rendering without changing the payload contract.
- Conservative quality/gradient checks and strict opaque-hex paint admission before vendor, preview and export boundaries.
- Current validated-payload continuity, monotonic render revisions, stale/superseded async rejection and exact-current capacity eligibility.
- Test Scan and PNG/SVG/PDF blocking only for the matching confirmed capacity failure, with Thai/English recovery guidance.
- Safe localized export errors, generic privacy-preserving filenames and no payload-derived default labels.
- Structured vCard/Event newline handling and exact preservation of accepted nonblank WiFi passwords.
- Fail-closed reusable renderer state after failed updates, fixed private renderer failure codes and bounded pinned-vendor capacity classification.
- One localized Test Scan dialog title and Close action, with preserved focus trap, Escape/outside/body dismissal and focus restoration.
- Passive local SVG admission plus local rasterization of the logo only; the QR remains vector in SVG/PDF.
- Strict per-attribute SVG value grammar/sanitized serialization, no original SVG at vendor/svg2pdf boundaries, and no external logo-resource fetch path.
- Source-image limits, canonical prepared-PNG validation at 1024×1024 / 1,048,576 pixels, CRC/chunk/IHDR checks, timeout/caller-abort/latest-wins/unmount and post-await no-save cancellation/cleanup.
- Production origin admission, offline migration drift checking, CI/runtime engine requirements, route/artifact verification, release build and static bundle audit.

Exact preimages, candidate hashes, rejected review iterations and independent final reviews are retained in the engineering loop and primary reports in §7.

## 3. Verification completed on this exact source/artifact

| Gate | Result |
|---|---|
| PM/source renderer suite | 301/301 PASS |
| Full application tests | 879/879 PASS across 21 files |
| Release/script tests | 119/119 PASS |
| Typecheck / lint / diff check | PASS |
| Offline migration drift | PASS — 7 tables / 28 SQL statements; no DB connection |
| Missing production origin | Rejected as expected with redacted fixed diagnostic |
| Fresh no-env build | PASS — 27/27 pages |
| Fresh synthetic explicit-origin release build | PASS — 27/27 pages |
| Origin/artifact verification | PASS — all 22 generator routes, canonical/OG/hreflang, sitemap and robots |
| Static bundle boundary | PASS — QR/PDF heavy chunks absent from every 22-route initial script set |
| Final focused security/recovery probes | 294/294 PASS across 5 files |
| Final real production-artifact browser QA | SCOPED PASS on th/en desktop 1280×800 and mobile 390×844 |
| Logo admission/rejection/recovery | PNG/JPEG/GIF/WebP/passive SVG PASS; malformed, active, resource and oversize inputs fail closed |
| Request sentinel | Zero requests to the rejected SVG external-resource sentinel |
| Real downloads | PNG/SVG/PDF saved with generic names; no payload-derived name |
| Independent decode | Apple Vision decoded the exact synthetic payload from PNG, rendered SVG and rendered PDF |
| Export structure | SVG/PDF keep vector QR; one local PNG logo; no raw SVG marker, external ref/link or PDF annotation |
| Capacity/Test Scan/accessibility | Current/stale recovery, one dialog/title/Close, focus trap and dismissal/focus return PASS |
| Console and cleanup | Empty browser console; runtime/sentinel stopped; no listeners on ports 31058/39999 |

NQR-058 used the same `.next` artifact produced by NQR-057 and rechecked the source/artifact/package/renderer/Test Scan identities before and after. PM independently recomputed the final source and artifact digests after QA; both matched the values in §1.

The browser API did not expose a downloadable HAR or exact Chromium version. Network evidence therefore consists of browser request/resource observations, a local rejected-resource sentinel with zero requests, exported-file inspection and an empty console; it is not mislabeled as HAR evidence.

## 4. Reproduction and real-origin release preparation

From a clean immutable copy/archive of the frozen source with Node `>=24 <25`, npm `>=11 <12` and the recorded lockfile:

```sh
npm ci --engine-strict
npm run typecheck
npm run lint
npm test
env -u DATABASE_URL npm run check:drift
env -u DATABASE_URL npm run release:validate
env -u DATABASE_URL NEXT_TELEMETRY_DISABLED=1 npm run build:release
```

The authorized build environment must set `NEXT_PUBLIC_APP_URL` to the approved public HTTPS origin before `release:validate` and `build:release`. The public origin is baked into static output; changing only runtime environment values after build is insufficient.

The repository has no provider deployment command. Do not invent a provider/target or deploy action. The authorized operator must connect the real-origin artifact to the approved immutable revision, provider release ID, evidence location and rollback target.

The complete non-secret production-information request, post-deploy DNS/TLS/redirect/route runbook, stop conditions and PromptPay UAT form are in the Product report referenced in §7.

## 5. Remaining user-owned launch gates

Engineering work available in the current local environment is complete. Launch remains blocked until the Product Owner and authorized operator provide or perform all applicable items below:

1. **Production identity and authority:** canonical HTTPS origin, apex/www redirect policy, provider/project/environment label, authorized operators, immutable reviewed revision/archive, rollback target and evidence location.
2. **Explicit action authority:** separately authorize real-origin build, DNS/TLS changes, deployment and post-deploy checks. Unchecked actions remain unauthorized.
3. **Real-origin release evidence:** rebuild from the immutable reviewed source, rerun release admission, verify all 22 routes/canonical/hreflang/sitemap/robots, connect source digest, build/artifact ID and provider release ID, then verify DNS/TLS/root redirect and served routes.
4. **PromptPay UAT:** the Product Owner privately tests an owned/authorized PromptPay identifier in three different Thai bank apps, once without amount and once with a fixed amount, verifies payee/amount, and cancels all six scans before transfer. No agent can perform or attest this gate.
5. **Product acceptance and launch authorization:** record engineering acceptance separately from deployment/launch approval.

Do not send credentials, tokens, private keys, OTPs, bank identifiers, payee names or real QR images in chat or reports.

## 6. Known non-blocking limitations and advisory

- No VoiceOver/JAWS/NVDA certification was performed. Browser accessibility-tree and keyboard behavior passed, but formal assistive-technology validation remains separate.
- No physical camera/scanner or general ECI interoperability claim is made. The required three-bank PromptPay UAT is the product-owned real-device gate for the payment flow.
- The available browser API did not expose a full HAR or exact Chromium version.
- Non-cooperative timeout, caller abort, latest-wins race, unmount and save-cancellation injections are verified by focused tests rather than being deterministically injected into the unmodified production UI.
- P3 advisory: after an intentional malformed-logo export failure, the fixed error alert can remain visible while editing to a new valid revision until retry starts. Retry succeeds and clears it; no stale save or data leak occurred. Consider clearing the alert immediately on a newly eligible revision in a later UX backlog item. This is not a release-blocking defect for the frozen candidate.
- npm reports six lock-present WASM/platform transitive packages as extraneous in the existing install. Builds/tests pass; no prune/install mutation was authorized.

No release-blocking engineering defect remains open in the verified local scope.

## 7. Primary evidence

- [Engineering loop](../ENGINEERING_LOOP.md)
- [Product acceptance checklist](PRODUCT_ACCEPTANCE.md)
- [PM logo integration](PM_LOGO_PASSIVE_RASTER_INTEGRATION.md)
- [PM Test Scan integration](PM_TEST_SCAN_SEMANTICS_INTEGRATION.md)
- DEVOPS final build: `/Users/sarawutjuntasang/.codex/worktrees/e81b/QRCODE/docs/reports/FINAL_RELEASE_CANDIDATE_BUILD.md` — SHA-256 `de2041b032fbb1f68f79ccc548ca386fc622935a72449b13107ac812d5c83ac7`
- QA final runtime: `/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/FINAL_ASSEMBLED_RUNTIME_QA.md` — SHA-256 `fe06f0f513373ece6e42592fb8e57bbacfb4d2ebc507a5ddc7c11c7281c1bb88`
- TL final logo review: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/LOGO_PASSIVE_RASTER_ITERATION_3_TL_REVIEW.md` — SHA-256 `2f5f247c5f53fd0ff02bd25d35c47889e03bb82e5c73305f776dddeab1b8b318`
- SECURITY final logo review: `/Users/sarawutjuntasang/.codex/worktrees/7b9b/QRCODE/docs/reports/LOGO_PASSIVE_RASTER_ITERATION_3_SECURITY_REVIEW.md` — SHA-256 `585df1f01fcdc1f116cec57fc7e23740ba7908c7400ee5689bd8c09fcabbb4ea`
- Product-owned release gates: `/Users/sarawutjuntasang/.codex/worktrees/ea6d/QRCODE/docs/reports/USER_OWNED_RELEASE_GATES.md` — SHA-256 `c71d4e339c634920ef42ea22ce4e5e45ccb93c2b2743a18946066ca6759b4fd9`

## 8. Handoff decision

**Product Owner decision recorded on 2026-08-31:** `ACCEPT engineering handoff` and `BUILD-READY ONLY — DO NOT DEPLOY`.

This acceptance freezes the reviewed local evidence for source digest `bbc142d7…5237` and local artifact digest `04fd46b5…25a0`. It authorizes no deployment or production mutation.

**Production-preparation authority recorded on 2026-08-31:** `อนุมัติ real-origin build และ verification เท่านั้น — ไม่อนุมัติ DNS, deploy หรือ production mutation`.

This authorizes only a new real-origin build and its local/static verification after the canonical HTTPS origin and required non-secret build identity inputs are supplied. It does not authorize DNS/TLS changes, deployment, post-deploy production contact or any other production mutation.

Acceptance of the engineering deliverable does not authorize deployment. Any source/config/package change creates a new candidate and requires proportionate review, QA and build evidence. Production preparation proceeds only after the Product Owner supplies the non-secret information and explicit authorities in §5.
