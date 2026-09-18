# NQR-129 Stage B iteration 6 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-b5-tl/TL_REVIEW_ITERATION_5.md` SHA `7414bea0d5d29f50360d17e2ef8e1cdced4fee448ab70c35af36559696c1e0e2` (REQUEST_CHANGES)

## Verdict: **ACCEPT** (TL, ขอบเขต candidate Stage B เท่านั้น มี P3 หนึ่งข้อที่แนะนำให้ปิดก่อน integrate)

- **D1 (P2) ปิดแล้ว**: shadow ทั้งสี่แบบที่ผมเคยได้ exit 0 ตอนนี้ได้ exit 1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` ผ่าน CLI จริงใน lab และ NODE_PATH/HOME ยังได้ exit 1
- **D2 (P3) ปิดแล้ว**: USAGE, comment และข้อความในเทสต์บอกให้ใช้ `env -i` และ print mode พิมพ์เฉพาะ fixed code
- **ไม่มี regression**: log ของ probe admission และ semantics ตรงกับ i5 ทุกไบต์ และ mutant regression ถูก kill ทั้งหมด
- **Finding ใหม่ G1 (P3)**: กฎใหม่ตรวจเฉพาะการ resolve *ชื่อ package* ส่วน `next` ที่ pin ไว้แค่สองไฟล์ Node โหลดผ่าน subpath `next/dist/compiled/acorn/acorn` ซึ่งลองไฟล์ชื่อ `acorn` ที่ไม่มีนามสกุลก่อน `acorn.js` ถ้าวางไฟล์นั้นไว้ **ภายใน `node_modules/next`** จะได้ exit 0 PASS กับ record ที่เขียนเอง ผมให้ P3 (ไม่ใช่ P2) เพราะต้องเขียนใน `node_modules` ของโปรเจกต์ ซึ่ง comment `build.mjs:20-25` และรายงานผู้เขียนประกาศไว้ชัดว่าอยู่นอก boundary ของ drift detection และเป็นหน้าที่ของ C2 ต่างจาก D1 ที่มีช่องทางผ่าน folder นอก repo การแก้สั้นมาก ถ้าผู้ใช้ต้องการปิด P3 ก่อน integrate ตามที่เคยเลือก ควรปิดข้อนี้ด้วย

## 1. Identity check

| ไฟล์ (`nqr-stageb-b6/project/scripts/`) | ค่าที่คาด | ก่อน | หลัง |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | cb1a993088feb6dfb2c7852cb240df69469ed310c86df43f62d2b62a98834745 | ตรง | ตรง |
| build.mjs | d43028a5310b753d68e97cf110e255c63ba576412dbe6c53bca30b8145a16be2 | ตรง | ตรง |

- ทั้งห้าไฟล์เป็น mode 0444 และ origin modules byte-identical กับ SOURCE
- ผม diff i5→i6 เอง: เปลี่ยนเฉพาะ `build.mjs` (กฎใน `resolvePackage`, USAGE, comment, print catch) และเทสต์
- หลังรีวิว toolchain SHA ยังตรง ใน repo จริง `next/dist/compiled/acorn/` มีเพียง `LICENSE`, `acorn.js`, `package.json` (ไม่มีไฟล์ `acorn`) และไม่มี `scripts/node_modules`
- ไฟล์ปลอมทั้งหมดอยู่ใต้ `review-stageb-b6-tl/{evil,lab}`
- lab = สำเนาจริงของ scripts i6 (`cmp` ตรง) กับ closure 40 package และไฟล์ `next` สองไฟล์ `env -i … --print-dependency-digest` ใน lab ได้ `753c9343…969c` ตรงกับ pin

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b6-tl/tmp`)

