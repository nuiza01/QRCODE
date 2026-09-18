# PM — แผนสำหรับ gate ที่เหลือหลัง integrate release gate

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (PM) | เอกสารวางแผน ไม่ใช่การขอสิทธิ์โดยปริยาย

ผู้ใช้สั่ง "ทำต่อทุกข้อ" หลัง [integrate release gate](PM_PHASE2A_RELEASE_GATE_SOURCE_INTEGRATION.md) เอกสารนี้แยกว่าอะไรทำได้แล้ว อะไรติดสิทธิ์ และอะไรติดเครื่องมือ ตาม CLAUDE_HANDOFF §4/§7 คำว่า "ทำต่อ" แบบกว้างไม่ใช่การให้สิทธิ์ build, browser, DB หรือ deploy

## 1. Browser QA และเครื่องมือ neo

- **สถานะ:** MCP server `browseros-neo` เชื่อมต่อไม่สำเร็จใน session นี้ (ConnectionRefused) จึงยังทำ browser QA ตาม NQR129 §7 ไม่ได้
- ตามข้อกำหนดเดิม ห้ามสลับไปใช้ CUA/Playwright แทนเงียบ ๆ ถ้าจะใช้เครื่องมืออื่นต้องเป็นการตัดสินใจของผู้ใช้
- **ทำได้ทันทีเมื่อเครื่องมือพร้อมและได้สิทธิ์:** เก็บหลักฐานหกฉากตาม runbook §5 โดยแต่ละฉากต้องมี route ครบตามชุดที่ gate บังคับ, trace ดิบ, digest ของ trace, identity ก่อน/หลัง และ local origin
- **สิ่งที่ต้องได้จากผู้ใช้:** ทำให้ neo เชื่อมต่อได้ หรืออนุมัติเครื่องมืออื่นอย่างชัดเจน

## 2. Runtime model ของ Turbopack (ทำให้ gate ตรวจ artifact จริงได้)

- **ปัญหา:** adapter จัด chunk `static/chunks/turbopack-*` เป็น `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` เสมอ ผลของ artifact จริงจึงเป็น UNKNOWN ตลอด แม้ Stage B จะผ่าน review แล้ว
- **สิ่งที่ต้องทำ:** build จริงที่ไม่ถูกแก้ แล้วอ่าน runtime chunk เพื่อสร้าง reviewed runtime profile ตาม NQR129 §5 (registry/cache/install, context methods, chunk URL, retries, queue, `otherChunks`/`runtimeModuleIds`) จากนั้นแก้ adapter ใน candidate root แยก ผ่าน review อิสระ แล้วจึง integrate
- **ขอบเขตไฟล์:** อยู่ในห้าไฟล์เดิม (adapter + test) จึงไม่ขยาย scope
- **สิ่งที่ต้องได้จากผู้ใช้:** สิทธิ์ build จริงในพื้นที่แยก (ไม่ใช่ deploy) เพื่อให้มี artifact เป็นตัวอย่างและเป็น fixture ของ acceptance

## 3. นโยบาย `COLD_VALID_INITIAL_PREVIEW`

- **ผลตรวจจากโค้ดวันนี้:** แอปไม่มี flow นี้ `Generator` เริ่มด้วย `emptyDrafts()` ทุกชนิด (`src/components/generator/drafts.ts:118`), รับแค่ `initialType` และไม่อ่านค่าจาก query string, cookie หรือ storage (`src/components/generator/Generator.tsx:90-123`) preview และ Test Scan จะ mount เฉพาะเมื่อ payload ผ่าน validation
- **ผลต่อ gate:** ฉากนี้ถูกบังคับให้ต้อง PASS ถ้าปล่อยไว้ gate จะ BLOCKED ตลอดไป เพราะ QA เก็บหลักฐานฉากนี้ไม่ได้
- **ทางเลือก:** (ก) ให้ฉากนี้เป็น `NOT_APPLICABLE` ได้ โดยผูกกับ source inventory digest เพื่อให้กลับมาบังคับอัตโนมัติถ้าแอปมี flow นี้ในอนาคต (ข) เพิ่ม flow prefill ในแอปแล้วเก็บหลักฐานจริง (เปลี่ยนโค้ดแอป) (ค) คงไว้อย่างเดิมและยอมรับว่า gate ผ่านไม่ได้
- **สิ่งที่ต้องได้จากผู้ใช้:** เลือกแนวทาง ถ้าเลือก (ก) จะเป็น Stage B iteration ใหม่ + review อิสระ

