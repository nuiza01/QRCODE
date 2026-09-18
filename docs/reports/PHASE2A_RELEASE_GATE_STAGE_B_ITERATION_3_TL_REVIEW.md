# NQR-129 Stage B iteration 3 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-b2-tl/TL_REVIEW_ITERATION_2.md` SHA `dbcbaf628b2ded69b9b188d11861e28c1d94b53a6f391bfa79bb4b0b94a0996e`

## Verdict: **ACCEPT** (จาก TL สำหรับขอบเขตของ candidate Stage B เท่านั้น)

N1–N4 แก้ครบตามที่ตรวจบน bytes ใหม่ ส่วน N1 ผมลองโจมตีผ่าน CLI จริงด้วย 10 รูปแบบ รวมถึง decoy ใน comment, U+2028, CRLF และ IIFE ทุกกรณีได้ exit 1 โดย control ยังได้ exit 0 ผมไม่พบ bypass ใหม่ใน strict grammar, ในการนับ statement, ในการเทียบรายการ runtime กับ source, ใน `startupChunks` attestation หรือใน scan ที่ตอนนี้รันกับ inspection ที่เป็น UNKNOWN ด้วย ยังไม่มี finding ระดับ P1 หรือ P2 ค้างอยู่ ที่เหลือเป็น P3 สามข้อซึ่งไม่ block (R1–R3)

การ ACCEPT นี้ไม่ใช่ release, integration หรือ deploy approval ข้อจำกัดของ Stage A ยังอยู่: gate ยังผ่านบน Turbopack artifact จริงไม่ได้ เพราะ runtime chunk ถูกจัดเป็น UNKNOWN

## 1. Identity check

| ไฟล์ (`nqr-stageb-b3/project/scripts/`) | ค่าที่คาด | ก่อน | หลัง |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | b04ba37e04740261dc0cc2994c17e36396a82708f5045f98faef6820e18b40a3 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | 8a42da551d6a6c31ee004d3f10c3550218e01c879b9dbb7948e5c41dcc5a0a98 | ตรง | ตรง |
| build.mjs | 9a5e57c989ba1d2eaabc6609d50335e174bfdcc367616c543073809e48140533 | ตรง | ตรง |

- ทั้งห้าไฟล์เป็น mode 0444 และ adapter กับเทสต์ของ adapter เหมือน i2 ทุกไบต์
- `origin-gate.mjs` และ `verify-origin-artifacts.mjs` byte-identical กับ SOURCE
- ผม diff i2→i3 เอง ผลคือเปลี่ยนเฉพาะ verifier, test และ build.mjs และส่วนที่เปลี่ยนตรงกับที่รายงานผู้เขียนระบุ
- หลังรีวิว SHA ของ toolchain ใน `node_modules` ยังตรง
- ไม่ได้แก้อะไรใน candidate root หรือ repo จริง

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b3-tl/tmp`)

| # | Command | ผล |
| --- | --- | --- |
| 1 | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test` สี่ suite | **278/278 pass**, fail/skip/todo 0 (`run-candidate-1.log` prefix `41ab83d7`) |
| 2 | eslint ห้าไฟล์ | exit 0 |
| 3 | `probes/p1-admission.mjs`: admission declaration 12 แบบ บน gate copy + CLI จริง | `p1-admission.log` (`ea483823`) |
| 4 | `probes/p2-semantics.mjs`: startup scan, attestation, regression ของ F2/F4/F6 | `p2-semantics.log` (`46a00580`) |
| 5 | `probes/mutants.mjs`: 19 mutant บนสำเนา | `mutants.log` (`a76190eb`): killed 15, survived 4 |

ไม่มี install, build, typegen, server, browser, network, DB หรือ git write

## 3. สถานะ N1–N4

### N1 (P1) admission declaration ซ่อนโค้ดได้ — **แก้แล้ว**

**Code** (`verify-initial-bundle-boundary.mjs`)
- `:509`: regex อนุญาตเฉพาะ `Object.freeze([])` หรือบรรทัด `\n  "<64 lowercase hex>",` ซ้ำกันเท่านั้น
- `:510`: statement count
- `:513-515`: `Set` และ `Set.prototype.has` ที่ capture ไว้ตอน load
- `:868-876`: ต้องมี declaration 1 และ statement 1, array frozen, และรายการ runtime ต้องเท่ากับรายการที่ parse จาก source