| # | Command / probe | ผล (log sha prefix) |
| --- | --- | --- |
| 1 | suite สี่ไฟล์ | **283/283 pass** (`101341a5`) |
| 2 | eslint `build.mjs` และเทสต์ | exit 0 |
| 3 | `env -i PATH node scripts/build.mjs --print-dependency-digest` บน candidate | `753c9343…969c` = pin (ไม่มี false positive บนเครื่องนี้ รวม folder แม่และ `$prefix/lib/node`) |
| 4 | `p-shadow-files.mjs`, `p-shadow-scripts.mjs` (shadow D1 ทั้งสี่แบบ + control) | (`b84ea661`, `524742c0`) |
| 5 | `p-shadow-extra.mjs` (กรณีใหม่) | (`0f7a2603`) |
| 6 | `p-dep-env.mjs` (NODE_PATH/HOME) | (`c047524d` = i5) |
| 7 | `p1-admission.mjs`, `p2-semantics.mjs` | (`61e1266f`, `46a00580` = i5 ทุกไบต์) |
| 8 | print mode ใน lab เมื่อ `acorn.js` หายไป | stderr `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` exit 1 ไม่มี path |
| 9 | `probes/mutants.mjs` 13 mutant | (`3bd0f8ea`) **killed 13/13** |

## 3. D1 — shadow ทั้งสี่แบบผ่าน CLI จริง (ใช้ env ที่ผ่าน allowlist และ record ที่เขียนเอง)

| Shadow | i5 | i6 |
| --- | --- | --- |
| `parent/node_modules/canvas.js` | exit 0 PASS | **exit 1 DEPENDENCY_MISMATCH** |
| `parent/node_modules/canvas/index.js` (ไม่มี package.json) | exit 0 PASS | **exit 1 DEPENDENCY_MISMATCH** |
| `proj/node_modules/canvas.js` | exit 0 PASS | **exit 1 DEPENDENCY_MISMATCH** |
| `scripts/node_modules/jsdom/index.js` (ไม่มี package.json) | exit 0 PASS | **exit 1 DEPENDENCY_MISMATCH** |
| control ก่อนและหลัง | exit 1 ACCEPTANCE_NOT_ADMITTED | เหมือนเดิม |

เทสต์ใหม่ของผู้เขียน (`test.mjs` "Forms Node loads without a package.json") ครอบทั้งสี่แบบ รวมถึงไฟล์ `canvas` ที่ไม่มีนามสกุลและ `symbol-tree.js` ข้าง package จริง mutant ที่ kill: F1 (ไม่ตรวจไฟล์ `.js/.json/.node` ข้าง candidate), F2 (ข้าม candidate ที่ไม่ใช่ directory), F3 (ข้าม directory ที่ไม่มี manifest)

## 4. กฎใหม่ของ `resolvePackage` (`build.mjs:53-70`) เทียบกับ Node

**CommonJS (`Module._findPath`)**: ในแต่ละ search folder Node ลองตามลำดับ exact file `<name>` → `<name>` + extension ใน `Module._extensions` → directory (`package.json#main` หรือ `index.*`) ผมตรวจแล้วว่าใน runtime `env -i` extension มีเพียง `[".js",".json",".node"]` กฎใหม่ตรงกันดังนี้:
- ไฟล์ข้าง candidate ที่มี extension เหล่านี้ → mismatch (Node เลือกไฟล์เหล่านี้ก่อน directory แม้ directory จะมีอยู่)
- `<name>` ที่ไม่ใช่ directory (ไฟล์หรือ symlink เสีย) → mismatch
- directory ที่ไม่มี package.json → mismatch

probe ยืนยันว่าไม่นับรูปที่ Node ไม่โหลด: `canvas.cjs` และ `canvas.mjs` ใน parent folder → ไม่ mismatch และไม่มีโค้ด payload รัน (`ACCEPTANCE_NOT_ADMITTED`)

**ESM (PACKAGE_RESOLVE)**: bare specifier ใช้ได้เฉพาะ *folder* ถ้า folder ไม่มี package.json จะใช้ legacy main (`index.js`) กฎ "directory ที่ไม่มี package.json → mismatch" ปิดกรณีนี้แล้ว ส่วนไฟล์ `node_modules/jsdom.js` ข้าง jsdom จริง ESM จะไม่โหลด แต่กฎตัดสินเป็น mismatch (probe ยืนยัน) ถือเป็น false positive แบบ fail-closed ที่ยอมรับได้

