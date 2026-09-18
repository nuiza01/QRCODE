# NQR-129 Stage B iteration 8 — Independent TL review (test-only delta)

วันที่ 2026-09-18 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: iteration 7 = ACCEPT พร้อม O1 (optional) SHA `ecbeec70f424786cc2e810a64c07d89aba23987099413fb609d9c02b8340dcf1`

## Verdict: **ACCEPT** (TL, ขอบเขต candidate Stage B เท่านั้น ไม่มี finding)

- Runtime ทั้งสี่ไฟล์ byte-identical กับ iteration 7 ที่ผม accept ไว้ (เทียบด้วย SHA-256)
- เทสต์ใหม่ปิด O1 ได้จริง: อ่าน pin จาก `build.mjs` ด้วย AST (ไม่ได้ copy ค่า), จับ bare import ที่ไม่ได้ pin, จับ specifier ที่ไม่ใช่ literal และจับการเพิ่มข้อยกเว้น build-mode ที่ถูกใช้งานจริง ผมยืนยันด้วย mutant 6 ตัว (kill 5 / survive 1 ตามที่คาด)
- ข้อจำกัดของเทสต์ (จุดบอดเชิงรูปแบบ) มีจริงแต่ไม่กระทบ bytes ชุดนี้ บันทึกเป็น O2 ไม่ block

Delta เป็นเทสต์ล้วน 78 บรรทัด ผมจึงจำกัดงานไว้ที่ identity, การรัน suite และ mutation ของเทสต์ใหม่ ไม่ได้รัน probe ชุดใหญ่ซ้ำ (runtime ไม่เปลี่ยน)

## 1. Identity check

| ไฟล์ (`nqr-stageb-b8/project/scripts/`) | ค่าที่คาด | ผล | เทียบกับ i7 |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | เท่ากับ i7 |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | เท่ากับ i7 |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | ตรง | เท่ากับ i7 |
| verify-initial-bundle-boundary.test.mjs | c253599162ba7a7b4ddca001e4bd52893d393369cc02ce53cd9cc7ac5458f161 | ตรง | ไฟล์เดียวที่เปลี่ยน |
| build.mjs | 3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33 | ตรง | เท่ากับ i7 |

- ตรวจทั้งก่อนและหลังงาน ทั้งห้าไฟล์เป็น mode 0444
- **canonical5 reproduce ได้**: `1c4bdab39842797014f0d82a224261392dd7a1cfb274ed1e9067764f37c2edb7` = SHA-256 ของ `JSON.stringify(rows)` เมื่อ rows คือ `{sha256, path}` ห้าแถวเรียงตามลำดับในรายงาน โดย path เป็น `project/scripts/<file>` (ผมลองสี่รูปแบบ มีรูปแบบนี้ตรง)
- `origin-gate.mjs`, `verify-origin-artifacts.mjs` และเทสต์ของทั้งสอง byte-identical กับ SOURCE (`cmp`)
- `node_modules` เป็น symlink อ่านอย่างเดียวไปยัง SOURCE
- หลัง filesystem ถูกล้าง ผมตรวจ candidate ที่ coordinator rebuild ด้วย hash ที่บันทึกไว้เท่านั้น ไม่ได้ตรวจกระบวนการ rebuild เอง (ดู §5)

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b8-tl/tmp`)

| # | Command | ผล |
| --- | --- | --- |
| 1 | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test` สี่ suite | **284/284 pass**, fail/skip/todo 0 (เพิ่มจาก 283 ของ i7 หนึ่งเทสต์) |
| 2 | `eslint` บนไฟล์เทสต์ที่เปลี่ยน | exit 0 |
| 3 | `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest` | `753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c` = pin |
| 4 | mutant 6 ตัว รันเฉพาะเทสต์ใหม่ด้วย `--test-name-pattern "bare specifier"` บนสำเนา | ดู §3 |

## 3. เทสต์ใหม่ `stage B: every bare specifier the gate files load is covered by the dependency pin` (`test.mjs:1437-1494`)

**อ่าน pin จาก source จริง ไม่ได้ duplicate**: parse `build.mjs` ด้วย acorn แล้วดึง `VERIFY_EXISTING_DEPENDENCIES` (คลาย `Object.freeze`) เอา `packages`, `files` และ `subpaths` จาก AST ค่าที่เทสต์ใช้จึงมาจากไฟล์ที่ hash อยู่ใน gate revision เสมอ

**ครอบคลุมรูปแบบการโหลด**: `ImportDeclaration`, `ExportAllDeclaration`, `ExportNamedDeclaration` ที่มี source, `ImportExpression` (dynamic import) และ `CallExpression` ที่ callee เป็น `require` หรือ `require.<member>` ข้าม specifier ที่ขึ้นต้นด้วย `./`, `../` และ builtin (`isBuiltin`) ส่วนชื่อ scoped (`@scope/name`) แยก package name ถูกต้อง

**Mutation (สำเนาแยก รันเฉพาะเทสต์นี้)**

