# NQR-129 Stage B iteration 5 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b5/project` (canonical5 ตามรายงานผู้เขียน `a88595ef…bf55`)

## Verdict: **ACCEPT (Stage B security scope, LOW residual เท่านั้น)**

ACCEPT นี้ไม่ใช่ release readiness และไม่อนุญาตให้ deploy

- Bypass A–D ของ iteration 4 ถูกปิดทั้งหมดบน CLI จริง
- Comment และรายงานบอกตรง ๆ ว่า dependency pin เป็น **drift detection** ไม่ใช่ security boundary และส่ง C2 ไปเป็นขั้นตอนใน runbook
- ผมพบช่องใหม่ใน drift detection หนึ่งกลุ่ม (S5-1): ไฟล์ `<dep>.js` ที่วางข้าง package ใน `node_modules` ทำให้ได้ exit 0 ขณะที่ digest ยังตรง ต้องมีสิทธิ์เขียน `node_modules` ซึ่งอยู่นอก boundary ที่ประกาศไว้ ระดับจึงเป็น LOW
- Preload ที่ลบ `NODE_OPTIONS` ของตัวเองยังข้าม allowlist ได้ (S5-2) ซึ่งตรงกับข้อจำกัด "defense in depth" ที่เอกสารไว้แล้ว

ถ้าผู้ใช้ต้องการปิด LOW ทั้งหมดก่อน integrate จริง S5-1 แก้ได้ในวงแคบ (§4) และควรแก้ข้อความใน JSDoc/รายงานที่อ้างว่า digest เปลี่ยน "ไม่ว่า Node จะค้นที่ใด"

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 (`diff` กับ i4 ได้ผลว่าเหมือนกันทุกไบต์) |
| verify-initial-bundle-boundary.test.mjs | a979f49a609623173705b27d4776d7f37e0c04483d3218b868adada886af0d45 |
| build.mjs | 674551ea91cb36d64496d7853f57642504a42ce4f184324a4d6ee9ca0ac55428 |

ไม่ได้แก้ candidate root หรือ `node_modules` ที่ใช้ร่วม และ repo จริงไม่มี `node_modules/canvas`, `canvas.js` หรือ `symbol-tree.js` probe ทุกตัวใช้สำเนาใน `review-stageb-b5-sec/` ที่มี `node_modules` เป็น directory ของ symlink ไปยัง package จริง ยกเว้น package ที่ copy ออกมา

## 2. Commands ที่รันจริง (Node v24.14.1 `/usr/local/bin/node`, `env -i PATH TMPDIR NEXT_PUBLIC_APP_URL`)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `node --test` 4 suite บนสำเนา | 283/283 pass |
| 1 | `p-setup3.mjs` สร้าง artifact/record ผูก gate revision i5 แล้ว admit 10 digest | สร้างได้ |
| 2 | Control | pristine + record ที่เขียนเอง → exit1 `ACCEPTANCE_NOT_ADMITTED`; admitted clean → **exit 0**; admitted flightPdf → exit1 `FORBIDDEN_STARTUP_MARKER` |
| 3 | Re-run A: `NODE_PATH=<dir>/canvas` | exit1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` (`HOME` ก็ถูกปฏิเสธ) |
| 4 | Re-run B: `scripts/node_modules/jsdom` shim | exit1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` |
| 5 | Re-run C: `jsdom/lib/node_modules/symbol-tree` shim | exit1 `DEPENDENCY_MISMATCH` |
| 6 | Re-run D: `jsdom` เป็น symlink ไปยังสำเนาที่มี `symbol-tree` ข้างเคียงถูกแก้ | exit1 `DEPENDENCY_MISMATCH` |
| 7 | F: `node_modules/symbol-tree.js` (shim) วางข้าง `symbol-tree/` ที่ไม่แก้ | **exit 0**; `--print-dependency-digest` = `753c9343…969c` (ตรงกับ pin) |
| 8 | F′: `node_modules/canvas.js` (optional peer ที่ไม่ได้ติดตั้ง) | **exit 0**; digest ตรงกับ pin |
| 9 | G: `NODE_OPTIONS=--import=scrub-patch.mjs` (preload ลบ `NODE_OPTIONS` แล้ว patch) | **exit 0** |
| 10 | `resolve.paths("jsdom/")` ภายใต้ `env -i` | ท้ายรายการมี `/node_modules` และ `/usr/local/lib/node` ดังนั้น global prefix folder อยู่ในการค้นของ digest แล้ว |
| 11 | ตรวจ `exports`/`imports` ของ dependency หลัก + static scan หา require ที่ไม่ได้ประกาศ (`p-undeclared.cjs`) | ไม่มี `imports` field; ไม่พบ require ที่ไม่ได้ประกาศจริง (มีแต่ false positive จาก regex) |
| 12 | `--print-dependency-digest` เมื่อตั้ง `HOME` | exit1 `UNTRUSTED_RUNTIME` (ใช้ allowlist เดียวกัน) |

## 3. สถานะของ finding เดิม

