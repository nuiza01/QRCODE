# NQR-129 Stage B iteration 2 — Independent SECURITY re-review

วันที่ 2026-09-17 | Reviewer: SECURITY (อิสระ ไม่ได้เขียนโค้ด ไม่ได้ประสานกับ TL)
Candidate: `scratchpad/nqr-stageb-b2/project` (canonical5 ตามรายงานผู้เขียน `6866da8a…2126`)

## Verdict: **REQUEST_CHANGES**

การซ่อมแก้ F1, F3 (ส่วน legacy), F5 และ F7 ได้จริง ตอนนี้ PASS ใช้งานได้ด้วยการ admit record จริงในไฟล์ (ผมยืนยันด้วย CLI แล้ว exit 0) แต่การ normalize gate revision เปิดช่องใหม่ระดับ MEDIUM: โค้ดใด ๆ ที่ไม่มีอักขระ `]` วางไว้ใน declaration ของ admission ได้โดย gate revision ไม่เปลี่ยน ผมสาธิตการ admit ที่ caller เลือกผ่าน environment และ IIFE ที่ patch การตรวจ admission ทั้งสองแบบได้ exit 0 กับ record ที่เขียนเอง ส่วน static PDF check ยังพึ่งการค้น string marker ใน bytes ซึ่งหลบได้ง่าย (F2 แก้บางส่วน) และ runtime preload check หลบได้ด้วยการใส่ quote ใน `NODE_OPTIONS`

## 1. Identity

SHA-256 ตรวจก่อนและหลังงาน ตรงกับที่คาดทุกไฟล์ และทั้งห้าไฟล์เป็น mode 0444:

| File | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a |
| verify-initial-bundle-boundary.mjs | bf01b55e7e5ad8bd6796451191ed702a22cf139d213a422fca2d88696fb63246 |
| verify-initial-bundle-boundary.test.mjs | 9c5167a5b89452bfbe2b7256bb6d6c51e17fe799ecabafcfd090067050584ae3 |
| build.mjs | 96e128a143d00a3fc083340620889fd3a512fc4905078ad8d823f6fe86ea2ab0 |

Iteration 1 ยังไม่เปลี่ยน (verifier `e6a5df…`, build `ee66c8…`) ผม diff iteration 1→2 เอง ผลคือ adapter เปลี่ยนบรรทัดเดียว (`NON_REGULAR_ARTIFACT_NODE` จาก VIOLATION เป็น UNKNOWN) ส่วน verifier และ `build.mjs` อ่านใหม่ทั้งไฟล์ ไม่ได้แก้อะไรใน candidate root หรือ repo จริง probe ทั้งหมดทำบนสำเนาใน `review-stageb-b2-sec/{project,admit,regex,regex2}`

## 2. Commands ที่รันจริง (Node v24.14.1, TMPDIR=`review-stageb-b2-sec/tmp`)

| # | สิ่งที่รัน | ผล |
| --- | --- | --- |
| 0 | `node --test` 4 suite บนสำเนา `project/` | 276/276 pass |
| 1 | `probes/p-setup.mjs` สร้าง artifact สังเคราะห์แบบ inert 9 แบบ พร้อม record ตาม schema ใหม่ (canonical compact JSON, gateRevision จาก `readGateRevision()`, reviews ผูก revision) แล้ว admit 11 digest ลงใน `admit/` ด้วยรูปแบบหลายบรรทัดแบบเดียวกับเทสต์ของผู้เขียน | สร้างได้ |
| 2 | CLI `build.mjs --verify-existing` บนสำเนา pristine (admission ว่าง) | clean→exit1 `ACCEPTANCE_NOT_ADMITTED`; markerEntry→exit1 `STATIC_CHECK_FAILED` (`FORBIDDEN_INITIAL_MARKER`); flightPdf→exit1 NEEDS_REVIEW |
| 3 | CLI บนสำเนาที่ admit แล้ว | ตารางใน §4 |
| 4 | Runtime injection บนสำเนา pristine ด้วย record ที่เขียนเอง | ตารางใน N3 |
| 5 | `probes/p-regex.cjs` + `p-regex-rev.mjs` + CLI | ดู N1 |
| 6 | admitted clean ภายใต้ `NODE_OPTIONS="--permission --allow-fs-read=*"` | exit 0 ไม่มี spawn และไม่มี fs write ถูกปฏิเสธ ตัว `PRELOAD_FLAG` ไม่นับ `--permission` เป็น preload |

