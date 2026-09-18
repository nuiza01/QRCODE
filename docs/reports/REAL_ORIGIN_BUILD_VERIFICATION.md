# NQR Phase 1 — PM real-origin build verification

Date: 2026-08-31 (Asia/Bangkok)

Result: **SCOPED PASS — REAL-ORIGIN LOCAL ARTIFACT / DO NOT DEPLOY**

## Approved origin and scope

- Canonical origin: `https://nqr.orenvis.com`
- Canonical policy: no `www.nqr.orenvis.com`; eventual `/` to `/th` is a separate provider/edge action.
- Authority exercised: local real-origin build and static artifact verification only.
- No DNS/TLS change, deployment, production contact/mutation, provider action or bank UAT was performed.

## Frozen identities

- Authoritative source: 125 paths
- Source digest: `bbc142d769336abab45e649595d22780fbbc2ace59264693b4896ec823a55237`
- `package.json`: `b33fd111876ab0cb77ed57383dce9473996c36bd26aaf234fd09c1cafe9e97a1`
- `package-lock.json`: `6cbbdadcc9f85b5f8ddb8505603ff57b58f28be0c4b519126b72a3b1efb1bf72`
- DEVOPS report: `/Users/sarawutjuntasang/.codex/worktrees/e81b/QRCODE/docs/reports/REAL_ORIGIN_RELEASE_BUILD.md`
- DEVOPS report SHA-256: `05d7efe1426a938dea5d5665b8700fd9b06b4a086e0bdf33fb7993e30197cbf8`

## Real-origin artifact

- Release build: PASS, 27/27 pages
- BUILD_ID: `aWSs8HiiUAeBLmRjvoikK`
- Artifact scope: `.next/BUILD_ID` plus regular files under `.next/server/app` and `.next/static`
- Artifact count: 245 files
- Artifact digest: `b9b5c4f8dc796ea4903d7422b7afd233f3b4afd0a5dfe74a525d5fc3afe49a4d`

DEVOPS independently verified all 22 generator routes, canonical, Open Graph, HTML/sitemap hreflang, sitemap and robots output. Every emitted site URL used only `https://nqr.orenvis.com`; no synthetic fixture, localhost or `www.nqr.orenvis.com` residue remained. Static bundle analysis also kept QR/PDF heavy targets outside every route's initial script set.

PM then independently recomputed the source digest, package/lock hashes, BUILD_ID, artifact count/digest and reran the frozen origin-artifact verifier against the authoritative `.next`. Every value matched and the 22-route verifier passed.

## Local browser/runtime QA

Product Owner separately authorized local browser/runtime QA of this exact artifact. QA report:

- `/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/REAL_ORIGIN_ARTIFACT_RUNTIME_QA.md`
- SHA-256: `57dc5f8e19c636f34c735ac1fa2699704ffafa0f0a23fdddacfbb0904a8bd2aa`
- Verdict: **SCOPED PASS**, no actionable defect.

QA served the unchanged artifact on localhost and passed Thai/English desktop and mobile paint, validation/current-capacity recovery, Test Scan dialog and keyboard behavior, passive local logo and rejected-resource fail-closed behavior, real PNG/SVG/PDF downloads, structural inspection and exact synthetic-payload decode. Metadata remained baked to `https://nqr.orenvis.com`, while navigation and fetchable resources remained local. No request to the public hostname was initiated; the rejected-resource sentinel recorded zero requests. QA stopped both local servers. PM independently confirmed no listeners on ports 31060/39960 and recomputed the unchanged source and artifact identities after QA.

## Remaining gates

This artifact is not deployed and has not yet received browser/runtime QA under its new BUILD_ID. The following remain separate decisions/actions:

1. Production provider/project/operator, immutable release reference, rollback target and evidence location.
2. Explicit DNS/TLS and provider-edge `/` to `/th` authorization.
3. Explicit deployment and post-deploy verification authorization.
4. Product Owner three-bank PromptPay UAT and final launch authorization.

No later gate is implied by this build approval.