## 4. NQR124 cleanup gate

- **สถานะ:** path runtime เดิมไม่มีแล้ว และ `ps` ไม่พบ process ที่เกี่ยวข้อง พบเพียง Homebrew `mysqld` ของเครื่องที่ datadir `/opt/homebrew/var/mysql` ซึ่งไม่ได้แตะ
- **ที่ยังพิสูจน์ไม่ได้:** DB, user, grant และ secret ที่อาจค้าง เพราะต้องเข้าถึง DB ด้วย credential ซึ่งอยู่นอกสิทธิ์ปัจจุบัน และ cleanup ของ path เดิมเคยถูกปฏิเสธ
- **สิ่งที่ต้องได้จากผู้ใช้:** สิทธิ์อ่าน DB แบบจำกัดเพื่อตรวจ remnant (เช่น รายชื่อ schema/user ที่ขึ้นต้นด้วย nqr) และถ้าพบ ต้องมีสิทธิ์ cleanup ที่ระบุเป้าหมายชัดเจน ห้ามตีความจากการที่ path หายไปว่าสะอาดแล้ว

## 5. เส้นทางไปสู่ Gmail login บนเว็บจริง

ลำดับที่ต้องผ่านทีละขั้น แต่ละขั้นต้องมีสิทธิ์แยก

1. Build จริงในพื้นที่แยก → ได้ artifact ที่ freeze ไว้ (ข้อ 2 ใช้ร่วมกัน)
2. QA กับ MariaDB ในเครื่อง: migration, fault/recovery, session lifecycle (สิทธิ์ local DB เคยได้ แต่ยังติด prerequisite ข้อ 4)
3. Browser QA ตาม NQR129 §7 (ข้อ 1)
4. PM admit หลักฐานตาม runbook §5 แล้วรัน `--verify-existing` บน artifact ชุดนั้น
5. Deploy พร้อม backup/rollback และ post-deploy QA (ต้องมีสิทธิ์ใหม่)
6. ผู้ใช้ทดสอบ login ด้วยบัญชี Google จริง เพราะรับรองแทนไม่ได้

**ข้อเท็จจริงล่าสุดที่ยังไม่เปลี่ยน:** deploy รอบ 2026-09-01 ล้มเหลวที่ขั้นอ่าน session หลัง callback ของ Google และถูก rollback ไปแล้ว โค้ด auth ที่ซ่อมหลังจากนั้นผ่านเฉพาะการทดสอบแบบ offline

## 6. สรุปสิทธิ์ที่ต้องขอ (ถามทีละข้อ)

| ลำดับ | สิ่งที่ขอ | ปลดล็อกอะไร |
| --- | --- | --- |
| 1 | นโยบาย `COLD_VALID_INITIAL_PREVIEW` | ทำให้ gate มีทางผ่านได้จริง (ไม่ต้องใช้สิทธิ์ใหม่) |
| 2 | สิทธิ์ build จริงในพื้นที่แยก | runtime model + artifact สำหรับ QA |
| 3 | เครื่องมือ browser ที่ใช้ได้ | หลักฐาน timing หกฉาก |
| 4 | สิทธิ์ตรวจ/ล้าง DB remnant ของ NQR124 | ปิด cleanup gate และปลดล็อก DB QA |
| 5 | สิทธิ์ deploy พร้อม rollback | ทดสอบ Gmail login บนเว็บจริง |

