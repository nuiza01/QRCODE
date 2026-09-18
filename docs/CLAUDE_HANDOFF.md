# NQR — Handoff ให้ Claude

วันที่ส่งมอบ: 2026-09-16 (Asia/Bangkok) | ผู้ใช้เป็น Product Owner

## 1. เริ่มอ่านตรงนี้

รับช่วง **Phase 2A — บัญชีผู้ใช้และ Saved Static QR บน MariaDB** ไม่ใช่เริ่มโปรเจ็กต์ใหม่ ไม่มีสิทธิ์ deploy จากเอกสารนี้

**สถานะล่าสุด: งาน Stage A iteration-3 มีรายงาน DONE / REVIEW-READY แต่ยังไม่ผ่าน independent review และขณะส่งมอบไม่พบ candidate/build/checkpoint ที่เคยเก็บใน `/private/tmp`. งานแรกคือกู้และยืนยันหลักฐาน ไม่ใช่ integrate หรือ build ใหม่ทันที**

อ่านตามลำดับ:

1. เอกสารนี้ และ [AGENTS.md](../AGENTS.md) — ต้องอ่านคู่มือ Next ที่ติดตั้งจริงก่อนแก้ framework code
2. [WORKING_AGREEMENT.md](WORKING_AGREEMENT.md), [TEAM_REPORTING.md](TEAM_REPORTING.md) และเฉพาะ Control state ของ [ENGINEERING_LOOP.md](ENGINEERING_LOOP.md)
3. รายงาน/ข้อกำหนดเฉพาะงานใน §5 ไม่ต้องโหลด ledger ประวัติทั้งหมดทุกครั้ง
4. [PHASE2_IMPLEMENTATION_PLAN.md](PHASE2_IMPLEMENTATION_PLAN.md) ใช้สำหรับ product scope แต่บรรทัดสถานะบนสุดเก่าแล้ว; current control และ handoff นี้ใช้สำหรับสถานะ ณ วันส่งมอบ

`CLAUDE.md` เดิมมีเพียง `@AGENTS.md` และไม่ได้ถูกแก้ในรอบส่งมอบนี้ ให้ผู้ใช้ชี้ Claude มาที่เอกสารนี้โดยตรง ไม่มีการติดต่อ Claude service หรือส่งข้อมูลออกภายนอกในรอบนี้

## 2. ผลิตภัณฑ์และการตัดสินใจที่ไม่ต้องเริ่มถกใหม่

- ชื่อ NQR / Nexora QR; origin ที่เลือก `https://nqr.orenvis.com`
- ใช้ HostAtom เดิมและ MariaDB 10.11 ก่อน ไม่เพิ่มบริการเสียเงินหรือย้ายฐานข้อมูลเพียงเพราะเป็นทางเลือกที่สะดวกกว่า
- Static QR สร้างฟรีไม่จำกัดและไม่ต้อง login; บัญชี Free บันทึก Static ได้ 25 รายการ
- Login ด้วย Google; persistence ใช้ Better Auth + Drizzle + mysql2
- Phase 2B: Dynamic URL QR 5 รายการที่ active ต่อบัญชี ใช้ `/r/[code]`, มี ownership/quota/abuse controls
- Phase 2C: scan analytics ไม่เก็บ raw IP, raw events Free เก็บ 30 วัน, daily aggregate/CSV/purge
- Phase 3 billing และ Phase 4 API/bulk/custom domain/team เป็นอนาคต ไม่ใช่ scope งานปัจจุบัน
- Phase 1 static generator มีการส่งมอบงานวิศวกรรมแล้ว แต่ไม่ใช้ผลนั้นแทนการรับรอง Phase 2A/live banking/ทุก release gate

## 3. Repo, runtime และประวัติที่จำเป็น

