# NQR-129 Stage B iteration 9 — Independent SECURITY review

วันที่ 2026-09-18 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ดนี้ ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b9/project` (frozen 0444)
Baseline ที่ ACCEPT แล้ว: iteration 8 canonical5 `1c4bdab3…edb7`

## Verdict: **REQUEST_CHANGES**

บน canonical5 ที่ผมคำนวณเอง: **`f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb`** (ตรงกับที่ coordinator แจ้ง)

เหตุผลหลักข้อเดียว: ผมสร้าง **PASS ได้จริง** โดยที่ scenario `COLD_VALID_INITIAL_PREVIEW`
เป็น `NOT_APPLICABLE` ในขณะที่แอปที่ gate อ่านซอร์ส **มี prefill path จริง** (ดู F1 / SEC-A)
กลไกทำงานถูกต้องตามที่โค้ดตรวจ แต่ comment ในไฟล์ที่ review อ้างเกินจริงว่า
"adding any prefill path changes the digest and blocks" ซึ่งเป็นข้อความที่ผู้ทำ C1 จะใช้ตัดสินใจ admit
สิ่งที่ขอแก้เป็นงานเล็กและเป็นเชิงข้อความ/ขอบเขต ไม่ใช่ redesign (ดู §6)

ส่วนที่เหลือของ delta แข็งแรง: การผูก gate revision ถูกต้อง, record-only attacker ทำอะไรไม่ได้,
reason-code discipline ไม่เสีย, การอ่านไฟล์ fail closed ทุกทาง

## 1. Identity ที่ยืนยันเอง (ก่อนและหลังงาน)

| File (`project/scripts/`) | SHA-256 | เทียบ i8 |
| --- | --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` | เหมือน |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` | เหมือน |
| verify-initial-bundle-boundary.mjs | `629eb10bf84792c81447d97a63c0b54344483353ede6934be75e7f8998870959` | **เปลี่ยน** |
| verify-initial-bundle-boundary.test.mjs | `81612f4142597b7058c2c5be2aced34e30314fb3ebad1de74cc74dbb8dd249fb` | **เปลี่ยน** |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` | เหมือน |

- canonical5 i9 = `f551d9ca…e7fc` (คำนวณด้วย `rebuild/canon.cjs` ทั้งก่อนและหลังการทดลอง ค่าไม่เปลี่ยน)
- canonical5 i8 = `1c4bdab3…edb7` (คำนวณซ้ำเอง ตรงกับ baseline)
- `diff -rq` ระหว่างสองต้นไม้: เปลี่ยนเฉพาะสองไฟล์ข้างบน + candidate i9 มี `src/app`, `src/components` เพิ่มมา
  (สำเนาซอร์สที่ใช้เป็นหลักฐาน; **ไม่อยู่ใน canonical5**)
- สี่ไฟล์ซอร์สที่ pin ใน candidate **hash ตรงกับ SOURCE ทุกไฟล์** และให้ digest ตรงกับ pin:
  `readColdPreviewAbsence()` = `4ad557f2…6453` ทั้งจาก SOURCE repo, จาก candidate และจากสำเนาของผม
- Gate revision: `verifierLogicSha256` i8 `97827d18…2957` → i9 `629eb10b…0959`
  (`sha256(JSON.stringify(gateRevision))`: i8 `8f41b099…de21` → i9 `c1273221…b21f`) คีย์อื่นทั้งสี่ไม่เปลี่ยน
- `ADMITTED_ACCEPTANCE_SHA256` ยังว่างทั้งสอง iteration → วันนี้ยังไม่มี record ใดผ่าน gate ได้

## 2. Tests ที่รันเอง

