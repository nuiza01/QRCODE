# NQR-129 Stage B iteration 7 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-b6-tl/TL_REVIEW_ITERATION_6.md` SHA `75c80deed7351cd3152975ab3036188b27a9d1b5421b3397b698e0a1912a98f7` (ACCEPT + G1 P3)

## Verdict: **ACCEPT** (TL, ขอบเขต candidate Stage B เท่านั้น ไม่มี finding ค้าง)

- **G1 ปิดแล้ว**: ไฟล์ `acorn` ที่ไม่มีนามสกุลวางข้าง `acorn.js` ผ่าน CLI จริงเปลี่ยนจาก exit 0 PASS (i6) เป็น exit 1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH`
- **การตรวจ package scope (S6-1)** ทำงานตามกฎ nearest-scope ของ Node มี false positive แบบ fail-closed หนึ่งกรณีที่ยอมรับได้
- **ไม่มี regression**: log ของ probe ห้าชุด (admission, semantics, shadow files, shadow scripts, env) ตรงกับ i6 ทุกไบต์
- มีข้อสังเกตด้าน maintainability หนึ่งข้อ (O1) ที่ไม่ใช่ defect ของ bytes ชุดนี้ และไม่ block

เนื่องจาก delta เล็ก (84 บรรทัด) ผมจำกัดงานไว้ที่ probe ของ G1 และ S6-1, regression probe ชุดเดิม และ mutant 6 ตัว

## 1. Identity check

| ไฟล์ (`nqr-stageb-b7/project/scripts/`) | ค่าที่คาด | ก่อน | หลัง |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | 3f0f3e0b4053e1d5961b63b9d6ad59ad9c825492ee1240e91be43cf8fdeca764 | ตรง | ตรง |
| build.mjs | 3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33 | ตรง | ตรง |

- ทั้งห้าไฟล์เป็น mode 0444 และ origin modules byte-identical กับ SOURCE
- ผม diff i6→i7 เอง: เปลี่ยนเฉพาะ `build.mjs` (`subpaths`, การตรวจ scope, JSDoc) และเทสต์ ตรงกับภาคผนวกของผู้เขียน
- หลังรีวิว toolchain SHA ยังตรง ใน repo จริงไม่มีไฟล์ `acorn` และไม่มี `scripts/package.json`
- ไฟล์ปลอมทั้งหมดอยู่ใต้ `review-stageb-b7-tl/{evil,lab}` เท่านั้น lab = สำเนาจริงของ scripts i7 (`cmp` ตรง) กับ closure `env -i … --print-dependency-digest` ใน lab ได้ `753c9343…969c` = pin

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b7-tl/tmp`)

| # | Command / probe | ผล (log sha prefix) |
| --- | --- | --- |
| 1 | suite สี่ไฟล์ | **283/283 pass** (`7c417194`) |
| 2 | eslint `build.mjs` และเทสต์ | exit 0 |
| 3 | `env -i PATH node scripts/build.mjs --print-dependency-digest` บน candidate และใน lab | ทั้งสองได้ `753c9343…969c` = pin (ไม่มี false positive ใน repo จริง ซึ่ง `package.json` ใกล้สุดชื่อ `nexora-qr`) |
| 4 | `p-shadow-extra.mjs` (G1 + ชุด i6) | (`537cf688`) |
| 5 | `p-scope.mjs` (S6-1, 6 กรณี + control) | (`f510dc9b`) |
| 6 | `p-shadow-files`, `p-shadow-scripts`, `p-dep-env`, `p1-admission`, `p2-semantics` | `b84ea661`, `524742c0`, `c047524d`, `61e1266f`, `46a00580` — **= i6 ทุกไบต์** |
| 7 | `probes/mutants.mjs` 6 mutant | (`8f0a19ef`) **killed 6/6** |

## 3. G1 — subpath resolver check (`build.mjs:29-30, 129-135`)

**Probe ผ่าน CLI จริง** (env ผ่าน allowlist, record ที่เขียนเอง):
```
next/dist/compiled/acorn/acorn (extensionless file beside pinned acorn.js): exit=1 stderr="NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH"   (i6: exit=0 PASS)
control after cleanup: exit=1 … ACCEPTANCE_NOT_ADMITTED
```
กรณีอื่นใน probe ชุดเดิมให้ผลเหมือน i6 (`canvas` ไม่มีนามสกุล / `jsdom.js` → mismatch ; `canvas.cjs/.mjs` → ไม่ถูกนับ)

**ความถูกต้อง**
- `createRequire(join(scriptsDir, "resolve.js")).resolve(specifier)` ใช้ CJS resolver ด้วย base directory เดียวกับที่ verifier (`:14`) และ adapter (`:10`) ใช้ `require` จริง (ทั้งสองอยู่ใน `scripts/`) จึงครอบ exact file, extension, directory, exports และ self-reference ตามลำดับของ Node
- การเทียบ `realpath` สองฝั่งกับไฟล์ที่ hash ไว้จาก `found.dir` (real path) ถูกต้อง: mutant T03 (ใช้ path ที่ hash แทนผลของ resolver) killed และ T02 (ถอดการตรวจ) killed
- ถ้า resolve ไม่ได้ → `null` → mismatch (fail closed)
- **False positive**: ไม่มีใน tree จริง การตรวจนี้เป็นเงื่อนไขที่ Node ใช้จริง จึงไม่เพิ่ม false positive เอง

**Maintainability**: ดู O1

