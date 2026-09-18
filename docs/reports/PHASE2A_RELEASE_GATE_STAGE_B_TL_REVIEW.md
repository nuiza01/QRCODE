# NQR-129 Stage B — Independent TL review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ดนี้) | ไม่ได้ประสานงานกับ SECURITY reviewer

## Verdict: **REQUEST_CHANGES**

เหตุผลหลัก: กลไก admission ที่ออกแบบไว้ทำให้ `PASS_BUNDLE_SCOPE` **ไปถึงไม่ได้เลยในทางปฏิบัติ** (F1, P1) เพราะ record ต้องผูก SHA-256 ของไฟล์ verifier ขณะที่ไฟล์ verifier ต้องมี SHA-256 ของ record อยู่ข้างใน เทสต์ positive path ซ่อนปัญหานี้ไว้ด้วย harness ที่รันโค้ดจาก `data:` URL แต่ hash ไฟล์บน disk ที่ไม่ได้แก้ นอกจากนี้ violation ที่พิสูจน์ได้ยังถูกซ่อนเป็น BLOCKED ได้ ซึ่งขัดกับ NQR129 §4 และขัดกับข้อความในรายงานผู้เขียนที่บอกว่า "FAIL ชนะ BLOCKED เสมอ" (F2) และเทสต์ที่ตั้งชื่อว่า "every decision predicate is mutation-sensitive" ปล่อยให้ mutant รอดไป 12 จาก 14 ตัว (F5)

ฝั่งที่ปลอดภัยยังดีอยู่: ไม่พบทางที่ record ที่ผู้เรียกเขียนเองจะผ่าน gate ได้ path แบบไม่มี options ยัง BLOCK เสมอ และ verify-existing ไม่ spawn Next

## 1. Identity check

| ไฟล์ (`scripts/`) | ค่าที่คาดไว้ | ก่อนรีวิว | หลังรีวิว |
| --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | d391fe92663e0ba4d70be47888101f9caafdefec6a69f0a97bf25e069317f462 | ตรง | ตรง |
| inspect-turbopack-emission.test.mjs | 8394ca27adf4cdc0e2117ab5e0a6d60c1fbb1230d27892cb162983524ed3bd8f | ตรง | ตรง |
| verify-initial-bundle-boundary.mjs | e6a5df2dd50a54348d6aaa25345374ca6102e56fb6a6cdcf76251eb7d6a03b64 | ตรง | ตรง |
| verify-initial-bundle-boundary.test.mjs | fac5f89d6e697c979c3a9da4f8c3e670f3bdf84b94390f9bdc1a23aa5c7457b9 | ตรง | ตรง |
| build.mjs | ee66c8c257f9ab3ed7685028618d3c19176356c280c1d693484a84a8d63e67ff | ตรง | ตรง |

ทุกไฟล์เป็น mode 0444 ผมไม่ได้แก้อะไรใน candidate root หรือ repo จริง mutation และ probe ทั้งหมดทำบนสำเนาใน `review-stageb-tl/{copy,cycle,adm,mut}` หลังรันเสร็จ ผมเช็ก SHA-256 ของไฟล์ toolchain ใน `node_modules` ที่ใช้ร่วมกัน (next/package.json, acorn.js, parse5) แล้ว ยังตรงกับ `SUPPORTED_PROFILE`

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR อยู่ใต้ `review-stageb-tl/tmp`)

1. `shasum -a 256` ห้าไฟล์ ทั้งก่อนและหลังรีวิว: ตรงทั้งหมด
2. `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test scripts/verify-initial-bundle-boundary.test.mjs scripts/inspect-turbopack-emission.test.mjs scripts/origin-gate.test.mjs scripts/verify-origin-artifacts.test.mjs` บน candidate root: **273/273 pass** exit 0 (log: `run-candidate-1.log`) ได้ผลตรงกับที่ผู้เขียนอ้าง
3. `node node_modules/eslint/bin/eslint.js` บนห้าไฟล์: exit 0 (มีแค่ข้อความแจ้งเรื่องโฟลเดอร์ pages)
4. `diff` กับ SOURCE: `inspectInitialBundleBoundary` และ helper เดิมไม่เปลี่ยน เปลี่ยนแค่ import เทสต์เดิมยังอยู่ครบ ส่วน test file เปลี่ยนเฉพาะ import
5. Probe `probes/p1-admission-cycle.mjs` บนสำเนา `cycle/`: log `p1-admission-cycle.log`
6. Probe `probes/p2-decision-semantics.mjs` (candidate จริงสำหรับกรณี A และสำเนา `adm/` ที่ใส่ admission สำหรับ B/C/D): log `p2-decision-semantics.log`
7. Mutation runner `probes/mutants.mjs`: ทำ 14 mutant บนสำเนาแยก แต่ละตัวรัน `verify-initial-bundle-boundary.test.mjs` log อยู่ที่ `mutants.log` (รอบแรกถูก kill ด้วย exit 137 ระหว่าง mutant ตัวที่ 7 ก่อนจะเขียน log ได้ จึงรันใหม่ทั้งชุดโดยให้เขียน log ทีละ mutant)