- สำเนาไบต์เท่ากันของ candidate (`review-stageb-b9-sec/project`, canonical5 ตรงกัน), Node v24.x, `TMPDIR` อยู่ในพื้นที่ review
- `node --test scripts/*.test.mjs` → **287/287 pass** (ตรงกับที่รายงานอ้าง)
- `scripts/verify-initial-bundle-boundary.test.mjs` เดี่ยว ๆ → 147/147 pass
- Probe ของผมเอง 6 ตัว (`SEC-A`…`SEC-F`) อยู่ที่ `review-stageb-b9-sec/project/scripts/sec-probe.test.mjs`
  (สำเนาของไฟล์เทสต์เดิม + probe ต่อท้าย เพื่อใช้ helper `withStageBArtifact` / `withAdmittedGate`)
  รันด้วย `node --test --test-name-pattern "^SEC-" scripts/sec-probe.test.mjs` → 6/6 pass

## 3. Findings

### F1 — P2 (blocking) หลักฐานครอบแค่สี่ไฟล์ ไม่ใช่ module graph ของ Generator และ comment อ้างเกินจริง

`COLD_PREVIEW_ABSENCE_SOURCES` มีสี่ไฟล์ แต่เพจทั้งสองที่ pin ไว้ **ไม่ได้ import `Generator.tsx` โดยตรง**
ทั้งคู่เขียนว่า `import { Generator } from "@/components/generator"` ซึ่งคือ `src/components/generator/index.ts`
— ไฟล์ที่ **ไม่ได้อยู่ในรายการ** การแก้ barrel บรรทัดเดียวจึงแทรก prefill wrapper ให้ทั้งสอง route ได้
โดยไฟล์ที่ pin ทั้งสี่ยัง byte-identical (ทางอื่นที่เทียบเท่า: `PayloadForm.tsx`, `fields.tsx`,
`src/app/[locale]/layout.tsx`, `src/qr/render/*` — ล้วนอยู่นอกรายการ)

comment ในไฟล์ที่ review เขียนว่า *"adding any prefill path changes the digest and blocks until this policy is
reviewed again"* ข้อความนี้ไม่จริงตามที่พิสูจน์ได้ และเป็นข้อความที่คนทำ C1 จะใช้เชื่อว่าไม่ต้องตรวจซ้ำเอง
(รายงาน §5 ของผู้เขียนพูดถึงข้อจำกัดนี้ไว้แล้ว แต่ในเวอร์ชันที่แคบกว่า — พูดถึงเฉพาะ "เพิ่มหน้าใหม่"
ไม่ได้บอกว่าการแก้ไฟล์เดิมที่ไม่อยู่ในรายการก็พอ และ comment ในโค้ดขัดกับข้อจำกัดนั้นตรง ๆ)

**Reproduction (SEC-A, ผ่านจริง):** ใน gate copy ที่ admit record ที่มี
`COLD_VALID_INITIAL_PREVIEW.status = "NOT_APPLICABLE"` และมีสี่ไฟล์ที่ pin ครบ เพิ่มสองไฟล์:

```
src/components/generator/index.ts        -> export { Generator } from "./PrefilledGenerator";
src/components/generator/PrefilledGenerator.tsx -> useSearchParams() + seed draft, แล้ว render Generator เดิม
```

ผล: `readColdPreviewAbsence(base)` = `4ad557f2…6453` (ยังตรง pin),
`verifyInitialBundleBoundary()` = `PASS_BUNDLE_SCOPE`, และ CLI จริง
`build.mjs --verify-existing` **exit 0** ทั้งที่แอปมี prefill path

**Blast radius จริง:** ยังต้องมี record ที่ถูก admit (แก้ซอร์สที่ต้อง review) และ artifact identity ยังผูกกับ record
ดังนั้นวันนี้ยังไม่มีทาง PASS อัตโนมัติ ความเสี่ยงคือ **ผู้ทำ C1 เชื่อ comment แล้วไม่ตรวจ absence เอง**

### F2 — P2 หลักฐานผูกกับตำแหน่งของสำเนา gate ไม่ได้ผูกกับ artifact หรือกับ source inventory

`decideExistingArtifact` อ่านซอร์สจาก `new URL("../", VERIFIER_URL)` คือโฟลเดอร์ของ gate ที่กำลังรัน
ส่วน `buildDir` เป็น absolute path อะไรก็ได้ และ `expectedInputs.sourceInventorySha256` ถูกเทียบกับ
**ค่าคงที่ใน `SUPPORTED_PROFILE`** ไม่ได้คำนวณใหม่จากซอร์สจริง ดังนั้นไม่มีอะไรผูก artifact ที่ตรวจ
เข้ากับต้นไม้ซอร์สที่ถูกอ่าน:

- คัดลอกไฟล์ gate ทั้งห้าแบบ byte-identical ไปที่โฟลเดอร์ชั่วคราว (gate revision **เท่าเดิมทุกค่า** เพราะเป็น content hash)
- วางสำเนาซอร์สสี่ไฟล์ที่ "สะอาด" ข้าง ๆ
- ชี้ `--artifact` ไปที่ build ที่มาจากต้นไม้ที่มี prefill

เท่านี้ digest ก็ตรง pin ข้อดีคือเรื่องนี้ **fail closed เสมอ** (ไม่มีซอร์ส = BLOCKED) จึงไม่เพิ่มอำนาจให้ใครที่
ไม่มีสิทธิ์เขียนไฟล์ แต่มันทำให้ "หลักฐาน" เป็นการยืนยัน *สถานะของโฟลเดอร์ที่รัน gate* ไม่ใช่คุณสมบัติของ artifact
นี่คือรูปแบบเดียวกับเทสต์ที่ 3 ของผู้เขียนเอง (`withAdmittedGate(..., { sources: true })` วางซอร์สข้างสำเนา gate
ในขณะที่ artifact อยู่คนละ temp dir แล้วได้ exit 0) — เทสต์นั้นพิสูจน์กลไก แต่ก็สาธิตข้อจำกัดนี้ไปพร้อมกัน

**Reproduction:** SEC-A ข้างบนคือเคสนี้อยู่แล้ว (gate + ซอร์สอยู่ temp dir หนึ่ง, artifact อยู่อีกที่หนึ่ง)

### F3 — P3 `coldPreviewAbsence` ขยาย pure decision API สำหรับ caller ที่ประกอบ input เอง

`evaluateBundleBoundary` เป็น pure function ที่เชื่อ input ของ caller อยู่แล้ว แต่เดิม **ไม่มี input ใด**
ที่ยกเว้น scenario ที่บังคับ PASS ได้ ตอนนี้มีสตริงเดียวที่ทำได้ และค่าที่ต้องใส่ถูก `export` ออกมาตรง ๆ
(`COLD_PREVIEW_ABSENCE_SHA256`)

**Reproduction (SEC-D):** สำเนา gate ที่ **ไม่มีซอร์สเลย** (`readColdPreviewAbsence(base) === null`)
เรียก `gate.evaluateBundleBoundary({ ...inputs, coldPreviewAbsence: gate.COLD_PREVIEW_ABSENCE_SHA256 })`
ได้ `PASS_BUNDLE_SCOPE`

บรรเทา: `DECISION_INPUT_KEYS` บังคับให้ต้องส่ง key นี้เสมอ (caller เก่าที่ไม่รู้จักจะได้ `INVALID_DECISION_INPUT`
ไม่ใช่ default ที่เงียบ ๆ) และ trusted path ใน repo มีทางเดียวคือ `decideExistingArtifact`
ผมถือว่าเป็น P3 เพราะ caller ที่โกหกได้ ก็ปลอม `inspection`/`acceptanceBytes` ได้อยู่แล้ว
แต่ควรมี JSDoc บอกชัดว่า input ตัวนี้ **ต้อง** มาจาก `readColdPreviewAbsence()` ของ gate ที่กำลังรันเท่านั้น

### F4 — LOW `realpath` equality ทำให้ checkout ใต้ symlink หรือชื่อผิด case กลายเป็น BLOCKED ที่อธิบายไม่ได้

`readBoundFile` ใช้ `O_NOFOLLOW` + `await realpath(path) !== path` ซึ่งถูกต้องสำหรับกัน symlink
แต่ผลข้างเคียงคือ **parent directory ที่เป็น symlink ก็ตกด้วย** และบน macOS ที่ volume case-insensitive
การเปิดไฟล์ผ่านชื่อที่ case ไม่ตรงก็ตกเช่นกัน ทั้งสองกรณี fail closed แต่ให้ reason code เดียวกับ
"ซอร์สถูกแก้" คือ `SCENARIO_NOT_APPLICABLE_UNPROVEN` ผู้ใช้จะแยกไม่ออก

