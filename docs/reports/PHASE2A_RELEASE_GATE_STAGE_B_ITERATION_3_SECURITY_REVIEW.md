# NQR-129 Stage B iteration 3 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b3/project` (canonical5 ตามรายงานผู้เขียน `3f168b9c…0bfd`)

## Verdict: **ACCEPT (Stage B security scope เท่านั้น มีเงื่อนไขใน §6)**

ACCEPT นี้ไม่ใช่ release readiness และไม่อนุญาตให้ deploy

Finding ระดับ MEDIUM ของ iteration 2 ปิดแล้วทั้งสองข้อ:
- **N1:** declaration ของ admission ที่ไม่ใช่ข้อมูลล้วนทำให้ gate revision อ่านไม่ได้ ทั้ง 7 รูปแบบที่ลอง → BLOCKED
- **N2:** chunk startup ที่ encode marker จะ PASS ได้ก็ต่อเมื่อ record ที่ admit แล้ว attest bytes นั้นพอดี

N3 ปิดแล้วด้วย (`NODE_OPTIONS` ที่ไม่ว่างทุกรูปแบบ → exit 1) ไม่พบทางไปถึง exit 0 โดยไม่มี record ที่ admit อย่างถูกต้อง นอกจากโค้ดที่รันใน process อยู่แล้ว (dependency ที่ถูกแก้ ดู S1) หรือการแก้ reviewed source ซึ่งอยู่นอก threat model ข้อที่เหลือเป็น LOW ทั้งหมด

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab (เหมือน i2) |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a (เหมือน i2) |
| verify-initial-bundle-boundary.mjs | b04ba37e04740261dc0cc2994c17e36396a82708f5045f98faef6820e18b40a3 |
| verify-initial-bundle-boundary.test.mjs | 8a42da551d6a6c31ee004d3f10c3550218e01c879b9dbb7948e5c41dcc5a0a98 |
| build.mjs | 9a5e57c989ba1d2eaabc6609d50335e174bfdcc367616c543073809e48140533 |

ผม diff i2→i3 ของ `verify-initial-bundle-boundary.mjs` และ `build.mjs` เอง ผลตรงกับภาคผนวกของผู้เขียน i2 ยังไม่เปลี่ยน (`bf01b55e…`) ไม่ได้แก้ candidate root หรือ repo จริง และ `node_modules` จริงไม่ถูกแก้ (probe S1 ใช้ `node_modules` สำเนาของตัวเอง ผลของ `cmp` ยืนยัน) งานทั้งหมดอยู่ใน `review-stageb-b3-sec/`

## 2. Commands ที่รันจริง (Node v24.14.1, TMPDIR=`review-stageb-b3-sec/tmp`)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `node --test` 4 suite บนสำเนา `project/` | 278/278 pass |
| 1 | `probes/p-setup3.mjs` สร้าง artifact inert 7 แบบ + record (schema i3 รวม `startupChunks`, `collectedAt` รูป toISOString) แล้ว admit 10 digest ในสำเนา `admit/` | adapter: clean/flightPdf/escapedMarker/deferredPdf/markerEntry/noRobots เป็น SUPPORTED, unknownFlightPdf เป็น UNKNOWN |
| 2 | CLI จริง `build.mjs --verify-existing` บน `admit/` | §4 |
| 3 | CLI จริงบนสำเนา pristine ด้วย `NODE_OPTIONS` และ `execArgv` หลายแบบ | §3 N3 |
| 4 | `probes/p-grammar.cjs` + `p-grammar-rev.mjs` + CLI: ทดลองแก้ admission 8 แบบ | §3 N1 |
| 5 | สำเนา `dep/` ที่มี `node_modules` เป็น symlink ทุก package ยกเว้น `jsdom` ซึ่งเป็นสำเนาที่แก้แล้ว + CLI | S1 |

หมายเหตุ: รอบแรกของ probe 2 ได้ `INVALID_TIMING_EVIDENCE` เพราะ fixture ผมใช้เวลาแบบไม่มี `.000Z` แปลว่า rule ใหม่ของ `isoInstant` ทำงานจริง ผมแก้ fixture แล้วรันใหม่

## 3. การ re-test N1–N5

### N1 (MEDIUM เดิม) — **Fixed**

ผลของการแก้ declaration ในสำเนา (record ที่เขียนเองผูกกับ revision ของ pristine):