## 7. อัปเดตวันเดียวกัน (2026-09-18) หลังตรวจเพิ่มแบบอ่านอย่างเดียว

### ข้อ 2 — ไม่ต้องรอสิทธิ์ build อีกต่อไป (บางส่วน)

พบ Turbopack browser runtime chunk ของจริงที่ถูก emit ไว้แล้วในแพ็กเกจ next 16.3.1 ที่ติดตั้งอยู่ (`node_modules/next/dist/bundle-analyzer/_next/static/chunks/turbopack-0_jd6_0ca14du.js`) จึงอ่าน semantics ของ startup ได้ครบโดยไม่ต้อง build ดู [PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md](PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md) สิ่งที่ยังต้องใช้ build จริงเหลือแค่ artifact ของ NQR เองเพื่อเป็นหลักฐานยอมรับ

### ข้อ 4 — ผลตรวจ remnant แบบไม่แตะ DB

- เซิร์ฟเวอร์ที่รันอยู่มีตัวเดียว: Homebrew MySQL (`/opt/homebrew/opt/mysql/bin/mysqld`) datadir `/opt/homebrew/var/mysql`
- ชื่อ schema ใน datadir นั้น: `artwell_admin_v2_local`, `artwell_booking_test_20260914`, `artwell_local`, `artwell_pos_local`, `grp`, `mysql`, `performance_schema`, `sys` — **ไม่มีชื่อที่ขึ้นต้นหรือมีคำว่า nqr**
- MariaDB 10.11 ติดตั้งไว้แต่ไม่มี datadir จึงไม่เคยถูกใช้เก็บข้อมูล
- ยังพิสูจน์ไม่ได้ด้วยวิธีนี้: user/grant ที่อยู่ในสคีมา `mysql` และ secret ในไฟล์ตั้งค่าแอป ทั้งสองอย่างต้องเข้าถึง DB หรืออ่านไฟล์ลับซึ่งอยู่นอกสิทธิ์ปัจจุบัน ดังนั้น **cleanup gate ยังไม่ปิด** และห้ามสรุปว่าสะอาดจากการที่ไม่พบ schema

## 8. ของค้างที่พบเพิ่ม (2026-09-18) — source inventory pin ล้าสมัยหลัง integrate

`SUPPORTED_PROFILE.sourceInventorySha256` ใน `scripts/inspect-turbopack-emission.mjs` ยังเป็น `3b0c6a72…00df` ซึ่งคือ SOURCE185 **ก่อน** integrate release gate แต่ manifest 185 path รวมไฟล์ใน `scripts/` ด้วย หลัง integrate ค่าจริงคือ `99f67d49…67c3` (185 path เดิม) หรือ `84ac6925…2982` (รวมสองไฟล์ใหม่)

ผลที่ตามมา: record ที่จะ admit ต้องประกาศ `expectedInputs.sourceInventorySha256` ให้ตรงกับค่าที่ pin ไว้ ไม่งั้น adapter จะออก diagnostic `INPUT_LINEAGE_MISMATCH` (UNKNOWN) แล้ว gate จบที่ `ADAPTER_STATIC_UNKNOWN` ดังนั้น **การ admit ครั้งแรกจะบล็อกแน่นอน** จนกว่าจะอัปเดตค่านี้

ทางแก้ที่ถูกต้อง: อัปเดต pin พร้อมกับรอบ build จริง (ค่าต้องมาจากต้นไม้ที่ใช้ build artifact ชุดนั้น) เป็นการแก้ไฟล์ adapter ซึ่งอยู่ในขอบเขตห้าไฟล์เดิม ต้องผ่าน review อิสระ ห้ามแก้ล่วงหน้าแบบเดา เพราะค่าจะเปลี่ยนอีกเมื่อโค้ดเปลี่ยน