ไม่มี install, build, typegen, server, browser, network, DB หรือ git write

## 3. Findings

### F1 — P1: admission set กับ gate revision อ้างอิงกันเป็นวง ทำให้ PASS ไปถึงไม่ได้ และเทสต์ positive ซ่อนปัญหานี้

**ตำแหน่ง**
- `scripts/verify-initial-bundle-boundary.mjs:501`: `ADMITTED_ACCEPTANCE_SHA256` อยู่ในไฟล์ verifier
- `scripts/verify-initial-bundle-boundary.mjs:697-702`: ต้องได้ `record.gateRevision.verifierSha256 === gateRevision.verifierSha256`
- `scripts/verify-initial-bundle-boundary.mjs:772-776`: `verifierSha256 = sha256(readFile(VERIFIER_URL))` คือ hash ของไฟล์ที่มี admission set อยู่ข้างใน
- `scripts/verify-initial-bundle-boundary.test.mjs:771-787` (`stageBVerifierAdmitting`): เขียน admission constant ใหม่แล้ว import จาก `data:` URL แต่ตั้ง `VERIFIER_URL` ให้ชี้ไปที่ไฟล์บน disk ที่ไม่ได้แก้ ผลคือ gate revision เป็น hash ของ bytes ที่ **ไม่ใช่โค้ดที่กำลังรัน** เทสต์ `:820` ("admitted evidence passes…") จึงผ่านได้เฉพาะใน harness

**กลไก**: record R ต้องมี H(V) และ verifier V ต้องมี H(R) การใส่ H(R) ลงใน V ทำให้ H(V) เปลี่ยน record จึงเก่าทันที ถ้าแก้ record ให้ใช้ H(V) ใหม่ H(R) ก็เปลี่ยน และต้องแก้ V อีก การหา fixed point ของ SHA-256 ทำไม่ได้ในทางคำนวณ

**Reproduction** (`p1-admission-cycle.log`): ในสำเนาของ candidate ผมทำตามกระบวนการที่ออกแบบไว้ คือสร้าง record ที่ครบถ้วนแล้วเพิ่ม SHA ของมันลงในไฟล์ verifier ทำซ้ำ 4 รอบ ทุกรอบได้ผลแบบเดียวกัน:
```
iteration 0: record.verifierSha256=e6a5df2dd50a verifierOnDiskAfterAdmission=f64973875d7b
{"real":["BLOCKED",["GATE_REVISION_MISMATCH"]],"controlIfGateRevisionMatched":["PASS_BUNDLE_SCOPE",[]],"verifyInitialBundleBoundary":"NQR_BUNDLE_NEEDS_EMISSION_REVIEW"}
... (iteration 1–3 ได้ผลเหมือนกัน แต่ละรอบ hash ของ verifier เลื่อนต่อไปเรื่อย ๆ)
```
Control run ยืนยันว่า predicate อื่นผ่านหมด สิ่งเดียวที่ทำให้ BLOCK คือวงนี้

**ผลกระทบ**: NQR129 §6 (Wrapper) กำหนด positive control ว่า "explicit existing artifact+all gates accepted succeeds without Next spawn" candidate นี้ไม่มีทางทำได้กับ bytes ที่ admit จริง กลไกนี้ fail closed จึงไม่ใช่ security bypass แต่เมื่อ PM admit หลักฐานจริงแล้ว gate จะ BLOCK ตลอด และเพราะรายงาน/เทสต์บอกว่า PASS ทำได้ จึงเป็นการอ้างที่ไม่จริง ถ้าต้องการให้ PASS ได้ ต้องแก้ design

