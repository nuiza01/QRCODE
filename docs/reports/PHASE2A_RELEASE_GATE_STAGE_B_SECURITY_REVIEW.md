# NQR-129 Stage B — Independent SECURITY review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ดนี้ ไม่ได้ประสานกับ TL)

## Verdict: **REQUEST_CHANGES**

ไม่พบทางที่ record ซึ่ง caller เขียนเอง (ไม่อยู่ใน `ADMITTED_ACCEPTANCE_SHA256`) จะทำให้ได้ `PASS_BUNDLE_SCOPE` หรือ exit 0 **โดยไม่มีการรันโค้ดของผู้โจมตีใน process** ส่วน fail-closed หลักใช้ได้จริง แต่ยังมีข้อบกพร่องสามข้อระดับ MEDIUM ที่ต้องแก้ก่อน integrate:
(1) กลไก admission ขัดกับ gate revision แบบวนกลับ จึงไม่มีทาง PASS ใน production และการทดสอบ PASS ของผู้เขียนผ่านได้เพราะใช้ harness ที่โค้ดที่รันจริงไม่ใช่ไฟล์ที่ถูก hash
(2) ฝั่ง static ไม่มี predicate ของ load-policy สำหรับ PDF เลย จำลอง admission แล้ว artifact ที่ preload chunk PDF แบบ eager ผ่าน Flight ยังได้ exit 0
(3) violation ที่พิสูจน์แล้วถูกลดเป็น BLOCKED เมื่อ record ไม่ได้ admit หรือ record ไม่ถูกต้อง

## 1. Identity check

SHA-256 ของไฟล์ candidate ห้าไฟล์ (`nqr-stageb/project/scripts/`) ตรวจ **ก่อน** และ **หลัง** งาน ตรงกับที่คาดทุกไฟล์ และทุกไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | d391fe92663e0ba4d70be47888101f9caafdefec6a69f0a97bf25e069317f462 |
| inspect-turbopack-emission.test.mjs | 8394ca27adf4cdc0e2117ab5e0a6d60c1fbb1230d27892cb162983524ed3bd8f |
| verify-initial-bundle-boundary.mjs | e6a5df2dd50a54348d6aaa25345374ca6102e56fb6a6cdcf76251eb7d6a03b64 |
| verify-initial-bundle-boundary.test.mjs | fac5f89d6e697c979c3a9da4f8c3e670f3bdf84b94390f9bdc1a23aa5c7457b9 |
| build.mjs | ee66c8c257f9ab3ed7685028618d3c19176356c280c1d693484a84a8d63e67ff |

การอ่านโค้ด: อ่านไฟล์ verifier ทั้งไฟล์ อ่าน `build.mjs` ทั้งไฟล์ อ่าน adapter ครบ 1122 บรรทัด และอ่านส่วน Stage B ของไฟล์เทสต์ แล้ว diff กับต้นฉบับใน `/Users/sarawutjuntasang/Nexora/QRCODE/scripts/` ผลคือส่วน `inspectInitialBundleBoundary` เดิมไม่เปลี่ยน มีเพียง import และ `VERIFIER_URL` ที่เปลี่ยน

ไม่ได้แก้อะไรใน candidate root หรือ repo จริง การทดลองทุกอย่างทำบน copy ที่ `review-stageb-sec/project` และ `review-stageb-sec/circ`

## 2. Commands ที่รันจริง (Node v24.14.1, TMPDIR=`review-stageb-sec/tmp`)