**เหตุผลว่าปิดได้จริง**: ส่วนที่ถูก normalize ออกจาก hash ตอนนี้เป็น data ล้วน ข้อความอื่นทั้งหมดของไฟล์ยังถูก hash ถ้าจะได้ `verifierLogicSha256` เท่ากับ revision ที่ reviewer รับรอง ข้อความที่ normalize แล้วต้องตรงกับต้นฉบับทุกไบต์ ดังนั้นตำแหน่งเดียวที่เปลี่ยนได้คือรายการ hex การนับ statement และการเทียบรายการ runtime จึงเป็นชั้นป้องกันเพิ่ม และจับ decoy ได้ก่อนถึงการเทียบ revision

**Probe ผ่าน CLI จริง** (`p1-admission.log`) ใช้ record ที่เขียนเอง และตั้ง env `NQR_ADMIT=<digest>`:

| Declaration | revision | CLI |
| --- | --- | --- |
| control: strict list มี digest | EQUAL | exit 0 PASS |
| control: strict list สอง entry | EQUAL | exit 0 PASS |
| env spread (probe ของ i2) | THROWS `UNREADABLE_GATE_REVISION` | exit 1 |
| IIFE patch `Array.prototype.includes` (probe ของ i2) | THROWS | exit 1 (`ACCEPTANCE_NOT_ADMITTED`) |
| IIFE patch `Set.prototype.has` | THROWS | exit 1 |
| strict entry + `process.env` entry | THROWS | exit 1 |
| declaration จริงกลางบรรทัด + strict decoy ใน block comment | THROWS | exit 1 |
| decoy ใน comment ที่รายการตรงกัน + declaration จริงกลางบรรทัด | DIFFERENT | exit 1 `GATE_REVISION_MISMATCH` |
| `// comment ` + strict list | DIFFERENT | exit 1 `GATE_REVISION_MISMATCH` |
| CRLF / tab indent / hex ตัวใหญ่ | THROWS | exit 1 |

**เทสต์**: `test.mjs` ("the admission list is data only…") รันผ่าน CLI จริงบนไฟล์ที่เขียนลง disk ครอบ 8 กรณี mutant ที่ถูก kill ด้วยเทสต์นี้: M30 (คืน regex แบบหลวมของ i2), M26 (ลบการนับ statement) และ M31 (ลบการเทียบรายการ runtime)

### N2 (P3) startup scan ทำเฉพาะเมื่อ SUPPORTED — **แก้แล้ว** (มี test gap ดู R1)

`:830-833` scan ทำงานกับทุก inspection ที่ well-formed probe:
```
E_eager_runtimeUnknown         STATIC_UNKNOWN [entry.js, pdf.js] => NQR_BUNDLE_STATIC_CHECK_FAILED [ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER]
E_eager_runtimeUnknown.cli     exit=1 stderr="NQR_BUNDLE_STATIC_CHECK_FAILED\nreasons: ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER"
E_eager_otherUnknownStatement  STATIC_UNKNOWN => NQR_BUNDLE_STATIC_CHECK_FAILED [...FORBIDDEN_STARTUP_MARKER...]
```

### N3 (P3) mutation survivors — **แก้แล้วเกือบทั้งหมด**

M17 และ M18 ถูก kill ด้วยเทสต์ `startupReachableChunks` ใหม่ ส่วน M26, M19 (ISO round-trip), M03b (browser version) และ M22 (NODE_OPTIONS ไม่ว่าง) ถูก kill ครบ ที่ยังรอดคือ M09 (read race ของ `readBoundFile`) ซึ่งน้ำหนักต่ำเพราะ admission ผูกด้วย hash อยู่แล้ว (ดู R3)

### N4 (P3) nit — **แก้แล้ว**

