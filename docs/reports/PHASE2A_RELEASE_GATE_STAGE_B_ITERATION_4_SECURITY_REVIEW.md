# NQR-129 Stage B iteration 4 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b4/project` (canonical5 ตามรายงานผู้เขียน `7fc1ae29…7eef`)

## Verdict: **REQUEST_CHANGES (LOW เท่านั้น; ไม่มีการถดถอยจาก i3)**

เป้าหมายของ iteration นี้คือปิด S1/S2 และบังคับ C2 ในโค้ด แต่ **dependency pin ที่เพิ่มมาถูกเลี่ยงได้ 5 ทาง** ทุกทางได้ `--verify-existing` **exit 0** กับ record ที่เขียนเองและไม่ admit บน verifier ที่ไม่ได้แก้ โดย pin digest ยังตรง:

1. `NODE_PATH` ซึ่งต้องคุม environment เท่านั้น
2. `scripts/node_modules` shadow
3. `node_modules` ที่ซ้อนอยู่ใน package ที่ pin
4. package ที่เป็น symlink แล้วมี dependency ข้างเคียงที่ถูกแก้
5. race ระหว่าง hash กับ import

ข้อ 2–4 ต้องมีสิทธิ์เขียน checkout และข้อ 5 ต้องเขียนพร้อมกันระหว่างรัน precondition ทุกข้อจึงอยู่ในระดับเดียวกับ S1/S2 เดิม (เทียบเท่ากับรันโค้ดได้) ระดับความรุนแรงจึงยังเป็น LOW

ไม่มีการเปลี่ยนแปลงใดเปิดทางไป exit 0 ที่ไม่ต้องใช้ precondition เหล่านี้ ส่วน N1, N3, attestation และ admission ยังทำงานเหมือน i3

แต่ข้อความที่ว่า "S1 ปิดแล้ว" และ "C2 ถูกบังคับในโค้ด" ไม่เป็นจริง ต้องแก้โค้ดหรือแก้ข้อความอ้างก่อน integrate (ดู §6)

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 |
| verify-initial-bundle-boundary.test.mjs | 1df0fcdf8170663e42a2c25790c10655af91814216e0aa0cd5cc137992616bd8 |
| build.mjs | 2f5093cd14186a7dcff5edff9c08f07f929c2c3e986e4323517a47ebe124fbe2 |

ผม diff i3→i4 เอง ผลตรงกับภาคผนวกของผู้เขียน ไม่ได้แก้ candidate root หรือ `node_modules` ที่ใช้ร่วม:
- `cmp` ของ `jsdom/lib/api.js` จริงยังตรงกับเดิม
- ไม่มี `node_modules/canvas` และ `scripts/node_modules` ใน repo จริง
- ทุก probe ใช้สำเนาใน `review-stageb-b4-sec/` ซึ่งมี `node_modules` เป็น directory ของ symlink ไปยัง package จริง ยกเว้น package ที่ต้อง copy

