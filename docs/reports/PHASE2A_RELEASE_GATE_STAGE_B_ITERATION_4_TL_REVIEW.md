# NQR-129 Stage B iteration 4 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-b3-tl/TL_REVIEW_ITERATION_3.md` SHA `e9b59011dc9ca7c123d941843270f1aabddeae1a6f2f1ee8df5cf972b24dba23` (ACCEPT)

## Verdict: **REQUEST_CHANGES** (มี P2 ใหม่หนึ่งข้อ ซึ่งอยู่ใน fix ของ S1 เอง)

- **R1–R3 ปิดครบ** เทสต์ใหม่ kill mutant M37, M09, M32 และ M32b ได้จริง
- **ไม่มี regression** ในส่วนที่ผมเคย accept ใน iteration 3: probe ชุดเดิมให้ผลเหมือนเดิมทุกบรรทัด และ mutant regression ถูก kill ทั้งหมด
- **Dependency pin** ครอบไฟล์ที่ถูกโหลดจริงครบ ผม trace ได้ 1,124 ไฟล์ และ uncovered = 0 ทั้ง walk และลำดับเป็น deterministic
- **แต่ walk ถือว่า dependency ที่ resolve ไม่เจอในโปรเจกต์ "ไม่ได้โหลด"** ขณะที่ Node ยังหา package นั้นต่อนอกโปรเจกต์ได้ jsdom เรียก `require("canvas")` ทุกครั้งที่โหลด ผมใส่ `canvas` ปลอมไว้ใน `NODE_PATH` หรือ `$HOME/.node_modules` แล้วรัน candidate ที่ส่งมา **ซึ่ง admission list ว่าง** ด้วย record ที่เขียนเอง ผลคือ **exit 0 "bundle and origin scopes PASS"** ทั้งที่ pin ยังตรงทุกไบต์ (P1-dep, P2)

## 1. Identity check

| ไฟล์ (`nqr-stageb-b4/project/scripts/`) | ค่าที่คาด | ก่อน | หลัง |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | 97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | 1df0fcdf8170663e42a2c25790c10655af91814216e0aa0cd5cc137992616bd8 | ตรง | ตรง |
| build.mjs | 2f5093cd14186a7dcff5edff9c08f07f929c2c3e986e4323517a47ebe124fbe2 | ตรง | ตรง |

- ทั้งห้าไฟล์เป็น mode 0444 และ adapter กับเทสต์ของ adapter เหมือน i3 ทุกไบต์ ส่วน origin modules byte-identical กับ SOURCE
- ผม diff i3→i4 เอง: verifier เปลี่ยนแค่ comment/JSDoc และถอด `Object.isFrozen` ออก ส่วน build.mjs เพิ่ม dependency pin และการตรวจ env `DYLD_*/LD_PRELOAD`
- หลังรีวิว toolchain SHA ยังตรง และไม่มี `node_modules/canvas` ในโปรเจกต์จริง
- ไม่ได้เขียนอะไรใน candidate root, repo จริง หรือ directory ใดนอก `review-stageb-b4-tl` (package ปลอมอยู่ที่ `review-stageb-b4-tl/evil/` เท่านั้น)

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b4-tl/tmp`)

| # | Command / probe | ผล (log sha prefix) |
| --- | --- | --- |
| 1 | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test` สี่ suite | **282/282 pass** (`run-candidate-1.log` `09b734d7`) |
| 2 | eslint บนสามไฟล์ที่เปลี่ยน | exit 0 |
| 3 | `probes/p1-admission.mjs` (ชุดเดียวกับ i3, 12 declaration, real CLI) | เหมือน i3 ทุกบรรทัด (`ea483823` ซึ่ง hash เท่ากับ log ของ i3) |
| 4 | `probes/p2-semantics.mjs` (ชุดเดียวกับ i3) | เหมือน i3 ทุกบรรทัด (`46a00580` hash เท่ากับ log ของ i3) |
| 5 | `probes/p-dep-coverage.mjs`: `module.registerHooks` บันทึกทุกไฟล์ที่โหลดระหว่าง legacy inspector, adapter และ `verifyOriginArtifacts` แล้วเทียบกับ walk ที่ replicate จาก build.mjs | (`8eed6d71`) |
| 6 | `probes/p-dep-env.mjs`: `canvas` ปลอมผ่าน `NODE_PATH` และ `HOME` บน CLI ของ candidate ที่ส่งมา | (`9bb9cdad`) |
| 7 | `probes/mutants.mjs` 17 mutant | (`73585f55`) killed 16, survived 1 |