**False positive บน tree จริง** (ข้อสังเกต ไม่ใช่ defect)
- บน tree ปัจจุบันและ search folder ของเครื่องนี้ไม่มี false positive: print = pin และ suite ผ่าน
- กรณีที่อาจเจอบนเครื่องอื่น ซึ่งทั้งหมด fail-closed:
  - directory ว่างที่ค้างจาก uninstall (Node CJS จะข้ามไป folder ถัดไป แต่กฎนี้ mismatch)
  - ไฟล์หรือ package ที่ชื่อชนกับ dependency ใน `node_modules` ที่อยู่เหนือ repo หรือใน `$prefix/lib/node`
  - package ที่ชื่อลงท้าย `.js` (เช่น `decimal.js`) ข้าง dependency ชื่อ `decimal` ซึ่งผู้เขียนตรวจว่าไม่มีใน tree ปัจจุบัน
- ผลของทุกกรณีคือ `DEPENDENCY_MISMATCH` โดยไม่บอกสาเหตุ ควรเพิ่มในหัวข้อ troubleshooting ของ runbook

## 5. D2

| รายการ | ผล |
| --- | --- |
| USAGE | `node scripts/build.mjs --bogus` พิมพ์ `… env -i PATH="$PATH" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing … \| env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest` |
| Comment | `build.mjs:24-25` บอก `env -i` และบอกว่าค่าที่พิมพ์ไม่ใช่การตรวจ integrity |
| ข้อความในเทสต์ | `test.mjs:1412-1413` บอก `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest` |
| Print mode fixed code | `build.mjs:148` ; lab ที่ไม่มี `acorn.js` → `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` exit 1 ; เทสต์ assert ว่าไม่มี `ENOENT` และไม่มี `/` ; mutant F4 (ถอด catch) killed |

## 6. Regression

- `p1-admission.log` และ `p2-semantics.log` ตรงกับ i5 ทุกไบต์ และ `p-dep-env.log` ตรงกับ i5
- mutant regression ที่ killed: M37 (scan เมื่อ UNKNOWN), M09 (read race), M32 (lookup ที่ capture), M35, M14 (re-verify), E1 (allowlist ยอม HOME/NODE_PATH), E3 (resolve จาก project root), E4 (ไม่ใช้ realpath), E7 (symlink ใน package)

## 7. Findings

### G1 — P3: subpath ที่ pin ไว้ของ `next` ถูก shadow ได้ด้วยไฟล์ที่ไม่มีนามสกุล

**ตำแหน่ง**
- `build.mjs:28`: pin `next` แค่ `package.json` และ `dist/compiled/acorn/acorn.js`
- `build.mjs:111-116`: hash ไฟล์ตาม path
- verifier `:14` และ adapter `:10`: `require("next/dist/compiled/acorn/acorn")`
- `next/package.json` ไม่มี `exports` (ตรวจแล้ว) Node จึง resolve subpath ตาม filesystem

**กลไก**: `Module._findPath` สำหรับ `…/next/dist/compiled/acorn/acorn` จะคืน exact file ชื่อ `acorn` ก่อน `tryExtensions` (`acorn.js`) กฎใหม่ตรวจเฉพาะ search folder ของ *ชื่อ package* และ `next` ไม่ได้ hash ทั้ง tree ไฟล์ที่เพิ่มเข้าไปใน `next/dist/compiled/acorn/` จึงไม่ทำให้ digest เปลี่ยน ส่วน `verifyLocalToolchain` ของ adapter ก็ hash `acorn.js` ตาม path แบบเดียวกัน

