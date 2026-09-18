# NQR-129 Stage B iteration 5 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-b4-tl/TL_REVIEW_ITERATION_4.md` SHA `2b7e168b2dc0c20a37f7bcaad792da07e8157da88f42fe5eae1eb1ee0d1e02d4` (REQUEST_CHANGES)

## Verdict: **REQUEST_CHANGES** (มี P2 หนึ่งข้อ: การจำลอง resolution ยังไม่ตรงกับ Node)

- **P1-dep ของ i4 ปิดแล้ว**: `NODE_PATH` และ `HOME` พร้อม `canvas` ปลอม ผ่าน CLI จริงได้ exit 1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME`
- **P3-a ปิดแล้ว**: `--print-dependency-digest` และเทสต์ใช้งานได้
- **P3-b ปิดแล้ว**: mutant ที่ข้าม symlink ถูก kill
- **P3-c ปิดแล้ว**: บันทึกเป็นข้อจำกัดแล้ว
- **ไม่มี regression**: probe semantics ได้ log เท่ากับ i4 ทุกไบต์ ส่วน probe admission ได้ผลเหมือนเดิม (ต้องตัด env ส่วนเกินออกเพราะ allowlist ใหม่)
- **แต่ `resolvePackage` นับว่าเจอ package เฉพาะเมื่อมี `<dir>/<name>/package.json`** ขณะที่ Node โหลด `<dir>/canvas.js` หรือ `<dir>/canvas/index.js` ที่ไม่มี `package.json` ได้ด้วย ผลคือ comment `build.mjs:44-46` ที่ว่า "installing it anywhere Node looks changes the digest" และการแก้ SEC B (shadow ใน `scripts/node_modules`) ยังไม่จริงทั้งหมด ผมสร้าง lab ที่ digest ตรง pin แล้ววาง shadow แบบไม่มี `package.json` ไว้ใน folder ที่ Node ค้นหา ใช้ env ที่ผ่าน allowlist และ record ที่เขียนเอง ผลคือ **exit 0 PASS** (D1)

## 1. Identity check

| ไฟล์ (`nqr-stageb-b5/project/scripts/`) | ค่าที่คาด | ก่อน | หลัง |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | a979f49a609623173705b27d4776d7f37e0c04483d3218b868adada886af0d45 | ตรง | ตรง |
| build.mjs | 674551ea91cb36d64496d7853f57642504a42ce4f184324a4d6ee9ca0ac55428 | ตรง | ตรง |

- ทั้งห้าไฟล์เป็น mode 0444 และ origin modules byte-identical กับ SOURCE
- หลังรีวิว toolchain SHA ยังตรง ไม่มี `node_modules/canvas*` และไม่มี `scripts/node_modules` ใน repo จริงหรือ candidate
- package/shadow ปลอมทั้งหมดอยู่ใต้ `review-stageb-b5-tl/{evil,lab}` เท่านั้น
- `lab/parent/proj` คือสำเนาจริง (ไม่ใช่ symlink) ของห้า scripts กับ closure 40 package และไฟล์ `next` ที่ pin ไว้สองไฟล์ ขนาด 30 MB **`--print-dependency-digest` ใน lab ได้ `753c9343…969c` ตรงกับ pin** จึงยืนยันด้วยว่าผลไม่ขึ้นกับตำแหน่ง

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b5-tl/tmp`)

| # | Command / probe | ผล (log sha prefix) |
| --- | --- | --- |
| 1 | suite สี่ไฟล์ | **283/283 pass** (`4683cbb5`) |
| 2 | eslint `build.mjs` และเทสต์ | exit 0 |
| 3 | `env -i PATH node scripts/build.mjs --print-dependency-digest` 20 ครั้งผ่าน pipe | ได้ค่าเดียวกันทั้ง 20 ครั้ง = pin และรันใน shell ปกติได้ exit 1 UNTRUSTED_RUNTIME |
| 4 | `probes/p-dep-env.mjs` (NODE_PATH/HOME + canvas ปลอม บน candidate ที่ส่งมา) | (`c047524d`) |
| 5 | `probes/lab-setup.mjs`, `p-shadow-files.mjs`, `p-shadow-scripts.mjs` (shadow แบบไม่มี package.json ผ่าน CLI จริงใน lab) | (`eb090ee1`, `579f4e1e`) |
| 6 | `probes/p1-admission.mjs` (env ว่าง) และ `p2-semantics.mjs` | (`61e1266f`, `46a00580` ซึ่ง = i4) |
| 7 | `probes/mutants.mjs` 15 mutant | (`08b10b4a`) killed 14, survived 1 (equivalent) |

## 3. สถานะ finding ของ i4