## 3. R1–R3

| Finding | สถานะ | หลักฐาน |
| --- | --- | --- |
| R1 เทสต์ wrapper สำหรับ scan ตอน UNKNOWN | **ปิดแล้ว** | เทสต์ใหม่ "an admitted record still FAILs an eager PDF preload while a runtime chunk keeps the adapter UNKNOWN" ใช้ไฟล์บน disk ผ่าน verifier และ CLI จริง **M37 KILLED** |
| R2 edge case ของ scan | **ปิดแล้ว** (บันทึกไว้) | JSDoc ของ `startupReachableChunks` (`verify:613-617`) อธิบายทั้งสองกรณีตรงกับที่ probe F/G ของผมเจอ |
| R3 M09/M32/M33 | **ปิดแล้ว** | M09 **KILLED** (เทสต์ patch `fs.open` + `syncBuiltinESMExports` ทดสอบ `readBoundFile` จริง) ; M32 และ M32b (`ADMITTED_SET.has` แบบไม่ capture) **KILLED** ; M33: ถอด `Object.isFrozen` ออก ซึ่งถูกต้อง เพราะ strict grammar บังคับ `Object.freeze(...)` และข้อความอื่นถูก hash แล้ว |

## 4. Regression (สิ่งที่ accept ไว้ใน i3)

- probe ด้าน admission และ semantics ได้ log เท่ากับ i3 ทุกไบต์: env/IIFE/decoy/U+2028/CRLF ได้ exit 1, control ได้ exit 0, marker legacy/startup ได้ FAIL ทั้งเมื่อ UNKNOWN และ SUPPORTED, route set/symlink ได้ BLOCKED
- mutant regression ที่ **KILLED** ทั้งหมด: M30 (regex หลวม), M26 (statement count), M31 (runtime list), M35 (scan เฉพาะ SUPPORTED), M34 (attestation), M22 (NODE_OPTIONS), M14 (re-verify)
- build path ปกติไม่เปลี่ยน: `verifyDependencies` ถูกเรียกเฉพาะใน `verifyExisting` (`build.mjs:81`)

## 5. Dependency pin (`build.mjs:13-72`) — ประเมิน

**ครอบคลุมอะไร (ยืนยันแล้ว)**
- Closure จาก `jsdom`, `parse5`, `entities` รวม deps + optional + peer ได้ 40 package / 1,866 ไฟล์ บวก `next/package.json` และ `acorn.js` replica ของ walk ได้ digest ตรงกับ pin (`replicaDigestEqualsPin true`) และใช้เวลา hash ~165 ms
- **ไฟล์ที่ถูกโหลดจริง 1,124 ไฟล์ใต้ `node_modules` อยู่ใน closure ทั้งหมด (uncovered = [])** และไม่มีไฟล์ใดถูกโหลดจากนอกโปรเจกต์ใน environment ปกติ
- ลำดับ: package เรียงตาม posix path, entry เรียงตาม code unit, pinned files ต่อท้าย ผลจึง deterministic
- `node_modules` ที่ซ้อนอยู่ใน package ถูกข้าม และจะถูก hash ก็ต่อเมื่อเป็น dependency ที่ resolve ไปถึง
- symlink ภายใน tree ของ package → throw (fail closed) ส่วน package dir หรือ `node_modules` ที่เป็น symlink ถูกอ่านตาม link (อ่าน content จริง)
- Pin อยู่ใน `build.mjs` ซึ่งเป็นส่วนหนึ่งของ `buildWrapperSha256` การ re-pin จึงบังคับให้ gate revision และ review เปลี่ยนตาม ซึ่งถูกต้องตามเจตนา
- ตรวจก่อน import verifier (D1/D2 killed) และ closure ต้องรวม optional/peer (D5 killed เพราะมี package ที่ติดตั้งผ่าน optional/peer จริง)

**สิ่งที่พลาด** → ดู P1-dep ด้านล่าง

## 6. Findings