**ข้อเสนอแก้**: แยก admission set ออกไปเป็นไฟล์ reviewed แยก (เช่น `scripts/bundle-gate-admissions.mjs` หรือ JSON ที่ commit แล้ว) ที่ไม่รวมอยู่ใน `verifierSha256` และให้ record ผูก revision เฉพาะโค้ดตรรกะ (adapter, verifier, และควรรวม build.mjs และ origin modules ด้วย ดู F3) เพิ่มเทสต์ end-to-end ที่ admit ด้วยการเขียนไฟล์จริงในสำเนา temp แล้ว import ผ่าน file URL (ไม่ใช้ `data:` URL และไม่ override `VERIFIER_URL`) แล้วได้ PASS รวมถึงเทสต์ที่ยืนยันว่า gate revision เท่ากับ hash ของโมดูลที่กำลังรันจริง

### F2 — P2: violation ที่พิสูจน์ได้ถูกซ่อนเป็น BLOCKED เมื่อ record หายไป ยังไม่ admit หรือ invalid

**ตำแหน่ง**
- `scripts/verify-initial-bundle-boundary.mjs:758-761`: return BLOCKED ก่อนเรียก `inspectInitialBundleBoundary` ทั้งที่ legacy inspector ไม่ต้องใช้ record
- `scripts/verify-initial-bundle-boundary.mjs:672-708`: legacy marker (`:703`) และ timing FAIL (`:704`) ถูกประเมินเฉพาะใน branch ที่ record admit แล้วและ key ตรงพอดี

**Reproduction** (`p2-decision-semantics.log`) ใช้ artifact เดียวกันที่ HTML-root chunk มี `"jsPDF"`:
```
A.legacyMarkerDiagnostics 1
A.noOptions NQR_BUNDLE_STATIC_CHECK_FAILED
A.optionsUnadmitted NQR_BUNDLE_NEEDS_EMISSION_REVIEW
A.evaluatorUnadmitted BLOCKED ["ACCEPTANCE_NOT_ADMITTED"]
A.evaluatorMissingRecord BLOCKED ["MISSING_ACCEPTANCE_RECORD"]
A.cliVerifyExisting 1 "NQR_BUNDLE_NEEDS_EMISSION_REVIEW"
B.markerValid FAIL ["FORBIDDEN_INITIAL_MARKER"]
B.markerExtraKey BLOCKED ["INVALID_ACCEPTANCE_RECORD"]
B.markerWrongProfile BLOCKED ["INVALID_ACCEPTANCE_RECORD"]
```
artifact เดียวกันได้ FAIL ผ่าน path เดิม แต่ได้ BLOCKED ผ่าน verify-existing ซึ่งขัดกับ NQR129 §4 ("An unknown alongside any proven violation must not hide that violation" และ "throw NQR_BUNDLE_STATIC_CHECK_FAILED for proven violation") และขัดกับรายงานผู้เขียน §3 ที่บอกว่า "FAIL ชนะ BLOCKED เสมอ" เทสต์ `:936-938` ครอบเฉพาะกรณีที่ record admit แล้วเท่านั้น exit code ยังเป็น 1 จึงไม่ใช่ bypass

**ข้อเสนอแก้**: ใน `decideExistingArtifact` ให้รัน legacy inspector ก่อนตรวจ admission เสมอ (ไม่ต้อง parse bytes ที่ยังไม่ admit) ใน evaluator ให้ประเมิน `FORBIDDEN_INITIAL_MARKER` ของ legacy แยกจาก branch ของ record เพิ่มเทสต์: marker ร่วมกับ record ที่ (ไม่มี / ไม่ admit / มี key เกิน / profile ผิด) ต้องได้ FAIL และ `NQR_BUNDLE_STATIC_CHECK_FAILED`

### F3 — P2: schema ของ evidence ไม่ครบตามรายการใน §4 และ exact-keys ทำให้ใส่ field ที่ §4 กำหนดไม่ได้

**ตำแหน่ง**: `scripts/verify-initial-bundle-boundary.mjs:518-519` (`RECORD_KEYS`, `TIMING_KEYS`), `:608` (scenario keys `id,routes,state,status`), `:630-645` (reviews)