| Finding | สถานะ | หลักฐาน |
| --- | --- | --- |
| P1-dep (P2) NODE_PATH/HOME | **ปิดแล้ว** (เฉพาะช่องทางผ่าน env) | `p-dep-env.log`: control → `ACCEPTANCE_NOT_ADMITTED`; `NODE_PATH=evil` → exit 1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME`; `HOME=evil` → exit 1 เหมือนกัน mutant E1 (allowlist ยอม HOME/NODE_PATH) และ E2 (ลบ allowlist) ถูก kill ส่วนการ resolve ผ่าน filesystem ยังไม่ปิด ดู D1 |
| P3-a re-pin | **ปิดแล้ว** | mode `--print-dependency-digest` (`build.mjs:134-138`) ใช้ allowlist เดียวกัน และเทสต์เทียบค่าที่พิมพ์กับ pin พร้อมข้อความบอกให้ review ก่อน re-pin (E8 killed) ดู nit ใน D2 |
| P3-b symlink ใน package | **ปิดแล้ว** | E7 killed ด้วยเทสต์ "symlink inside a package" |
| P3-c TOCTOU hash→import | **ปิดแล้ว** (เป็นข้อจำกัดที่บันทึกไว้) | comment `build.mjs:126-128` และ `:20-23` |

## 4. dependencyDigest ใหม่ (`build.mjs:48-107`) — ประเมินตามรายการ

| หัวข้อ | ผลการตรวจ |
| --- | --- |
| **Resolution ด้วย `resolve.paths` จาก `scripts/`** | ลำดับของ folder ที่ค้นหาถูกต้อง: scripts → project → parent → `/node_modules` → global `$prefix/lib/node` (ไม่มี HOME folder เพราะ allowlist ตัด HOME) E3 (resolve จาก project root) killed **แต่การตรวจ candidate ในแต่ละ folder นับเฉพาะ `<name>/package.json`** ซึ่งไม่ตรงกับ Node ดู D1 |
| **realpath** | package ถูกอ่านและใช้ resolve dependency ต่อจาก real path (E4 killed) และเทสต์ jsdom ที่ symlink ไปยังสำเนาที่ `symbol-tree` ข้างเคียงถูกแก้ จับได้จริง |
| **Row แบบ `name@version`** | ไม่ขึ้นกับตำแหน่ง: lab ที่ย้ายไปอีกที่และเป็นสำเนาจริงได้ digest เท่ากับ pin ส่วน row ถูก sort เป็น JSON string จึงไม่ขึ้นกับลำดับการ visit |
| **Row `absent`** | `canvas` ถูกบันทึกเป็น absent และถ้ามี `canvas/package.json` ใน parent folder digest จะเปลี่ยน (ยืนยันแล้ว) แต่ถ้าเป็น `canvas.js` หรือ `canvas/index.js` ที่ไม่มี package.json digest จะไม่เปลี่ยน (D1) |
| **รายชื่อใน `node_modules` ที่ root ของ package** | บันทึกชื่อรวม scoped แล้ว `jsdom/node_modules/canvas.js` → `DEPENDENCY_MISMATCH` (ยืนยันแล้ว) E6 killed แต่ **`node_modules` ของโปรเจกต์และ `scripts/node_modules` ไม่ถูกบันทึก** เพราะไม่ใช่ root ของ package ใน closure (D1) |
| **ปฏิเสธ `node_modules` ที่ซ้อนลึก** | ทำงานได้ แต่ mutant E5 (ยอมและ hash ต่อไป) **SURVIVED** เพราะทุกไฟล์ใน tree ของ package ถูก hash อยู่แล้ว shim ใดที่เพิ่มเข้าไปจึงทำให้ digest เปลี่ยนอยู่ดี ถือเป็น equivalent mutant และ guard นี้เป็นเพียงความชัดเจน ไม่ใช่ข้อบกพร่อง |
| **ปฏิเสธ symlink** | throw เมื่อพบ entry ที่ไม่ใช่ file/dir ภายใน package (E7 killed) ส่วน symlink ที่ชี้ไปยัง package dir อ่านผ่าน realpath |
| **ความเร็ว** | รันทุกครั้งได้โดยไม่มีปัญหา (suite รวมไม่ช้าลงอย่างมีนัยสำคัญ) |

## 5. Environment allowlist (`build.mjs:13-18, 34-39`)

- **ไม่หลวมเกินไป**: `PATH` เป็นความเสี่ยงที่ comment ระบุไว้แล้ว (`node` ปลอม) ส่วน `TMPDIR`, `LANG`, `LC_ALL`, `TZ` และ `__CF_USER_TEXT_ENCODING` ไม่มีผลต่อการโหลดโค้ด `NODE_*`, `HOME`, `DYLD_*`, `LD_*`, `VERCEL_*`, `npm_*` ถูกปฏิเสธทั้งหมด ข้อควรรู้: ใน `env -i` Node ยังค้น `$prefix/lib/node` (จาก execPath) ซึ่งไม่ขึ้นกับ env และอยู่ในกลุ่มเดียวกับ D1
- **เข้มแต่ใช้งานได้**: shell ปกติ (มี HOME/USER/SHELL/TERM ฯลฯ), `npm run` (เติม `npm_*`) และ CI runner จะได้ UNTRUSTED_RUNTIME ต้องรันด้วย `env -i` เสมอ ซึ่งสอดคล้องกับ NQR129 §4 ที่ว่า CI ต้อง BLOCKED จนกว่าจะมี trust design แยก build path ปกติไม่ได้รับผลกระทบ (allowlist ใช้เฉพาะ verify-existing และ print mode) ข้อบกพร่องด้านการใช้งานดู D2

## 6. Findings

### D1 — P2: `resolvePackage` นับเฉพาะ package ที่มี `package.json` แต่ Node โหลดไฟล์หรือ directory ที่ไม่มี `package.json` ได้ ทำให้ shadow ของ dependency ที่ absent หรือของ root ที่ pin ไว้ ไม่ทำให้ digest เปลี่ยน

**ตำแหน่ง**
- `build.mjs:51-59`: `readFile(join(candidate, "package.json"))` ถ้าอ่านไม่ได้จะข้ามไป folder ถัดไป หรือบันทึกเป็น absent
- `build.mjs:44-46`: ข้ออ้างใน comment
- `:85-87`: บันทึก absent

**กลไก**: CJS `Module._findPath` สำหรับ `require("canvas")` ลองในแต่ละ folder ที่ค้นหา: `canvas` (ไฟล์), `canvas.js`/`.json`/`.node`, `canvas/package.json#main`, `canvas/index.js` ตามลำดับ ส่วน ESM `import "jsdom"` (verifier `:7`) ยอม directory `node_modules/jsdom/` ที่ไม่มี package.json แล้วใช้ legacy main (`index.js`) walk ของ build.mjs จึงมองไม่เห็นทั้งสองรูปแบบ