**Reproduction (SEC-B):**
- ต้นไม้ปกติ → `4ad557f2…6453`
- `mv src SRC` แล้วอ่านผ่าน path `src/...` (เปิดสำเร็จบน APFS case-insensitive) → `null`
- อ่านผ่าน `<base>/link/...` เมื่อ `link -> <base>` → `null`
- เส้นทางจริง `/tmp/claude-501/.../project` (โดยที่ `/tmp -> private/tmp`) → `null`

เข้าข่าย false-positive class ที่ §7 ของ runbook รวบรวมไว้ ควรเพิ่มบรรทัดเดียวที่นั่น

### F5 — LOW ไม่มี `within()` guard บน path ที่ join จากรายการที่ pin

ที่อื่นในไฟล์ (`artifactRoot`, chunk paths) มีการตรวจ containment ด้วย `within()`
`readColdPreviewAbsence` join ตรง ๆ วันนี้ปลอดภัยเพราะรายการเป็น frozen literal ที่ไม่มี `..` และผมตรวจแล้วว่า
ทั้งสี่ entry เป็น relative path ปกติ (`[locale]`, `[type]` เป็นตัวอักษรจริงในชื่อโฟลเดอร์ ไม่ใช่ glob)
เป็นข้อเสนอเชิง defence-in-depth สำหรับการแก้รายการในอนาคต ไม่ใช่ช่องโหว่วันนี้

### F6 — LOW เอกสาร SOURCE ยังไม่รองรับ waiver ใหม่ (ต้องทำตอน integrate)

- `docs/RELEASE_GATE_RUNBOOK.md:62` รายการ reason code ที่พบบ่อยยังไม่มี `SCENARIO_NOT_APPLICABLE_UNPROVEN`
- §5 (C1 checklist ข้อ 1–8) ยังไม่มีข้อที่บังคับให้ตรวจ absence เองเมื่อ record มี scenario เป็น `NOT_APPLICABLE`
- §7 ยังไม่มี false positive จาก F4

## 4. คำถามภัยคุกคามที่ได้รับมอบหมาย — คำตอบตรง ๆ

1. **เป็น bypass ใหม่ของข้อกำหนดเรื่องหลักฐานไหม / ผู้ที่เขียนได้แค่ acceptance record ทำได้ไหม / ผู้ที่เขียน
   working tree ได้ ทำให้อ่อนลงกว่าเดิมไหม**
   - ผู้ที่เขียนได้เฉพาะ record: **ไม่ได้** record ถูกผูกด้วย SHA-256 ของไบต์ใน `ADMITTED_ACCEPTANCE_SHA256`
     การแก้ status เป็น `NOT_APPLICABLE` หลัง admit ทำให้ digest เปลี่ยน → `ACCEPTANCE_NOT_ADMITTED`
     (SEC-C: ได้ `["ACCEPTANCE_NOT_ADMITTED"]` ตามคาด) อำนาจที่เพิ่มขึ้นจริงอยู่ที่ **ตอน admit** ไม่ใช่หลังจากนั้น:
     record ที่มี waiver ตอนนี้ "admit ได้" ทั้งที่เดิมจะ BLOCKED เสมอ
   - ผู้ที่เขียน working tree ได้: เดิมก็ควบคุมได้ทุกอย่างอยู่แล้ว (แก้ไฟล์ gate) แต่การแก้ไฟล์ gate จะเปลี่ยน
     gate revision จน record ใช้ไม่ได้ **สิ่งใหม่** คือ ตอนนี้มีไฟล์ที่ **ไม่อยู่ใน gate revision** (สี่ไฟล์ซอร์ส)
     มีผลต่อคำตัดสิน ทิศทางของผลเป็น fail-closed (แก้ = block) แต่ "ทำให้ผ่าน" ทำได้ด้วยการ *คืน* ไบต์ที่ pin
     ให้ตรงระหว่างรัน gate โดยไม่ต้องแตะไฟล์ที่ hash ไว้เลย → F1/F2
