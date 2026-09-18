# NQR-129 Stage B iteration 8 — Independent SECURITY review (test-only delta)

วันที่ 2026-09-18 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b8/project` (canonical5 ที่ coordinator ส่งมา `1c4bdab3…edb7`)

## Verdict: **ACCEPT (Stage B security scope)**

ACCEPT นี้ไม่ใช่ release readiness และไม่อนุญาตให้ deploy

- ไฟล์ runtime ทั้งสี่ **byte-identical กับ iteration 7** ตาม SHA-256 ที่ผมรับไว้แล้ว การยอมรับด้าน security ของ i7 จึงยังใช้ได้กับ bytes ชุดนี้
- Delta เป็นเทสต์ล้วน (78 บรรทัด) ไม่เพิ่มความเสี่ยง: อ่านไฟล์ gate ด้วย `readFile` แล้ว parse ด้วย acorn ไม่ execute ไฟล์ gate ไม่ spawn ไม่เขียนไฟล์ ไม่มี network
- Finding ที่เหลือคือ S5-2 (LOW, documented) จาก i7 และข้อสังเกตเรื่องขอบเขตของเทสต์ (I8-1, informational)

## 1. Identity

ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 | เทียบกับ i7 |
| --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | เหมือน |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | เหมือน |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | เหมือน |
| build.mjs | 3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33 | เหมือน |
| verify-initial-bundle-boundary.test.mjs | c253599162ba7a7b4ddca001e4bd52893d393369cc02ce53cd9cc7ac5458f161 | **เปลี่ยน** (ไฟล์เดียว) |

ค่าสี่ไฟล์แรกตรงกับที่ระบุไว้ในรายงาน SECURITY review ของ i7 (`90742e19…d54a`) ทุกตัว root เดิมของ i7 ถูกลบไปพร้อม `/private/tmp` การเทียบจึงใช้ SHA-256 ที่บันทึกไว้ ซึ่งเพียงพอสำหรับข้อสรุปว่า runtime ไม่เปลี่ยน

ผมไม่ได้แก้ candidate root, `node_modules` ที่ใช้ร่วม หรือ repo จริง งานทั้งหมดอยู่ใน `review-stageb-b8-sec/`

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR ใต้ไดเรกทอรีของผมเอง)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `shasum -a 256` ห้าไฟล์ ก่อน/หลัง | ตรงทั้งหมด |
| 1 | อ่าน `rebuild/b7-b8.diff` ทั้งไฟล์ (78 บรรทัด) | เป็นเทสต์ล้วน |
| 2 | `node --test` 4 suite บนสำเนา | **284/284 pass** (i7 คือ 283 เพิ่มมา 1 ตัว) |
| 3 | รันเฉพาะเทสต์ใหม่ | pass, 28.5ms, TMPDIR ว่างหลังรัน |
| 4 | Mutation 3 แบบ เพื่อดูว่าเทสต์ไม่ใช่ของว่างเปล่า | ทุกแบบ **fail** ตามที่ควร |

Mutation ที่ใช้:
- เพิ่ม `import "lru-cache";` ใน `origin-gate.mjs` → fail (`unpinned`)
- เพิ่ม `await import(\`js${"dom"}\`)` ใน `verify-origin-artifacts.mjs` → fail (`unanalysable`)
- เปลี่ยนชื่อตัวแปร `require` ใน `build.mjs` เป็น `req` แล้วเพิ่ม `req("lru-cache")` → fail แต่ fail ด้วยเหตุผลอ้อม ดู I8-1

## 3. การวิเคราะห์ความเสี่ยงของเทสต์ใหม่

- **ไม่ execute โค้ด gate:** ใช้ `readFile` + `acorn.parse` แล้วเดิน AST อ่านค่าคงที่ `VERIFY_EXISTING_DEPENDENCIES` จาก AST ของ `build.mjs` (ไม่ได้ `import` เพื่อดึงค่า) จึงไม่รัน `build.mjs`
- **โหลดอะไรเพิ่ม:** มีเพียง `createRequire(import.meta.url)("next/dist/compiled/acorn/acorn")` ซึ่งเป็น parser ตัวเดียวกับที่ gate ใช้อยู่แล้วและอยู่ใน pin (`subpaths`) ส่วน `isBuiltin`/`createRequire` เป็น builtin ของ Node ไม่มี dependency ใหม่ ไม่มี spawn, network, fs write หรือการอ่านนอก `scripts/`
- **เป็นเทสต์เท่านั้น:** ไม่มีโค้ด production อ้างถึง และไม่เปลี่ยนพฤติกรรมของ `--verify-existing` (runtime bytes เท่าเดิม)
- **คุณค่าเชิงป้องกัน:** ถ้าอนาคตมีการเพิ่ม bare specifier ที่ไม่อยู่ใน pin หรือเปลี่ยนเป็น specifier แบบ dynamic เทสต์จะ fail ซึ่งช่วยกันการขยาย attack surface ของ dependency โดยไม่ตั้งใจ

## 4. Findings

### S5-2 — LOW (carried จาก i5–i7, documented, ไม่เปลี่ยน)

Preload ใน `NODE_OPTIONS` ที่ลบร่องรอยตัวเองยังได้ exit 0 ตามที่ comment ระบุว่าเป็น defense in depth runbook ต้องบังคับ `env -i` บนเครื่องและ `node` ที่เชื่อถือได้ (ไม่ได้รันซ้ำใน iteration นี้เพราะ runtime bytes ไม่เปลี่ยน)

### I8-1 — Informational (ขอบเขตของเทสต์ ไม่ใช่ความเสี่ยงของ bytes ปัจจุบัน)

ตัวสแกนจับ `require(...)` เฉพาะเมื่อชื่อตัวแปรคือ `require` ถ้าไฟล์ gate ในอนาคตเขียนเป็น `const req = createRequire(...)` แล้วเรียก `req("pkg")` specifier นั้นจะมองไม่เห็น ใน mutation ที่ผมลอง เทสต์ยัง fail แต่เพราะ assertion `buildOnlySeen` ที่บังคับว่าต้องเจอ `build.mjs:next/dist/bin/next` พอดี ไม่ใช่เพราะจับ `req("lru-cache")` ได้ ไฟล์ gate ชุดนี้ใช้ชื่อ `require` ทั้งหมด จึงไม่มีผลกับ bytes ที่ freeze แล้ว ถ้าจะปิดช่องนี้ ให้ตามตัวแปรที่รับค่าจาก `createRequire(...)` หรือ assert ว่าไฟล์ gate ต้องตั้งชื่อว่า `require` เท่านั้น

## 5. ขอบเขตและข้อจำกัด

- ผมไม่ได้รัน probe ด้าน security ซ้ำทั้งชุด (admission grammar, attestation, dependency pin, environment) เพราะ runtime bytes ทั้งสี่ไฟล์เหมือน i7 ทุกไบต์ ข้อสรุปเหล่านั้นยกมาจากรายงาน i7 (`90742e19…d54a`)
- ไม่ได้ตรวจสอบกระบวนการ rebuild ของ coordinator ด้วยตัวเอง แต่ SHA-256 ของห้าไฟล์ตรงกับที่คาด ซึ่งเป็นสิ่งที่ผูกกับข้อสรุปนี้
- เงื่อนไข C1/C2 เดิมยังต้องทำก่อน admit ครั้งแรก
- สำเนาและ mutation อยู่ใน `review-stageb-b8-sec/{copy,m-unpinned,m-dynamic,m-renamed,tmp}`
