# PM — integrate Stage A/B release gate เข้า SOURCE

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (PM) | SOURCE integration ของ candidate ห้าไฟล์

**ผล: integrate สำเร็จ ห้าไฟล์ใน `scripts/` เป็น bytes ชุดเดียวกับที่ TL และ SECURITY ยอมรับ เทสต์ script ของ repo ผ่าน 299/299 และ lint สะอาด ไม่ได้ commit ไม่ได้ build ไม่ได้ deploy และ release ยัง BLOCKED**

## 1. Authority

- 2026-09-10 ผู้ใช้อนุมัติ workflow ห้าไฟล์ตาม NQR129 โดย integrate ได้เฉพาะ delta ที่ผ่าน review แล้ว
- 2026-09-17 ผู้ใช้เลือกให้ Claude subagent ทำ independent review และให้ปิด finding ระดับ P3/LOW ก่อน integrate
- 2026-09-18 ผู้ใช้เลือก "เขียน runbook C1/C2 ก่อน แล้วค่อย integrate" จึงเขียน [RELEASE_GATE_RUNBOOK.md](../RELEASE_GATE_RUNBOOK.md) ก่อน แล้วจึง integrate
- ไม่มี commit/push, build, typegen, server, browser, DB, deploy หรือการแตะ production ในงานนี้

## 2. Bytes ที่นำเข้า

Stage B iteration 8, canonical5 `1c4bdab39842797014f0d82a224261392dd7a1cfb274ed1e9067764f37c2edb7` ยอมรับโดย [TL](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_8_TL_REVIEW.md) `09b714a9…2220` และ [SECURITY](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_8_SECURITY_REVIEW.md) `e650fc6a…d47c`

| ไฟล์ใน `scripts/` | SHA-256 | สถานะ |
| --- | --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` | ใหม่ |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` | ใหม่ |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` | แทนที่ `a48002f4…3650` |
| verify-initial-bundle-boundary.test.mjs | `c253599162ba7a7b4ddca001e4bd52893d393369cc02ce53cd9cc7ac5458f161` | แทนที่ `c7c26601…e240` |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` | แทนที่ `584dce0c…1ecf` |

หลัง integrate ยืนยันว่า canonical5 ที่คำนวณจากไฟล์จริงใน `scripts/` เท่ากับค่าที่ reviewer ยอมรับ

## 3. Source inventory

- ก่อน integrate: SOURCE185 = `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df` (ตรวจสดวันนี้ก่อนแก้)
- หลัง integrate: 185 path เดิม (สามไฟล์เปลี่ยน) = **`99f67d496e87f7503a1b30c87ef3720ae1c33c13433c4abc4d3733ee8e5167c3`**
- หลัง integrate รวมสองไฟล์ใหม่ = **`84ac6925b973d4423972a7f0c6ec4a53c9ad0fee66583c758dbbb22ef8e92982`** (เรียงตาม path, rows `{sha256,path}`, compact JSON)
- ใช้ค่าใหม่นี้แทน SOURCE185 สำหรับงานหลังจากนี้ ส่วน SOURCE185 ยังเป็นค่าอ้างอิงของหลักฐานเก่า
- ไม่มีการแก้ package, lock, schema, migration หรือโค้ดแอปพลิเคชัน

## 4. Backup และการย้อนกลับ

- สำเนาไฟล์เดิมสามไฟล์อยู่ใน `scratchpad/integration-backup/scripts/` (อาจถูกล้างพร้อม `/private/tmp`)
- **วิธีย้อนกลับที่ทนกว่า:** ใช้ diff ในรายงาน iteration 8 → 7 → 6 → 5 → 4 → 3 → 2 และ [Stage B](PHASE2A_RELEASE_GATE_STAGE_B.md) แบบย้อนทาง (`patch -R -p1`) จะได้ไฟล์เดิมทั้งสาม แล้วลบสองไฟล์ใหม่ออก ผลลัพธ์ต้องกลับไปตรง `584dce0c…`, `a48002f4…`, `c7c26601…` และ SOURCE185 `3b0c6a72…00df`
- วิธีนี้พิสูจน์แล้ววันนี้ เพราะ candidate ทั้งหมดถูกสร้างใหม่จาก diff ชุดเดียวกันหลัง `/private/tmp` ถูกล้าง และได้ canonical5 ตรงทุกขั้น

## 5. Verification หลัง integrate (ในเครื่อง, Node v24.14.1)

- `npm run test:scripts`: **299/299 ผ่าน** ไม่มี fail/skip/todo (284 จาก gate suite + 15 จาก `check-migration-drift`)
- `npm run lint`: ผ่าน ไม่มี output
- `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest` = `753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c` ตรงกับ pin
- ไม่ได้รัน vitest ของแอป เพราะไม่มีไฟล์ใน `src/` เปลี่ยน และ `.mjs` ไม่อยู่ใน include ของ tsconfig/vitest

## 6. พฤติกรรมหลัง integrate

- `npm run build` ยังจบด้วย BLOCKED เหมือนเดิม (verifier แบบไม่มี options)
- โหมดใหม่ `--verify-existing` ต้องใช้ตาม [runbook](../RELEASE_GATE_RUNBOOK.md) และจะ BLOCKED เสมอจนกว่าจะมี acceptance record ที่ admit ผ่านการแก้ source ที่ review แล้ว (`ADMITTED_ACCEPTANCE_SHA256` ยังว่าง)
- Gate ยังผ่านบน artifact Turbopack จริงไม่ได้ เพราะ adapter จัด runtime chunk เป็น UNKNOWN

## 7. ขั้นถัดไปที่ต้องให้ผู้ใช้ตัดสิน

1. สิทธิ์ build จริงและ browser QA ตาม NQR129 §7 (BrowserOS neo ยังเชื่อมต่อไม่ได้)
2. runtime model ของ Turbopack chunk เพื่อให้ gate ประเมิน artifact จริงได้
3. นโยบาย `COLD_VALID_INITIAL_PREVIEW`
4. NQR124 cleanup gate ที่ยังเปิดอยู่
5. เส้นทางไปสู่ Gmail login บนเว็บจริง (build → QA กับ MariaDB → deploy → ทดสอบ login โดยผู้ใช้)