## 4. S6-1 — nearest package scope (`build.mjs:59-67`)

Node (ทั้ง ESM PACKAGE_SELF_RESOLVE และ CJS `trySelf`) ใช้เฉพาะ `package.json` ที่ใกล้ที่สุดของไฟล์ที่ import และ self-resolve เฉพาะเมื่อ `name` ตรงและมี `exports` ผลจาก `p-scope.log` (CLI จริงใน lab):

| กรณี | ผล | ตรงกับ Node หรือไม่ |
| --- | --- | --- |
| `proj/package.json` name=`nexora-qr` (เหมือน repo จริง) | ACCEPTANCE_NOT_ADMITTED (ไม่ block) | ตรง |
| `proj/package.json` name=`jsdom` + `exports` (Node self-resolve ได้) | **DEPENDENCY_MISMATCH** | ตรง (ปิดช่อง) |
| `proj/package.json` name=`jsdom` ไม่มี `exports` | DEPENDENCY_MISMATCH | false positive แบบ fail-closed (Node ไม่ self-resolve) ยอมรับได้และไม่น่าเกิดจริง |
| `parent/package.json` jsdom+exports แต่ `proj/package.json` = nexora-qr | ACCEPTANCE_NOT_ADMITTED | ตรง (scope ที่ใกล้สุดคือ proj) |
| `parent/package.json` jsdom+exports และไม่มี `proj/package.json` | DEPENDENCY_MISMATCH | ตรง |
| `proj/package.json` เป็น JSON เสีย | DEPENDENCY_MISMATCH | fail closed |

**ความครอบคลุม**
- ตรวจเฉพาะ scope ของ `scripts/` ซึ่งเพียงพอ เพราะไฟล์ gate ที่ใช้ bare specifier (`jsdom`, `parse5`, `next/…`) อยู่ใน `scripts/` ทั้งหมด
- ไฟล์ภายใน package ที่ pin มี scope เป็น `package.json` ของตัวเองซึ่งถูก hash อยู่แล้ว
- การรวม `entities` กับ `next` ไว้ใน `pinnedNames` ไม่มีผลเสีย
- mutant T01 (ถอดการตรวจชื่อ) killed

**ข้อสังเกตย่อย** (ไม่ใช่ finding): walk ขึ้นไปหยุดที่ `package.json` ตัวแรก ส่วน Node เองจะหยุดการหา scope เมื่อเจอ path ที่ลงท้ายด้วย `node_modules` ซึ่งไม่เกี่ยวกับ `scripts/` จึงเทียบเท่ากันในทางปฏิบัติ

## 5. Regression

- log ของ probe ห้าชุดตรงกับ i6 ทุกไบต์ (§2 แถว 6): admission grammar, FAIL-over-BLOCKED/startup scan/attestation, shadow แบบไม่มี package.json ทั้งสี่ และการปฏิเสธ `NODE_PATH`/`HOME`
- mutant ที่ killed: F1 (ไฟล์ข้าง candidate), E1 (allowlist ยอม HOME/NODE_PATH), M37 (scan เมื่อ UNKNOWN)
- ข้อความ fixed code ของ print mode, USAGE ที่มี `env -i` และ build path ปกติไม่เปลี่ยนจาก i6 (diff ยืนยัน)

## 6. Observation (ไม่ block ไม่มี severity)

### O1 — `subpaths` ต้องดูแลให้ตรงกับ `require` ในโค้ดด้วยมือ

`VERIFY_EXISTING_DEPENDENCIES.subpaths` (`build.mjs:30`) เป็น string เดียวกับที่ hard-code ไว้ใน verifier `:14` และ adapter `:10` ถ้าในอนาคตเพิ่ม `require("next/dist/compiled/…")` หรือ bare import ใหม่ในไฟล์ gate โดยไม่เพิ่มใน `packages`/`subpaths` specifier ใหม่นั้นจะไม่ถูกตรวจ และไม่มีเทสต์ใดเตือน bytes ชุดนี้ยังไม่มีปัญหา เพราะ specifier ที่ใช้อยู่ครอบครบแล้ว (ตรวจด้วย grep) ข้อเสนอ (ทำเมื่อไรก็ได้): เพิ่มเทสต์ที่ใช้ acorn parse ไฟล์ gate ทั้งห้าไฟล์ เก็บ bare specifier ทุกตัวของ `import`/`require` แล้ว assert ว่าอยู่ใน `packages`, `files` หรือ `subpaths`

## 7. ข้อจำกัดของรีวิวนี้

- จำกัดขอบเขตตาม delta: ไม่ได้รัน mutant ชุดเต็มซ้ำ (verifier ไม่เปลี่ยนตั้งแต่ i4) และไม่ได้รัน mutant ของผู้เขียน
- ใช้ lab และ fixture สังเคราะห์ ไม่ได้วางไฟล์ใน `node_modules` จริงหรือ folder นอกพื้นที่ที่อนุญาต
- ข้อจำกัดที่รับไว้แล้วยังอยู่ครบ: pin เป็น drift detection ภายใน process และต้องพึ่ง C2 (snapshot แยก + `env -i` + `node` ที่เชื่อถือได้) รวมถึง TOCTOU, dyld/`node` ปลอม, false positive แบบ fail-closed ที่ควรใส่ไว้ใน runbook, runtime chunk ของ Turbopack จริงเป็น UNKNOWN และ `COLD_VALID_INITIAL_PREVIEW`