| # | Command / probe | Result |
| --- | --- | --- |
| 0 | `node --test` กับ 4 suite (verify-initial-bundle-boundary, origin-gate, verify-origin-artifacts, inspect-turbopack-emission) บน copy | 273/273 pass, 0 fail/skip |
| 1 | `probes/p1-setup.mjs` สร้าง artifact สังเคราะห์ inert 5 แบบ (clean, flightPdf, marker, leakJsonLd, noRobots) พร้อม origin artifacts ครบ 22 route, sitemap, robots และ record ที่เขียนเองซึ่งมี gateRevision ถูกต้อง | สร้างได้ |
| A | `build.mjs --verify-existing` บน clean ด้วย record ที่ไม่ได้ admit | exit 1 `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` |
| B | เหมือน A แต่ตั้ง `NODE_OPTIONS=--import=probes/admit-patch.mjs` | **exit 0** "bundle and origin scopes PASS" |
| C | เหมือน B แต่รันด้วย `node --permission --allow-fs-read=*` | exit 0 ไม่มี child process หรือ fs write ถูกปฏิเสธ |
| C2 | control: `build.mjs` แบบไม่มี argument ภายใต้ `--permission` | exit 1 "Access to this API has been restricted… --allow-child-process" แปลว่า permission model บล็อก spawn ได้จริง ดังนั้นผล C เป็นหลักฐานว่า verify-existing ไม่ spawn |
| D | flightPdf + patch | **exit 0** |
| E | marker ด้วย record ที่ไม่ได้ admit | exit 1 `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` |
| F | marker + patch | exit 1 `NQR_BUNDLE_STATIC_CHECK_FAILED` |
| G | leakJsonLd + patch | exit 1 ข้อความ `Expected ',' or '}' … at position 47` (ไม่ echo เนื้อหา) |
| H | noRobots + patch | exit 1 และ **echo absolute path** `ENOENT: … open '/private/tmp/…/artifact/server/app/robots.txt.body'` |
| I | `probes/p-default.mjs` เรียกแบบไม่มี options กับแบบมี options (ไม่ admit) บน flightPdf และ marker | flightPdf: default→NEEDS_REVIEW (legacy อ่านแค่ entry.js); marker: default→**STATIC_CHECK_FAILED** แต่ options→**NEEDS_REVIEW** |
| J | `probes/p-circ.mjs` ทำตาม workflow การ admit จริงใน copy 3 รอบ | ทุกรอบ `GATE_REVISION_MISMATCH` เป็น reason เดียว และ verifier SHA ไม่ converge (e6a5df→62bbe9→0bc606→a27093) |
| K | `probes/p-inproc.mjs` รันแบบ in-process พร้อม patch | ดู F3, F4, F7 |

`probes/admit-patch.mjs` ใช้จำลอง "record ที่ admit แล้ว" หรือ "มีโค้ดผู้โจมตีใน process" โดยให้ `Array.prototype.includes` คืน `true` เมื่อค้นค่า hex 64 ตัวใน frozen empty array ส่วนอื่นของ gate (adapter, legacy, evaluator, origin) รันด้วยโค้ดจริงทั้งหมด

## 3. Findings