**Reproduction** (`p-shadow-extra.log`, lab, CLI จริง, env ผ่าน allowlist, record ที่เขียนเอง): วางไฟล์ `lab/parent/proj/node_modules/next/dist/compiled/acorn/acorn` = payload inert + `module.exports = require("./acorn.js")`
```
next/dist/compiled/acorn/acorn (extensionless file beside pinned acorn.js): exit=0 [verify-existing] bundle and origin scopes PASS … stderr="[probe] …loaded"
control after cleanup: exit=1 … ACCEPTANCE_NOT_ADMITTED
```

**ทำไมเป็น P3**: ต้องเขียนภายใน `node_modules` ของโปรเจกต์ ซึ่ง comment `build.mjs:20-25` และรายงานผู้เขียนประกาศว่าอยู่นอก boundary ของ drift detection และให้ C2 ตรวจจาก snapshot แยกเทียบกับ lockfile/registry integrity (ไฟล์เกินแบบนี้จะเห็นได้ถ้า C2 เทียบรายชื่อไฟล์ด้วย ไม่ใช่เทียบแค่ integrity ของ tarball) ช่องนี้ไม่มีทางผ่าน folder นอก repo หรือ env แต่ข้ออ้างว่า "pinned … package code that --verify-existing loads" ยังไม่จริงสำหรับไฟล์นี้

**ข้อเสนอแก้** (สั้น)
1. ใน `dependencyDigest` ให้ resolver ของ Node ยืนยันไฟล์ที่ pin: `createRequire(join(scriptsDir, "resolve.js")).resolve("next/dist/compiled/acorn/acorn")` ต้องเท่ากับ `realpath(<next>/dist/compiled/acorn/acorn.js)` ถ้าไม่เท่า → mismatch
   - หรือ hash ทั้ง directory `next/dist/compiled/acorn/` (3 ไฟล์) ซึ่งครอบ `package.json` ที่กำหนด `type` ของ `acorn.js` ด้วย
2. เพิ่มเทสต์ CLI ที่วางไฟล์ `acorn` ไม่มีนามสกุลในสำเนาของ `next` แล้วคาดว่าได้ `DEPENDENCY_MISMATCH`
3. (ไม่บังคับ) ใช้วิธีเดียวกันใน `verifyLocalToolchain` ของ adapter ใน iteration ของ Stage A ถัดไป

## 8. สิ่งที่ยืนยันว่าถูกต้อง

- env route ปิด (NODE_PATH/HOME → UNTRUSTED_RUNTIME) และ filesystem route สำหรับ absent peer กับ root ที่ pin (`canvas*`, `scripts/node_modules/jsdom`) ปิดแล้ว
- กฎตรงกับลำดับของ CJS `_findPath` และ ESM folder resolution สำหรับชื่อ package ส่วนรูปที่ Node ไม่โหลด (`.cjs/.mjs`) ไม่ถูกนับ
- Admission grammar, FAIL-over-BLOCKED, startup scan, attestation, re-verify, allowlist และ print mode ยังทำงานตามที่ accept ไว้

## 9. ข้อจำกัดของรีวิวนี้

- ใช้ lab และ fixture สังเคราะห์ ไม่ได้วางไฟล์ใน `node_modules` จริงหรือ folder นอกพื้นที่ที่อนุญาต ผลใช้กับ repo จริงได้เพราะ scripts เหมือนกันทุกไบต์และ digest ตรง pin
- ไม่ได้ทดสอบ `.node` native addon (ต้อง compile) และไม่ได้ทดสอบ false positive บนเครื่องหรือ layout อื่น (pnpm/npm link)
- ไม่ได้รัน mutant ของผู้เขียน ผลนี้มาจาก mutant 13 ตัวของผม
- ข้อจำกัดเดิมยังอยู่: pin เป็น drift detection ภายใน process, TOCTOU ระหว่าง hash กับ import, `node` ปลอมหรือ dyld, C2 ใน runbook, Stage A runtime chunk เป็น UNKNOWN และ `COLD_VALID_INITIAL_PREVIEW`