- Authoritative checkout: `/Users/sarawutjuntasang/Nexora/QRCODE`
- Node `>=24 <25`, npm `>=11 <12`; package.json ปัจจุบัน Next 16.3.1, React 19.2.8, Better Auth 1.7.2, Drizzle ^0.45.2, mysql2 ^3.24.2
- ห้ามอิง Next 15 หรือ Vercel/PostgreSQL ใน roadmap เก่าเป็น current implementation
- Repo มีประวัติงาน uncommitted/untracked จำนวนมาก: ห้าม reset/checkout/clean หรือคัดลอกทั้ง worktree มาทับ SOURCE
- ณ ส่งมอบ `git status --short` รันไม่สำเร็จ exit69 เพราะ macOS แจ้ง Xcode license ยังไม่ยอมรับ ไม่ได้แก้ system หรือกดยอมรับแทนผู้ใช้ จึงไม่มี fresh git-cleanliness claim
- Phase 2A เคย deploy แล้วพบ session resolution failure และ rollback; source/auth hardening ภายหลังผ่าน scoped offline acceptance ดู [PHASE2A_AUTH_ASSEMBLED_OFFLINE_ACCEPTANCE.md](reports/PHASE2A_AUTH_ASSEMBLED_OFFLINE_ACCEPTANCE.md)
- หลักฐานย้อนหลังบน assembled SOURCE185: app tests1129 + script247, focused163, lint/direct tsc/drift ผ่าน เป็นหลักฐานเดิม ไม่ได้รันใหม่วันที่ส่งมอบ และไม่เท่ากับ built-runtime MariaDB/browser acceptance
- Production rollback ที่บันทึกล่าสุด `m1fxDjFEQxdLlI91m1Czx`; rejected build `Gg64LFGQcClo_70kqyHFi` ห้าม promote. ไม่ได้ตรวจ production สดในรอบ handoff จึงไม่ยืนยันว่า live BUILD_ID วันนี้ยังเป็นค่าเดิม

## 4. ขอบเขตสิทธิ์

ทำต่อได้ภายใต้สิทธิ์เดิม: bounded local repair/test/independent review ของ release-gate candidate ห้าไฟล์ในพื้นที่แยก ไม่ต้องขอ user approval ใหม่ทุก edit หรือ test ที่อยู่ใน scope

| ช่วง | ไฟล์ที่แก้ได้ใน isolated candidate | เงื่อนไข |
|---|---|---|
| Stage A | `scripts/inspect-turbopack-emission.mjs`, `scripts/inspect-turbopack-emission.test.mjs` | diagnostic เท่านั้น; ทุก result ต้อง `releaseDecision=BLOCKED` |
| Stage B | `scripts/verify-initial-bundle-boundary.mjs`, test ชื่อเดียวกัน, `scripts/build.mjs` | เริ่มหลัง Stage A ผ่าน independent TL + SECURITY; ยังเป็น isolated candidate |

Stage A/B เป็นขั้นย่อยของเครื่องมือตรวจ release ภายใน **Phase 2A** ไม่ใช่ Phase 2A/2B ของผลิตภัณฑ์

Policy ที่อนุมัติ: Generator อยู่ initial ได้, renderer/vendor โหลดเมื่อ preview ที่ valid ปัจจุบัน mount ได้, PDF โหลดเฉพาะคำขอ PDF ที่ eligible ปัจจุบัน ต้องพิสูจน์จริง ไม่ถือว่า policy คือผล QA

ยังห้าม: SOURCE integration, build/typegen ใหม่ภายใต้ scope gate นี้, install/package/schema/application edits, deploy/production/Plesk/DNS/live OAuth, spending, commit/push, สร้าง task/agent/automation เพิ่ม หรือ bypass security denial. Stage B ห้ามรับหลักฐาน QA/reviewer ที่ตนแต่งเองเป็น acceptance

เคยมีสิทธิ์ local DB/build/artifact QA แยกต่างหาก แต่ยังมี prerequisite/denial ค้าง (§7); ห้ามตีความว่าการเปลี่ยน agent ทำให้ข้อห้ามหมดอายุ เอกสารนี้ไม่ขยายอำนาจ

## 5. งานล่าสุดและหลักฐานที่ยังเปิดอ่านได้

สำเนา 4 รายงานด้านล่างเก็บใน repo แบบ exact-byte เพื่อไม่ต้องพึ่ง worktree สำหรับการอ่าน แต่ **ไม่ได้มี candidate code/build/probe fixtures อยู่ในสำเนานี้** SHA ของต้นฉบับและสำเนาตรวจในรอบ handoff