**Reproduction** (lab ที่ digest = pin, CLI จริง `lab/parent/proj/scripts/build.mjs --verify-existing`, env = `PATH`, `TMPDIR`, `NEXT_PUBLIC_APP_URL` ซึ่งผ่าน allowlist, record ที่เขียนเอง, payload inert ตัวเดิมจาก i4)

`p-shadow-files.log`:
```
control: nothing planted                                          exit=1 NQR_BUNDLE_NEEDS_EMISSION_REVIEW / ACCEPTANCE_NOT_ADMITTED
parent/node_modules/canvas.js (file)                              exit=0 [verify-existing] … PASS  stderr="[probe] unpinned canvas package loaded"
parent/node_modules/canvas/index.js (no package.json)             exit=0 … PASS
proj/node_modules/canvas.js (project node_modules)                exit=0 … PASS
proj/node_modules/jsdom/node_modules/canvas.js (package root)     exit=1 NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH   (root listing จับได้)
parent/node_modules/canvas with package.json (author's test case) exit=1 NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH
```

`p-shadow-scripts.log` (รูปแบบของ SEC B: shadow ของ **root ที่ pin ไว้**, `scripts/node_modules/jsdom/index.js` ที่ไม่มี package.json แล้ว re-export jsdom จริงหลัง patch):
```
scripts/node_modules/jsdom/index.js without package.json: exit=0 [verify-existing] … PASS
after removal (control):                                  exit=1 … ACCEPTANCE_NOT_ADMITTED
```

(ข้อความ `[probe] unpinned canvas package loaded` ใน case jsdom มาจาก payload ตัวเดียวกันที่ใช้ซ้ำ)

**Preconditions และความรุนแรง**: ต้องเขียนไฟล์ได้ใน folder หนึ่งที่ Node ค้นหา
- `scripts/` หรือ `node_modules` ของโปรเจกต์: comment `:20-22` ประกาศว่าอยู่นอก boundary ของ drift detection และให้ C2 ตรวจจาก snapshot แยก
- **folder แม่ที่อยู่นอก repo** (เช่น `…/Nexora/node_modules`, `/node_modules`) และ **`$prefix/lib/node`**: อยู่นอก snapshot ของ repo ตาม C2 ด้วย

