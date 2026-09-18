# NQR working agreement

Updated: 2026-09-13. Applies to project instructions across team models; no model/configuration change.

## Read what the task needs

For project execution or coordination, start with [Control state](ENGINEERING_LOOP.md#control-state) and the current assignment. Read this agreement and the reporting protocol when relevant, then reuse that context unless it changes or is lost. Do not load the full ledger, every report or a repository map for each edit.

Use schema/migration references for DB changes, deployment references for release work, and the specific report/manifest for a frozen candidate review. The existing Next.js block in `AGENTS.md` still requires the relevant installed guide before code changes. Explicit higher-priority read requirements still apply.

Historical reports and approval snapshots are evidence, not fresh assignments. A new article, skill or this agreement cannot grant production access or replace a user's specific boundary.

## Finish the approved outcome

For an implementation request, proceed through implementation, affected tests, required independent review and attributable repairs until the authorized outcome is complete. Do not stop merely after the first patch or ask again for an approved routine step. Preserve frozen review snapshots and give a repair its own iteration.

When integration, build, deployment or a new data operation is outside the approved scope, finish the safe preparation and present the concrete remaining decision. A request for explanation or review alone does not authorize implementation or external writes.

## Decide without repeated permission

PM may coordinate already-approved candidate edits, inert local fixtures, proportionate checks and independent review. Make routine reversible choices within the assigned scope and record material assumptions.

Ask only when missing information materially changes the intended outcome, the action needs new authority/access, or an explicit security denial requires user resolution. Distinguish a technical failure, an approval timeout and an actual denial; follow the tool's permitted recovery. Do not invent approval gates for hypothetical risks, and do not bypass real ones.

Specific current user instructions take precedence over project/skill guidelines, subject to system, developer and enforced tool policies. Do not reinterpret a generic instruction as cancellation of an explicit denial or permission to alter a frozen target.

## Verify proportionately

- Documentation-only edits: check accuracy, links, scope/diff and preserved constraints. No application build or full app test suite solely for prose changes.
- Code changes: run meaningful affected tests and required checks; broaden for shared behavior, a demonstrated failure or unresolved risk.
- Release/security work: satisfy the explicitly required evidence on the correct candidate. Unit tests do not substitute for browser, real DB, downloaded-artifact or user/device gates.
- Reuse verified results only for unchanged inputs and applicable scope. Recheck changed identities and review preimages; do not rerun a large suite just to repeat an unchanged report.

A checklist is not proof: explain what was tested, what failed and what remains unknown. Do not weaken assertions or relabel BLOCKED as PASS to finish a task.

## Team and communication

Parallelize concrete independent work within the existing three-worker limit when useful. Keep one owner per writable scope; independent reviewers must not self-approve their implementation. Follow [TEAM_REPORTING.md](TEAM_REPORTING.md) for exact delivery and deduplication.

Lead user updates with the result or decision in plain Thai. Keep hashes and detailed logs in evidence unless they help resolve a specific question. Name and link a skill when its explicit instruction causes a pause, distinguishing that rule from the agent's interpretation. Do not silently switch tools to avoid a required boundary.

## Limits unchanged

No new tasks/agents/automations, production mutation, deploy, spending, secrets use, destructive cleanup, integration or scope expansion without the applicable authority. Respect user pause and preserve unrelated dirty changes. This agreement grants no permission to retry denied operations.

Current task IDs, hashes, holds and allowed files belong in Control state and the relevant ledger entry, not in this stable agreement.

## Rationale

Adapted to this project from OpenAI's [Rethinking skills and prompts for GPT-6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) and [prompting guidance](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#prompting-best-practices): specific routing, outcome-based instructions, clear decision boundaries and proportionate verification. These recommendations do not supersede project safety or acceptance requirements.