| หลักฐาน | SHA-256 | ความหมาย |
|---|---|---|
| [NQR129 spec](handoff-evidence/2026-09-16/PHASE2A_RELEASE_GATE_CHANGE_SPEC.md) | `4243bacdddf6794f08ced2fb0befa290af2c65ea05167593e504540e4b9ef34d` | ข้อกำหนดห้าไฟล์; ข้อความขออนุมัติ Stage B ในรายงานนี้เก่ากว่าการอนุมัติแบบมี dependency ใน Control state |
| [NQR133 TL review i2](handoff-evidence/2026-09-16/PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_2_TL_REVIEW.md) | `35c7ef163dee144d5164e35aebef3bbd0a56d8d1168945c8df84e8c285d456ca` | REQUEST_CHANGES; ไม่ใช่ review i3 |
| [NQR134 SECURITY review i2](handoff-evidence/2026-09-16/PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_2_SECURITY_REVIEW.md) | `07e60b7ca5a336211f9a644a74bf88891e130e781cb1c738a7b2299001998f22` | REQUEST_CHANGES; ไม่ใช่ review i3 |
| [NQR130 DEVOPS i3](handoff-evidence/2026-09-16/PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_3.md) | `c26e8428eb538fd1d122e67940048dc76eb98e22f2ce3c41089f9e8cd026746b` | DONE / REVIEW-READY; worker รายงาน35/35 และ copied probes ผ่าน; ยังไม่มี independent i3 acceptance |

DEVOPS i3 completed เมื่อ 2026-09-13. ส่ง callback ถูก security gate ปฏิเสธ จึงจบเป็น CALLBACK_FAILED ไม่มีการ resend. PM อ่านรายงานในรอบ handoff ได้ แต่ไม่ถือว่าเป็นสิทธิ์ส่ง denied payload ซ้ำหรือเปลี่ยน channel เพื่อเลี่ยง

หกกลุ่มที่ i3 อ้างว่าแก้แล้วและ reviewer ต้องพิสูจน์ซ้ำ:

1. SVG script href/xlink และ iframe src/srcdoc ไม่ควรถูกจัดว่า SUPPORTED โดยไม่มีโมเดลรองรับ
2. `Promise` ถูก shadow ด้วย callback/context/named factory ต้องไม่ถูกตีความเป็น global intrinsic
3. Module ต้อง reachable จาก load context ไม่ใช่แค่มี registration ในไฟล์ที่ไม่ถูกโหลด; รวม duplicate/conflicting Flight IDs
4. Ancestor-directory symlink swap: คุม path containment; probe เดิมใช้ bytes เหมือนกัน ไม่ใช่ข้อพิสูจน์ byte forgery
5. บังคับ cumulative executable64MiB จริง ไม่ใช่ counter ที่ไม่มี call site; ใช้ bounded boundary tests ไม่ stress/OOM
6. `runCli` ต้อง contain malformed null/Proxy/getter/non-string args ด้วย fixed output; trusted writer failures แยกจาก input boundary

คง positive controls ของเดิม: capped severity, admitted-buffer/final-byte race, valid loaders/HTML, fixed inspect API, benign IIFE/metadata UNKNOWN. ไม่แก้ unsupported real grammarให้เป็น PASS เพื่อปิดงาน

## 6. Frozen identity กับสิ่งที่หายไป — สำคัญที่สุด

**ค่าต่อไปนี้เป็น historical pins ไม่ใช่ fresh byte verification ณ 2026-09-16** เพราะ path ที่อ้างไม่พบแล้ว ไม่ทราบสาเหตุการหาย และไม่มีหลักฐานว่าถูก cleanup อย่างถูกต้อง