## 3. สถานะของ finding เดิม (F1–F7)

| Finding | สถานะ | หลักฐาน |
| --- | --- | --- |
| F1 admission กับ revision วนกลับกัน | **Fixed** (แต่เกิด N1) | `readGateRevision()` normalize declaration (`verify-initial-bundle-boundary.mjs:507-508, 844-855`) สำเนาที่ admit แล้วได้ revision เท่าเดิม และ CLI จริงได้ exit 0 กับ `clean` |
| F2 ไม่มี static PDF deferral | **Partially fixed** | chunk ที่ Flight preload (ทั้งใน HTML และใน chunk), `modulepreload` และ `nomodule` ที่มี `jsPDF` → FAIL ทั้งหมด แต่ `"jsPDF"` → **exit 0** (N2) และยังไม่มีการจำแนก PDF |
| F3 violation ถูกลดเป็น BLOCKED | **Fixed สำหรับ legacy marker, partial สำหรับ startup scan** | markerEntry + record ไม่ admit → `STATIC_CHECK_FAILED` แต่ flightPdf + record ไม่ admit → NEEDS_REVIEW (N4) |
| F4 TOCTOU bundle↔origin | **Mostly fixed** | re-verify หลัง origin check (`build.mjs:25-27`) ช่องที่เหลือคือเปลี่ยนแล้วเปลี่ยนกลับ ผู้เขียนระบุไว้เอง (N5) |
| F5 error echo path | **Fixed ใน verify-existing** | noRobots → `NQR_ORIGIN_ARTIFACT_CHECK_FAILED` ไม่มี path ส่วน build path เดิมยัง echo ดิบ (ไม่เปลี่ยนตามเจตนา) |
| F6 NODE_OPTIONS preload | **Partially fixed / ineffective** | `--import=` แบบไม่มี quote ถูกจับ แต่แบบมี quote กับ `--experimental_loader` หลุด → exit 0 (N3) |
| F7 duplicate key / `revoked` | **Fixed** | record ที่ admit แล้วแต่ pretty-print หรือมี key ซ้ำ → `INVALID_ACCEPTANCE_RECORD` และลบ `revoked` แล้ว |

## 4. Matrix ของ CLI บนสำเนาที่ admit แล้ว

| Artifact | ผล |
| --- | --- |
| clean | **exit 0** PASS |
| flightPdf (HTML Flight `I` preload pdf.js มี `jsPDF`) | exit1 `FORBIDDEN_STARTUP_MARKER` |
| flightInChunk (Flight push อยู่ใน entry.js) | exit1 `FORBIDDEN_STARTUP_MARKER` |
| modulepreload | exit1 `FORBIDDEN_INITIAL_MARKER,FORBIDDEN_STARTUP_MARKER` |
| nomodule script | exit1 `FORBIDDEN_INITIAL_MARKER,FORBIDDEN_STARTUP_MARKER` |
| escapedMarker (Flight preload, `t.v("jsPDF")`) | **exit 0** PASS |
| deferredPdf (reviewed deferred loader → pdf.js) | exit 0 (ตั้งใจตาม policy) |
| markerEntry | exit1 FAIL |
| noRobots | exit1 `NQR_ORIGIN_ARTIFACT_CHECK_FAILED` |
| markerEntry, record ไม่ admit | exit1 `STATIC_CHECK_FAILED` |
| flightPdf, record ไม่ admit | exit1 **NEEDS_REVIEW** (N4) |
| clean, pretty JSON (admit แล้ว) / key ซ้ำ (admit แล้ว) | exit1 `INVALID_ACCEPTANCE_RECORD` |

