# PM triage — NQR-030 capacity and recovery

2026-08-28, Asia/Bangkok. **REQUEST_CHANGES accepted for deterministic overflow feedback/eligibility (P2); reusable-renderer stale output capability accepted for repair (P3).** No source implementation changed in this triage.

## Report and actual PM verification

- QA report `/Users/sarawutjuntasang/.codex/worktrees/a255/QRCODE/docs/reports/CAPACITY_RECOVERY_REVIEW.md`, SHA-256 `2ea278c97ee760aea06821cb998f7de8a8c2ebf92ab2bfd7aa2ba80760b0c83e` freshly verified and read in full, including all five JavaScript probe blocks.
- Callback `TEAM_REPORT | NQR-030 | QA | iteration-1 | DONE`; task completed/idle at cursor `546fc8a2-6fe6-4cc1-b1b5-ec46b0360196:9`. Status retrieval exposed no assistant/tool items for this turn; callback text, file identity and reproducible evidence were checked rather than inventing a tool marker.
- Candidate `NQR-P1-CODE-633-e353d3128d7f`, original lineage `NQR-P1-6982907ed8d9c48124f2` plus reviewed deltas. 117-file digest `e353d3128d7f50c2a58798dc62dbbde81a28df0504288aca24bb2e276c060e51`; both vendor hashes match.
- QA independently reports 160 focused Vitest tests/2 files PASS. PM did not rerun those tests in this turn or relabel the prior 633+119 tests as QA results.

PM ran the inspected report's probes A, B and C in separate bounded Node stdin processes, each at explicit cwd `/Users/sarawutjuntasang/Nexora/QRCODE`, existing dependencies, no file writes:

| Probe | PM actual result |
|---|---|
| A: shipped pure encoder + bounded structured fixtures | 100 fixtures completed, 7.708s; byte-mode boundary and overflow observations reproduced |
| B: actual source components with inert drawing/PDF/save IO | 12 scenarios completed, 0.845s; th/en export and TestScan enabled after confirmed overflow |
| C: races/recovery/API cache with inert IO | 33 scenarios completed, 1.074s; old cached SVG returned after failed reusable update while host empty |

All processes exited0: this means the probes reproduced their expected observations, **including the defects**, not that product acceptance passed. CODE-633 and vendor hashes remained unchanged before/after. No actual browser, downloaded artifact, network or scanner evidence.

## Disposition

QA-CAP-001 P2: Thai1200 exceeds capacity at every ECC; some email/vCard aggregate or percent-encoded data also overflow although field schemas accept them. Retrying or switching PNG/SVG/PDF does not change the encoded payload/ECC and cannot resolve that condition. PM accepts capacity-specific safe localized feedback with a usable recovery instruction and blocking of TestScan/export for confirmed current overflow. Do not silently truncate, export last-valid data, blanket-lower character limits, or treat a pending preview as proven overflow. Preserve encodable numeric/alphanumeric/ASCII inputs and current-revision/style/ECC transitions. Changing ECC must not be suggested as sufficient in every case or when a logo forces H.

QA-CAP-002 P3: after valid A then failed B, reusable QrRenderer.toSvgString can read vendor cache A. Current UI exports use fresh renderOnce and reject before raw/save, so this is not evidence of stale UI download. PM accepts fail-closed output readiness after any failed update until a current successful update; review pending reads, recovery, repeated failure and destroy without changing successful output semantics.

NQR-034 assigned once to existing RENDER task after idle check, as the third worker alongside TL032/FORMS033:

- Implement QA-CAP-002 only in own engine.ts and focused renderer tests; own `docs/reports/RENDER_FAILURE_STATE_AND_CAPACITY_PLAN.md`.
- For QA-CAP-001, provide a **plan only** for the safe capacity status/error contract through renderer/preview/current Generator eligibility, with exact API/ownership/revision/localization behavior. PM/TL review before capacity implementation; FORMS is completing the separate password fix first.
- Own `/Users/sarawutjuntasang/.codex/worktrees/fc7f/QRCODE` engine preimage `9616cce76567c459102d66f10d9083d6293a46c0e4502808c4e76a523bf39daa` matched source; options/export/colors/security tests/Unicode/filename guards also matched. No hydration/install/carry-forward necessary.
- Red regression, frozen new delta, independent review and one terminal callback required. No UI/domain/package/logo changes or build/browser/permission workaround.

Both CODE-633 offline reviews are now received. The checkpoint remains an immutable historical verification input, not a successful build; future reviewed integrations require a new assembled checkpoint and QA retest. Source currently remains CODE-633, 633 application +119 script tests at its last actual full verification. ECI/scanner interpretation and actual export/browser/privacy acceptance remain pending. No production operations or new tasks/agents/automations.