| สิ่งที่ต้องกู้ | Path เดิม / identity |
|---|---|
| SOURCE185 manifest | `/private/tmp/nqr122-auth-integration-POST185.json`; canonical `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df`; serialized file SHA `ee1b04c22c0b46a95e3f2e6a00fdb6a586127d7868cb56d8f1f199bb322adc40` |
| Recoverable integration backup | `/private/tmp/nqr122-auth-integration-BACKUP.json`; SHA `a6ed5abf1b987ef2e7305976cc5ee4a07070c7a5a2035388e4cdbd0c12d27139` |
| Candidate i3 root | `/private/tmp/nqr130-gate-stage-a-i3-fBy3Aj4N`; authored2 canonical `da69c4667784b1f73895b00665791ea1b6c915235e886ff6dd3d8a6be36c559e` |
| i3 adapter / test SHA | `63fc94534e072ad72ab805c94a5aba4864628d7222a985f23b56c4405f6dc51c` / `6103a6f4ef56d3001b30b2111fce21452076cb07317fe4eefb6ee599568f2454` |
| Previous candidates | `/private/tmp/nqr130-gate-stage-a-7PEiLUZ0`, `/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD`; ทั้งคู่ไม่พบ |
| Diagnostic .next | `/private/tmp/nqr125-build-i2-pUZsutO2/project/.next`; BUILD_ID `7OgVcQLdytdDmtYEw_V6N`; full610 `4d372f50b89dd44cf2ea3259113d16015406046e29a89f87200c629038f98f1d`; scope342 `80fe2ca3df2c327a8d00ff3dd2765631ee39dbd8ec85e1867409d38ce12daddd` |
| Independent fixture roots | `/private/tmp/nqr133-tl-BhOKZIcs`, `/private/tmp/nqr134-security-oodcb6n3`; ทั้งคู่ไม่พบ |

Candidate canonical2 ใช้ compact JSON/no LF ของ rows `{sha256,path}` โดย path เป็น `project/scripts/...` ตามลำดับ adapter/test. SOURCE185 ใช้ ASCII path order `{sha256,path}`. ห้ามสร้าง manifest จากไฟล์ที่เลือกใหม่แล้วเรียกมันว่า checkpoint เดิม

Fresh checks ณ ส่งมอบที่ทำได้จริง: รายงาน4ฉบับยังอยู่, package.json/lock/AGENTS hashes ตรงค่าประวัติด้านล่าง ไม่ได้พิสูจน์ SOURCE185 ทั้งชุดแทน manifest:

- `package.json`: `237ae720268fb4b389b29642e7cf21df1470b429ecadab54f336d56b1393b9b0`
- `package-lock.json`: `163289534419b41984b54dc038e4873ed60466e3d3d016446a6270d0d4d62f1a`
- `AGENTS.md`: `63f2c50380ed6303237cce215ce27af1d620d094c215e28d1b1538a3c070e3bb`

## 7. Blockers ที่ห้ามข้าม

- Release ยัง BLOCKED; real artifact ตามรายงาน STATIC_UNKNOWN ไม่ใช่ deployable build แม้35 testsผ่าน
- ไม่พบ frozen bytes/manifest: กู้จาก backup หรือ retained local session/tool patches ถ้ามีสิทธิ์อ่าน แล้วตรวจเทียบ hash. ถ้ากู้ exact bytes ไม่ได้ ให้บันทึกเป็น recovery/reconstruction candidate ใหม่พร้อม baseline ที่ยืนยันได้และทำ independent review ใหม่ ห้ามแอบอ้างว่าเป็น i3 เดิม
- NQR124 cleanup เคยถูกปฏิเสธสำหรับ `/private/tmp/nqr124-runtime-CtRCzt/runtime/`; วันนี้ไม่พบ path แต่ไม่ได้ตรวจ DB/user/process/secret remnants จึง **ห้ามปิด cleanup gate จาก path absence อย่างเดียว** หรือ restart/create DBเพื่อหลบ hold
- BrowserOS neo tooling เคยไม่พร้อม; ไม่ได้ตรวจใหม่รอบ handoff. ก่อน browser work อ่าน skill ที่มีจริง/ตรวจเครื่องมือ หากถูกบังคับใช้แล้ว unavailable ต้องรายงาน ไม่ใช้ CUA/Playwright แทนเงียบ ๆ
- Denied analyzer/PostCSS retry และ denied callbacks ยังไม่ถูกยกเลิก การเปลี่ยนเป็น Claudeไม่ใช่ permission recovery
- Xcode license เป็น local environment blocker ใหม่สำหรับ `git` ที่พบรอบนี้ ให้ผู้ใช้จัดการตามความเหมาะสม ไม่ accept license/sudo แทน
- Bank-app PromptPay UAT, physical scanner/ECI, production acceptance ต้องมีผลจริงจากผู้ใช้/อุปกรณ์ ไม่รับรองแทน

## 8. ลำดับรับช่วงที่แนะนำ