คำตอบคำถามเรื่อง reachability: Flight ที่อยู่ในไฟล์ chunk, `modulepreload` และ `nomodule` **ไม่** หลบ `startupReachableChunks` ได้ (`:596-619` นับ `flight-resolve-preload` จากทุก subject และนับ route edge ทุกแบบ `SCRIPT_ROOT`/`PRELOAD_DECLARATION`) จุดที่หลบได้คือตัว marker เอง (N2)

## 5. Findings ใน iteration 2

### N1 — MEDIUM (ใหม่): normalize gate revision ยกเว้นโค้ดใด ๆ ที่อยู่ใน admission declaration

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:507` `/^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[[^\]]*\]\);$/gm` และ `:854` ใช้ `[^\]]*` ซึ่ง match ข้ามบรรทัดและรับอักขระใดก็ได้ยกเว้น `]` source สองชุดจึงได้ `verifierLogicSha256` เท่ากันเมื่อต่างกันเฉพาะใน array literal นี้ แต่ array literal รับ expression อะไรก็ได้ รวม IIFE ที่มี statement ด้วย
- หลักฐาน (`probes/p-regex.cjs`, `p-regex-rev.mjs`):
  - `regex/`: `Object.freeze([\n  process.env.NQR_ADMIT_SHA256,\n]);` → revision เท่ากับ pristine (`true`) ไม่ตั้ง env → exit1 ตั้ง `NQR_ADMIT_SHA256=<sha ของ record ที่เขียนเอง>` → **exit 0** คือการ self-approval ที่ environment เลือกได้ ซึ่ง §4 ห้ามไว้ชัด
  - `regex2/`: `Object.freeze([\n  (() => { …defineProperty(Array.prototype, "includes", …) … })(),\n]);` → revision เท่ากับ pristine (`true`) และ record ที่เขียนเองได้ **exit 0**
- คำถามอื่นที่ได้รับมา: ถ้ามี declaration ที่ match เกินหนึ่งจุด (เช่นบรรทัดเดียวกันอยู่ใน comment หรือ string) → `declarations.length !== 1` → throw → BLOCKED (fail-closed) ถ้าพยายามให้ match เริ่มจาก comment แล้วลากไปถึง declaration จริง bytes ที่อยู่นอก match ก็ต้องเหมือน reviewed prefix/suffix ทุกไบต์ อิสระที่ได้จริงจึงมีแค่ภายในวงเล็บ ซึ่งพอแล้วสำหรับรันโค้ด
- Preconditions: ต้องมีการแก้ source ที่ admission declaration การแก้แบบนี้คือเส้นทาง "เปลี่ยนเฉพาะข้อมูล" ของ PM ที่ออกแบบมาไม่ให้ต้อง TL/SEC review ซ้ำ และ `reviewedGateRevisionSha256` ของ reviewer ยังตรง การผูก revision จึงไม่จับการเปลี่ยน logic แบบนี้ ผู้รีวิว diff ต้องสังเกตเอง
- ข้อเสนอแก้: ให้ normalize ได้เฉพาะรูปแบบข้อมูลล้วน เช่น `^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[(?:\n  "[a-f0-9]{64}",)*\n?\]\);$` และถ้า declaration ไม่ตรงรูปนี้ให้ throw ดีกว่านั้นคือ parse ด้วย acorn แล้วบังคับว่า element ทุกตัวเป็น string literal hex 64 ตัว หรือย้าย admission ไปไฟล์ JSON ที่อ่านเป็นข้อมูลล้วน (canonical) เพิ่ม mutation test ที่ใส่ `process.env` และ IIFE ใน list แล้วคาดว่า revision ต้อง throw หรือเปลี่ยน

### N2 — MEDIUM (F2 ต่อจากเดิม, แก้บางส่วน): static PDF check พึ่ง marker ใน bytes และหลบได้ด้วย escape

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:858-870` (`bytes.includes(marker)`) และ `:651-675` adapter ยังไม่จำแนก module/chunk ที่เฉพาะ PDF
- หลักฐาน: `escapedMarker` คือทุก route preload `pdf.js` ผ่าน Flight และ module 8 export `"jsPDF"` (literal value คือ `jsPDF` แต่ bytes ไม่มี marker) → admitted CLI **exit 0**
- Preconditions: ต้องมี record ที่ admit แล้วซึ่ง timing evidence ผิดหรือไม่ครบ ผลคือเงื่อนไขที่ §4 ข้อ 2 และ §5 ต้องการ ("Marker disappearance under minification cannot be a PASS predicate", "Eager proven PDF load is FAIL") ยังไม่มีแบบ static ผู้เขียนระบุข้อจำกัดนี้ไว้แล้วใน §4 ของรายงาน
- ข้อเสนอแก้: จำแนก PDF-specific module/chunk ด้วย identity ใน reviewed profile แล้วให้ FAIL เมื่อ reachable ตอน startup และ BLOCKED เมื่อจำแนกไม่ได้ หรือระบุชัดใน spec/acceptance ว่า PDF deferral พึ่ง browser evidence ที่ PM admit เท่านั้น และให้ TL/PM ยอมรับความเสี่ยงนี้เป็นลายลักษณ์อักษร

