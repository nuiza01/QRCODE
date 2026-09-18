# NQR-129 Stage B iteration 7 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b7/project` (canonical5 ตามรายงานผู้เขียน `a5aef1e5…c73a`)

## Verdict: **ACCEPT (Stage B security scope)**

ACCEPT นี้ไม่ใช่ release readiness และไม่อนุญาตให้ deploy

- **S6-1 ปิดแล้ว:** ทั้ง `scripts/package.json` และ `package.json` ของโปรเจกต์ที่ตั้งชื่อ `jsdom` → `DEPENDENCY_MISMATCH`
- **TL G1 ปิดแล้ว:** ไฟล์ `acorn` ที่ไม่มีนามสกุล → mismatch
- **Variant อื่นที่ขอให้ลอง:** ได้ mismatch หรือ Node ไม่โหลดเลย และไม่พบทางไป exit 0 ใหม่
- **Finding ที่เหลือ:** มีแค่ S5-2 (LOW, documented) กับข้อสังเกตหนึ่งข้อที่ fail-closed (I7-1)

Delta เล็ก (84 บรรทัด) ผมจึงจำกัดขอบเขตไว้ที่ส่วนที่เปลี่ยน

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 (`diff -q` กับ i6 แล้วเหมือนกันทุกไบต์) |
| verify-initial-bundle-boundary.test.mjs | 3f0f3e0b4053e1d5961b63b9d6ad59ad9c825492ee1240e91be43cf8fdeca764 |
| build.mjs | 3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33 |

`diff` ของ `build.mjs` i6→i7 มีเพียง `subpaths`, การเช็คชื่อ package scope, การเช็ค resolver ของ subpath และ JSDoc ไม่ได้แก้ candidate root, `node_modules` ที่ใช้ร่วม หรือ repo จริง probe ทุกตัวใช้สำเนาใน `review-stageb-b7-sec/`

## 2. Commands ที่รันจริง (Node v24.14.1, `env -i PATH TMPDIR NEXT_PUBLIC_APP_URL`)

- `node --test` 4 suite บนสำเนา → 283/283 pass
- `p-setup3.mjs` สร้าง artifact/record ผูก gate revision i7 แล้ว admit 10 digest ในสำเนา `admit/`
- CLI จริง `build.mjs --verify-existing` ตาม matrix ข้างล่าง ใช้ record ที่เขียนเองบนสำเนา pristine หรือ record ที่ admit แล้วบนสำเนา `admit/` สำหรับกรณี `next`

| Probe | ผล | ความหมาย |
| --- | --- | --- |
| Control: pristine + record ที่เขียนเอง | exit1 `ACCEPTANCE_NOT_ADMITTED` | |
| Control: admitted clean | **exit 0** | |
| **S6-1:** `scripts/package.json` `{"name":"jsdom","exports":"./jsdom-self.mjs"}` + shim | exit1 `DEPENDENCY_MISMATCH` | **Fixed** |
| `package.json` ของโปรเจกต์ที่เปลี่ยนเป็น `name: jsdom`, `exports` → shim | exit1 `DEPENDENCY_MISMATCH` | Fixed |
| Scope ชื่อ transitive dep (`symbol-tree`) + `exports` | exit1 `ACCEPTANCE_NOT_ADMITTED` | Node ไม่โหลด: self-reference ใช้กับ specifier ที่ import จาก scope นั้นเท่านั้น และ require ของ jsdom ใช้ scope ของ jsdom (ถูก hash) |
| `package.json` ชื่อ `jsdom` ที่อยู่สูงกว่าโปรเจกต์ | exit1 `ACCEPTANCE_NOT_ADMITTED` | Node ใช้ scope ที่ใกล้ที่สุด (โปรเจกต์) เหมือนกับที่ gate เช็ค |
| `scripts/package.json` ที่ JSON เสีย | exit1 `DEPENDENCY_MISMATCH` | fail-closed |
| `imports: {"#jsdom": …}` ใน scope ชื่ออื่น | exit1 `ACCEPTANCE_NOT_ADMITTED` | ไฟล์ที่ hash ไว้ไม่ใช้ `#` specifier จึงไม่มีผล |
| `scripts/node_modules/package.json` ชื่อ `jsdom` (พยายามใช้ scope ที่ node_modules boundary) | exit1 `ACCEPTANCE_NOT_ADMITTED` | Node ไม่ถือว่าเป็น scope ของ `scripts/*.mjs` |
| `next` ขั้นต่ำ (package.json + `dist/compiled/acorn/*`) กับ admitted clean | **exit 0** | control ของ subpath |
| **G1:** ไฟล์ `…/acorn` ที่ไม่มีนามสกุล (shim) | exit1 `DEPENDENCY_MISMATCH` | **Fixed** |
| `…/acorn.json` | exit 0 (admitted) | Node ไม่โหลดเพราะ `acorn.js` ชนะก่อน ไม่ใช่ bypass |
| `next/dist/compiled/acorn/package.json` ใส่ `"type":"module"` (ไฟล์นี้ไม่ถูก hash) กับ admitted clean/flightPdf | exit1 `NQR_VERIFY_EXISTING_FAILED` | fail-closed ดู I7-1 |
| S5-2: `NODE_OPTIONS=--import=scrub-patch.mjs` | exit 0 | ไม่เปลี่ยน (documented) |

## 3. การวิเคราะห์ส่วนที่เปลี่ยน