| Variant | `readGateRevision()` | CLI |
| --- | --- | --- |
| env list `process.env.NQR_ADMIT_SHA256` (ตั้ง env แล้ว) | throw `UNREADABLE_GATE_REVISION` | exit1 |
| IIFE ที่ patch `Set.prototype.has` | throw | exit1 |
| decoy อยู่ใน template literal แล้ว declaration จริง (มี hash) ไม่อยู่ต้นบรรทัด | throw (runtime list ≠ source list) | exit1 |
| decoy ว่างอยู่ใน `/* */` แล้ว declaration จริง (มี hash) ตามหลัง `*/` บรรทัดเดียวกัน | throw | exit1 |
| declaration จริงว่างแต่ไม่อยู่ต้นบรรทัด + decoy ใน comment + patch `Set.prototype.has` นอก list | **revision DIFFERS** | exit1 `GATE_REVISION_MISMATCH,REVIEW_NOT_ACCEPTED` |
| CRLF ใน list | throw | exit1 |
| U+2028 เป็นตัวแบ่งบรรทัดใน list | throw | exit1 |
| control: admit ถูกรูปแบบ (`\n  "<hex>",\n`) | revision EQUALS pristine | **exit 0** |

เหตุผลว่าทำไม grammar ใหม่ปลอดภัย: `verifierLogicSha256` คือ hash ของทั้งไฟล์ โดยแทนเฉพาะส่วนที่ match `ADMISSION_DECLARATION` ส่วนที่แก้ได้โดยไม่ทำให้ revision เปลี่ยนจึงมีแค่ส่วนที่ match และ regex ใหม่ (`:509`) ยอมให้ส่วนนั้นเป็นได้เพียง `"<hex 64>",` บรรทัดละหนึ่ง entry คั่นด้วย `\n` ซึ่งไม่ใช่โค้ด การเช็ค statement หนึ่งจุดและการเทียบรายการ runtime กับ source (`:870-876`) ช่วยปิด decoy ใน comment หรือ template อีกชั้น

แถว "DIFFERS" แสดงว่าโค้ดนอก list ถูกจับได้ด้วย revision binding เท่านั้น ถ้าคนที่แก้ source เขียน record ใหม่ที่ผูกกับ revision ที่แก้แล้ว (reviews เป็น hash ที่ไม่ได้ authenticate) ก็จะผ่านได้ กรณีนี้คือการแก้ reviewed source ซึ่งอยู่นอก threat model และตรงกับ NQR129 §4 ที่ไม่ให้สร้างระบบ signing

`\b` ใน `ADMISSION_STATEMENT` ไม่นับชื่อที่ยาวกว่า (เช่น `…SHA256_X`) และ `m` flag มอง `\r`/U+2028 เป็นจุดขึ้นบรรทัด ซึ่งมีผลเพียงทำให้นับ decoy ได้มากขึ้น จึง fail-closed

### N2 (MEDIUM เดิม) — **Fixed ตาม disposition ที่เอกสารไว้; ยอมรับได้ ไม่ block**

- `escapedMarker` (Flight preload `pdf.js` ที่มี `"jsPDF"`):
  - record attest เฉพาะ `entry.js` → exit1 `STARTUP_CHUNKS_NOT_ATTESTED`
  - record attest `[entry.js, pdf.js]` พอดี → exit 0 (ตั้งใจ)
- `clean` ที่มี `startupChunks: []` → `STARTUP_CHUNKS_NOT_ATTESTED` และถ้าลำดับ key เป็น `{sha256,path}` ก็ได้ผลเดียวกัน (fail-closed)
- สรุป: chunk startup ที่ encode หรือเปลี่ยนชื่อจะเข้า PASS ไม่ได้เลยถ้าไม่มี attestation ของ bytes นั้นใน record ที่ admit
- เรื่อง reachability ที่ต้อง attest: `startupReachableChunks` ครอบ HTML script (รวม `nomodule`), preload/`modulepreload`, Flight ทั้งใน HTML และใน chunk และ static import (ยืนยันแล้วใน i2) ส่วน deferred loader ไม่นับโดยตั้งใจ (deferredPdf → exit 0)
- เหตุผลที่ยอมรับ: การตัดสินว่า chunk ไหนเป็น PDF ย้ายไปอยู่กับ QA/TL/SEC ที่ต้องตรวจ bytes ที่ระบุไว้อย่างชัดเจน ซึ่งเข้ากับ §1/§4 (static อย่างเดียวไม่พอ และ PM admit หลักฐาน) แต่ต้องมีเงื่อนไข C1 ใน §6

