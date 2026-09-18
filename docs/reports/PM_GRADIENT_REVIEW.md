# PM independent review and integration — QA-004

Date: 2026-08-28, Asia/Bangkok. Reviewer: PM, not the TL implementer.

## Verdict

PASS for code/unit integration of TL gradient candidate `82e3b7be4360605938ad9d9f6bf7d796019cd2ab70e73dceec5048449ed717c4`. Integrated only `src/qr/quality.ts` and `src/qr/quality.test.ts` with `apply_patch` after checking exact source preimages and candidate hashes. This is not browser, build, scan or release acceptance; QA-004 remains pending integrated QA.

Baseline: `NQR-P1-6982907ed8d9c48124f2` at `/private/tmp/nqr-001-93_k6d9b/snapshot/tree`.

TL report: `/Users/sarawutjuntasang/.codex/worktrees/4873/QRCODE/docs/reports/TL_REVIEW_AND_GRADIENT.md`.

## Review reasoning

- Read the entire changed quality module and test delta. The helper validates both endpoints and the background; solid-color calculation and exported contract/code names remain unchanged.
- Relative luminance increases with each RGB channel. Every interpolated RGB channel is bounded by its endpoint minimum/maximum, so the channel-envelope luminance interval conservatively contains the gradient's colors. The closest interval boundary gives a lower contrast bound; background inside the interval yields 1. This does not assume endpoint luminances alone bound a mixed-channel interior.
- The approach intentionally can reject some safe mixed-channel gradients. This matches the assigned conservative safety policy, but is not a measured per-pixel contrast or a proof that an accepted QR scans.
- Inversion checks both endpoints. Existing severities and warning-only high-contrast inversion behavior are preserved. Tests cover constant-gradient/solid parity, invalid endpoints, reversed stops, rotations, safe and unsafe spans, and input immutability.
- FORMS locale adapter reports thresholds rather than reparsing a numeric ratio from Thai domain prose, avoiding an independent approximation inconsistent with this bound. FORMS implementation itself still awaits independent review.

## Independent checks actually run

1. SHA-256 checks matched both source preimages and both TL candidate files to the report.
2. `npm test -- src/qr/quality.test.ts` from the explicit TL worktree: initial sandbox run could not write Vitest's temporary config cache (EPERM). Normal escalation was requested and approved; rerun passed **39/39**, exit 0, 17:46:49. No install, code edit, browser, build or permission workaround in that worktree.
3. Independent read-only Node probe: 2,000 deterministic RGB gradient/background fixtures, 138 accepted; 13,938 sampled positions across accepted gradients, zero sampled contrast violations below 3:1. This finite sampling corroborates the reasoning; it is not exhaustive proof or camera QA.
4. Applied only the two reviewed files in the authoritative source checkout using hash-guarded `apply_patch`.
5. Source focused suite: **39/39 PASS**, exit 0, 17:47:20.
6. Source full suite: `npm test`, **365/365 PASS, 11 files**, exit 0, 17:48:28.
7. Source `src/` compared recursively against snapshot: only the two expected quality files differ. Post-apply hashes match TL candidate exactly.
8. Source `npm run typecheck` and `npm run lint` after integration: both exit 0. These checks cover the gradient-only source state, not the as-yet unassembled release candidate.

| File | Baseline SHA-256 | Integrated SHA-256 |
|---|---|---|
| `src/qr/quality.ts` | `14745ce259f5d1f5c58fab34c3958bc72fc8e18b523ad481de5efee48e90cc58` | `6e2b7749d79d2d227a260392a7ac08f8896d56d1e4d9800ec84d68496bb7aaa9` |
| `src/qr/quality.test.ts` | `a8695dd3db28b13f9ad79752fa8d670cf9bd91277f2e036a999524a5c74e5ca1` | `da801e1b5c0dd6a351a0fc6ab6513a3e9682226a313969c6d87ff20002fe5f6a` |

## Outstanding

Source runtime/build artifacts still represent the earlier baseline; do not use the existing server as evidence for this integration. Full integrated-candidate typecheck/lint/build and browser/export/scan verification remain required after the remaining reviewed deltas are assembled. TL and FORMS build attempts reported runtime bind failures, and browser localhost access has a separate explicit security denial. Do not bypass either restriction or label untested paths PASS.

DEVOPS, RENDER and FORMS patches are not part of this source integration. No commit, push, deployment, database operation or user-code deletion was performed.