- **เช็คชื่อ scope (`build.mjs:59-67`):** เดินขึ้นจาก `scripts/` หา `package.json` แรกแบบเดียวกับการหา scope ของ Node และ Node ใช้ self-reference ได้เฉพาะเมื่อ `name` ตรงและมี `exports` การเช็คของ gate กว้างกว่า (ดูแค่ `name`) จึงปลอดภัย import ทุกตัวที่อยู่บนเส้นทาง gate (`jsdom`, `parse5`, `next/...`) มาจากไฟล์ใน `scripts/` scope เดียวกัน scope ที่อยู่สูงกว่าไม่มีผลเพราะ Node หยุดที่ scope แรกเหมือนกัน
- **เช็ค subpath (`:130-135`):** ใช้ `createRequire(scripts/resolve.js).resolve(specifier)` ซึ่งมี search paths และ scope เดียวกับ `createRequire(VERIFIER_URL)` ที่ verifier และ adapter ใช้โหลด acorn จริง และ `require` กับ `require.resolve` ผ่าน `_resolveFilename` เดียวกัน การเทียบ realpath กับไฟล์ที่ hash จึงบังคับว่า candidate ที่ชนะคือ bytes ที่ pin ส่วน `acorn.js` ไม่มี `require(` จึงไม่ดึงไฟล์อื่น
- **Import แบบ ESM เทียบกับ `resolve.paths` แบบ CJS:** ESM ไม่ลองนามสกุล ไม่ใช้ global folders และเลือก condition `import`/`require` ภายใน `exports` ของ package ที่ hash ทั้ง tree แล้ว digest จึงครอบกว้างกว่า ไม่แคบกว่า

## 4. Findings

### S5-2 — LOW (documented, ไม่เปลี่ยน)

Preload ใน `NODE_OPTIONS` ที่ลบร่องรอยตัวเองยังได้ exit 0 disposition เดิมยังใช้ได้ คือเป็น defense in depth และ runbook ต้องบังคับ `env -i` บนเครื่องและ `node` ที่เชื่อถือได้

### I7-1 — Informational (fail-closed, ไม่ต้องแก้)

`next/dist/compiled/acorn/package.json` ไม่อยู่ใน digest ถ้าแก้ `type` ไฟล์เดียวกันจะถูกตีความเป็น module ประเภทอื่น ผลคือ gate พังเป็น `NQR_VERIFY_EXISTING_FAILED` (exit 1) แม้จะมี record ที่ admit แล้ว ข้อนี้ไม่ใช่การ inject โค้ดและไม่ทำให้ได้ PASS ต้องมีสิทธิ์เขียน `node_modules` ถ้าต้องการให้ผลเป็น mismatch ที่ชัดกว่านี้ ให้เพิ่ม `dist/compiled/acorn/package.json` ใน `files.next` ได้ แต่ไม่จำเป็น

## 5. Class "ผู้เขียน `node_modules`/`scripts/`/package scope ของโปรเจกต์" และ C2

ผมไม่พบกรณีใหม่ในคลาสนี้ที่ทำให้ได้ exit 0 บน i7 ถ้าพบเพิ่มในอนาคต ผมให้ระดับ **LOW** และถือว่า **C2 runbook ครอบไว้พอแล้ว** ไม่จำเป็นต้องเพิ่มโค้ดอีก เหตุผลคือ:

1. Comment และรายงานประกาศชัดแล้วว่า pin เป็น drift detection ไม่ใช่ security boundary
2. Precondition ของทั้งคลาสเท่ากับรันโค้ดในเครื่องที่รัน gate ได้ ซึ่งในตัว process ป้องกันไม่ได้โดยหลักการ (race และ preload ที่ลบร่องรอยตัวเองยังอยู่)
3. C2 กำหนดให้ตรวจ tree จาก process แยกบน snapshot ที่อ่านอย่างเดียวเทียบ lockfile/registry integrity และรันด้วย `env -i` กับ `node` ที่เชื่อถือได้ ซึ่งปิดคลาสนี้ในระดับกระบวนการ

**เงื่อนไขที่ยังต้องมีก่อน admit ครั้งแรก:** runbook C1/C2 ต้องมีอยู่จริง และควรระบุ false positive ที่ fail-closed ด้วย (`<name>.js` ข้าง package, โฟลเดอร์ว่างที่ค้างจากการ uninstall, scope ที่ชื่อชน, `type` ของ acorn ใน I7-1)

## 6. Exit 0 โดยไม่มี record ที่ admit อย่างถูกต้อง

ไม่พบทางใหม่ ทางที่ยังมีคือ S5-2 (คุม environment) และ race ระหว่าง hash กับ import (เขียนไฟล์ระหว่างรัน) ซึ่งเป็นข้อจำกัดที่เอกสารไว้ทั้งคู่ หรือการแก้ reviewed source verifier ไม่เปลี่ยนตั้งแต่ i4 และส่วนที่เปลี่ยนใน i7 เพิ่มได้แค่ throw → exit 1

## 7. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่ได้รัน mutation suite ของผู้เขียนซ้ำ
- ไม่ได้ทดสอบบน Linux หรือ filesystem ที่สนตัวพิมพ์
- ขอบเขตจำกัดตาม delta ส่วนอื่นอ้างผลจาก review i3–i6
- Probe และสำเนาอยู่ใน `review-stageb-b7-sec/{probes,tmp,project,admit,v-*}`
