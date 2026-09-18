# Runbook — Stage B release gate (`--verify-existing`)

สร้าง 2026-09-18 (Asia/Bangkok) | สำหรับ PM/DEVOPS ที่จะใช้ bundle gate | เอกสารนี้เป็นเงื่อนไข **C1/C2** ที่ SECURITY กำหนดไว้ว่าต้องมีก่อนการ admit หลักฐานครั้งแรก

เอกสารนี้อธิบายวิธีใช้ gate ที่ผ่าน review แล้ว (Stage B iteration 8 canonical5 `1c4bdab39842797014f0d82a224261392dd7a1cfb274ed1e9067764f37c2edb7`) **ไม่ใช่การอนุมัติ deploy** และไม่ได้ทำให้ release พ้นสถานะ BLOCKED เอกสารนี้ไม่ให้สิทธิ์ build, deploy หรือแตะ production เพิ่ม

## 1. gate นี้ปิดอะไรและไม่ปิดอะไร

- **ปิด:** ว่า artifact ที่ระบุตรงกับ manifest ที่ยอมรับ, emission grammar อยู่ในขอบเขตที่ review แล้ว, ไม่มี marker ต้องห้ามใน chunk ที่โหลดตอนเริ่มหน้า, มีหลักฐาน browser timing ที่ผูกกับ artifact เดียวกัน, มี TL/SECURITY/QA ยอมรับ และ origin ใน HTML/sitemap/robots ถูกต้อง
- **ไม่ปิด:** application gate, built-DB gate, physical scanner/accessibility, PromptPay UAT, deploy readiness ผลลัพธ์ PASS แปลว่า "bundle + origin scope ผ่านสำหรับ artifact ชุดนี้" เท่านั้น
- Build ปกติ (`npm run build`) ยัง BLOCKED เสมอ เพราะ artifact ที่เพิ่ง build ยังไม่มีหลักฐานที่ admit

## 2. ก่อนใช้งานครั้งแรก (prerequisite)

1. ห้าไฟล์ของ gate ต้องเป็น bytes ที่ reviewer ยอมรับ ตรวจด้วย canonical5 ข้างบน
2. ต้องมี artifact ที่ build แล้วและไม่ถูกแก้ พร้อม manifest `artifactFull`/`artifactScope`
3. ต้องมีหลักฐาน browser QA ตาม NQR129 §7 ที่เก็บ trace ดิบไว้ และรายงาน review ที่ hash ได้
4. ต้องทำขั้นตอน **C2** ใน §3 ก่อนรัน gate ทุกครั้งที่ dependency อาจเปลี่ยน

## 3. C2 — ตรวจ dependency tree จาก process แยก (ทำก่อนรัน gate)

Dependency pin ใน `build.mjs` เป็นเพียง **drift detection ภายใน process ของ gate** ไม่ใช่ security boundary ผู้ที่เขียน `node_modules`, `scripts/` หรือ `package.json` ของโปรเจกต์ได้อยู่แล้วจะรันโค้ดใน process ของ gate ได้ ดังนั้นต้องตรวจจากภายนอกด้วย

1. ทำ snapshot ของ repo และ `node_modules` แบบอ่านอย่างเดียว (เช่น copy ไปยัง volume/โฟลเดอร์ที่ผู้ใช้ทั่วไปเขียนไม่ได้)
2. ตรวจ tree เทียบกับ `package-lock.json` หรือ integrity ของ registry จาก process แยกที่ไม่โหลด package ใด ๆ **ห้ามใช้ค่าที่ gate print ออกมาแทนขั้นตอนนี้** เพราะ gate อ่าน tree เดียวกับที่ตัวเองจะใช้
3. ตรวจว่าไม่มี `scripts/node_modules` และไม่มี `package.json` ที่ตั้งชื่อว่า `jsdom`, `parse5`, `entities` หรือ `next` เหนือ `scripts/`
4. ตรวจว่า `node` ที่จะใช้เป็นตัวที่เชื่อถือได้ (path เต็ม, ตรวจ checksum ถ้าทำได้) เพราะ gate ตรวจ `node` ปลอมใน PATH ไม่ได้
5. จากนั้นจึงคำนวณ digest เทียบกับค่าที่ pin ไว้:

```bash
env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest
```

ค่าที่ได้ต้องตรงกับ `VERIFY_EXISTING_DEPENDENCIES.sha256` ใน `scripts/build.mjs` ถ้าไม่ตรงแปลว่า tree เปลี่ยน ให้กลับไปทำข้อ 2 แล้วดู §6

## 4. การรัน gate

```bash
env -i PATH="$PATH" NEXT_PUBLIC_APP_URL=https://nqr.orenvis.com \
  node scripts/build.mjs --verify-existing \
  --artifact /absolute/path/to/.next \
  --acceptance /absolute/path/to/acceptance.json
```

- ต้องใช้ `env -i` เพราะ gate ยอมรับเฉพาะ `PATH`, `NEXT_PUBLIC_APP_URL`, `TMPDIR`, `LANG`, `LC_ALL`, `TZ` (และตัวที่ macOS เติมเอง) ตัวแปรอื่นทั้งหมด รวม `NODE_OPTIONS`, `NODE_PATH`, `HOME`, `DYLD_*`, `LD_PRELOAD` จะถูกปฏิเสธ
- ห้ามใส่ Node flag ใด ๆ (เช่น `--no-warnings`) เพราะ `process.execArgv` ต้องว่าง
- ทั้งสอง path ต้องเป็น absolute และห้ามใช้ร่วมกับ `--production`/`--preview`
- โหมดนี้ไม่เรียก `next build`, ไม่เปิด server, browser หรือ DB

**ผลลัพธ์**

| exit | stdout/stderr | ความหมาย |
| --- | --- | --- |
| 0 | `[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval` | bundle + origin scope ผ่านสำหรับ artifact ชุดนี้เท่านั้น |
| 1 | `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` + `reasons: …` | หลักฐานไม่ครบ ไม่ถูก admit หรือยังพิสูจน์ไม่ได้ |
| 1 | `NQR_BUNDLE_STATIC_CHECK_FAILED` + `reasons: …` | พบการละเมิดที่พิสูจน์ได้ เช่น marker ต้องห้ามหรือ timing FAIL |
| 1 | `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` | dependency ไม่ตรง pin (ดู §6) |
| 1 | `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` | มี Node flag หรือ environment ที่ไม่อยู่ใน allowlist |
| 1 | `NQR_ORIGIN_ARTIFACT_CHECK_FAILED` | origin ใน HTML/sitemap/robots ไม่ตรง |
| 1 | `NQR_VERIFY_EXISTING_FAILED` | ข้อผิดพลาดอื่นที่ไม่ระบุรายละเอียด (fail closed) |

Reason code ที่พบบ่อย: `ACCEPTANCE_NOT_ADMITTED`, `ACCEPTANCE_IDENTITY_MISMATCH`, `GATE_REVISION_MISMATCH`, `ORIGIN_NOT_BOUND`, `ADAPTER_STATIC_UNKNOWN`, `ADAPTER_STATIC_VIOLATION`, `FORBIDDEN_INITIAL_MARKER`, `FORBIDDEN_STARTUP_MARKER`, `STARTUP_CHUNKS_NOT_ATTESTED`, `TIMING_EVIDENCE_INCOMPLETE`, `TIMING_EVIDENCE_IDENTITY_MISMATCH`, `TIMING_POLICY_VIOLATION`, `REVIEW_NOT_ACCEPTED`, `INVALID_ACCEPTANCE_RECORD`, `UNREADABLE_GATE_REVISION`

## 5. C1 — ขั้นตอนการ admit หลักฐาน (ทำโดย PM หลัง review)