2. **symlink / hardlink / TOCTOU / path traversal / case-insensitive / สลับ src ระหว่างสองการอ่าน /
   รัน gate จากโฟลเดอร์ที่ parent มี src ปลอม**
   - symlink: ถูกปฏิเสธด้วย `O_NOFOLLOW` + `realpath` equality (รวม parent ที่เป็น symlink ด้วย) → null → block
   - hardlink: ผ่านได้ แต่ไม่มีผล เพราะสิ่งที่ hash คือเนื้อไฟล์
   - TOCTOU: `readBoundFile` เทียบ `fileIdentity` = `dev:ino:size:mtimeNs:ctimeNs` ก่อน/หลังอ่าน
     ปลอม `ctimeNs` ไม่ได้ถ้าไม่มี root การสลับไฟล์ระหว่างอ่านจึงได้ null หรือได้ digest ที่ไม่ตรง
     (SEC-F: สลับ `drafts.ts` ระหว่างคำนวณ → ได้ `391806e6…` ไม่ตรง pin) ค่า digest ถูกอ่าน **ครั้งเดียว**
     หลัง inspection แล้วไม่ตรวจซ้ำ — race ระหว่างอ่านกับตัดสินมีอยู่จริงในทางทฤษฎี แต่ไม่ให้สิ่งใดเพิ่ม
     เพราะผู้ที่แข่งได้ก็คือผู้ที่เขียน tree ได้ ซึ่งวางไบต์ที่ pin ทิ้งไว้ตลอดการรันได้ง่ายกว่ามาก (F2)
   - path traversal: รายการเป็น frozen literal ไม่มี `..` (ดู F5)
   - case-insensitive macOS: ตกเป็น null (F4) ไม่ใช่ทางผ่าน
   - src ปลอมใน parent ของ cwd: **ไม่มีผล** เพราะ root มาจาก `VERIFIER_URL` ไม่ใช่ `process.cwd()`
     (ยืนยันด้วย SEC-D: รัน gate copy ที่ไม่มีซอร์ส โดยมี cwd อยู่ที่ต้นไม้ที่มีซอร์สครบ ยังได้ null) แต่ src ที่วาง "ข้างสำเนา gate" มีผลเต็ม ๆ → F2
3. **`coldPreviewAbsence` ขยาย pure decision API ไหม** — ขยาย ดู F3 (P3) พร้อม reproduction
4. **gate revision เปลี่ยนถูกต้องจน record เดิมใช้ซ้ำไม่ได้ไหม** — **ถูกต้อง**
   `verifierLogicSha256` เปลี่ยน (การ normalize มีเฉพาะบล็อก `ADMITTED_ACCEPTANCE_SHA256` ซึ่งไม่ถูกแตะ)
   SEC-E: record ที่ผูกกับ revision ของ i8 แล้ว admit ใน gate i9 ได้
   `["GATE_REVISION_MISMATCH","REVIEW_NOT_ACCEPTED"]` — ทั้ง record และลายเซ็น review หลุดพร้อมกัน
   และวันนี้ `ADMITTED_ACCEPTANCE_SHA256` ยังว่าง จึงไม่มี record เก่าให้ reuse อยู่แล้ว
5. **มีการรั่วของ path หรือข้อมูลอื่นใน error output ไหม / reason-code discipline เสียไหม** — **ไม่เสีย**
   `readColdPreviewAbsence` คืน `null` แทนการ throw ไม่มี path หรือข้อความ exception ออกมา
   `SCENARIO_NOT_APPLICABLE_UNPROVEN` เป็นค่าคงที่ตัวใหม่ตัวเดียว เข้าทาง BLOCKED (ไม่ใช่ FAIL) ซึ่งถูกต้อง
   เพราะ "พิสูจน์ไม่ได้" คือหลักฐานขาด ไม่ใช่การละเมิดที่พิสูจน์แล้ว CLI พิมพ์แค่ `reasons: <codes>`
   (`build.mjs:187`) ผมไม่พบการรั่วของ path, digest ของไฟล์รายตัว หรือเนื้อซอร์สในทุกเส้นทาง
