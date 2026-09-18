# NQR-129 Stage B iteration 6 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b6/project` (canonical5 ตามรายงานผู้เขียน `36d81deb…82d4`)

## Verdict: **ACCEPT (Stage B security scope, LOW residual เท่านั้น)**

ACCEPT นี้ไม่ใช่ release readiness และไม่อนุญาตให้ deploy

- **S5-1 ปิดแล้ว:** probe ทั้งสองตัวเดิมและ variant 9 แบบที่ถูกขอให้ลอง ได้ exit 1 หรือ Node ไม่โหลดไฟล์นั้นเลย
- **กฎใหม่ไม่เปิดทาง exit 0 ใหม่**
- **พบ gap เดิมในกลุ่ม shadow เดียวกันอีกหนึ่งจุด (S6-1):** ESM package self-reference ผ่าน `package.json` ที่ใกล้ที่สุดของ `scripts/` ให้ exit 0 ขณะที่ digest ยังตรง gap นี้มีอยู่แล้วใน i5 และต้องมีสิทธิ์เขียน `scripts/` หรือ `package.json` ของโปรเจกต์ ผมจึงให้ LOW ตามเกณฑ์เดิม
- **S5-2 disposition ไม่เปลี่ยน** (documented LOW)

เนื่องจาก TL จัด shadow กลุ่มนี้เป็น P2 และผู้ใช้เลือกปิด finding ก่อน integrate ผมแนะนำให้แก้ S6-1 (เล็ก) ก่อน integrate แต่จากมุม SECURITY ข้อนี้ไม่ block

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 (`diff` กับ i5 แล้วเหมือนกันทุกไบต์) |
| verify-initial-bundle-boundary.test.mjs | cb1a993088feb6dfb2c7852cb240df69469ed310c86df43f62d2b62a98834745 |
| build.mjs | d43028a5310b753d68e97cf110e255c63ba576412dbe6c53bca30b8145a16be2 |

`diff` ของ `build.mjs` i5→i6 ตรงกับภาคผนวกของผู้เขียน ไม่ได้แก้ candidate root, `node_modules` ที่ใช้ร่วม หรือ `scripts/` ของ repo จริง (ไม่มี `canvas`, `canvas.js`, `symbol-tree.js` และ `scripts/package.json` ใน repo จริง) probe ทุกตัวใช้สำเนาใน `review-stageb-b6-sec/`

## 2. Commands ที่รันจริง (Node v24.14.1, `env -i PATH TMPDIR NEXT_PUBLIC_APP_URL`)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `node --test` 4 suite บนสำเนา | 283/283 pass |
| 1 | `Object.keys(require("module")._extensions)` | `.js`, `.json`, `.node` (Node 24.14.1; ไม่มี `.ts`/`.cjs`/`.mjs` ใน `tryExtensions`) |
| 2 | `p-setup3.mjs` สร้าง artifact/record ผูก gate revision i6 แล้ว admit 10 digest | สร้างได้ |
| 3 | Control | pristine + record ที่เขียนเอง → exit1 `ACCEPTANCE_NOT_ADMITTED`; admitted clean → **exit 0**; admitted flightPdf → exit1 `FORBIDDEN_STARTUP_MARKER`; สำเนา `node_modules` ที่ไม่แก้ (x-control) → exit1 `ACCEPTANCE_NOT_ADMITTED` |
| 4 | Matrix ของ variant (§3) ทุกตัวใช้สำเนาที่ `jsdom` และ `symbol-tree` เป็น directory จริง ตัวอื่นเป็น symlink และมี record ที่เขียนเอง | §3 |
| 5 | S5-2: `NODE_OPTIONS=--import=scrub-patch.mjs` | exit 0 (ไม่เปลี่ยน) |
| 6 | S6-1: `scripts/package.json` `{"name":"jsdom","exports":"./jsdom-self.mjs"}` ทั้งบน i6 และ i5 | i6 → **exit 0**; `--print-dependency-digest` ของทั้ง i6 และ i5 = pin `753c9343…969c` |