### N3 — LOW (F6 ต่อจากเดิม): runtime preload check หลบได้ง่าย

- ตำแหน่ง: `build.mjs:9, 13`
- หลักฐาน (สำเนา pristine, record ที่เขียนเองและไม่ admit):

| NODE_OPTIONS | ผล |
| --- | --- |
| `--import=patch.mjs` | exit1 `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` |
| `"--import=patch.mjs"` (มี quote) | **exit 0** |
| `"--require=patch.cjs"` (มี quote) | **exit 0** |
| `--experimental_loader=loader-hook.mjs` (underscore; hook แก้ source ของ verifier ใน memory ขณะที่ `readGateRevision` อ่านไฟล์บน disk) | **exit 0** |

- สาเหตุ: regex ต้องมี `^` หรือ whitespace นำหน้า และไม่รู้จักว่า Node ยอมให้ใช้ `_` แทน `-` ในชื่อ option นอกจากนี้ยังมีทางอื่นที่ไม่ได้ตรวจ เช่น `--openssl-config` ที่โหลด provider หรือ `--inspect` (theoretical)
- Preconditions: ต้องควบคุม environment ของ process gate ได้ ซึ่งเทียบเท่ากับการรันโค้ดได้ ผู้เขียนระบุว่าเป็น defense in depth
- ข้อเสนอแก้: ใน verify-existing ให้ fail เมื่อ `NODE_OPTIONS` ไม่ว่างเลย (ไม่ต้องใช้ regex) และเมื่อ `process.execArgv.length > 0` และระบุใน runbook ว่า environment ของ operator อยู่ใน trusted boundary

### N4 — LOW (F3 ต่อจากเดิม): marker ใน startup-reachable chunk ไม่เป็น FAIL เมื่อ record ไม่ admit หรือ adapter ไม่ SUPPORTED

- ตำแหน่ง: `verify-initial-bundle-boundary.mjs:809-810` (startup scan อยู่ใน `if (record)` และต้อง STATIC_SUPPORTED) และ `:887-895` (`legacyOnly` ไม่มี startup scan)
- หลักฐาน: flightPdf + record ที่ไม่ admit → `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` ขณะที่ admit แล้ว → FAIL
- ผลกระทบ: exit ยังเป็น 1 แต่ violation ที่มี edge `flight-resolve-preload` พิสูจน์ได้ยังถูกแสดงเป็น "รอหลักฐาน" ในกรณีที่ record ไม่ admit
- ข้อเสนอแก้: ถ้าจะรัน adapter ก่อน admission ได้ ต้องไม่ใช้ expectedInputs ที่ยังไม่ admit ทางที่พอทำได้คือเขียนใน reason หรือเอกสารให้ชัดว่า FAIL ของ startup marker ต้องมี record ที่ admit แล้ว หรือทำ reachability scan ขั้นต่ำด้วย parser ของ legacy สำหรับ Flight `I` record