- `isoInstant` (`:574-581`) ต้อง round-trip กับ `toISOString` และปฏิเสธ `2026-02-30`
- `localOrigin` (`:583-587`) รับ port ไม่เกิน 65535
- การห้าม Node flag มีคำอธิบายใน comment ของ `build.mjs:11-13` แล้ว ส่วนข้อความ USAGE ยังไม่ได้บอก ซึ่งยอมรับได้

## 4. การตรวจส่วนที่เพิ่มใหม่

**`startupChunks` attestation** (`:691-694`)
- record ต้องระบุ `{path, sha256}` ตรงกับ scan ทุกตัวตามลำดับ ถ้าไม่ตรงได้ BLOCKED แต่ถ้าพบ marker ยังได้ FAIL (`E_eager_supported_unattested` → FAIL `[FORBIDDEN_STARTUP_MARKER, STARTUP_CHUNKS_NOT_ATTESTED]`)
- ข้อนี้ไม่เปิดทาง PASS ใหม่ เพราะเป็นเงื่อนไขเพิ่ม และค่าที่ต้องตรงคำนวณจาก artifact ที่ adapter ผูกไว้แล้ว
- ข้อสังเกต: `artifactFull` ผูกทุกไบต์อยู่แล้ว attestation จึงเพิ่มความชัดเจนเชิงกระบวนการ (ระบุ bytes ที่ reviewer ต้องดู) มากกว่าหลักฐานอิสระ ข้อนี้ไม่ใช่ defect

**Scan ที่รันกับ UNKNOWN**
- ไม่พบทางที่ UNKNOWN จะกลายเป็น PASS เพราะ PASS ยังต้องได้ `STATIC_SUPPORTED`
- graph ที่ใช้ derive startup set มาจาก adapter หลังผ่าน identity check แล้วเท่านั้น (adapter `:968`) path จึงอยู่ใน `static/chunks/` ที่ normalize แล้ว และอ่านแบบ bound
- ผลข้างเคียงที่พบบันทึกไว้ใน R2

**Regression ที่ตรวจซ้ำ**

| Case | ผล | หมายเหตุ |
| --- | --- | --- |
| `A.markerUnadmitted.cli` | FAIL | F2 ยังแก้อยู่ |
| `C_pdfOnlyLanding` | BLOCKED | F4 |
| `D_symlinkAdded` | BLOCKED | F6 |
| `C_cleanControl` | PASS | |
| M11 canonical JSON, M14 re-verify, M16 Flight roots, M23 scan identity | killed | |
| M34 ลบ attestation, M35 scan เฉพาะ SUPPORTED ใน evaluator, M36 port max | killed | |

## 5. Findings (P3 ทั้งหมด ไม่ block)

### R1 — P3: เทสต์ไม่ป้องกันการที่ wrapper scan ทำงานเมื่อ inspection เป็น UNKNOWN (fix ของ N2 ถอยกลับได้โดยไม่มีเทสต์ fail)

**Mutant M37**: แก้ `verify:932` เป็น `const startupScan = inspection.staticStatus === "STATIC_SUPPORTED" ? await scanStartupChunks(...) : null;` แล้ว **SURVIVED** (138/138)

เทสต์ `unknownWithStartupMarker` ทดสอบเฉพาะ evaluator ที่รับ `startupScan` ที่เตรียมไว้แล้ว ไม่ได้ผ่าน `decideExistingArtifact` ถ้าเกิด regression นี้ artifact จริง (ซึ่งเป็น UNKNOWN เสมอ) จะได้ `STARTUP_SCAN_INCOMPLETE` (BLOCKED) แทน FAIL และเท่ากับย้อนกลับไปเป็น N2

**ข้อเสนอ**: เพิ่มเทสต์บนไฟล์จริงผ่าน `withAdmittedGate` โดยใช้ Flight preload ไปยัง `pdf.js` ที่มี marker และเพิ่ม `static/chunks/turbopack-runtime.js` แล้วคาดว่าได้ `NQR_BUNDLE_STATIC_CHECK_FAILED` พร้อม reasons `ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER` (ตรงกับ probe `E_eager_runtimeUnknown`)

### R2 — P3: ขอบเขตของ startup scan ที่ควรบันทึกไว้ (fail closed ทั้งสองทาง)