### N3 (LOW เดิม) — **Fixed**

บนสำเนา pristine ด้วย record ที่เขียนเอง ทุกแบบได้ exit1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME`:

- `NODE_OPTIONS="\"--import=patch.mjs\""`
- `NODE_OPTIONS="\"--require=patch.cjs\""`
- `NODE_OPTIONS=--experimental_loader=…`
- `NODE_OPTIONS=" "`
- `node --import=patch.mjs build.mjs …`

Control: `NODE_OPTIONS` ที่ตั้งเป็นค่าว่างบนสำเนาที่ admit แล้ว → ผ่านการเช็คนี้ได้ตามปกติ

### N4 (LOW เดิม) — **ยอมรับเป็นข้อจำกัด ไม่ block**

- record ไม่ admit + marker ใน chunk ที่ Flight preload → ยังได้ NEEDS_REVIEW แบบเดิม
- ถ้ามี record ที่ admit แล้ว ผลดีขึ้น: `unknownFlightPdf` (adapter UNKNOWN) → exit1 `STATIC_CHECK_FAILED` (`ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER`) และ marker ที่ legacy เห็นเป็น FAIL เสมอ (markerEntry)
- ทุกกรณียังเป็น exit 1 และถ้าไม่มี manifest ที่ admit ก็สร้าง graph ไม่ได้ disposition นี้จึงสมเหตุผล

### N5 (LOW เดิม) — **ยอมรับเป็นข้อจำกัด ไม่ block**

โค้ดไม่เปลี่ยนจาก i2 (re-verify หลัง origin check) ช่องเปลี่ยนแล้วเปลี่ยนกลับยังอยู่ precondition คือมีสิทธิ์เขียน artifact พร้อม timing ที่แม่น ซึ่งคนที่มีสิทธิ์นี้แก้ artifact หลัง exit 0 ได้อยู่แล้ว

## 4. Matrix ของ CLI บนสำเนาที่ admit แล้ว

| Artifact / record | ผล |
| --- | --- |
| clean / attest ถูกต้อง | **exit 0** |
| clean / `startupChunks: []` | exit1 `STARTUP_CHUNKS_NOT_ATTESTED` |
| clean / attest ด้วยลำดับ key สลับ | exit1 `STARTUP_CHUNKS_NOT_ATTESTED` |
| flightPdf / attest ถูกต้อง | exit1 `STATIC_CHECK_FAILED` (`FORBIDDEN_STARTUP_MARKER`) |
| escapedMarker / attest ครบ | exit 0 (ตั้งใจ ตาม N2) |
| escapedMarker / attest ไม่ครบ | exit1 `STARTUP_CHUNKS_NOT_ATTESTED` |
| unknownFlightPdf / attest ถูกต้อง | exit1 `STATIC_CHECK_FAILED` |
| deferredPdf | exit 0 (ตั้งใจ ตาม policy) |
| markerEntry | exit1 `STATIC_CHECK_FAILED` |
| noRobots | exit1 `NQR_ORIGIN_ARTIFACT_CHECK_FAILED` (ไม่มี path) |
| pristine (admission ว่าง) / clean ที่เขียนเอง | exit1 `ACCEPTANCE_NOT_ADMITTED` |

## 5. Findings ใน iteration 3

### S1 — LOW (carried, theoretical ระดับ supply-chain): dependency ที่ไม่ได้ pin และรันก่อนเช็ค ข้าม admission ได้

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:7` import `jsdom` ซึ่งถูก evaluate ก่อน `:512-515` จะ capture `Set.prototype.has` และ `readGateRevision` ไม่ hash `node_modules`
- `verifyLocalToolchain` ของ adapter hash next/acorn/parse5/entities ก็จริง แต่ hash หลังจากที่โค้ดของ package เหล่านั้นถูกรันไปแล้ว
- หลักฐาน (probe 5): สำเนาที่แก้ `node_modules/jsdom/lib/api.js` ให้ patch `Set.prototype.has` + record ที่เขียนเองและไม่ admit + verifier ที่ไม่ได้แก้ → `build.mjs --verify-existing` ได้ **exit 0**
- Preconditions: ต้องมีสิทธิ์เขียน `node_modules` ของ checkout ที่ใช้รัน gate ซึ่งเทียบเท่ากับรันโค้ดได้ ผู้เขียนระบุไว้แล้วว่า full dependency digest เป็น carried provenance
- ข้อเสนอแก้ (ไม่ block): ใน runbook ของ admission ให้ตรวจ dependency digest ทั้งหมด (`82b9649f…06db`) ด้วย process แยกที่ไม่ import package ใด ๆ ก่อนรัน verify-existing และระบุว่าการเช็ค hash ใน process เป็น drift detection ไม่ใช่ security boundary