### N5 — LOW (F4 ต่อจากเดิม): ช่องเปลี่ยนแล้วเปลี่ยนกลับระหว่างสองรอบ bundle check

- ตำแหน่ง: `build.mjs:18-27` และ `verify-origin-artifacts.mjs:65-73` (`readFile` ตาม symlink ได้)
- สถานะ: อาศัยเหตุผลจากโค้ดและข้อจำกัดที่ผู้เขียนระบุเอง ไม่ได้สาธิตซ้ำ Precondition คือมีสิทธิ์เขียน artifact พร้อม timing ที่แม่น ให้ origin check อ่าน bytes อีกชุดแล้วคืนค่าเดิมก่อน re-verify
- ข้อเสนอแก้ (ไม่บังคับ): ให้ origin check ใช้ buffer ที่ adapter อ่านและ admit แล้ว

## 6. สิ่งที่ตรวจแล้วว่ายังใช้ได้

- **Canonical JSON (`:782-785`) sound:** key ซ้ำ, whitespace, `1.0`, `\u` escape และ key ที่เป็นตัวเลขซึ่งถูกเรียงใหม่ ถูกปฏิเสธทั้งหมด (fail-closed) ถ้ามี BOM จะถูกตัดโดย `TextDecoder` แต่ SHA ยังผูกกับ bytes รวม BOM ซึ่งไม่เป็นปัญหา ส่วน `__proto__` → `exactKeys` ปฏิเสธ แม้ `decideExistingArtifact:898` จะ parse bytes ที่ admit แล้วโดยยังไม่ตรวจ canonical เพื่อส่งให้ adapter แต่ evaluator จะ BLOCK ภายหลังอยู่ดี
- **Fixed-code errors (`build.mjs:45-50`):** พิมพ์เฉพาะ `BundleBoundaryError` หรือข้อความรูป `^NQR_[A-Z_]+$` และ `reasonCodes` มาจาก enum ของ evaluator เท่านั้น ไม่พบทางไปถึง exit 0 ผ่าน catch เพราะ `verifyExisting` ต้องได้ `verifyInitialBundleBoundary` resolve (ซึ่งเกิดได้เฉพาะ PASS) สองครั้งและ origin check ผ่าน
- **ไม่มี injection ในสำเนา pristine:** record ที่เขียนเองยังได้ exit 1 เสมอ ค่า default ไม่มี options ยัง throw และ build path ย้าย import ไปหลัง spawn แล้ว ใน PASS path ภายใต้ permission model ไม่มี child process หรือ fs write และไม่พบ network import
- `readGateRevision` ครอบคลุม adapter, build.mjs, origin-gate, verify-origin-artifacts และ verifier logic ถ้ามี declaration ซ้ำ → BLOCKED ส่วน reviews ผูก `sha256(JSON.stringify(gateRevision))`
- Legacy inspector รันก่อน admission (ไม่ parse bytes ที่ยังไม่ admit) และ output เป็น reason code เท่านั้น
- `LEGACY_CLOSURE` ใช้ `Object.hasOwn` บน object ที่ frozen แล้ว และ timing/route set บังคับให้ตรงพอดีต่อ scenario

## 7. ข้อจำกัด

- ใช้เฉพาะ fixture สังเคราะห์ที่ inert ไม่มี emission จริงของ Next (adapter ยังให้ UNKNOWN กับ `turbopack-*` จึงยังไม่มีทาง PASS บน artifact จริง)
- ไม่ได้รัน mutation suite 39 แบบของผู้เขียนซ้ำ และไม่ได้รีวิว grammar ของ adapter เชิงลึกนอกจากบรรทัดที่เปลี่ยน
- Permission model ของ Node 24 ไม่ครอบคลุม network การยืนยันว่าไม่มี network ใช้ code review เท่านั้น ไม่ได้สาธิต N5 และ vector แบบ `--openssl-config`/`--inspect`
- Probe และสำเนาอยู่ใน `review-stageb-b2-sec/probes`, `tmp`, `project`, `admit`, `regex`, `regex2` (`node_modules` เป็น symlink อ่านอย่างเดียว)