## 2. Commands ที่รันจริง (Node v24.14.1, TMPDIR=`review-stageb-b4-sec/tmp`)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `node --test` 4 suite บนสำเนา `project/` | 282/282 pass |
| 1 | `probes/p-setup3.mjs` สร้าง artifact inert + record ที่ผูก gate revision ของ i4 แล้ว admit 10 digest ใน `admit/` | สร้างได้ |
| 2 | CLI control | pristine + record ที่เขียนเอง → exit1 `ACCEPTANCE_NOT_ADMITTED`; admitted clean → **exit 0**; admitted flightPdf → exit1 `FORBIDDEN_STARTUP_MARKER`; escapedMarker ที่ attest ไม่ครบ → exit1 `STARTUP_CHUNKS_NOT_ATTESTED` |
| 3 | S1 เดิม: สำเนา jsdom ที่ `lib/api.js` patch `Set.prototype.has` | exit1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` (control ที่ไม่แก้ → exit1 `ACCEPTANCE_NOT_ADMITTED` คือ pin ผ่าน) |
| 4 | N1: admission list เป็น env และเป็น IIFE ที่ patch prototype | exit1 `UNREADABLE_GATE_REVISION` / `ACCEPTANCE_NOT_ADMITTED` |
| 5 | N3: `NODE_OPTIONS` แบบ quoted `--import` และ `--experimental_loader` | exit1 ทั้งสองแบบ |
| 6 | Env: `LD_PRELOAD=/nonexistent` → exit1 `UNTRUSTED_RUNTIME`; `DYLD_INSERT_LIBRARIES=/usr/lib/libz.dylib` → exit1 `UNTRUSTED_RUNTIME`; `DYLD_INSERT_LIBRARIES=/nonexistent` → dyld abort 134 ก่อนถึง JS; `LD_AUDIT` และ `NODE_COMPILE_CACHE` → ไม่ถูกปฏิเสธ (เข้าสู่ flow ปกติ) | ดู S4-2 |
| 7 | Bypass A–D (§4) + การตรวจ digest ของแต่ละสำเนาด้วยฟังก์ชัน `dependencyDigest` ที่คัดลอกจาก `build.mjs` | A–D exit 0; digest ของ shadow/nested/symsib **ตรงกับ pin** (s1 ไม่ตรง) |
| 8 | `probes/p-undeclared.cjs` สแกนแบบ static หา require ที่ไม่ได้ประกาศใน closure 40 package | ไม่พบของจริง (มีแต่ false positive จาก regex) |
| 9 | `probes/p-race-swapper.cjs` สลับ `jsdom/lib/api.js` จาก pristine เป็น tampered หลัง N ms | flip@150ms → **exit 0**; 250–800ms → exit1 |

## 3. สถานะของ finding และเงื่อนไขเดิม

| Item | สถานะ |
| --- | --- |
| S1 (LOW) dependency ที่ไม่ได้ pin | **Partially fixed**: จับการแก้ไฟล์ใน package ที่ pin ได้ แต่เลี่ยงได้ด้วย S4-1 A–E |
| S2 (LOW) env ระดับ native/cache | **Partially fixed**: เพิ่ม `DYLD_*`/`LD_PRELOAD` แล้ว แต่ `NODE_PATH`, `LD_AUDIT`, `LD_LIBRARY_PATH` และ `NODE_COMPILE_CACHE` ยังไม่ถูกปฏิเสธ (S4-1 A, S4-2) |
| C1 checklist สำหรับ `startupChunks` | **เพียงพอในระดับ source ถ้ามี runbook ประกอบ**: comment ติดกับ admission list จะเห็นใน diff ทุกครั้งที่ admit แต่ไม่ใช่กลไกบังคับ ต้องให้ PM runbook อ้างถึงและเก็บผลตรวจไว้ใน report ที่ `reportSha256` ชี้ |
| C2 dependency digest ด้วย process แยก + runtime ที่เชื่อถือได้ | **ยังไม่พอ**: การเช็คใน `build.mjs` เป็นการเช็คใน process เดียวกัน ไม่ใช่ process แยกที่ไม่โหลด package ตามที่ C2 ขอ และหลบได้ตาม §4 ข้อความที่ว่า "C2 ถูกบังคับด้วย S1 ในโค้ด" ไม่เป็นจริง |
| N1, N3, N2 attestation, TL R3 (ถอด `Object.isFrozen`) | ยังใช้ได้ grammar บังคับข้อความ `Object.freeze(` และมีการเทียบรายการ runtime กับ source อยู่แล้ว การถอดเช็คนี้จึงไม่ลดความปลอดภัย |

## 4. S4-1 — LOW: dependency pin ถูกเลี่ยงได้ขณะที่ digest ยังตรง

ตำแหน่ง: `build.mjs` `dependencyDigest` (`resolvePackage` เริ่มค้นจาก `projectRoot`, `hashTree` ข้ามทุก directory ชื่อ `node_modules`, ไม่ตรวจ symlink ของตัว package, ไม่ครอบ package ที่ไม่ได้ติดตั้ง) และ `verifyExisting` (เช็ค env แค่ `NODE_OPTIONS`/`DYLD_*`/`LD_PRELOAD`)

ทุก probe ใช้ shim ที่ patch `Set.prototype.has` แล้ว re-export module จริง ทุกกรณีรันด้วย verifier ที่ไม่ได้แก้ และ record `clean` ที่เขียนเองและไม่ admit:

| ID | วิธี | Precondition | ผล |
| --- | --- | --- | --- |
| A | `NODE_PATH=<dir>/` ที่มี `canvas/` ซึ่ง `jsdom/lib/jsdom/utils.js` ทำ `try { require("canvas") }` เป็น optional peer ที่ไม่ได้ติดตั้ง resolver ของ pin จึงข้าม แต่ CJS ของ Node หาใน `NODE_PATH` | ควบคุม env ได้อย่างเดียว ไม่ต้องเขียน checkout | **exit 0** |
| B | `scripts/node_modules/jsdom` (shim) การ resolve ESM ของ verifier/origin เริ่มจาก `scripts/` แต่ resolver ของ pin เริ่มจาก `projectRoot` | เขียน `scripts/` ได้ (ไม่ใช่ไฟล์ที่อยู่ใน gate revision) | **exit 0**, digest ตรง |
| C | `node_modules/jsdom/lib/node_modules/symbol-tree` (shim) ใน jsdom ที่ byte-identical เพราะ `hashTree` ข้าม `node_modules` ทุกระดับ แต่ Node resolve จาก `jsdom/lib/...` เจอก่อน | เขียน `node_modules` ได้ | **exit 0**, digest ตรง |
| D | `node_modules/jsdom` เป็น symlink ไปยัง `evil/node_modules/jsdom` (สำเนาที่ไม่แก้) ที่มี `evil/node_modules/symbol-tree` เป็น shim pin hash ต้นไม้ผ่าน symlink และ resolve dependency จาก path ของ project ส่วน Node ใช้ realpath จึง resolve dependency จาก `evil/node_modules` | เขียน `node_modules` ได้ | **exit 0**, digest ตรง |
| E | Race: `api.js` เป็นไฟล์เดิมตอน hash แล้วถูกเปลี่ยนก่อน import | เขียนพร้อมกันระหว่างรัน | **exit 0** (flip@150ms, 1 ใน 6 ครั้ง) |

- Case-folding: APFS ไม่สนตัวพิมพ์ ชื่อเดียวกันจึงชี้ entry เดียวกัน และทั้ง pin กับ Node อ่าน bytes เดียวกัน ไม่พบ bypass
- Hardlink: `isFile()` เป็นจริงและ hash ตาม content ผลเหมือน E (ต้องแก้ระหว่างรัน) ไม่มีช่องเพิ่ม
- Require ที่ไม่ได้ประกาศ: static scan ไม่พบ ช่องที่คล้ายกันคือ optional/peer ที่ไม่ได้ติดตั้ง (A)

ข้อเสนอแก้ (ทำขั้นต่ำให้ข้อความอ้างตรงกับความจริง หรือทำครบเพื่อให้ปิด S1/S2 ได้จริง):
1. ปฏิเสธ env ด้วย allowlist แทน denylist: verify-existing ยอมเฉพาะ `PATH`, `HOME`, `TMPDIR`, `NEXT_PUBLIC_APP_URL`, `NQR_DEPLOY_TARGET`, `VERCEL*` ที่จำเป็น หรืออย่างน้อยต้องปฏิเสธ `NODE_PATH`, `NODE_COMPILE_CACHE`, `LD_*` และ `DYLD_*` ทั้งหมด
2. ปฏิเสธถ้ามี `node_modules` ใน `scripts/` หรือใน ancestor ใดระหว่างไฟล์ที่ import กับ `projectRoot` นอกเหนือจาก `projectRoot/node_modules`
3. ใน `hashTree` ถ้าเจอ `node_modules` ซ้อนที่ไม่ใช่ directory ของ dependency ที่ resolve แล้ว ให้ throw (อย่าข้าม)
4. `lstat` package dir และทุก ancestor ถึง `projectRoot/node_modules`: ถ้าเป็น symlink หรือ `realpath` ไม่เท่ากับ path แบบ lexical ให้ throw ถ้าต้องรองรับ `node_modules` ที่เป็น symlink ทั้งก้อน ให้ใช้ realpath เป็นฐานของการ resolve
5. ระบุใน code/report ว่า race (E) พิสูจน์ในตัว process ไม่ได้ ถ้าต้องการ C2 จริงต้องรัน verify-existing บน snapshot ของ checkout และ `node_modules` ที่ operator เป็นเจ้าของและเขียนไม่ได้ หลังตรวจ digest ด้วย process แยก

## 5. S4-2 — LOW (informational): refusal ของ env loader ทำงานหลังจาก loader ทำงานไปแล้ว

`DYLD_INSERT_LIBRARIES` ถูก dyld โหลดก่อน JS จะเริ่ม (probe กับ lib ที่ไม่มีอยู่จริง → abort 134 ก่อนถึงเช็ค) ถ้า dylib เป็นของผู้โจมตีจริงก็ลบ env ตัวเองได้ก่อน `build.mjs` จะตรวจ เช็คนี้จึงจับได้เฉพาะความผิดพลาดโดยไม่ตั้งใจ ส่วน `LD_AUDIT`/`LD_LIBRARY_PATH` (Linux) และ `NODE_COMPILE_CACHE` ยังไม่ถูกปฏิเสธ ข้อเสนอ: ใช้ allowlist ตาม S4-1 ข้อ 1 และเขียนว่าการเช็คนี้เป็น hygiene ไม่ใช่ security boundary

## 6. สิ่งที่ต้องทำก่อน ACCEPT

ทำอย่างใดอย่างหนึ่ง:
- **(a) ซ่อมตาม S4-1 ข้อ 1–4** แล้วเพิ่มเทสต์ CLI สำหรับ A–D และปรับข้อความให้ race (E) กับ S4-2 เป็นข้อจำกัดที่เอกสารไว้
- **(b) ไม่แก้โค้ด** แต่แก้รายงาน/comment ให้ระบุว่า dependency pin เป็น **drift detection** ไม่ใช่ security boundary และเขียนขั้นตอน C2 ใน runbook: operator ตรวจ digest ด้วย process แยกบน snapshot ที่เขียนไม่ได้ รันด้วย env ที่ allowlist ไว้ และไม่มี `scripts/node_modules` ถ้าเลือกทางนี้ ผมจะยอมรับ S4-1/S4-2 เป็น LOW residual ได้

## 7. สิ่งที่ตรวจแล้วว่ายังใช้ได้

- ถ้าไม่มี precondition ข้างต้น record ที่เขียนเองยังได้ exit 1 เสมอ admission grammar (N1), attestation (N2), fixed codes และ re-verify ทำงานเหมือน i3 ส่วน record ที่ admit จริงยังได้ exit 0 และ violation ยังเป็น FAIL
- `dependencyDigest` ใช้เฉพาะ builtin และรันก่อน import verifier จับการแก้ไฟล์ใน package ที่ pin ได้จริง (S1 เดิม → `DEPENDENCY_MISMATCH`) และถ้าเจอ symlink **ภายใน** ต้นไม้ package จะ throw
- Error ของ pin เป็น fixed code (`.catch(() => null)`) ไม่รั่ว path

## 8. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่มี Next build จริงหรือ browser
- ไม่ได้รัน mutation suite ของผู้เขียนซ้ำ
- Race probe เป็นแบบความน่าจะเป็น (1/6) ผลขึ้นกับความเร็วเครื่อง
- ไม่ได้ทดสอบ `LD_AUDIT`/`LD_LIBRARY_PATH` บน Linux และไม่ได้สาธิต `NODE_COMPILE_CACHE` แบบแก้ cache จริง
- Static scan ของ require ที่ไม่ได้ประกาศเป็นการประมาณด้วย regex
- Probe และสำเนาอยู่ใน `review-stageb-b4-sec/{probes,tmp,project,admit,s1,s1ctl,shadow,nested,symsib,evil,evilpath,race,g-env,g-iife}`