### S2 — LOW (informational): runtime check ยังไม่ครอบ vector ระดับ native หรือ cache

`DYLD_INSERT_LIBRARIES` (ใช้ได้เมื่อ node binary ไม่อยู่ใต้ SIP), `PATH` ที่ชี้ไป `node` ปลอม และ `NODE_COMPILE_CACHE` ที่ถูกแก้ ยังไม่ถูกตรวจ ทุกทางต้องควบคุม environment ได้ ซึ่งเทียบเท่ากับรันโค้ดได้ ไม่ได้สาธิต ให้ระบุใน runbook ว่า environment ของ operator อยู่ใน trusted boundary

## 6. เงื่อนไขของ ACCEPT

- **C1 (N2):** checklist ของ PM สำหรับการ admit ต้องบังคับให้ QA/TL/SEC ตรวจแต่ละ entry ใน `startupChunks` (path + SHA) ว่าไม่มีโค้ดเฉพาะ PDF หรือโค้ดที่ไม่ได้ review และบันทึกผลใน report ที่ `reportSha256` อ้างถึง ถ้าไม่มี checklist นี้ attestation ก็เป็นแค่การคัดลอก scan ลง record
- **C2 (S1/S2):** ก่อนรัน verify-existing ต้องยืนยัน dependency digest ด้วย process แยก และรันด้วย `node` ที่เชื่อถือได้ โดยไม่ตั้ง `NODE_OPTIONS` และไม่ใส่ flag
- **C3:** ACCEPT นี้ครอบคลุม bytes canonical5 `3f168b9c…0bfd` เท่านั้น ไม่ใช่ release readiness และ gate ยังไม่มีทางผ่านบน artifact Turbopack จริง (runtime `turbopack-*` เป็น UNKNOWN เสมอ) ถ้ามีการเพิ่ม runtime model ต้อง review ใหม่

## 7. สิ่งที่ตรวจแล้วว่ายังใช้ได้

- Lookup ใช้ `Set` และ `Set.prototype.has` ที่ capture ตอน load ผ่าน `Reflect.apply` การ patch prototype หลัง load จึงไม่มีผล (โค้ดที่รันก่อน load ดู S1)
- ถ้ามีการแก้ใดทำให้ revision อ่านไม่ได้ → `legacyOnly` → BLOCKED หรือ FAIL (ถ้ามี legacy marker) ไม่มีเส้นทางใดให้ PASS
- `collectedAt` ต้อง round-trip ผ่าน `toISOString` พอดี และ `localOrigin` port ≤ 65535
- Canonical JSON, fixed-code errors, การ re-verify หลัง origin check และค่า default ไม่มี options ที่ throw เสมอ ยังทำงานเหมือน i2
- CLI ที่ PASS ไม่พิมพ์ path หรือ exception text

## 8. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่มี emission จริงของ Next หรือ browser และไม่รัน JS ของ fixture
- ไม่ได้รัน mutation suite 50 แบบของผู้เขียนซ้ำ และไม่ได้รีวิว grammar ของ adapter (ไม่เปลี่ยนจาก i2) เชิงลึก
- ไม่ได้สาธิต S2 และ N5 การยืนยันว่าไม่มี network ใช้ code review (ไม่มี import ใหม่)
- Probe และสำเนาอยู่ใน `review-stageb-b3-sec/{probes,tmp,project,admit,g-*,dep}` โดย `dep/project/node_modules` เป็น symlink ไปยัง package จริงแบบอ่านอย่างเดียว ยกเว้น `jsdom` ที่เป็นสำเนา