### P1-dep — P2: walk ถือว่า dependency ที่ resolve ไม่เจอเป็น "ไม่ได้โหลด" แต่ Node ยัง resolve ต่อนอกโปรเจกต์ได้ ส่งผลให้ admission ถูก bypass ด้วย env ตัวเดียว

**ตำแหน่ง**
- `build.mjs:28-35`: `resolvePackage` หยุดที่ `projectRoot`
- `build.mjs:38-39`: `// An uninstalled optional or peer dependency loads nothing` แล้ว `if (!found …) return;`
- `build.mjs:77-78`: ตรวจแค่ `NODE_OPTIONS`/`DYLD_*`/`LD_PRELOAD` ไม่ตรวจ `NODE_PATH`

**กลไก**: `jsdom/lib/jsdom/utils.js:101-105` ทำ `try { exports.Canvas = require("canvas"); } catch {}` ทุกครั้งที่ jsdom โหลด (verifier import jsdom แบบ static) `canvas` เป็น optional peer ที่ไม่ได้ติดตั้งในโปรเจกต์ walk จึงข้ามไปโดยไม่ผูกอะไร แต่ CJS resolution ของ Node ยังหา package ต่อใน (1) directory แม่ของ realpath ของ jsdom ที่อยู่เหนือ repo, (2) `NODE_PATH` และ (3) `$HOME/.node_modules` / `$HOME/.node_libraries` โค้ดใน `canvas` ปลอมจึงรันก่อนที่ verifier จะ capture `Set.prototype.has` (ESM ประเมิน dependency ก่อนตัว module)

**Reproduction** (`probes/p-dep-env.mjs`, `p-dep-env.log`)
- รัน **`build.mjs` ของ candidate ที่ส่งมา** (ไม่ใช่สำเนา) และยืนยันว่า `ADMITTED_ACCEPTANCE_SHA256` = `[]`
- ใช้ artifact สังเคราะห์กับ record ที่เขียนเอง ส่วน payload เป็นไฟล์ inert ที่ขยาย `Set.prototype.has` เฉพาะค่า 64-hex แล้ว throw เพื่อทำตัวเหมือน canvas ไม่มี

```
control (no env)          exit=1 stderr="NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED"
NODE_PATH=evil            exit=0 stdout="[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval" stderr="[probe] unpinned canvas package loaded"
HOME=evil (.node_modules) exit=0 stdout="[verify-existing] bundle and origin scopes PASS …" stderr="[probe] unpinned canvas package loaded"
```

กรณี (1) directory แม่ เช่น `/Users/sarawutjuntasang/Nexora/node_modules/canvas` ผมไม่ได้สาธิต เพราะต้องเขียนนอกพื้นที่ที่อนุญาต แต่ใช้กลไก resolution เดียวกัน

**ทำไมเป็น P2 ไม่ใช่ P3**: S1 ถูกเพิ่มเข้ามาเพื่อยืนยันว่า "Package code that --verify-existing loads … pinned" และ S2 ถือว่าการปฏิเสธ env ที่ inject โค้ดอยู่ในขอบเขตงาน แต่ env ตัวเดียว (หรือ `HOME` ที่ปกติไม่มีใครสงสัย) ก็ทำให้ gate exit 0 ได้โดย pin ยังตรง ข้ออ้างของ fix นี้จึงไม่เป็นจริงในกรณีที่ fix ตั้งใจจะกัน การแก้ก็สั้น ความเสี่ยงยังอยู่ในกลุ่ม operator environment และไม่ต้องแก้ repo จึงไม่ถึง P1