6. **สร้าง PASS ที่ `COLD_VALID_INITIAL_PREVIEW` เป็น NOT_APPLICABLE ทั้งที่แอปมี prefill path จริงได้ไหม**
   — **สำเร็จ** ดู F1 / SEC-A (`PASS_BUNDLE_SCOPE` + CLI exit 0)
   ข้อจำกัดของ bypass นี้คือยังต้องมี record ที่ถูก admit ผ่านการแก้ซอร์สที่ต้อง review
   มันจึงไม่ใช่ช่องที่ผู้โจมตีภายนอกใช้ได้ แต่เป็นช่องที่ทำให้ **การ review ตอน admit เชื่อคำรับรองที่ไม่จริง**

## 5. สิ่งที่ตรวจแล้วว่าทำงานถูกต้อง (ไม่มี finding)

- waiver จำกัดที่ scenario id เดียวและสถานะตรงตัวอักษร: `EMPTY_TO_VALID_PREVIEW` ยกเว้นไม่ได้แม้มี digest,
  `"NOT_APPLICABLE "` (มี space) ยังเป็น `TIMING_EVIDENCE_INCOMPLETE`, digest ที่เป็น
  `null`/`""`/ผิดหนึ่งตัว/ตัวพิมพ์ใหญ่ ล้วน BLOCKED — รันเองแล้วผ่านทั้งหมด
- scenario ที่ถูกยกเว้นยังต้องมี route ครบ, `state`, `observationsSha256` และ identity ตรงกับ artifact เหมือนเดิม
  การยกเว้นไม่ได้ลดข้อบังคับอื่นของฉากนั้น
- coverage ที่เสียไปจำกัด: `COLD_EMPTY_INVALID_STARTUP` (22 route) และ `EMPTY_TO_VALID_PREVIEW` (20 generator route)
  ยังต้อง PASS และยังครอบการโหลด vendor ตอน preview กลายเป็น valid
- `checkTimingEvidence` ไม่เคยตั้ง `failed = true` จากทาง NOT_APPLICABLE จึงไม่มีทางเปลี่ยน FAIL เป็น PASS
- ผมอ่านซอร์สของ SOURCE เองแล้วเห็นตรงกับคำอ้างใน §0 ของรายงาน: ทั้ง `src/` ไม่มี `searchParams`,
  `useSearchParams`, `localStorage`, `sessionStorage`, `document.cookie` หรือ `cookies()` ที่ใช้งานจริง
  (พบเฉพาะในคอมเมนต์ของ `src/components/layout/locale-switcher.tsx`) ข้อสรุป "วันนี้ยังไม่มี prefill path" **น่าเชื่อ**
  finding F1 พูดถึงความคงทนของหลักฐาน ไม่ได้แย้งข้อเท็จจริงวันนี้

## 6. สิ่งที่ขอให้แก้ (เล็กและตรวจซ้ำได้)

1. **บังคับ (F1)** แก้ comment เหนือ `COLD_PREVIEW_ABSENCE_SOURCES` ให้ระบุสิ่งที่พิสูจน์ได้จริง คือ
   "สี่ไฟล์นี้ byte-identical กับฉบับที่ review" และบอกตรง ๆ ว่า **ไม่ครอบไฟล์อื่นในกราฟของ `Generator`**
   พร้อมอย่างน้อยหนึ่งใน:
   (ก) เพิ่ม `src/components/generator/index.ts` (barrel ที่ทั้งสองเพจ import จริง) เข้ารายการ — ค่าใช้จ่ายต่ำสุด
   และปิดเคสที่ผมสาธิต หรือ (ข) ขยายรายการให้ครอบ closure ของ generator ที่รันฝั่ง client
