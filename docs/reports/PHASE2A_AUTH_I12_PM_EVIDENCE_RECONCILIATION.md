# NQR-076 iteration 12 — PM evidence reconciliation

Date: 2026-09-08. Scope: read-only evidence reconciliation and this PM report; no candidate source/test changes or acceptance.

## Outcome

The BACKEND iteration-12 report correctly reports a safety denial and incomplete verification, but incorrectly states that the first patch was denied and no candidate files changed. Three source patches succeeded before a later explicit denial. The partial candidate is untested and must not be integrated.

Historical worker report is preserved at `/Users/sarawutjuntasang/.codex/worktrees/c715/QRCODE/docs/reports/PHASE2A_AUTH_LIFECYCLE_REPAIR_ITERATION_12.md`, SHA-256 `6502b63292e6c446df73bf13fff3a860602c75290bb7a980231dbaba4d98631b`.

## Actual tool chronology

BACKEND task `01a047b2-4ae5-7192-9111-79095ef71221`, turn `01a0809b-5c2e-71a3-a0dc-8e6b49b42699`. Times are UTC from the exact local task session, not inferred from report prose.

| Time | Call | Observed outcome |
|---|---|---|
| 10:42:47 | `call_0kDwTjgKrn5YditdE9MNuk9l` | Patch context mismatch; not a security denial |
| 10:43:07 | `call_orHFcqnptPzSlkGFzBeT1rq7` | apply_patch succeeded |
| 10:43:22 | `call_M7lDYJ71pu1R98mK59sVt6KP` | apply_patch succeeded |
| 10:43:36 | `call_7ZI8nbQS3cBGPPKWxv6HXeu1` | apply_patch succeeded |
| 10:43:52 | `call_WNJMq7aSK163g5M8WAILIalO` | Patch context mismatch; not a security denial |
| 10:44:40 | `call_ElAG62veUC6Bdo9oU5C1Rcom` | Waiting on patch `call_JmGtkTn8LQO7GtDqseLjH2WM` returned explicit unacceptable-risk denial |

The rejected patch concerned rawListeners/eventNames. The rejection described auth source changes in the temporary candidate as outside read-only/schema authority and based on untrusted evidence. PM did not retry the operation or switch writer/path/executor before informing the user. No subsequent candidate patch was found in the iteration-12 turn.

## Actual byte evidence

Across the original 185-file inventory only `src/db/auth-pool.ts` changed. Tests, including the newly authorized index fixture, were unchanged. No iteration-12 red/green test evidence or accepted final manifests exist.

- Entry pool SHA: `47464b36e6939ae5ddf0c4704ed66c7de2296765c44d93ec5da7b45375e9e0e3`.
- Partial pool SHA: `f1e65c9094be7fd9f8c23fa306c09ec63a0e14d38e15c3e2e7653e138d0a1e59`.
- Partial actual185 canonical digest: `9544831401b9ece053ec50db99415978042f9a07fb8cf9f311a61e95f7f5ac13`.
- Partial SOURCE-relative18 canonical digest: `d296c08f9d7c021fcff20fd80b60a8944afd672a66f9705de76e8acddf4680c1`; authoritative SOURCE preimages remained unchanged.
- Genuine iteration-12 entry five-file gzip/base64 backup: `/private/tmp/nqr076-auth-iter12-PM-PRE_EDIT_BYTES.json`, SHA `1f91eea643b5ec47caa25418c93e6c9b02c14f30b078bae94592d614a07cc324`.
- Genuine iteration-13 entry backup containing the partial state: `/private/tmp/nqr076-auth-iter13-PM-PRE_EDIT_BYTES.json`, SHA `e9ccdeac168bb265dbd61ba001f384d9d3734e410537e3e62286f2ab3793ebeb`.
- Iteration-13 full entry inventory: `/private/tmp/nqr076-auth-iter13-PRE_EDIT_INVENTORY.json`, SHA `49aeb1e0935a13537ec592d96f58d5c0a810ab88b3dcce6d8e904a8d41c300d7`.

PM decompressed and verified both five-file backups against their declared lengths/hashes; comparison shows exactly the pool module differs. The second backup was also verified against current files before iteration-13 dispatch. These are actual byte backups, not hash-only lists or reconstructed claims about old intermediate states.

## Authority and next gate

PM disclosed both the explicit denial and the earlier successful partial edits to the user, including the risk of authentication/connection regressions. The user then instructed the team to continue and delegated routine scoped engineering approvals to PM. Current ENGINEERING_LOOP authorization records this renewed informed authority for the same five temporary candidate source/test paths and ordinary offline testing/evidence preparation. This does not authorize bypassing a new safety denial, build/typegen, real databases, source integration, deployment or production mutation.

Iteration 13 was dispatched once to the same BACKEND task. Actual regression-first repairs and independent review remain required; no historical test totals establish acceptance of the partial state. Original reports and backups remain unchanged.