§4 "Evidence trust and artifact binding" กำหนดให้มี: cold/warm preparation และ timestamps, local origin, request/resource/cache/initiator/event records, observations และ fixed failures, pre/post identity, และ exact accepted report digests ของ reviewer schema นี้ไม่มี field สำหรับ timestamps, local origin, raw evidence หรือ digest ของ evidence bundle, observation/failure และ pre/post identity และเพราะใช้ `exactKeys` record ที่ใส่ field เหล่านี้จะกลายเป็น `INVALID_ACCEPTANCE_RECORD` (ดู probe `B.markerExtraKey`) record ผูกหลักฐาน browser ได้ทางเดียวคือผ่าน `reviews[].reportSha256` ซึ่งเป็น digest ของรายงาน ไม่ใช่ของ trace นอกจากนี้ gate revision ยังไม่รวม `build.mjs`, `origin-gate.mjs` และ `verify-origin-artifacts.mjs` (ผู้เขียนระบุไว้แล้วใน §5) ทั้งที่ไฟล์เหล่านี้อยู่ใน path การตัดสินของ verify-existing

**ข้อเสนอแก้**: เพิ่ม field ที่ validate ได้ อย่างน้อย `evidenceBundleSha256` (ของ trace/log ดิบ), `collectedAt` ระดับ scenario, `localOrigin`, `preIdentity`/`postIdentity` (ต้องเท่ากับ `artifactFull.canonicalSha256`) และให้ review มี scope ด้วย เพิ่ม `build.mjs`, `origin-gate.mjs` และ `verify-origin-artifacts.mjs` เข้าไปใน gate revision ถ้าตั้งใจจะไม่ใส่ field ใด ต้องเขียนเหตุผลไว้ใน spec delta ที่ PM รับรอง

### F4 — P2: timing coverage ตรวจแค่ผลรวมของทุก scenario ไม่ได้ตรวจราย scenario

**ตำแหน่ง**: `scripts/verify-initial-bundle-boundary.mjs:607-626` แต่ละ scenario ต้องการแค่ ≥1 route และยอมให้ route ซ้ำ ส่วน coverage 22 route ตรวจจาก union ของทุก scenario

**Reproduction** (`C.pdfScenarioOnlyOnLandingRoute`): ตั้ง `FIRST_ELIGIBLE_PDF_REQUEST` ให้มีแค่ `["/th"]` (หน้า landing ที่ไม่มี generator), `COLD_VALID_INITIAL_PREVIEW` = `["/th"]` และ `NON_PDF_ACTIONS` = `["/en","/en"]` ผลที่ได้คือ `PASS_BUNDLE_SCOPE []` แต่ NQR129 §7 กำหนดให้ scenario ของ generator ครอบคลุม generator route ของทั้ง 10 type/2 locale

**ข้อเสนอแก้**: กำหนดชุด route ที่ต้องมีต่อ scenario (startup = 22 route, scenario ของ generator/PDF/non-PDF = 20 route `/xx/qr/*`) ปฏิเสธ route ซ้ำ และเพิ่มเทสต์ของกรณีข้างบน

### F5 — P2: เทสต์ที่อ้างว่า mutation-sensitive ไม่ครอบ predicate หลายตัว

**ตำแหน่ง**: `scripts/verify-initial-bundle-boundary.test.mjs:862` ("every decision predicate is mutation-sensitive…") ผลจาก `mutants.log` (แต่ละ mutant รัน `verify-initial-bundle-boundary.test.mjs` 133 เทสต์):

| Mutant | ผล |
| --- | --- |
| M01 ลบ admission precheck ใน `decideExistingArtifact` (:761) | SURVIVED (evaluator ยังตรวจซ้ำ แต่ข้ออ้าง "unadmitted bytes are never parsed" ไม่มีเทสต์) |
| M02 ไม่ตรวจรูปแบบ `review.reportSha256` | SURVIVED |
| M03 ไม่ตรวจ `browser.name/version` | SURVIVED |
| M04 ไม่ตรวจ `timing.policyVersion` | SURVIVED |
| M05 ไม่ผูก `timing.artifactScopeSha256` | SURVIVED |
| M06 ไม่ตรวจ `record.policyVersion/profileId` | SURVIVED |
| M07 ไม่ตรวจ shape ของ legacy (`schemaVersion/scope/releaseDecision`) | SURVIVED |
| M08 ไม่ตรวจ realpath ของ acceptance path | SURVIVED |
| M09 ไม่ตรวจ read race ของ acceptance | SURVIVED |
| M10 ยอม route ที่ไม่อยู่ใน profile | SURVIVED |
| M11 `revoked !== false` → `revoked === true` (ยอม `"true"`/`0`) | SURVIVED |
| M12 ลบ limit ขนาด acceptance ใน evaluator | SURVIVED |
| M13 legacy identity เทียบแค่ path ไม่เทียบ sha | KILLED |
| M14 wrapper ตรวจ origin บน `.next` เพิ่มอีกรอบ | KILLED |