### F1 — MEDIUM: admission constant กับ `gateRevision.verifierSha256` วนกลับกันเอง ทำให้ PASS ไปไม่ถึงใน production และ positive test ไม่สะท้อน configuration จริง

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:501` (`ADMITTED_ACCEPTANCE_SHA256` อยู่ในไฟล์ verifier), `:773-776` (hash ไฟล์ verifier บน disk), `:697-702` (record ต้องมี `gateRevision.verifierSha256` ตรงกัน)
- กลไก: record R ต้องมี H(V) และ V ต้องมี H(R) จะได้ทั้งคู่ต้องหา fixed point ของ SHA-256 ซึ่งทำไม่ได้ในทางปฏิบัติ
- หลักฐาน (probe J): เมื่อ admit hash ของ record ลงใน verifier แล้ว SHA ของ verifier เปลี่ยนทุกครั้ง evaluator ให้ `BLOCKED GATE_REVISION_MISMATCH` เป็น reason เดียวทั้ง 3 รอบ
- ทำไมเป็นเรื่อง security: เทสต์ "admitted evidence passes" (`verify-initial-bundle-boundary.test.mjs` `stageBVerifierAdmitting`) ผ่านได้เพียงเพราะ import verifier ที่แก้แล้วผ่าน `data:` URL และบังคับ `VERIFIER_URL` ให้ชี้ไปที่ไฟล์เดิม นั่นคือโค้ดที่รันไม่ใช่ bytes ที่ถูก hash เป็น gate revision configuration เดียวที่เคยสาธิตว่า PASS ได้จึงเป็นรูปแบบเดียวกับ bypass การแก้ปัญหานี้ในอนาคต (เช่นย้าย admission ไปไฟล์อื่นหรือยกเว้นบางส่วนออกจาก hash) คือการออกแบบ trust boundary ใหม่ ซึ่งยังไม่มีใครรีวิว
- Preconditions: ไม่มี ผลที่เกิดคือ fail-closed (ไม่มี bypass) แต่ข้อกล่าวอ้างของผู้เขียนว่า record ที่ admit แล้วจะ PASS ได้นั้นไม่เป็นจริงกับไฟล์ที่ส่งมา
- ข้อสังเกตประกอบ: adapter ให้ `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` (UNKNOWN) กับ `static/chunks/turbopack-*` ทุกไฟล์ (`inspect-turbopack-emission.mjs:1025-1028`) ดังนั้น emission จริงของ Next ยังไม่มีทางเป็น STATIC_SUPPORTED อยู่แล้ว
- ข้อเสนอแก้: แยก admission set ไปไว้ในไฟล์ reviewed source ต่างหาก (เช่น `scripts/admitted-bundle-acceptance.mjs`) ที่ไม่อยู่ใน `gateRevision` หรือให้ record ผูก revision ของ "decision logic" แต่ไม่ผูก admission list แล้วเขียน positive test ที่ load verifier จาก **ไฟล์จริงบน disk** (copy ไปไว้ใน temp root) ไม่ใช้ `data:` URL หรือการ override `VERIFIER_URL`

### F2 — MEDIUM: ไม่มี static load-policy predicate สำหรับ PDF เมื่อจำลอง admission แล้ว artifact ที่ preload chunk PDF แบบ eager ได้ exit 0

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:520-528, 572-579` (`ADAPTER_CLOSED_LEGACY_CODES` ให้ adapter แทน legacy) และ `:661-669` ถือว่า `STATIC_SUPPORTED` เพียงพอ ส่วนใน `inspect-turbopack-emission.mjs` ไม่มีการจำแนก PDF/QR/renderer เลย (grep หา `pdf` ไม่พบ ยกเว้นใน `policyVersion`) STATIC_SUPPORTED จึงหมายถึง "grammar รองรับ" เท่านั้น
- Legacy marker ตรวจเฉพาะ chunk ที่ถึงได้จาก HTML `<script src>`/preload และ static ESM import (`verify-initial-bundle-boundary.mjs:421-494`) จึงมองไม่เห็น chunk ที่ถูกอ้างผ่าน Flight `I` record
- หลักฐาน (probe D): ทุก route มี wire `2:I[8,["/_next/static/chunks/pdf.js"],"default"]` และ `pdf.js` register module 8 ที่มี `t.v("jsPDF")` ผลคือ adapter ได้ STATIC_SUPPORTED, legacy อ่านแค่ `entry.js` (probe I) และ `build.mjs --verify-existing` ได้ **exit 0**
- Preconditions: ต้องมี record ที่ PM admit แล้วซึ่ง timing evidence ผิดหรือไม่ครบ ในทางปฏิบัติตอนนี้ยังไปไม่ถึงเพราะ F1 ผลคือ PASS ขึ้นกับ record ที่มนุษย์ admit ล้วน ๆ ขัดกับ NQR129 §4 ข้อ 2 ("all relevant graph and load-policy predicates are supported and satisfied") และ §5 ("Eager proven PDF load is FAIL") และสเปกระบุว่า static proof เป็นเงื่อนไขจำเป็นคู่กับ browser evidence ที่มีขอบเขตจำกัด
- ข้อเสนอแก้: เพิ่ม predicate แบบ graph ที่ผ่านการรีวิว จำแนก module/chunk ที่เฉพาะ PDF (ผูกกับ identity ใน reviewed profile ไม่ใช้ชื่อ) แล้วให้ FAIL เมื่อถึงได้ผ่าน edge `synchronous-instantiation` หรือ `flight-resolve-preload` จาก route root และให้ BLOCKED เมื่อจำแนกไม่ได้ ถ้ายังทำไม่ได้ Stage B ต้องห้าม PASS