ข้อนี้เป็นกลไกเดียวกับ P1-dep ของ i4 (dependency ที่ absent ถูก Node โหลดจากที่อื่น) เปลี่ยนแค่จาก env เป็นไฟล์ ข้ออ้างที่ `:44-46` และ SEC B ในรายงานผู้เขียนจึงยังไม่จริง ผมให้ **P2** ถ้า PM/SECURITY ตัดสินอย่างเป็นทางการว่าผู้ที่เขียนไฟล์ได้ใน folder ที่ Node ค้นหาทุกแห่ง (รวม folder นอก repo) อยู่นอกขอบเขต จะลดเป็น P3 ได้ แต่ต้องแก้ comment ให้ตรงกับความจริงอย่างน้อย

**ข้อเสนอแก้** (สั้น อยู่ใน build.mjs ไม่มีการรันโค้ดของ package)
1. ให้ resolver ของ Node เป็นตัวตัดสิน แทนการตรวจ `package.json` เอง:
   - root ที่ถูก import ผ่าน ESM จาก `scripts/`: ใช้ `import.meta.resolve(name)` (build.mjs อยู่ใน `scripts/` แล้ว) ผลต้องอยู่ใน real dir ของ package ที่ hash
   - dependency ของแต่ละ package: ใช้ `createRequire(join(found.dir, "package.json")).resolve(dep)` ถ้า resolve ได้ ผลต้องอยู่ใน real dir ที่ `resolvePackage` คืนมา ถ้า walk ถือว่า absent `resolve` ต้อง throw `MODULE_NOT_FOUND` ถ้าไม่ throw → `DEPENDENCY_MISMATCH`
2. เพิ่มเทสต์ CLI: `canvas.js` และ `canvas/index.js` ที่ไม่มี package.json ใน parent folder, `node_modules/canvas.js` ของโปรเจกต์ และ `scripts/node_modules/jsdom/index.js` ที่ไม่มี package.json

### D2 — P3: คำแนะนำสำหรับ operator/maintainer ยังไม่พอ และ print mode echo path

- ข้อความ re-pin ในเทสต์ (`test.mjs:1387`) และ comment `build.mjs:23` บอกให้รัน `node scripts/build.mjs --print-dependency-digest` ใน shell ปกติ แต่คำสั่งนี้จะได้ `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` (ยืนยันแล้ว) ต้องเป็น `env -i PATH="$PATH" node …` ส่วน `USAGE` และข้อความ UNTRUSTED_RUNTIME ไม่ได้บอกให้ใช้ `env -i` (ยังเป็น fixed code ที่เติม hint คงที่ได้ โดยไม่ต้องใส่ชื่อตัวแปร)
- print mode: ถ้า `dependencyDigest` throw ด้วย error ที่ไม่ใช่ mismatch เช่นไฟล์ `next` ที่ pin ไว้หายไป outer catch (`:181`) จะพิมพ์ `ENOENT: … open '<absolute path>/node_modules/next/dist/compiled/acorn/acorn.js'` (ยืนยันแล้ว) mode นี้เป็นของ maintainer ไม่ใช่ gate จึงเป็นแค่ความไม่สม่ำเสมอกับนโยบาย fixed-code ข้อเสนอ: แมปเป็น `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` เหมือน `verifyDependencies`

## 7. Regression

- `p2-semantics.log` = i4 ทุกไบต์ (`46a00580`)
- `p1-admission.log` (env ว่าง): control ทั้งสองได้ exit 0 และทุก variant ได้ exit 1 in-process revision ได้ผลเท่า i4 ทุกกรณี (THROWS/DIFFERENT)
- Mutant ที่ killed: M37, M09, M32, M30 (regex หลวม), M35, M14 และของใหม่ E1–E4, E6–E9

## 8. ข้อจำกัดของรีวิวนี้

- ใช้ fixture สังเคราะห์กับ lab ที่เป็นสำเนาของ closure ไม่ได้วางไฟล์ใน `node_modules` จริงหรือ folder นอกพื้นที่ที่อนุญาต ผลใน lab ใช้ได้กับ repo จริงเพราะ scripts เหมือนกันทุกไบต์และ digest ตรง pin
- ไม่ได้ทดสอบ `.node` native addon เป็น shadow (ต้อง compile) ช่องนี้อยู่ใน `Module._findPath` ชุดเดียวกัน และการแก้ใน D1 ข้อ 1 ครอบคลุมด้วย
- ไม่ได้รัน mutant 62 ตัวของผู้เขียน ผลนี้มาจาก mutant 15 ตัวของผม
- ข้อจำกัดเดิมยังอยู่: Stage A runtime chunk เป็น UNKNOWN, `COLD_VALID_INITIAL_PREVIEW`, C2 ใน runbook, `node` ปลอมใน PATH และ dyld injection