1. ยืนยัน cwd และอ่าน scope; ไม่มี Codex worker active จาก status snapshot ทั้ง10ตำแหน่ง ณ ส่งมอบ ไม่มีการ dispatch งานใหม่ในรอบนี้
2. กู้ exact i3 code + source manifest + artifact/evidence จากสำเนาที่เชื่อถือได้ก่อน; อย่ารัน build/install/cleanup เพื่อแทนของหายโดยไม่มี authority ตรงเป้า
3. ตรวจ report hashes, actual before/after/prep identity แล้วให้ independent TL และ SECURITY review i3 ครบหกกลุ่ม หาก failed ซ่อมเฉพาะ adapter/test ใน snapshotใหม่ตามสิทธิ์เดิม
4. เมื่อทั้งคู่ผ่าน ค่อย Stage B isolated verifier/test/wrapper ตาม NQR129 และ conditional authority ที่อนุมัติแล้ว; reviewer ต้องอิสระจากผู้เขียน
5. สรุป reviewed five-file delta ให้ PM/ผู้ใช้ตัดสิน SOURCE integration แยกจาก build/deploy. ห้ามขยายขอบเขตด้วย generic “ทำต่อ”
6. แก้ prerequisite DB cleanup/browser tooling และดำเนิน built-runtime DB recovery/QA บน candidate identity เดียวกันเมื่ออำนาจ/เครื่องมือพร้อม; จึงค่อยขอ deployment scope พร้อม backup/rollback/post-deploy QA

ไม่ต้องรัน full app suiteเพียงเพราะอ่านเอกสารใหม่ แต่ต้องรัน affected regression และ required acceptance checks จริงบน bytes ที่ถูกต้อง อย่าลด assertions เพื่อทำให้ผ่าน

## 9. Team continuity และการพักงาน

Automation `nqr-engineering-loop` ตรวจไฟล์ configuration แล้วเป็น `PAUSED` ณ 2026-09-16; คงพักเพื่อ handoff ไม่ได้สร้าง/resume automation. ทุก specialist task latest turn completed และ status notLoaded; ไม่มี active worker ที่พบ

| หน้าที่ | Existing task ID | Latest snapshot cursor ที่เกี่ยวข้อง |
|---|---|---|
| PM | `01a047a6-65b5-7cd3-8897-67dd87dbaa07` | task นี้ |
| DEVOPS | `01a047b1-87c6-7b01-b738-4b85197d8913` | `752714b9-015a-473a-b804-28dcdb8a89c7:1` |
| TL | `01a047af-0fbd-7432-9bec-53f4022e57ec` | `1df29285-9342-4b6a-adb3-d2b1d8f158d8:1` |
| SECURITY | `01a047b1-d455-7293-96d6-d774d955a334` | `2ef8fced-55a4-4465-bb6b-86d9a1452ce4:1` |
| QA | `01a047b1-38d5-7dc2-84d7-12a662cb6b82` | `be1f1e71-acc5-401b-b46c-48a240ec3506:1` |
| BACKEND | `01a047b2-4ae5-7192-9111-79095ef71221` | `7a14c66f-4cb2-418e-b698-fa46d7f47708:1` |

Claude อาจไม่มี Codex task tools: IDs เป็น reference ไม่ใช่คำสั่งให้สร้างทีมใหม่ ใช้รายงานที่เก็บใน repo หรือให้ผู้ใช้ประสานช่องทางที่ใช้ได้ รักษาข้อกำหนด reviewer อิสระและไม่เกินสาม worker หากมีการมอบหมายจริง ห้ามปลุกงานประวัติโลโก้/authที่ปิดแล้วซ้ำ

## 10. Prompt ส่งต่อ

> รับช่วง NQR จาก `docs/CLAUDE_HANDOFF.md` อ่านก่อนลงมือ ขณะนี้ Phase 2A release gate ยัง BLOCKED งานล่าสุด NQR130 iteration3 มีรายงานแต่ frozen temp candidate/build/manifest ไม่พบแล้ว เริ่มจากตรวจและกู้หลักฐานในสิทธิ์ read-only ไม่เริ่ม repo ใหม่ ไม่ deploy และไม่ bypass denial แยกสิ่งที่ตรวจวันนี้ได้จากผลย้อนหลัง แล้วเสนอ/ดำเนินขั้นถัดไปที่อยู่ในขอบเขตเดิม โดยถามเฉพาะข้อมูล สิทธิ์ หรือการตัดสินใจใหม่ที่จำเป็นจริง
