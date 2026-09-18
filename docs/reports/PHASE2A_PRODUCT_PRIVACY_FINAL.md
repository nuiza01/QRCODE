# Phase 2A Product and Privacy Final Review

Date: 2026-08-31 (Asia/Bangkok)

Verdict: **SCOPED PASS — no actionable Product/Privacy copy defect found**

This is a Product/Privacy consistency review of the current Phase 2A candidate.
It is not legal advice, a regulatory opinion, a database inspection, or release
authorization.

## Reviewed scope

- Thai and English Privacy Policy and Terms copy.
- Saved-QR disclosures in the generator, dashboard, and quota errors.
- The implemented saved-Static quota and the inactive Dynamic-QR boundary.
- Authentication/session controls that support the published IP and session
  wording.
- Deletion, analytics, and backup statements for unsupported guarantees or
  premature claims.

No application source, authentication, API, database, schema, migration,
browser, provider, or production state was changed during this review. This
report is the only file added.

## Identity guards

- Privacy/Terms copy: `fc54e6fe9dff1bdc654907465d0752110db71def4a24ae6cc83966ac04034b1b`
- Privacy tests: `2c15a8f950127737f18a6181208c3a53f54d1287faa67850be5e1641d7e5fc16`
- Save QR card: `efc2cc90d6cb8b0ea204d37caf4b80161abb82fc1aa366d6d111057a5bb6c08d`
- Dashboard page: `51753a868b46fb5c58424315f718772a73ff3830c656fd23c28ecc14ab237421`
- Dashboard actions: `18733ab47558f3811d0338038282643a5465f08b3d8f768c9ea8723fb48b9b6d`
- Saved-Static quota policy: `4c2b07681e79dccf4289b4de1bc9f6ae846b0d22feccd2df5116a9334b652be5`
- Saved-QR data layer: `fc1652845bc01e37d45eeeb061e0b11c31fd4288dca63c25f806b45f40f21919`
- Authentication runtime: `b85a8292334465b6e261e908fb3b469e97e22d0e0d8fa9591d3847c2995ecdcd`

## Review result

### HostAtom and MariaDB disclosure

Both locales name Google as the sign-in provider and HostAtom as the current
web-hosting and MariaDB provider. The wording is limited to the operational
fact that those providers process the data needed to deliver their respective
services. It does not invent a storage jurisdiction, data-residency promise,
contractual role, certification, or provider retention period.

The HostAtom/MariaDB statement is appropriate for the approved DB-backed
candidate. It must ship with that candidate only after the release operator
confirms the deployed database target is in fact the approved HostAtom
MariaDB instance.

### Saved Static allowance

Thai and English copy consistently state that a Free account can hold up to 25
saved Static QR records at one time. This matches the server policy constant
and the create/duplicate data paths. Both insertion paths serialize the count
and insertion per owner, reject slot 26, and return the same quota error used
by the localized generator and dashboard messages.

The copy does not imply that anonymous Static generation or downloads are
limited; those remain free and available without an account.

### Dynamic QR boundary

Both locales describe five Dynamic QR records as a later-phase allowance that
is not active. Phase 2A accepts Static saves only. No Dynamic redirect or scan
collection is represented as available, so the copy does not advertise an
unimplemented service.

### Data, security, and retention accuracy

- The policy distinguishes local generation/download from the explicit Save QR
  action, and warns that a saved payload can include sensitive values such as a
  WiFi password or PromptPay identifier.
- The session disclosure matches the database-backed authentication model.
  OAuth tokens are not duplicated into an account cookie, authorization does
  not trust a cached user snapshot, and the session-create hook replaces the
  raw IP value before database persistence.
- The policy says a dashboard deletion removes the saved record from the
  primary database. It separately states that whole-account self-service
  deletion is unavailable.
- Analytics and scan collection are identified as inactive. The no-raw-IP and
  30-day Free raw-event wording is expressly conditional on a later analytics
  phase.
- No fixed backup-retention period or immediate backup-erasure promise is made.
  The copy states that the actual policy must be published if backups become
  active.

No obsolete production-copy claim such as “no account database,” “nothing is
ever uploaded,” guaranteed immediate backup deletion, or active Dynamic QR was
found in the reviewed surfaces.

## Verification

- Focused Vitest: **9 files / 37 tests PASS** covering privacy, auth runtime,
  saved-QR policy/data/API, and Thai/English quota UI.
- TypeScript/type generation: **PASS**.
- ESLint: **PASS**.

## Remaining gates outside this review

- Actual HostAtom database identity, provider configuration, migration, and
  production behavior require independent operational evidence.
- Backup creation, restore verification, and a published retention period are
  still separate release/operations decisions.
- Legal sufficiency, statutory notices, processor contracts, and jurisdiction-
  specific rights were not assessed.
- No browser, database, provider console, network, deploy, or production action
  was performed.