M05 มีน้ำหนักมากเป็นพิเศษ: ถ้าไม่ผูก timing evidence กับ artifact scope digest หลักฐานของ artifact อื่นที่ BUILD_ID เดียวกันก็จะผ่านได้ NQR129 §6 กำหนดว่า "Every negative mutation needs a specific expected decision/reason, and must fail if its associated guard is removed" **ข้อแนะนำ**: เพิ่ม negative variant ให้ M02–M07, M10 และ M11 เป็นอย่างน้อย (M08/M09/M12 น้ำหนักต่ำกว่าเพราะ admission ใช้ hash อยู่แล้ว แต่ยังควรมี)

### F6 — P3: symlink ภายใน artifact ถูกจัดเป็น FAIL (proven violation) ไม่ใช่ BLOCKED

**ตำแหน่ง**: `scripts/inspect-turbopack-emission.mjs:960-962` (`NON_REGULAR_ARTIFACT_NODE` severity `VIOLATION`) และ `scripts/verify-initial-bundle-boundary.mjs:664-666` ที่แปลงเป็น FAIL
**Reproduction**: `D.internalSymlinkAdded FAIL ["ADAPTER_STATIC_VIOLATION"]` และ `D.verifyThrows NQR_BUNDLE_STATIC_CHECK_FAILED` แม้ symlink จะชี้ภายใน artifact NQR129 §6 Identity ระบุว่า "symlink escape … each blocks" และ §4 นิยาม FAIL ว่าเป็น boundary violation ที่พิสูจน์ได้ **ข้อเสนอแก้**: เปลี่ยนเป็น UNKNOWN หรือเขียนเหตุผลของ policy นี้ไว้ในเอกสาร

### F7 — P3: verify-existing ตรวจ origin บนไฟล์ที่อ่านซ้ำหลัง bundle PASS โดยไม่ผูก hash (TOCTOU)

**ตำแหน่ง**: `scripts/build.mjs:30-32` และ `scripts/verify-origin-artifacts.mjs:65-73` อ่าน HTML, `sitemap.xml.body` และ `robots.txt.body` ใหม่หลัง adapter ตรวจ identity เสร็จ ข้อความ "PASS for this exact artifact" (`build.mjs:33`) จึงไม่ได้ผูกกับ bytes ที่ admit โดยตรง ข้อจำกัด C4 ของ Stage A ก็ยอมรับไว้แล้วว่าต้องอาศัยว่า directory จะไม่ถูกแก้ **ข้อเสนอแก้**: ตรวจ origin จาก buffer ที่ adapter อ่านแล้ว หรือ re-verify `artifactFull` digest หลังตรวจ origin เสร็จ

### F8 — P3: path build ปกติเปลี่ยนลำดับ import

**ตำแหน่ง**: `scripts/build.mjs:27` import verifier (ซึ่งตอนนี้ import adapter และ parse5 ด้วย) **ก่อน** spawn Next ที่ `:35` ต้นฉบับ import หลัง build ที่ `:24` ถ้า import ของ adapter ล้ม build ปกติจะจบก่อนเรียก Next พฤติกรรมยัง fail closed แต่ขัดกับข้ออ้าง "Build path เดิมคงไว้" **ข้อเสนอแก้**: ย้าย dynamic import เข้าไปในแต่ละ branch

### F9 — P3: diagnostics ที่ operator เห็นมีน้อยเกินไป

**ตำแหน่ง**: `scripts/verify-initial-bundle-boundary.mjs:796-798` และ `scripts/build.mjs:46-48` reason codes ที่เป็น enum คงที่ถูกทิ้งไป operator จะเห็นแค่ `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` (ถ้าไม่มี probe ผมก็วินิจฉัย F1 ไม่ได้) **ข้อเสนอแก้**: แนบ `reasonCodes` (enum คงที่ ไม่มี payload) ไปกับ `BundleBoundaryError` แล้วพิมพ์ออกมา

### F10 — P3: ไม่มีเอกสาร mapping ราย class ของ legacy unsupported → adapter predicate

