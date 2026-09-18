# NQR Phase 1 — real-origin build attempt

Date: 2026-08-31 (Asia/Bangkok)

Status: **BLOCKED BY BUILD-RUNTIME PERMISSION — NO DEPLOYMENT**

## Authorized input and scope

- Product Owner selected canonical origin: `https://nqr.orenvis.com`.
- Product Owner approved the canonical host policy on 2026-08-31: use `nqr.orenvis.com` without a `www.nqr.orenvis.com` alias, and route `/` to the Thai default `/th` when the service is eventually deployed.
- Authority remains limited to a real-origin build and local/static verification.
- DNS changes, TLS provisioning, deployment and all production mutation remain prohibited.
- Public DNS was queried read-only after the attempt. At that time the host returned no A, AAAA or CNAME answer; no record was created or changed.

## Frozen input

- Authoritative checkout: `/Users/sarawutjuntasang/Nexora/QRCODE`
- Source inventory: 125 code/config/asset paths
- Source digest: `bbc142d769336abab45e649595d22780fbbc2ace59264693b4896ec823a55237`
- Isolated release workspace inventory: 125 paths with the same digest
- Runtime: Node `v24.14.1`, npm `11.11.0`
- `npm ci --engine-strict --offline`: PASS, 559 packages, lockfile unchanged

## Verification completed

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- Application tests: 879/879 PASS across 21 files
- Script tests: 119/119 PASS
- Offline migration drift: PASS, 7 tables / 28 SQL statements; no database
- Production origin admission for `https://nqr.orenvis.com`: PASS (explicit; not launch approval)

## Build result

The first isolated `build:release` reached Next.js but could not download the three configured Google Fonts because sandbox network access was denied. The normally authorized network retry resolved that dependency boundary, then Turbopack failed while its PostCSS worker attempted to bind an internal port:

```text
creating new process
binding to a port
Operation not permitted (os error 1)
```

The failure occurred before a complete `.next` release artifact existed. Consequently:

- no real-origin BUILD_ID or artifact digest is claimed;
- the 22-route artifact verifier was not run against an incomplete build;
- the prior synthetic-origin artifact remains historical evidence only and must not be deployed;
- no alternative bundler, host, permission bypass, DNS action or deployment was attempted.

## Next action

Run the same exact `build:release` command for source digest `bbc142d7…5237` in an authorized build runtime that permits Next/Turbopack worker process and loopback-port creation. Then run the frozen 22-route origin-artifact verifier against `https://nqr.orenvis.com`. DNS/TLS/deployment remain separate actions requiring separate Product Owner authorization.