| Mutant | ผล |
| --- | --- |
| N1 เพิ่ม `import "zod";` (ไม่ได้ pin) ใน `origin-gate.mjs` | **KILLED** |
| N2 เพิ่ม `import(name)` ที่ specifier ไม่ใช่ literal | **KILLED** (`unanalysable`) |
| N3 เพิ่ม `"zod"` ใน `buildModeOnly` พร้อม import จริง | **KILLED** (`buildOnlySeen` ต้องเท่ากับ `["build.mjs:next/dist/bin/next"]` พอดี) |
| N4 ลบ `"parse5"` ออกจาก `packages` ใน `build.mjs` | **KILLED** |
| N5 ลบ `subpaths` ของ `next/dist/compiled/acorn/acorn` | **KILLED** |
| N6 โหลดผ่าน handle ของ `createRequire` ที่ตั้งชื่ออื่น | SURVIVED (ตามคาด ดู O2) |

**ข้ออ้างอื่นในเทสต์**: `for (const specifier of subpaths) assert.ok(partiallyPinned.includes(...))` บังคับว่า subpath ทุกตัวต้องมาจาก package ที่อยู่ใน `files` (คือ package ที่ pin เพียงบางไฟล์) ถูกต้องตามที่ตั้งใจ

**ไม่ให้ความมั่นใจเกินจริงหรือไม่**: ข้อความ assert อธิบายสิ่งที่ต้องทำ (pin แล้ว re-pin digest แล้ว re-review) และข้อยกเว้น `next/dist/bin/next` มี comment กำกับว่าเป็น build path เท่านั้น ซึ่งตรงกับโค้ด (`build.mjs:199` อยู่ใน branch ที่ไม่ใช่ `--verify-existing`) ข้อจำกัดที่เหลืออยู่ใน O2

## 4. Observation (ไม่ block ไม่มี severity)

### O2 — จุดบอดเชิงรูปแบบของเทสต์ (ไม่กระทบ bytes ชุดนี้)

เทสต์เห็นเฉพาะ `require` ที่เป็นชื่อ identifier `require` ถ้ามีการโหลดผ่าน handle ที่ตั้งชื่ออื่น เช่น `const r = createRequire(url); r("pkg")` หรือ `createRequire(url)("pkg")` จะไม่ถูกตรวจ (mutant N6 รอด) นอกจากนี้ `import.meta.resolve` ไม่ถูกตรวจ ซึ่งถูกต้องเพราะไม่ได้โหลดโค้ด

สถานะปัจจุบัน: ผม grep ไฟล์ gate ทั้งห้าแล้ว รูปแบบที่ใช้จริงมีเพียง
- `const require = createRequire(...)` แล้ว `require("next/dist/compiled/acorn/acorn")` (verifier `:13-14`, adapter `:9-10`) — เทสต์เห็น
- `import` แบบ static ของ `jsdom`, `parse5` และ path สัมพัทธ์ — เทสต์เห็น
- `createRequire(...).resolve(...)` ใน `build.mjs:70,133` ซึ่งเป็นการ resolve เท่านั้น ไม่โหลดโค้ด

ถ้าจะปิดจุดบอดนี้ในอนาคต: ให้เทสต์ไล่หา binding ที่มาจาก `createRequire(...)` (ทั้งตัวแปรและการเรียกทันที) แล้วถือว่าการเรียก binding นั้นเป็นการโหลด หรือกำหนด lint rule ว่าให้ใช้ชื่อ `require` เท่านั้น

## 5. ข้อจำกัดของรีวิวนี้

- ผมยืนยัน candidate ที่ rebuild ด้วย SHA-256 ห้าไฟล์, mode, canonical5 และการเทียบกับ SOURCE เท่านั้น ไม่ได้ตรวจสอบขั้นตอน replay/patch ที่ coordinator ใช้ ความถูกต้องของ bytes อ้างอิงจาก hash ที่บันทึกไว้ในรายงานและใน review ก่อนหน้าของผม
- ไม่ได้รัน probe ชุดใหญ่ของ iteration ก่อนหน้าซ้ำ (admission grammar, startup scan, dependency shadow, env allowlist) เพราะ runtime ทั้งสี่ไฟล์ byte-identical กับ i7 ที่ผ่าน probe เหล่านั้นแล้ว และ suite เต็มผ่าน 284/284
- ข้อจำกัดที่รับไว้แล้วทั้งหมดยังอยู่: pin เป็น drift detection ภายใน process และต้องพึ่ง C2 (snapshot แยก, `env -i`, `node` ที่เชื่อถือได้), TOCTOU ระหว่าง hash กับ import, dyld/`node` ปลอม, false positive แบบ fail-closed ที่ควรระบุใน runbook, runtime chunk ของ Turbopack จริงยังเป็น UNKNOWN และ `COLD_VALID_INITIAL_PREVIEW` ยังรอการตัดสินของ Product Owner
- Verdict นี้ครอบคลุมเฉพาะ candidate Stage B ไม่ใช่ release, integration หรือ deploy approval
