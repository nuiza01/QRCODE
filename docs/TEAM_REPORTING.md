# Team reporting — direct callbacks to PM

Updated: 2026-09-13. Preserves the direct-report protocol authorized on 2026-08-28.

Use this protocol when dispatching, reviewing or returning team work. It need not be reread for each local edit; refresh it when changed, when context is lost, or when an explicit assignment requires it.

## Coordination

PM: `NQR — Project Manager`, task `01a047a6-65b5-7cd3-8897-67dd87dbaa07`, host `local`.

Use existing role tasks only, with at most three active workers. PM checks status and the saved cursor before dispatch, assigns non-overlapping ownership, and alone updates the ledger. Workers do not create tasks/agents/automations, dispatch peers, or change PM state. Follow [WORKING_AGREEMENT.md](WORKING_AGREEMENT.md) within the current [control state](ENGINEERING_LOOP.md#control-state).

## Assignment contract

State the outcome and completion criteria, exact writable scope and frozen inputs, verification proportionate to risk, reviewer/acceptance dependency, and any real permission boundary. Link the specific evidence needed; do not paste the entire project history.

An approved implementation assignment includes fixing its attributable failures and rerunning affected checks until review-ready. A review rejection routes back to the owner within that same approved scope. Do not turn each local edit or rerun into a new user approval.

## One terminal report

Before ending an assignment, save a report and send one concise callback to PM with `send_message_to_thread`:

`TEAM_REPORT | <assignment-id> | <role> | <iteration> | DONE / BLOCKED / REVIEW_FAILED`

Include the report path and hash, candidate identity and changed scope, checks actually run, actionable findings or limitations, and next required action. Keep secrets and large logs out of messages. Distinguish observed results from carried evidence; DONE means the assignment ended, not that QA or release was accepted.

If a material blocker ends the assignment, report BLOCKED. A later authorized repair uses a new iteration. Do not send routine ACKs or ask PM to acknowledge.

For ambiguous delivery, inspect status before retrying. Retry at most once only when justified and permitted by the tool. A security denial stops the affected delivery; do not bypass it by changing channel, payload or identity. Record CALLBACK_FAILED in the final response/report. PM can inspect task status under its existing read authority; that is not permission to repeat a denied send.

## PM disposition

Verify sender/assignment, completion and the relevant report/bytes before accepting claims or dispatching dependent work. Record the report identity and next cursor once in the ledger. Duplicate callbacks must not reopen an assignment.

- DONE: complete required independent review, then route the next already-authorized step. Integrate only reviewed exact deltas when integration is authorized.
- REVIEW_FAILED: give the owner concrete findings and required regressions in a new iteration; preserve the reviewed snapshot.
- BLOCKED: complete independent safe work and resolve a scoped technical dependency; ask the user only for a missing decision, authority or access that is actually necessary.

Reuse accepted evidence for unchanged identities and scope. Rerun when inputs changed, evidence is invalid/missing, a review raises a new concern, or an explicit gate requires fresh evidence. Preserve mandatory release/security checks.

## Waiting and notifications

During active coordination, use bounded `wait_threads` calls with saved cursors; do not poll unchanged state or send ACK loops. Notify the user for a meaningful result, decision or needed action, not every unchanged check.

The existing heartbeat is a fallback only. Its current paused/active state is in Control state; do not create another automation or resume it implicitly. On user pause or engineering handoff, pause it and await acceptance. Never claim continuous monitoring when no wait or active automation is running.