Record ที่ไม่ถูก admit จะไม่มีทางผ่าน gate การ admit คือการเพิ่ม SHA-256 ของ bytes ของ record ลงใน `ADMITTED_ACCEPTANCE_SHA256` ใน `scripts/verify-initial-bundle-boundary.mjs` ซึ่งเป็น **การแก้ source ที่ต้องผ่าน review**

**รูปแบบของ record** ต้องเป็น JSON แบบ compact ที่ canonical (คือ `JSON.stringify(JSON.parse(text)) === text`) และมี key ครบพอดีตามนี้

| ส่วน | Key ที่ต้องมีพอดี |
| --- | --- |
| root | `expectedInputs`, `gateRevision`, `policyVersion`, `productionOrigin`, `profileId`, `reviews`, `schemaVersion`, `startupChunks`, `timingEvidence` |
| `gateRevision` | `adapterSha256`, `buildWrapperSha256`, `originArtifactsSha256`, `originGateSha256`, `verifierLogicSha256` |
| `timingEvidence` | `artifactFullSha256`, `artifactScopeSha256`, `browser`, `buildId`, `collectedAt`, `evidenceBundleSha256`, `localOrigin`, `policyVersion`, `scenarios`, `schemaVersion` |
| แต่ละ scenario | `id`, `observationsSha256`, `postIdentitySha256`, `preIdentitySha256`, `routes`, `state`, `status` |
| แต่ละ review | `disposition`, `reportSha256`, `reviewedGateRevisionSha256`, `role` |

ข้อกำหนดที่ gate บังคับ: scenario ต้องครบทั้งหกและมีชุด route ตรงตามที่กำหนด (startup และ warm = 22 route, valid preview/empty→valid/non-PDF/PDF = 20 generator route), `collectedAt` ต้องอยู่ในรูป `Date#toISOString()` และ start ≤ end, `localOrigin` ต้องเป็น `http://127.0.0.1:<port>` หรือ `http://localhost:<port>` (port ≤ 65535), review ต้องมี QA, SECURITY และ TL อย่างละหนึ่ง disposition `ACCEPT` และ `reviewedGateRevisionSha256` ต้องเท่ากับ SHA-256 ของ `JSON.stringify(gateRevision)`

**Checklist ก่อนเพิ่ม digest (ต้องบันทึกผลไว้)**

1. QA, TL และ SECURITY ตรวจ `startupChunks` **ทุกรายการ** ว่าไม่มีโค้ดเฉพาะ PDF หรือโค้ดที่ยังไม่ได้ review — gate ตรวจได้แค่ว่า bytes ตรงกับที่สแกนเจอ ไม่ได้ตรวจความหมายของโค้ด
2. ตรวจว่า `gateRevision` ใน record ตรงกับค่าที่ `readGateRevision()` คำนวณจากไฟล์ที่กำลังใช้จริง
3. ตรวจว่า timing evidence มาจาก QA รอบที่ทำกับ artifact ชุดนี้จริง และ `evidenceBundleSha256`/`observationsSha256` ชี้ไปที่ trace ดิบที่เก็บไว้
4. ตรวจว่า `reportSha256` ของแต่ละ review ตรงกับรายงานฉบับที่เก็บใน repo
5. ทำ C2 ใน §3 ให้เสร็จ
6. เพิ่ม digest หนึ่งบรรทัดต่อหนึ่งรายการในรูปแบบ `  "<64 hex ตัวเล็ก>",` เท่านั้น ห้ามใส่โค้ด ห้ามเปลี่ยนรูปแบบ มิฉะนั้น gate จะตอบ `UNREADABLE_GATE_REVISION`
7. รัน `npm run test:scripts` และ lint แล้วให้ reviewer ตรวจ diff ของการ admit
8. การ **revoke** หลักฐานคือการลบ digest ออกจากรายการ ไม่มี flag ใน record

## 6. เมื่อ dependency เปลี่ยน (re-pin)

