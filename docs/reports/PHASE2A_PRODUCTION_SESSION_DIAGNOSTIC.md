# Phase 2A production session diagnostic

Date: 2026-09-01 (Asia/Bangkok)  
Target: `https://nqr.orenvis.com` on HostAtom/Plesk  
Verdict: **DIAGNOSTIC COMPLETE — ROOT CAUSE NOT YET IDENTIFIED**

## Authorized scope

The Product Owner authorized one temporary redacted server diagnostic for the
Better Auth session read, one Google Login attempt with the Product Owner's
account, and immediate removal of the diagnostic afterward. The authorization
explicitly excluded deploying a new application candidate.

## Execution and evidence

- The active rollback artifact stayed at BUILD_ID `m1fxDjFEQxdLlI91m1Czx`.
  Its read-back value matched before closeout; no `.next` candidate was
  activated.
- The original production `server.js` was preserved before the experiment:
  626 bytes, SHA-256
  `34dde3cdb48908c4d4e216587d603222d2955b2b69c4df59219d95d7e1614f08`.
- The temporary wrapper captured only the first Better Auth
  `INTERNAL_SERVER_ERROR` at the `get-session` stage. It did not record the
  error message, SQL, query parameters, DSN, token, cookie or account identity.
- Exactly one Google account-selection flow was exercised. Google returned to
  `https://nqr.orenvis.com/th/dashboard`, but the application still showed the
  Google sign-in control and the fixed localized saved-QR load failure.
- The redacted record was:

  ```json
  {"timestamp":"2026-08-31T18:51:36.086Z","stage":"better-auth/get-session","errors":[{"kind":"object","name":"Error","keys":["stack","message"]}]}
  ```

  This identifies the failing Better Auth stage, but the outer exception is a
  generic `Error` with no own `code`, `sqlState`, `errno` or `cause`. It is not
  enough to distinguish a MariaDB query failure from an adapter/runtime error.
- Plesk's Passenger log browser showed no retained items during the final
  read. No raw Passenger message, SQL text or stack was copied into project
  evidence, and no speculative classification is recorded.

## Diagnostic shutdown and production state

The diagnostic wrapper was disabled immediately after the one login attempt,
the original `server.js` was restored, and the Node.js application was
restarted. Final read-back of the active file again produced 626 bytes and the
exact original SHA-256 above. The Thai production landing page then rendered
normally from the unchanged rollback BUILD_ID.

The following forensic files remain in the Plesk application directory so
that no cloud data is deleted without a separate action-time confirmation:

- `server.js.disabled-session-diagnostics-20260901`
- `nqr-server-diagnostics-20260901.js`
- `tmp/nqr-auth-session-diagnostic-20260901.jsonl`

They are inactive. The active startup file is the restored 626-byte
`server.js`.

No application candidate, DNS/TLS setting, database schema/data/grant, OAuth
client configuration or production secret was changed by this diagnostic.

## Required next gate

Do not deploy another session repair from this evidence alone. The next step is
a reviewed, bounded diagnostic/repair candidate that preserves fixed error
output while capturing a non-secret internal failure category at the adapter
boundary. It requires offline tests and independent TL/Security review before
any fresh immutable build. A later production activation still needs separate
deployment authority, followed by one Google session gate and saved-QR
CRUD/quota/ownership acceptance on the same build.