### F3 — MEDIUM: violation ที่พิสูจน์แล้วถูกลดเป็น BLOCKED เมื่อ record ไม่ได้ admit อ่านไม่ได้ หรือไม่ถูกต้อง

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:758-767` return `BLOCKED` ก่อนรัน legacy inspector และ adapter ส่วน `:686-705` เรียก `checkLegacyInspection` เฉพาะใน branch ที่ record admit แล้ว **และ** schema ถูกต้อง
- หลักฐาน: artifact เดียวกันที่มี `jsPDF` ใน `entry.js`
  - `verifyInitialBundleBoundary(root)` (ไม่มี options) ได้ `NQR_BUNDLE_STATIC_CHECK_FAILED`
  - `verifyInitialBundleBoundary(root, {acceptancePath, origin})` กับ record ที่ไม่ได้ admit ได้ `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` (probe I และ CLI probe E)
  - evaluator ที่มี admission: record ถูกต้อง→`FAIL`; record มี key เกิน→`BLOCKED INVALID_ACCEPTANCE_RECORD`; bytes ไม่ใช่ JSON→`BLOCKED` (probe K)
- ผลกระทบ: ไม่ได้ exit 0 แต่ขัดกับ NQR129 §4 ("An unknown alongside any proven violation must not hide that violation") และขัดกับที่รายงานผู้เขียนอ้างว่า violation ไม่ถูกซ่อน ผลที่ตามมาคือ artifact ที่ละเมิดจริงถูกแจ้งว่า "รอหลักฐาน" ชวนให้คนไปเก็บหรือ admit หลักฐานเพิ่ม แทนที่จะแก้ build
- ข้อเสนอแก้: ใน verify-existing ให้รัน `inspectInitialBundleBoundary` (ซึ่งไม่ต้องใช้ record) ก่อนตรวจ admission ถ้าพบ `FORBIDDEN_INITIAL_MARKER` ให้ FAIL ทันที และใน evaluator ให้ประเมิน marker ของ legacy โดยไม่ขึ้นกับ admission หรือ record แล้วเพิ่มเทสต์ marker + record ไม่ admit → `NQR_BUNDLE_STATIC_CHECK_FAILED`

### F4 — LOW: TOCTOU ระหว่าง bundle gate กับ origin gate และไม่มีการผูก identity ซ้ำหลังตรวจ

- ตำแหน่ง: `build.mjs:30-33` และ `verify-origin-artifacts.mjs:65-73` (`readFile` ตาม symlink ได้ ไม่เช็ค identity)
- หลักฐาน (probe K): bundle gate ได้ `PASS_BUNDLE_SCOPE` จากนั้นแก้ `server/app/th.html` โดยเพิ่ม inline script แล้ว `verifyOriginArtifacts` ยัง PASS ถ้าเป็น wrapper จะพิมพ์ "PASS for this exact artifact" การตรวจซ้ำหลังแก้ได้ `NQR_BUNDLE_STATIC_CHECK_FAILED`
- Preconditions: ต้องมีสิทธิ์เขียน artifact directory ในระหว่างการตรวจ (คนที่มีสิทธิ์นี้แก้หลัง exit 0 ได้อยู่แล้ว ความเสี่ยงที่เพิ่มขึ้นจึงต่ำ) รายงาน i4 ข้อ C4 ประกาศเงื่อนไขนี้เป็น prerequisite ไว้แล้ว
- ข้อเสนอแก้: ให้ origin check ใช้ bytes ที่ adapter admit ไว้แล้ว (ส่ง buffer ต่อ) หรือ walk แล้วเทียบ `artifactFull` ซ้ำหลัง origin check ก่อนพิมพ์ PASS และระบุ prerequisite นี้ในข้อความ usage หรือ docs

### F5 — LOW: `build.mjs` echo `error.message` ดิบ ทำให้ absolute path รั่ว

- ตำแหน่ง: `build.mjs:46-48`
- หลักฐาน (probe H): `ENOENT: no such file or directory, open '/private/tmp/…/artifact/server/app/robots.txt.body'` ส่วน probe G ข้อความ `JSON.parse` บน Node 24 ไม่ echo เนื้อหา ถ้า import dependency ล้มเหลวก็จะ echo path ในลักษณะเดียวกัน
- Preconditions: ต้องผ่าน bundle PASS แล้วหรือ import ล้มเหลว สิ่งที่รั่วคือ path ไม่พบว่ามี secret รั่ว แต่ขัดกับ §4 ("never echo arbitrary exception.message… path diagnostics constrained to approved project-relative identities")
- ข้อเสนอแก้: ใน verify-existing ให้แมป error เป็น fixed code (`BundleBoundaryError.code`, `NQR_ORIGIN_ARTIFACT_CHECK_FAILED`, `NQR_VERIFY_EXISTING_INTERNAL`) และเก็บข้อความของ `origin-gate` ไว้เพราะเป็น fixed string อยู่แล้ว

### F6 — LOW (theoretical): โค้ดที่ฉีดเข้า process ผ่าน environment ข้าม admission ได้

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:676, 761` พึ่ง `Array.prototype.includes` และ `createHash` ที่ patch ได้จากใน process ส่วน `build.mjs` ไม่ตรวจ `NODE_OPTIONS` หรือ `process.execArgv`
- หลักฐาน (probe B/C): record ที่เขียนเองและไม่ได้ admit + `NODE_OPTIONS=--import=<patch>` ได้ exit 0 และยังได้ exit 0 ภายใต้ `--permission`
- Preconditions: ต้องควบคุม environment หรือ command line ของ process ที่รัน gate ได้ ซึ่งเทียบเท่ากับการรันโค้ดได้ จึงอยู่นอก threat model ของ JS gate ล้วน และตรงกับ NQR129 §4 ที่ว่า automation ต้อง BLOCKED ถ้า CI บังคับ trusted boundary ไม่ได้
- ข้อเสนอแก้ (defense-in-depth): ใน verify-existing ให้ปฏิเสธเมื่อ `process.env.NODE_OPTIONS` ไม่ว่าง หรือ `process.execArgv.length > 0` และจับ reference ของ primitive ไว้ตอนโหลด module (เช่น `Set` ที่สร้างตอน load) ทั้งนี้ต้องระบุชัดใน runbook ว่า environment ของ operator อยู่ใน trusted boundary

