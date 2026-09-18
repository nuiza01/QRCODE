# Phase 2A Saved-QR API Hardening

Date: 2026-08-31  
Scope: saved-QR authentication order, mutation rate limiting, and failure boundaries  
Status: implementation complete; independent review and live MariaDB verification pending

## Outcome

- Every saved-QR mutation now completes configuration, same-origin, and authoritative
  account authentication checks before reading a request body, parsing route parameters,
  or calling the saved-QR data layer.
- Authenticated accounts receive a bounded process-local allowance of 30 saved-QR
  mutations per 60 seconds. A denial returns HTTP `429`, error code
  `saved_qr_rate_limited`, `Retry-After`, and `Cache-Control: no-store`.
- Create, rename, delete, and duplicate API boundaries catch unknown runtime/DAL failures
  without binding, logging, coercing, stringifying, or reflecting the rejected value.
  They return only HTTP `500` with `saved_qr_operation_failed` and no-store headers.
- Dashboard authentication/list failures render fixed localized copy. Save and dashboard
  mutation clients retain fixed localized fallback copy and do not expose response or
  rejection details.

## Rate-limit design and limitation

The limiter key is the durable Better Auth user ID after successful authentication. It
does not read or store an IP address. The fixed-window map is capped at 10,000 active
account entries and prunes expired/old entries, so memory use is bounded.

This implementation is intentionally process-local and free. It limits one Node.js
process, but counts are not shared across multiple workers, hosts, or restarts. Before
horizontal scaling, replace it with an atomic shared limiter. The authoritative saved
Static quota remains independently enforced by the MariaDB transaction/user-row lock.

## Stable public responses

| Condition | HTTP | Error code | Additional header |
|---|---:|---|---|
| Account mutation limit | 429 | `saved_qr_rate_limited` | `Retry-After` |
| Unknown saved-QR operation failure | 500 | `saved_qr_operation_failed` | none |
| Saved Static quota | 409 | `saved_static_qr_quota_exceeded` | none |

All responses above include `Cache-Control: no-store`.

## Evidence

- Focused hardening tests: 7 files / 26 tests passed.
- Full Vitest: 38 files / 970 tests passed.
- Script tests: 119 / 119 passed.
- TypeScript (`--incremental false`), full ESLint, and `git diff --check` passed.
- Hostile Proxy rejections with throwing property/prototype traps were not inspected.
- Synthetic Drizzle-style messages containing connection/payload markers were absent
  from response bodies.
- An unauthenticated request with a throwing body accessor returned `401` without
  accessing the body.

## Not performed

No schema or migration change, live database request, browser run, deployment, DNS
change, production mutation, external service, or paid rate-limit service was used.