- **Under-report**: ถ้าช่วง identity walk ของ adapter มี diagnostic ใดก็ตาม เช่นมีไฟล์ executable ใหญ่เกิน 8 MiB adapter จะ return ก่อนสร้าง graph (adapter `:968`) startup set จึงว่าง และ marker ใน chunk ที่ถูก Flight preload จะไม่ถูกรายงาน probe `F_oversizedStartupChunkPlusMarker` → BLOCKED `[ADAPTER_STATIC_UNKNOWN, STARTUP_CHUNKS_NOT_ATTESTED]` ไม่ใช่ FAIL
- **Over-approximate**: Flight data ที่อยู่ใน chunk ที่โหลดแบบ deferred ถูกนับเป็น startup ด้วย (`verify:596-605` นับ `flight-resolve-preload` ทุก edge) probe `G_flightDataInsideDeferredChunk` → FAIL ทั้งที่ chunk นั้นโหลดหลัง thunk กรณีนี้ไม่น่าเกิดใน Next emission จริง
- **ข้อเสนอ**: ระบุทั้งสองข้อในรายงานข้อจำกัด หรือจำกัด root ของ `flight-resolve-preload` ให้เหลือ edge ที่มาจาก `inline:` (HTML)

### R3 — P3: mutant ที่ยังรอดซึ่งน้ำหนักต่ำ

- M09 `readBoundFile` read race: bytes ถูกผูกด้วย hash อยู่แล้ว
- M32 ใช้ `Array.prototype.includes` แทน `Set` ที่ capture ไว้: เทสต์ `prototypePatch` ถูกปฏิเสธโดย grammar ก่อนถึง lookup จึงไม่ได้ทดสอบ capture จริง
- M33 ลบ `Object.isFrozen`: ส่วนใหญ่เป็น equivalent เพราะข้อความถูก hash

ทั้งสามเป็น defense in depth จะเพิ่มเทสต์หรือบันทึกว่ายอมรับก็ได้

## 6. สิ่งที่ยืนยันว่าถูกต้อง (สรุป)

- ไม่มีทางทำให้ record ที่เขียนเองหรือรายการ admission จาก environment ผ่านได้ ทั้งผ่าน CLI จริงและ in-process และ admission ที่ถูกต้องยัง PASS โดย revision ไม่เปลี่ยน
- FAIL ชนะ BLOCKED ทุกกรณีที่ตรวจ: legacy marker ไม่ว่า record จะอยู่ในสถานะใด, startup marker ทั้งเมื่อ SUPPORTED และ UNKNOWN, และเมื่อไม่มี attestation
- verify-existing: ปฏิเสธ execArgv และ `NODE_OPTIONS` ที่ไม่ว่าง (M22 killed), ไม่ spawn, รันซ้ำหลัง origin check และพิมพ์เฉพาะ fixed code
- Default path แบบไม่มี options และ build path ปกติยังเหมือน i2
- เทสต์ของ guard ใหม่ใช้ไฟล์จริงบน disk และ CLI จริง ยกเว้น R1

## 7. ข้อจำกัดของรีวิวนี้

- ใช้ fixture สังเคราะห์เท่านั้น ไม่มี Turbopack emission จริง, browser หรือ build ข้อจำกัดของ Stage A (runtime chunk เป็น UNKNOWN), policy ของ `COLD_VALID_INITIAL_PREVIEW` และการเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่านยังอยู่ตามที่ผู้เขียนรับไว้
- ไม่ได้รัน mutant ชุด 50 ตัวของผู้เขียน (`mutants.cjs` ไม่อยู่ใน frozen root) ผลนี้มาจาก mutant 19 ตัวของผม
- ประเด็นของ SECURITY (SEC N2 marker ที่ถูกเข้ารหัส, SEC N3/N4) ประเมินเฉพาะในแง่ความถูกต้องของตรรกะ ไม่ได้ประเมิน threat model
- `jsdom` ที่ legacy inspector ใช้ และ dependency tree ทั้งหมด ยังไม่อยู่ใน gate revision (เป็น carried provenance ตั้งแต่ Stage A)