2. **บังคับ (F1/F6)** เพิ่มข้อใน C1 checklist (`docs/RELEASE_GATE_RUNBOOK.md` §5) ตอน integrate:
   ถ้า record มี scenario ใดเป็น `NOT_APPLICABLE` ผู้ทำ C1 ต้องยืนยัน absence ด้วยตนเองบนกราฟทั้งก้อน
   และต้องยืนยันว่า gate ถูกรันใน checkout เดียวกับที่ build artifact (F2)
3. **ควรทำ (F3)** JSDoc ของ `evaluateBundleBoundary` ระบุว่า `coldPreviewAbsence` ต้องมาจาก
   `readColdPreviewAbsence()` ของ gate ที่กำลังรันเท่านั้น
4. **ควรทำ (F4/F6)** เพิ่ม false positive ของ symlinked/case-mismatched checkout เข้า §7
   และเพิ่ม `SCENARIO_NOT_APPLICABLE_UNPROVEN` เข้ารายการ reason code ของ runbook (บรรทัด 62)
5. **ไม่บังคับ (F5)** ใส่ `within()` guard ใน `readColdPreviewAbsence`

ถ้าทำข้อ 1–2 ผมพร้อม ACCEPT โดยไม่ต้องรื้อกลไก — กลไกที่เขียนมาทำงานตรงตามที่ตั้งใจ ปัญหาคือขอบเขตของคำรับรอง

## 7. ข้อจำกัดที่ยอมรับว่าเป็น documented และสิ่งที่ผมตรวจไม่ได้

ยอมรับตามที่ระบุไว้แล้ว:
- C1, C2, S5-2 และเรื่องการสลับไฟล์ระหว่าง hash กับ import (runbook §3/§5/§7/§8) ไม่ถูกแตะโดย delta นี้
  ผมไม่ได้ตรวจซ้ำ นอกจากยืนยันว่าไฟล์ที่เกี่ยวข้องไบต์เท่า i8
- artifact จริงยังได้ `ADAPTER_STATIC_UNKNOWN` เพราะยังไม่มี runtime model ของ Turbopack
- การยกเว้นนี้เป็นการตัดสินใจเชิงนโยบายของ Product Owner ผมไม่ได้ประเมินว่าควรมี flow นี้หรือไม่

ตรวจไม่ได้ / ถูกบล็อก:
- `git status` บน SOURCE **ถูกบล็อก**: `git` บนเครื่องนี้ต้องการ Xcode license (`sudo xcodebuild -license`)
  ซึ่งผมไม่รับตามข้อห้าม จึงยืนยันความสะอาดของ working tree ด้วย git ไม่ได้
  ผมยืนยันแทนด้วย SHA-256 ว่าไฟล์ซอร์สสี่ไฟล์ใน SOURCE ตรงกับสำเนาใน candidate และให้ digest ตรง pin
- ไม่มี build / dev server / browser จึง **ไม่ได้สังเกตพฤติกรรม runtime จริง** ข้อสรุปเรื่อง "ไม่มี cold valid
  initial preview" มาจากการอ่านซอร์สเท่านั้น (ของผมเองและของผู้เขียน) ไม่ใช่จากการวัด
- ไม่ได้รันการทดลองบน volume ที่ case-sensitive จึงไม่ได้ยืนยันว่า F4 มีพฤติกรรมเดียวกันบน Linux CI
- ไม่ได้ตรวจสอบ `inspect-turbopack-emission.mjs` ใหม่ (ไบต์เท่า i8 และไม่ถูกแตะโดย delta นี้)
- mutation testing 11 แบบตามที่รายงานอ้าง ผมไม่ได้รันซ้ำ แต่รัน suite เต็ม 287/287 และ probe ของผมเอง 6 ตัว

---
Reviewer artifacts: `review-stageb-b9-sec/project` (สำเนาที่รันได้, canonical5 ตรงกับ candidate),
`review-stageb-b9-sec/project/scripts/sec-probe.test.mjs` (SEC-A…SEC-F), `probe1.mjs`, `probe2.mjs`
Candidate ที่ freeze ไว้ไม่ถูกแตะ: canonical5 หลังงานเสร็จยังเป็น `f551d9ca…e7fc`