**ข้อเสนอแก้** (อยู่ใน build.mjs)
1. ปฏิเสธ `NODE_PATH` ทุกค่าใน `--verify-existing` เหมือน `NODE_OPTIONS`
2. **ให้ Node เป็นตัว resolve แทนการจำลอง**: สำหรับทุก dependency ที่ประกาศไว้ใน closure ให้เรียก `createRequire(join(realpath(packageDir), "package.json")).resolve(name)` (หรือ `require.resolve(name + "/package.json", { paths: [realDir] })`) ถ้า resolve ได้ ผลต้องอยู่ใน package dir ที่ hash แล้ว ถ้า resolve ไม่ได้ ต้อง throw จริง ถ้า optional/peer ที่ walk ถือว่า "ไม่ติดตั้ง" กลับ resolve ได้ → `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` วิธีนี้ปิดได้ทั้ง `NODE_PATH`, `HOME` global folders, directory แม่นอก repo และ layout ที่ package dir เป็น symlink (resolution จาก realpath อาจต่างจาก walk แบบ lexical)
3. แยก dependency ที่ประกาศใน `dependencies` แต่ resolve ไม่ได้ออกจาก optional/peer ถ้าเป็น required แล้ว resolve ไม่ได้ให้ fail
4. เพิ่มเทสต์ CLI จริงด้วย `NODE_PATH` และ `HOME` ที่มี `canvas` ปลอม (payload inert) แล้วคาดว่า exit 1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` หรือ `…DEPENDENCY_MISMATCH`

### P3-a: การ re-pin ยังดูแลยาก และเทสต์ผูกกับ bytes ที่ติดตั้งอยู่

- ไม่มีวิธีที่ reviewed สำหรับคำนวณ digest ใหม่ (`dependencyDigest` ไม่ได้ export และไม่มีเทสต์ที่พิมพ์ค่าที่คาด) คนดูแลต้องเขียนสคริปต์เองหรือแก้ไฟล์ชั่วคราว
- เทสต์ PASS ห้าตัว (on-disk admission, data-only list, R1, dependency tamper, real CLI) ขึ้นกับ bytes ใน `node_modules` ตอนนี้ (mutant D5/D6 ทำให้ fail พร้อมกันห้าตัว) ถ้า `npm install` เปลี่ยน jsdom, parse5 หรือ next แม้แค่ patch เทสต์ชุดนี้จะ fail โดยข้อความไม่บอกสาเหตุ
- **ข้อเสนอ**: export `dependencyDigest` (หรือแยกเป็น helper ที่ไม่มี bypass) ให้เทสต์ assert ว่าค่าที่คำนวณได้ตรงกับ pin พร้อมข้อความที่บอกว่า "re-pin + review" และเขียนขั้นตอน re-pin ไว้ใน runbook

### P3-b: mutant D3 รอด (ไม่มีเทสต์ symlink ใน tree ของ package)

แก้ `build.mjs:53-56` ให้ข้าม symlink แทนที่จะ throw แล้ว **SURVIVED** น้ำหนักต่ำ เพราะการแทนไฟล์เดิมด้วย symlink ทำให้ row หายไป และ digest ก็เปลี่ยนอยู่แล้ว แต่ guard ที่มีอยู่ควรมีเทสต์รองรับ

### P3-c: TOCTOU ระหว่าง hash dependency กับการ import

`verifyDependencies()` hash เสร็จก่อน แล้วจึง `import()` verifier ไฟล์จึงถูกสลับในช่วงนั้นได้ เป็นข้อจำกัดชนิดเดียวกับ C4 ที่ยอมรับไว้แล้ว แต่ควรเขียนลงในรายงานข้อจำกัดของ S1 ด้วย

## 7. ข้อจำกัดของรีวิวนี้

- ใช้ fixture สังเคราะห์เท่านั้น ไม่มี emission จริง, browser หรือ build ข้อจำกัด Stage A (runtime chunk เป็น UNKNOWN) และ `COLD_VALID_INITIAL_PREVIEW` ยังอยู่
- การ trace ไฟล์ที่โหลดครอบเฉพาะเส้นทางที่ probe เรียก (legacy inspector, adapter, origin artifacts บน artifact สังเคราะห์) เส้นทางที่ jsdom lazy-load จาก HTML/XML รูปแบบอื่นอาจโหลดไฟล์เพิ่ม แต่ถ้าไฟล์นั้นอยู่ใน closure ก็ยังถูกครอบ
- ไม่ได้สาธิตกรณี directory แม่นอก repo เพราะต้องเขียนนอกพื้นที่ที่อนุญาต
- ไม่ได้รัน mutant 55 ตัวของผู้เขียน ผลนี้มาจาก mutant 17 ตัวของผม
- ประเด็นของ SECURITY (S1/S2/C1/C2) ประเมินในแง่ความถูกต้องและ coverage เท่านั้น ส่วน threat model เป็นหน้าที่ของ SECURITY
