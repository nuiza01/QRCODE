# Phase 2A — live OAuth and MariaDB runtime activation

Date: 2026-08-31 (Asia/Bangkok)  
Operator scope: approved Plesk runtime configuration and live authentication checks  
Deployment: **not performed**

## Outcome

**SCOPED PASS** for the explicitly approved no-deploy runtime activation.

- The Product Owner confirmed the new MariaDB application-user password in
  Plesk. The value is not recorded in this repository, report, terminal output,
  or screenshot.
- Plesk's nginx maximum request-body setting for `nqr.orenvis.com` was reduced
  from 2 GB to **1 MB**.
- A new Google Web OAuth client named `Nexora QR Production` was created in the
  existing Google Cloud project `nexora-qr` with exactly:
  - JavaScript origin: `https://nqr.orenvis.com`
  - redirect URI: `https://nqr.orenvis.com/api/auth/callback/google`
- The Google Auth Platform Audience page reported **External / In production**.
  No additional publish action was necessary.
- Plesk now contains the seven required runtime variable names:
  `NEXT_PUBLIC_APP_URL`, `NEXT_TELEMETRY_DISABLED`, `BETTER_AUTH_URL`,
  `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
  `DATABASE_URL`. Only presence was re-read; secret values were not copied.
- `BETTER_AUTH_SECRET`, the Google client pair, and the MariaDB password/DSN
  were rotated or introduced in one runtime change, after which the Node.js
  application was restarted once.
- A live Google authorization flow used the exact production callback and
  returned successfully to `https://nqr.orenvis.com/en` as an authenticated
  session. This proves the new client, callback, restarted runtime, and live
  MariaDB-backed authentication path work together for the approved account.
- Temporary in-memory copies of password/secret values were cleared after the
  Plesk update and login check.

## Important session impact

The singular Better Auth secret was rotated. Any session or OAuth-state cookie
created with the previous secret no longer verifies, and provider tokens
encrypted with the previous value require reauthentication. The successful
fresh Google login after restart is the recovery evidence for the approved
test account; it is not evidence for other users or token-refresh longevity.

## No-deploy boundary and remaining blocker

No source artifact, `.next` build, DNS, TLS, proxy target, document root, or
provider release was changed. The public site remained reachable throughout
the check.

The currently deployed artifact does not contain the reviewed Phase 2A saved
QR endpoint: authenticated navigation to `/api/qr-codes` returned the deployed
404 page. Therefore dashboard list/create/rename/duplicate/delete, owner
isolation, the 25-record transaction quota, and mutation throttling cannot be
tested against the reviewed Phase 2A implementation until a separately
authorized build and deployment places that implementation behind the approved
HTTPS origin. This is expected under the user's explicit **still no deploy**
constraint and must not be reported as a runtime defect in the reviewed source.

A separate direct browser navigation to Better Auth's session endpoint was
blocked by the in-app browser client and was not bypassed. The accepted login
evidence is the completed Google callback plus the authenticated application
state and available Sign out control on the real origin.

## Evidence classification

| Gate | Result |
|---|---|
| Plesk DB password change | PASS — user confirmed Apply |
| nginx request-body limit | PASS — 1 MB configured |
| Required runtime variable-name set | PASS — 7/7 present |
| Node process restart | PASS |
| Google Web client origin/callback | PASS |
| OAuth publishing status | PASS — already In production |
| Fresh Google login on real HTTPS origin | PASS — one approved account |
| Phase 2A saved-QR API/dashboard | BLOCKED — reviewed artifact not deployed |
| Two-user ownership/quota/CRUD | PENDING deployment authority |
| DNS/deployment/production release | NOT AUTHORIZED / not performed |

## Next decision

The next irreversible product step is not another secret or database change.
It is a separately authorized Phase 2A release build and deployment of the
reviewed source, followed by the exact live CRUD, ownership, quota, rollback,
and browser acceptance matrix on that immutable artifact.