## 3. S5-1 re-test และ variant

| Variant | ผล | ความหมาย |
| --- | --- | --- |
| `node_modules/symbol-tree.js` (shim) ข้าง package ที่ติดตั้งอยู่ | exit1 `DEPENDENCY_MISMATCH` | S5-1 fixed |
| `node_modules/canvas.js` (optional peer ที่ไม่ได้ติดตั้ง) | exit1 `DEPENDENCY_MISMATCH` | S5-1 fixed |
| `symbol-tree.cjs` / `.mjs` / `.ts` | exit1 `ACCEPTANCE_NOT_ADMITTED` | Node ไม่โหลด (ไม่อยู่ใน `_extensions`) ไม่ใช่ bypass |
| Case variant `Symbol-Tree.JS` | exit1 `DEPENDENCY_MISMATCH` | `stat` แบบไม่สนตัวพิมพ์เจอเหมือน Node |
| Symlinked file `symbol-tree.js → shim` | exit1 `DEPENDENCY_MISMATCH` | `stat` ตาม symlink |
| `node_modules/canvas/index.js` ที่ไม่มี `package.json` | exit1 `DEPENDENCY_MISMATCH` | |
| `scripts/node_modules/parse5/index.js` ที่ไม่มี `package.json` (ESM folder) | exit1 `DEPENDENCY_MISMATCH` | |
| Scoped `@asamuzakjp/css-color.js` ข้าง package | exit1 `DEPENDENCY_MISMATCH` | fail-closed (package มี `exports` จึงเป็น false positive ที่ปลอดภัย) |
| `symbol-tree/package.json` ที่ `main` ชี้ `../symbol-tree-evil.js` | exit1 `DEPENDENCY_MISMATCH` | `package.json` ถูก hash |

- **Subpath request ของ `next`:** `require("next/dist/compiled/acorn/acorn")` ผ่าน `scripts/node_modules/next/...` ที่ไม่มี `package.json` จะเข้ากฎ "folder ไม่มี manifest" ตัว `acorn.js` ไม่มี `require(` (นับได้ 0) จึงไม่ดึงไฟล์อื่น ส่วน `next/dist/compiled/acorn/package.json` ไม่ถูก hash แต่มีผลแค่การตีความ module type ของ bytes เดิม ไม่ได้ inject โค้ด (theoretical ไม่ได้สาธิต)
- **Require ที่ไม่ได้ประกาศ:** static scan ใน i4/i5 ไม่พบ และ tree ไม่เปลี่ยน

## 4. S6-1 — LOW (existing, ไม่ได้เกิดจาก i6): ESM self-reference ผ่าน `package.json` ที่ใกล้ `scripts/` ที่สุด