1. review การเปลี่ยน dependency ตามปกติ (lockfile diff, changelog, integrity)
2. ทำ C2 ใน §3 บน tree ใหม่
3. คำนวณค่าใหม่ด้วย `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest`
4. แก้ `VERIFY_EXISTING_DEPENDENCIES.sha256` แล้วให้ reviewer ตรวจ
5. การแก้ `build.mjs` ทำให้ `gateRevision` เปลี่ยน ดังนั้น **record ที่ admit ไว้เดิมจะใช้ไม่ได้อีก** ต้องออก record และ review ใหม่

## 7. False positive ที่ทราบแล้ว (ทุกกรณี fail closed)

ทั้งหมดนี้แสดงเป็น `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` เฉย ๆ ให้ตรวจก่อนสรุปว่าถูกโจมตี

- ไฟล์ `<ชื่อ package>.js` วางอยู่ข้าง package ที่ติดตั้งจริง
- โฟลเดอร์ว่างหรือโฟลเดอร์ที่ไม่มี `package.json` ที่เหลือจากการ uninstall
- ชื่อ package ที่ชนกันในโฟลเดอร์เหนือ repo หรือใน global folder ของ Node
- `package.json` ในโฟลเดอร์ย่อยของ package ที่ถูกแก้ เช่น `next/dist/compiled/acorn/package.json` (I7-1) ซึ่งทำให้ gate จบด้วย `NQR_VERIFY_EXISTING_FAILED`
- package scope เหนือ `scripts/` ที่ตั้งชื่อชนกับ package ที่ pin แม้จะไม่มี `exports`

## 8. ข้อจำกัดที่ต้องรู้

- **S5-2:** โค้ดที่ preload ผ่าน `NODE_OPTIONS` แล้วลบตัวแปรของตัวเองทิ้งก่อน จะผ่านการตรวจ environment ได้ การรันด้วย `env -i` บนเครื่องที่เชื่อถือได้จึงเป็นเงื่อนไขจริง ไม่ใช่คำแนะนำ
- ไฟล์ที่ถูกสลับระหว่างการ hash กับการ import หรือระหว่างการตรวจสองรอบ พิสูจน์ไม่ได้ด้วยการตรวจแบบ path-based
- `DYLD_*` ถูกโหลดก่อน JavaScript จะเริ่มรัน และ `node` ปลอมใน PATH ตรวจจับไม่ได้
- การสแกน marker เป็นหลักฐานเสริม โค้ด PDF ที่เปลี่ยนชื่อหรือเข้ารหัสจะไม่ถูกจับ จึงต้องมีการตรวจ `startupChunks` ตามข้อ C1
- **Adapter ยังจัด runtime chunk `turbopack-*` ของ artifact จริงเป็น UNKNOWN เสมอ** gate จึงยังผ่านบน build จริงไม่ได้ จนกว่าจะมี runtime model ที่ review แล้วและ build ใหม่
- `COLD_VALID_INITIAL_PREVIEW` ถูกบังคับให้ต้อง PASS ถ้าแอปไม่มี flow นี้ ต้องให้ Product Owner ตัดสินนโยบายก่อน
- เทสต์ bare specifier รู้จัก loader ที่ชื่อ `require` เท่านั้น (O2/I8-1) ถ้ามีการเพิ่ม loader ชื่ออื่นในไฟล์ gate ต้องตรวจด้วยมือ

## 9. อ้างอิง

- ข้อกำหนด: [PHASE2A_RELEASE_GATE_CHANGE_SPEC.md](handoff-evidence/2026-09-16/PHASE2A_RELEASE_GATE_CHANGE_SPEC.md)
- Implementation ล่าสุดและ diff: [Stage B iteration 8](reports/PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_8.md) และ iteration ก่อนหน้าในโฟลเดอร์เดียวกัน
- Review ที่ยอมรับ: [TL](reports/PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_8_TL_REVIEW.md), [SECURITY](reports/PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_8_SECURITY_REVIEW.md)
- สถานะปัจจุบันและสิทธิ์: [Control state](ENGINEERING_LOOP.md#control-state)