| Item | สถานะ |
| --- | --- |
| S4-1 A (`NODE_PATH`/global folder) | **Fixed** ด้วย allowlist และ `resolve.paths` ที่รวม `/usr/local/lib/node` |
| S4-1 B (`scripts/node_modules`) | **Fixed** |
| S4-1 C (`node_modules` ซ้อน) | **Fixed** (throw เมื่อลึกกว่า root และบันทึกรายชื่อเมื่ออยู่ที่ root) |
| S4-1 D (symlink + dependency ข้างเคียง) | **Fixed** (realpath) |
| S4-1 E (race ระหว่าง hash กับ import) | **ยอมรับเป็นข้อจำกัดที่เอกสารไว้** (`build.mjs:126-128`) |
| S4-2 (DYLD ทำงานก่อน JS) | **ยอมรับเป็นข้อจำกัดที่เอกสารไว้** (`build.mjs:16`) |
| ความซื่อตรงของถ้อยคำ | **ส่วนใหญ่ถูกต้อง**: `build.mjs:20-23` ระบุ drift detection และ C2 เป็น runbook, `:35` ระบุ defense in depth และรายงาน §2/§4 สอดคล้อง ข้อความที่เกินจริงเหลือจุดเดียว คือ JSDoc `:41-46` ("as Node would resolve it", "installing it anywhere Node looks changes the digest") กับแถว S4-1 A ของรายงาน ซึ่ง S5-1 แสดงว่าไม่จริงสำหรับไฟล์ `<name>.js/.json/.node` |
| C1 | เหมือน i4: เพียงพอในระดับ source (comment ติดกับ admission list) โดยมีเงื่อนไขว่า PM runbook อ้างถึงและเก็บผลตรวจไว้ |
| C2 | **ยอมรับได้ในฐานะขั้นตอน runbook** เพราะโค้ดไม่อ้างว่าบังคับแล้ว เงื่อนไขคือ runbook ต้องมีอยู่จริงก่อน admit ครั้งแรก และต้องกำหนดว่า (1) ตรวจ dependency tree จาก process แยกบน snapshot ที่อ่านอย่างเดียว เทียบกับ lockfile/registry integrity ไม่ใช่เทียบแค่ `--print-dependency-digest` (2) รันด้วย `env -i` บนเครื่องและ `node` ที่เชื่อถือได้ |

## 4. S5-1 — LOW (ใหม่, gap ของ drift detection): ไฟล์ข้าง package ใน `node_modules` ไม่ถูก digest

- ตำแหน่ง: `build.mjs:51-58` `resolvePackage` นับ base ว่าเจอ package ก็ต่อเมื่อมี `<base>/<name>/package.json` แต่ CJS `Module._findPath` ของ Node ที่ base เดียวกันจะลอง `tryExtensions(<base>/<name>)` คือ `<name>.js`/`.json`/`.node` **ก่อน** `tryPackage` สำหรับ package ที่ไม่มี `exports` และลองเลยสำหรับ package ที่ไม่ได้ติดตั้ง ส่วน `hashTree` บันทึกรายชื่อเฉพาะ `node_modules` ที่ root ของ package ที่ pin ไม่ได้บันทึก `node_modules` ระดับ project ที่เป็น parent ของ package
- หลักฐาน (ใช้ verifier/build ที่ไม่ได้แก้ และ record ที่เขียนเองและไม่ admit):
  - F: `project/node_modules/symbol-tree.js` (patch `Set.prototype.has` แล้ว re-export ของจริง) ขณะที่ jsdom เป็นสำเนา byte-identical → **exit 0** และ digest = pin
  - F′: `project/node_modules/canvas.js` (patch แล้ว throw เพื่อให้ `try/catch` ของ jsdom ทำงานต่อได้) → **exit 0** และ digest = pin แม้ JSDoc จะบอกว่า absent peer จะทำให้ digest เปลี่ยน
- Package ที่มี `exports` (เช่น `tough-cookie`, `parse5`, `entities`) ไม่โดนวิธีนี้เพราะ Node ใช้ `resolveExports` ก่อน แต่ `symbol-tree`, `whatwg-url`, `saxes` และ package ที่ไม่ได้ติดตั้งโดน
- Preconditions: ต้องมีสิทธิ์เขียน `node_modules` (หรือ directory ใดในรายการค้นหา) ซึ่งรายงานประกาศไว้แล้วว่าอยู่นอก boundary และ C2/runbook ครอบไว้
- ข้อเสนอแก้ (วงแคบ): ทุก base ใน `resolve.paths(name)` ที่ตรวจก่อนถึง package ที่เลือก และตัว base ที่เลือกเอง ให้เช็คว่า `<base>/<name>` + `Object.keys(require.extensions)` (`.js`, `.json`, `.node`) และ `<name>` ที่เป็นไฟล์ ไม่มีอยู่ ถ้ามีให้ mismatch หรือบันทึกลง digest ทำแบบเดียวกันกับ dependency ที่เป็น `absent` และเพิ่มเทสต์ CLI สำหรับ F/F′ พร้อมแก้ JSDoc ให้ตรงกับความจริง