**ตำแหน่ง**: `scripts/verify-initial-bundle-boundary.mjs:520-528` ปิดทั้งห้า class ด้วย `STATIC_SUPPORTED` รวมทั้งก้อน NQR129 §4 กำหนดว่า "Stage B explicitly documents which reviewed adapter predicate closes each unsupported class" **ข้อเสนอแก้**: เพิ่มตาราง mapping (เช่น `UNSUPPORTED_MIXED_SCRIPT_MODE` ↔ `CONFLICTING_EXECUTION_MODE`) พร้อมเทสต์ต่อ class

## 4. ข้อจำกัดที่ยอมรับได้เพราะผู้เขียนระบุไว้แล้ว (ไม่นับเป็น defect)

- `COLD_VALID_INITIAL_PREVIEW` ถูกบังคับเป็น PASS จึงต้องให้ PO ตัดสินนโยบาย
- legacy marker → FAIL อาจเป็น false FAIL ภายใต้ policy ใหม่ (§5 ของ spec บอกว่า marker เป็นแค่ candidate) ผู้เขียนระบุไว้แล้ว
- adapter `:1025-1028` จัด chunk `static/chunks/turbopack-*` ทุกตัวเป็น `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` artifact Turbopack จริงจึงไม่มีทางได้ `STATIC_SUPPORTED` และยังไม่มี real-emission positive fixture ตาม §6 ข้อนี้เป็นข้อจำกัดของ Stage A แยกจาก F1 แต่ผลรวมคือ gate นี้ยังพิสูจน์ PASS บน artifact จริงไม่ได้
- `sourceInventorySha256`/`dependencySha256` เป็น provenance ที่รับต่อมาจากค่าคงที่ ไม่ได้ hash ใหม่

## 5. สิ่งที่ตรวจแล้วว่าถูกต้อง

- `verifyInitialBundleBoundary(buildDir)` แบบไม่มี options ยังเป็นตรรกะเดิมทุกไบต์ (`:788-794`) และ `inspectInitialBundleBoundary` ไม่เปลี่ยน เทสต์เดิมทั้งหมดยังอยู่และผ่าน
- `ADMITTED_ACCEPTANCE_SHA256` เป็น array ว่างและ frozen record ที่ผู้เรียกเขียนเอง (มี `approved`, ชื่อ reviewer หรือ hash) ยัง BLOCKED การ smuggle key เข้า input ของ evaluator จะได้ `INVALID_DECISION_INPUT`
- ใน branch ที่ admit แล้ว FAIL (adapter violation, marker, timing FAIL) ชนะ BLOCKED ได้ถูกต้อง (`:713`)
- verify-existing: ตำแหน่ง argument ตายตัว ต้องเป็น absolute ใช้ร่วมกับ `--production/--preview` ไม่ได้ ไม่มี default/fallback ไม่ spawn Next (`spawnSync` อยู่เฉพาะ branch else ที่ `:35`) CLI child-process test ยืนยันกรณี unadmitted
- options ที่มี getter, Proxy หรือ key เกิน, path สัมพัทธ์, acceptance ที่เป็น symlink และ `.next` สัมพัทธ์ ได้ BLOCKED ทั้งหมด error message เป็นรหัสคงที่ไม่ echo input
- adapter ต้องการ `realpath(root) === root` ตรวจ full/scope manifest กับ bytes จริง ตรวจ BUILD_ID และ re-walk ตอนจบ legacy binding ทำให้ inspection ทั้งสองอ้างถึงชุด bytes เดียวกัน (M13 ถูก kill)
- `evaluateBundleBoundary` เป็น pure ไม่อ่านไฟล์หรือ execute อะไร
- lint ผ่าน และ 273/273 reproduce ได้

## 6. ข้อจำกัดของรีวิวนี้

- ไม่ได้รัน artifact Turbopack จริง, browser หรือ build (อยู่นอกสิทธิ์) ผลทั้งหมดมาจาก fixture สังเคราะห์
- mutation ทำแบบเลือกเป้า 14 ตัว ไม่ได้ทำแบบครบทุกจุด ไม่ได้ทำ mutation บน adapter และไม่ได้ทำ adversarial race แบบ timing จริง
- ไม่ได้ตรวจ grammar ของ Stage A (Flight/registration/factory) ในเชิงลึก ซึ่งเป็นขอบเขตของ Stage A review แยก
- ไม่มีนิยาม severity ใน WORKING_AGREEMENT จึงใช้เกณฑ์นี้: P1 = gate ไม่ตรง contract หลักหรือใช้งานไม่ได้ตามที่อ้าง; P2 = ต้องแก้ก่อน integrate; P3 = ควรแก้หรือบันทึกไว้