- ตำแหน่ง: `build.mjs:48-110` `dependencyDigest` resolve `jsdom`/`parse5`/`entities` ด้วย `resolve.paths` ซึ่งดูเฉพาะ `node_modules` แต่ `packageResolve` ของ ESM จะลอง **package self-reference** ก่อน คือถ้า `package.json` ที่ใกล้ `scripts/verify-initial-bundle-boundary.mjs` ที่สุด (`scripts/package.json` หรือ `package.json` ของโปรเจกต์) มี `name` เท่ากับ specifier และมี `exports` Node จะ resolve ไปยังไฟล์ใน scope นั้นแทน `node_modules` ไฟล์ทั้งสองนี้ไม่อยู่ใน gate revision และไม่อยู่ใน digest
- หลักฐาน: สำเนา i6 ที่เพิ่ม `scripts/package.json` = `{"name":"jsdom","private":true,"exports":"./jsdom-self.mjs"}` และ `scripts/jsdom-self.mjs` (patch `Set.prototype.has` แล้ว re-export `JSDOM`, `VirtualConsole` จาก jsdom จริง) + record ที่เขียนเองและไม่ admit → `build.mjs --verify-existing` **exit 0** ส่วน `--print-dependency-digest` = pin ทั้งบน i6 และ i5 วิธีเดียวกันใช้กับ `parse5` ที่ adapter import ได้
- Preconditions: ต้องมีสิทธิ์เขียน `scripts/` (ไฟล์ใหม่) หรือแก้ `name`/`exports` ใน `package.json` ของโปรเจกต์ ระดับเดียวกับ S4-1 B ซึ่งรายงานประกาศว่าอยู่นอก boundary ของ drift detection และ C2/runbook ครอบไว้
- ข้อเสนอแก้ (เล็ก): ใน `dependencyDigest` หา `package.json` ที่ใกล้ที่สุดจาก `scripts/` ขึ้นไปตามกฎ package scope ของ Node ถ้า `name` ตรงกับ package ที่ pin หรือ scope นั้นไม่ใช่ `package.json` ของโปรเจกต์ที่คาดไว้ให้ mismatch หรือจะใส่ `name` และ `exports`/`imports` ของ scope นั้นลงใน digest ก็ได้ แล้วเพิ่มเทสต์ CLI ของ `scripts/package.json` self-reference

## 5. S5-2 — LOW (documented, ไม่เปลี่ยน)

Preload ใน `NODE_OPTIONS` ที่ลบร่องรอยตัวเองยังได้ exit 0 ตามที่ comment "Defense in depth only" และข้อจำกัดในรายงาน i6 §2/§4 ระบุไว้ disposition เดิมยังใช้ได้ คือ runbook ต้องบังคับ `env -i` บนเครื่องและ `node` ที่เชื่อถือได้

## 6. ความซื่อตรงของถ้อยคำและ C2

- JSDoc ใหม่ (`build.mjs:41-50`) อธิบายกฎไฟล์/โฟลเดอร์ได้ตรงกับที่ทดสอบ แต่ประโยค "as Node would resolve it" ยังไม่ครอบ self-reference (S6-1) ถ้าแก้ S6-1 ข้อความนี้จะถูกต้อง ถ้าไม่แก้ ควรระบุข้อยกเว้นนี้ไว้
- `USAGE` และ comment ของ pin (`:10-12, :20-25`) บอกเรื่อง `env -i` และบอกว่าค่าที่ print ไม่ใช่การตรวจ integrity ครบถ้วน
- โหมด print พิมพ์เฉพาะ fixed code (`:146-148`)
- C1/C2: เหมือน i5 คือยอมรับในฐานะขั้นตอน runbook โดยมีเงื่อนไขว่า runbook ต้องมีก่อน admit ครั้งแรก

## 7. Exit 0 โดยไม่มี record ที่ admit อย่างถูกต้อง

ทำได้เฉพาะเมื่อมีโค้ดใน process อยู่แล้ว (S6-1 ต้องเขียน `scripts/` หรือ `package.json` ของโปรเจกต์, S5-2 ต้องคุม environment, race ต้องเขียนระหว่างรัน) หรือแก้ reviewed source กฎใหม่ของ i6 ไม่เปิดทางเพิ่ม เพราะทุกกรณีที่กฎจับได้เป็น throw → exit 1 ส่วน false positive เป็น fail-closed ทั้งหมด admission grammar, attestation, fixed codes และ re-verify ไม่เปลี่ยนตั้งแต่ i4

## 8. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่มี Next build หรือ browser
- ไม่ได้รัน mutation suite ของผู้เขียนซ้ำ และไม่ได้ทดสอบบน Linux หรือ filesystem ที่สนตัวพิมพ์
- ไม่ได้สาธิตผลของ `next/dist/compiled/acorn/package.json` และ `NODE_COMPILE_CACHE`
- Probe และสำเนาอยู่ใน `review-stageb-b6-sec/{probes,tmp,project,admit,v-*}`