### F7 — LOW: ความหมายของ JSON ใน record ที่ admit แล้วไม่ canonical ทั้ง duplicate key และ `revoked`

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:681, 764` (`JSON.parse` ใช้ค่าตัวหลังสุดเมื่อ key ซ้ำ) และ `:695`
- หลักฐาน (probe K): record ที่มี `"revoked":true,"revoked":false` หรือ `"disposition":"REQUEST_CHANGES","disposition":"ACCEPT"` ได้ `PASS_BUNDLE_SCOPE` คนที่อ่าน bytes อาจเห็นค่าแรก
- นอกจากนี้ `revoked` อยู่ใน bytes ที่ admit ด้วย hash จึงเปลี่ยนเป็น `true` หลัง admit ไม่ได้ การ revoke จริงต้องลบ hash ออกจาก source field นี้จึงให้ความรู้สึกว่าปลอดภัยโดยไม่มีผลจริง
- Preconditions: PM ต้อง admit record ที่ถูก craft มาโดยไม่ได้ตรวจแบบ canonical
- ข้อเสนอแก้: ก่อนเทียบ hash ให้ `JSON.stringify(JSON.parse(bytes))` แล้วต้องได้ bytes เดิม (บังคับ canonical และตัด key ซ้ำ) และบันทึก revocation เป็นการลบ hash ออกจาก admission set หรือเป็น deny-list ใน reviewed source

## 4. สิ่งที่ตรวจแล้วว่ายังใช้ได้

- ถ้าไม่มีโค้ดผู้โจมตีใน process จะไม่มี PASS หรือ exit 0 โดยไม่มี admission: `ADMITTED_ACCEPTANCE_SHA256` เป็น `Object.freeze([])` และ ES module binding แก้จากผู้ import ไม่ได้ ไม่มี option, argument, env, field หรือ hash จาก caller ที่ขยายชุดนี้ได้ (probe A และเทสต์ smuggle `INVALID_DECISION_INPUT`)
- bytes ที่ไม่ได้ admit ไม่ถูก parse และไม่ถูกใช้กำหนดทิศทาง inspection (`:761`) ส่วนการเล่นกับ path ของ record (symlink ancestor, race หลัง open) ไม่มีผล เพราะ authority คือ SHA ของ bytes ที่อ่านได้จริง
- ค่า default ไม่มี options ยัง throw เสมอ build path ยัง spawn Next แล้ว BLOCKED และ verify-existing ไม่ spawn (probe C กับ control C2 ใต้ permission model) ไม่มี import `http`/`https`/`net`/`dns`/`tls`/`vm`/`worker_threads`/`fetch` ใน verifier, adapter, verify-origin-artifacts หรือ build.mjs (`origin-gate` ใช้ `isIP` เท่านั้น) และ JSDOM ใช้ค่า default คือไม่มี resources และไม่รัน script
- Argument parsing ของ `build.mjs:12-16` ใช้ตำแหน่งตายตัว ไม่มี fallback ห้ามรวมกับ `--production`/`--preview` และบังคับ absolute path ส่วน origin ต้อง explicit และผ่าน `validateOrigin` แล้วผูกกับ `record.productionOrigin` (trailing slash→BLOCKED)
- Option shapes: getter, key เกิน, `null`, path สัมพัทธ์ และ `.next` → BLOCKED ส่วน Proxy หรือ null-prototype ที่มีค่าเหมือนเดิมไม่ทำให้เกิดอะไรต่าง เพราะค่าถูกอ่านครั้งเดียวแล้ว type-check
- Legacy กับ adapter ตรวจ bytes เดียวกัน: ทุกไฟล์ที่ legacy อ่านต้องมี SHA ตรงกับ `artifactFull.rows` (`:583-589`) และ adapter พิสูจน์ว่าไฟล์บน disk ตรงกับ rows ชุดเดียวกัน ทั้งตอน walk แรกและตอน walk สุดท้าย (`inspect-turbopack-emission.mjs:958-968, 1051-1062`) โดย rows ต้อง hash ได้ `canonicalSha256` (`:329`) และ symlink ใน artifact→`NON_REGULAR_ARTIFACT_NODE` VIOLATION ความเท่ากันผ่าน hash นี้กันการสลับ directory ระหว่าง legacy กับ adapter ได้
- Identity ที่ adapter คืนเป็นการ echo `expectedInputs` (`inspect-turbopack-emission.mjs:907-917`) ดังนั้นการเทียบ identity ใน evaluator เป็น tautology ใน verify-existing การผูกจริงมาจาก STATIC_SUPPORTED (rows ตรงกับ bytes) ซึ่งยังใช้ได้ แต่ `sourceInventorySha256` และ `dependencySha256` เป็นค่าคงที่ของ profile ไม่ได้ hash ใหม่ (ผู้เขียนระบุไว้แล้ว)
- Evaluator: FAIL ชนะ BLOCKED ภายใน branch ที่ admit แล้ว, exception ทุกตัว→`INVALID_DECISION_INPUT` โดยไม่ echo, `BundleBoundaryError` ใช้ fixed code
- Test harness `stageBVerifierAdmitting` อยู่เฉพาะใน `verify-initial-bundle-boundary.test.mjs` ไม่มีโค้ด production อ้างถึง จึงไม่ใช่ทาง bypass ใน production (ปัญหาเชิงความหมายดู F1)

## 5. ข้อจำกัด

- จำลอง admission ด้วย in-process patch เพราะ PASS แบบถูกต้องทำไม่ได้ (F1) ผลของ F2/F4/F5/F7 จึงแสดงสิ่งที่จะเกิดหลังมี admission กลไกที่ถูกต้องจริงอาจเปลี่ยนเส้นทางโค้ดได้
- Permission model ของ Node 24 ไม่ได้จำกัด network การยืนยันว่าไม่มี network ใช้ code review/grep เท่านั้น
- ไม่ได้รีวิว grammar ของ adapter Stage A เชิงลึก (false negative ของ registration, Flight หรือ deferred loader) นอกเหนือจากที่เกี่ยวกับ trust boundary ของ Stage B
- ไม่มี emission จริงของ Next ไม่มี browser ไม่รัน eslint ใช้เฉพาะ fixture สังเคราะห์ที่ inert และไม่รัน JS ของ fixture
- Artifact และ copy สำหรับ probe อยู่ใน `review-stageb-sec/tmp`, `review-stageb-sec/project` และ `review-stageb-sec/circ` (มี symlink `node_modules` แบบอ่านอย่างเดียว)