## 5. S5-2 — LOW (documented): preload ที่ลบร่องรอยตัวเองข้าม allowlist

- `NODE_OPTIONS=--import=scrub-patch.mjs` ที่ `delete process.env.NODE_OPTIONS` แล้ว patch `Set.prototype.has` → **exit 0** กับ record ที่เขียนเอง
- Option ที่มาจาก `NODE_OPTIONS` ไม่ปรากฏใน `execArgv` และ allowlist ถูกเช็คหลังจาก preload ทำงานไปแล้ว ตรงกับ comment "Defense in depth only" (`build.mjs:35`) และข้อจำกัดเรื่อง DYLD
- ตัวแปร `NODE_*` อื่นที่ Node อ่านก่อน JS (`NODE_COMPILE_CACHE`, `NODE_ICU_DATA`, `NODE_EXTRA_CA_CERTS`) จะถูกปฏิเสธถ้ายังตั้งอยู่ แต่ผลของมันเกิดขึ้นแล้วตอน startup (theoretical ไม่ได้สาธิต)
- Preconditions: ควบคุม environment ได้ ซึ่งเทียบเท่ากับรันโค้ดได้ ไม่ต้องแก้โค้ด ให้ runbook ระบุ `env -i` และระบุว่าเครื่องกับ `node` ต้องเชื่อถือได้

## 6. คำตอบข้อซักถามเพิ่มเติม

- **`resolve.paths` พลาดอะไรบ้าง:**
  - ไฟล์ `<name>.js/.json/.node` ข้าง package → **พลาด** (S5-1)
  - Global folders: `HOME` ถูกปฏิเสธ และ `<prefix>/lib/node` อยู่ใน `resolve.paths` จึงครอบแล้ว
  - `.pnp`: Node core ไม่โหลด PnP ถ้าไม่มี `--require` (ซึ่งถูกปฏิเสธ) → ไม่เกี่ยว
  - Package `imports` field: ไม่มีใน dependency หลัก และ `package.json` ถูก hash
  - Self-reference ผ่าน `exports`: resolve ภายใน package ที่ถูก hash แล้ว
  - Case-insensitive FS: Node กับ digest ใช้ชื่อเดียวกันกับ path เดียวกัน ไม่พบช่องเพิ่ม นอกจาก S5-1 ที่ `stat` แบบไม่สนตัวพิมพ์จะเจอ `Symbol-Tree.js` ด้วย
- **Require ที่ไม่ได้ประกาศ:** static scan ไม่พบ ช่องที่เกี่ยวข้องคือ optional peer ที่ไม่ได้ติดตั้ง (F′)
- **Environment allowlist:** ตัวแปรที่ยังไปถึง Node ได้คือ `PATH`, `NEXT_PUBLIC_APP_URL`, `TMPDIR`, `LANG`, `LC_ALL`, `TZ`, `__CF_USER_TEXT_ENCODING` ไม่มีตัวไหนทำให้ Node โหลดโค้ด ส่วน `TZ` ไม่กระทบ `isoInstant` เพราะใช้ UTC ตัวแปรที่ทำงานก่อน JS ดู S5-2
- **`--print-dependency-digest` ใช้ launder tree ที่ถูกแก้ได้หรือไม่:** เปลี่ยน pin ต้องแก้ `build.mjs` ซึ่งทำให้ `buildWrapperSha256` → gate revision → record และ reviews ทั้งหมดต้องออกใหม่ผ่าน review จึงไม่ใช่ bypass แต่ command นี้บอกเพียง digest ไม่ได้บอกว่า bytes ถูกต้อง (tree ที่ F/F′ แก้แล้วยังพิมพ์ค่าเดียวกับ pin) runbook ของการ re-pin จึงต้องตรวจ tree กับ lockfile/registry integrity ก่อนนำค่าไปใช้
- **Exit 0 โดยไม่มี record ที่ admit อย่างถูกต้อง:** ทำได้เฉพาะเมื่อมีโค้ดใน process อยู่แล้ว (S5-1 ต้องเขียน `node_modules`, S5-2 ต้องคุม environment) หรือแก้ reviewed source ไม่พบทางอื่น ส่วน admission grammar, attestation, fixed codes และ re-verify ยังทำงานเหมือนเดิม

## 7. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่มี Next build จริงหรือ browser
- ไม่ได้รัน mutation suite 62 แบบของผู้เขียนซ้ำ และไม่ได้ทดสอบบน Linux (`LD_*`)
- ไม่ได้สาธิต `NODE_COMPILE_CACHE` ที่ถูก poison
- Static scan ของ require ที่ไม่ได้ประกาศเป็นการประมาณด้วย regex
- Probe และสำเนาอยู่ใน `review-stageb-b5-sec/{probes,tmp,project,admit,shadow,nested,symsib,evil,evilpath,sibfile,absentpeer,scrub,homepath}`
