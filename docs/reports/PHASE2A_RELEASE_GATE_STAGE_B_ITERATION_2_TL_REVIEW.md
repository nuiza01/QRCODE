# NQR-129 Stage B iteration 2 — Independent TL re-review

วันที่ 2026-09-17 (Asia/Bangkok) | Reviewer: TL (อิสระ ไม่ได้เขียนโค้ด และไม่ได้ประสานงานกับ SECURITY)
Review ก่อนหน้า: `review-stageb-tl/TL_REVIEW.md` SHA `4330e50ecfa8983e5396f5574e2cdc3936c8bdff12382c4ac5b6863266eb4b34`

## Verdict: **REQUEST_CHANGES**

Iteration 2 แก้ปัญหาหลักของ iteration 1 ได้จริงและตรวจซ้ำได้ ได้แก่ admission cycle, violation ที่เคยถูกซ่อนเป็น BLOCKED, per-scenario route set, symlink, reason code, import order และ mutation coverage ตอนนี้เทสต์ PASS ใช้ไฟล์ที่เขียนลง disk จริงและ CLI จริง

แต่ **การแก้ F1 เปิดช่องใหม่ระดับ P1 (N1)**: regex ที่ใช้ normalize บรรทัด `ADMITTED_ACCEPTANCE_SHA256` ยอมให้มีโค้ดใดก็ได้ในวงเล็บที่ไม่มีอักขระ `]` โค้ดนั้นจึงถูกลบออกจาก `verifierLogicSha256` ด้วย ผมสาธิตแล้วว่าการแก้ที่ดูเหมือน "admission-only" สามารถ (ก) ดึงรายการ admission จาก environment หรือ (ข) patch `Array.prototype.includes` ได้ โดย gate revision ยังเท่ากับ revision ที่ reviewer รับรองทุกไบต์ ผลคือ record ที่เขียนเองได้ exit 0 ผ่าน CLI จริง ซึ่งเป็นการ bypass แบบที่ NQR129 §4 ห้ามไว้ และทำให้ข้อความของผู้เขียนว่า "admitting never changes the logic revision" กลายเป็นช่องโหว่แทนที่จะเป็นหลักประกัน

## 1. Identity check

| ไฟล์ (`nqr-stageb-b2/project/scripts/`) | ค่าที่คาดไว้ | ก่อน | หลัง | mode |
| --- | --- | --- | --- | --- |
| inspect-turbopack-emission.mjs | 5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab | ตรง | ตรง | 0444 |
| inspect-turbopack-emission.test.mjs | 11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a | ตรง | ตรง | 0444 |
| verify-initial-bundle-boundary.mjs | bf01b55e7e5ad8bd6796451191ed702a22cf139d213a422fca2d88696fb63246 | ตรง | ตรง | 0444 |
| verify-initial-bundle-boundary.test.mjs | 9c5167a5b89452bfbe2b7256bb6d6c51e17fe799ecabafcfd090067050584ae3 | ตรง | ตรง | 0444 |
| build.mjs | 96e128a143d00a3fc083340620889fd3a512fc4905078ad8d823f6fe86ea2ab0 | ตรง | ตรง | 0444 |

- `origin-gate.mjs` และ `verify-origin-artifacts.mjs` ใน root ใหม่ byte-identical กับ SOURCE (`cmp`)
- ส่วน adapter ใน iteration 2 เปลี่ยนเพียงบรรทัดเดียว (`:961` `VIOLATION`→`UNKNOWN`) และเทสต์ adapter ถูกปรับให้สอดคล้องหนึ่งบรรทัด
- หลังรีวิว SHA prefix ของ toolchain ที่ใช้ร่วมกันยังตรง (next package `dc243091…`, acorn `758cead0…`, parse5 `159187fd…`/`b825162a…`)
- ไม่ได้แก้อะไรใน candidate root หรือ repo จริง การทดลองทั้งหมดทำในสำเนาใต้ `review-stageb-b2-tl/{copy,gates}` (มี symlink `node_modules` แบบอ่านอย่างเดียว)

## 2. สิ่งที่รันจริง (Node v24.14.1, TMPDIR = `review-stageb-b2-tl/tmp`)

| # | Command | ผล |
| --- | --- | --- |
| 1 | `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test` สี่ suite บน candidate | **276/276 pass**, fail/skip/todo = 0 (`run-candidate-1.log` sha prefix `e01e5838`) |
| 2 | `node node_modules/eslint/bin/eslint.js` ห้าไฟล์ | exit 0 |
| 3 | `probes/p1-admission.mjs` (admission cycle + declaration abuse, real CLI) | `p1-admission.log` (`c5dac658`) |
| 4 | `probes/p2-semantics.mjs` (F2/F4/F6 + startup scan) | `p2-semantics.log` (`e64a5329`) |
| 5 | `probes/mutants.mjs` 23 mutant ต่างหากบนสำเนา แต่ละตัวรัน `verify-initial-bundle-boundary.test.mjs` | `mutants.log` (`5f79bddc`): killed 15, survived 8 |

ไม่มี install, build, typegen, server, browser, network, DB หรือ git write หลังรันเสร็จลบ artifact ชั่วคราวและ mutant dir แล้ว

## 3. สถานะของ finding เดิม (F1–F10)

| Finding | สถานะ | หลักฐาน |
| --- | --- | --- |
| F1 P1 admission cycle | **แก้แล้ว** (แต่ทำให้เกิด N1) | `p1-admission.log`: gate copy ที่ admit r1 ได้ revision เท่ากับ candidate, `inProcess RESOLVED PASS_BUNDLE_SCOPE`, CLI `exit=0` หลัง admit r2 เพิ่ม r1 ยัง PASS เทสต์ `test.mjs:814-833` (`withAdmittedGate`) เขียนไฟล์ลง disk แล้ว import ผ่าน file URL จริง และ `:906-909` รัน CLI จริงได้ exit 0 ไม่มีการแก้ใน memory แล้ว |
| F2 P2 violation ถูกซ่อน | **แก้แล้ว** (มีข้อสังเกต N2) | `A.missingRecord`/`A.unadmitted`/`A.cli` → `NQR_BUNDLE_STATIC_CHECK_FAILED` ; `B_markerExtraKey` → FAIL กลไก: `verify:886-901` (`legacyOnly`) และ `:796-797` |
| F3 P2 schema ไม่ครบ §4 | **แก้เกือบทั้งหมด** | `:541-548, 677-716`: เพิ่ม `artifactFullSha256`, `collectedAt`, `localOrigin`, `evidenceBundleSha256`, `observationsSha256` และ pre/post identity ต่อ scenario และ `reviewedGateRevisionSha256` gate revision ครอบคลุม build wrapper กับ origin modules แล้ว (`:844-856`) ที่เหลือเป็น nit ใน N4 |
| F4 P2 coverage แบบ union | **แก้แล้ว** | `:517-524, 697` ; `C_pdfOnlyLanding` → BLOCKED `TIMING_EVIDENCE_INCOMPLETE` และมีเทสต์ `pdfOnlyLanding`, `pdfIncludesLandings`, `duplicateRoute`, `routeOutsideProfile` |
| F5 P2 mutation survivors | **แก้เกือบทั้งหมด** | 12 ตัวที่รอดใน iteration 1 ที่ยังใช้ได้ ถูก kill ครบ (M01–M08, M10–M13) ยกเว้น M09 read race ; mutant ใหม่ที่รอดดู N3 |
| F6 P3 symlink → FAIL | **แก้แล้ว** | adapter `:961` เป็น UNKNOWN ; `D_symlinkAdded` → BLOCKED `ADAPTER_STATIC_UNKNOWN` |
| F7 P3 TOCTOU origin | **แก้บางส่วน** (ระดับที่ยอมรับได้) | `build.mjs:18-27` รัน bundle gate ซ้ำหลัง origin check (M14 ถูก kill) กรณีที่ไฟล์ถูกเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่านสองรอบยังตรวจไม่ได้ ข้อนี้ประกาศไว้แล้วตาม C4 |
| F8 P3 import order | **แก้แล้ว** | `build.mjs:61-67` import verifier หลัง spawn ; harness `events` = `["spawn","verifier"]` (`test.mjs:1255`) |
| F9 P3 reason codes หาย | **แก้แล้ว** | `verify:50-56, 928-929` ; `build.mjs:47-49` ; `A.cli stderr="NQR_BUNDLE_STATIC_CHECK_FAILED\nreasons: …"` |
| F10 P3 per-class mapping | **แก้บางส่วน** (ยอมรับได้) | `LEGACY_CLOSURE` (`:530-536`) เป็นคำอธิบายราย class แต่ทุก class ยังปิดด้วย predicate เดียวกันคือ `STATIC_SUPPORTED` ทั้งก้อน เทสต์ `:1122-1138` ยืนยันพฤติกรรมนี้ เป็นเอกสารตามที่ §4 ขอ แต่ไม่ได้ผูกกับ diagnostic เฉพาะของ adapter ราย class ไม่นับเป็น blocker |

## 4. Findings ใหม่

### N1 — P1: regex normalize ของ admission declaration ยอมรับโค้ดใดก็ได้ ทำให้ logic ที่ bypass gate ซ่อนอยู่ใน gate revision เดิมได้

**ตำแหน่ง**
- `scripts/verify-initial-bundle-boundary.mjs:507`: `/^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[[^\]]*\]\);$/gm`
- `:847-854`: นับว่า match หนึ่งครั้ง แล้วแทนด้วยรายการว่างก่อน hash เป็น `verifierLogicSha256`
- `:778`, `:895`: ใช้ `ADMITTED_ACCEPTANCE_SHA256.includes(...)` ตอน runtime โดยไม่ตรวจว่าสมาชิกเป็น hex literal

**กลไก**: `[^\]]*` match ได้ทุกอักขระยกเว้น `]` รวมทั้ง newline ดังนั้น spread, IIFE, การอ่าน `process.env` หรือการ assign `Array.prototype` ที่ไม่มี `]` จะ match ได้ทั้งหมด และถูก normalize เป็น `[]` ก่อน hash `verifierLogicSha256`, `reviewedGateRevisionSha256` ที่ reviewer รับรอง และ `record.gateRevision` จึงยังเหมือนเดิมทุกไบต์ ทั้งที่ logic ของ admission ถูกเปลี่ยนไปแล้ว

**Reproduction** (`probes/p1-admission.mjs`, `p1-admission.log`) ทำบน gate copy ที่แก้เฉพาะบรรทัดนี้ ใช้ record ที่เขียนเองและ digest ไม่อยู่ใน source ตอนรัน CLI จริง `build.mjs --verify-existing` ไม่มี execArgv และไม่มี `NODE_OPTIONS`:
```
abuse-env:  export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([...(process.env.NQR_ADMIT || "").split(",")]);
abuse-env.revisionEqualsCandidate true
abuse-env.cli.noEnv   exit=1 stderr="NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED"
abuse-env.cli.withEnv exit=0 stdout="[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval"
abuse-iife: Object.freeze([(() => { …Array.prototype.includes = function (v) {…}; return "0".repeat(64); })()]);
abuse-iife.revisionEqualsCandidate true
abuse-iife.cli.anyRecord exit=0 …PASS…
```

**ผลกระทบ**: NQR129 §4 ห้าม "environment-selected self-approval" และกำหนดให้ gate revision ผูกกับโค้ดที่ผ่านการรีวิว design ของ iteration 2 คาดว่า PM จะแก้บรรทัดนี้ทุกครั้งที่ admit ซึ่งเป็นการแก้ที่ reviewer มักมองว่าเป็นแค่ data ดังนั้นบรรทัดนี้คือจุดที่ต้องเข้มที่สุด แต่ตอนนี้กลับเป็นบรรทัดเดียวที่ gate revision มองไม่เห็นการเปลี่ยน logic ช่องนี้ต้องมีสิทธิ์เขียน source จึงไม่ใช่ช่องสำหรับผู้เรียกทั่วไป แต่ทำให้กลไกที่ออกแบบมาเพื่อจับ logic drift ใช้ไม่ได้ในจุดสำคัญที่สุด เทสต์ที่มีอยู่ไม่ตรวจข้อนี้ (mutant M26 `declarations.length < 1` ก็รอด)

**ข้อเสนอแก้** (ยังอยู่ในขอบเขตห้าไฟล์)
1. ใช้ grammar ที่เข้มงวดเฉพาะ literal เช่น `^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[(?:\n  "[a-f0-9]{64}",)*\n?\]\);$` (ไม่มีช่องว่าง, comment, expression หรือ spread) และให้เป็น string เดียวกันในเทสต์
2. ตอน runtime ให้ parse digest จาก source text ด้วย grammar เดียวกัน แล้วตรวจว่า `ADMITTED_ACCEPTANCE_SHA256` deep-equal กับค่าที่ parse ได้ และทุกสมาชิกผ่าน `HEX_64` ถ้าไม่ตรงให้ BLOCKED `UNREADABLE_GATE_REVISION`
3. ใช้ `Set` หรือ function ที่ capture ไว้ตอนโหลด module แทน `Array.prototype.includes` ตามที่ SEC เสนอไว้ก่อนหน้า
4. เพิ่ม negative test บนไฟล์ที่เขียนลง disk: env-computed list, IIFE, สองบรรทัด declaration, สมาชิกไม่ใช่ hex, comment ในวงเล็บ ทุกกรณีต้องได้ `UNREADABLE_GATE_REVISION` และต้องไม่ exit 0

### N2 — P3: startup marker scan ทำงานเฉพาะเมื่อ adapter ได้ STATIC_SUPPORTED จึงไม่เคยทำงานบน Turbopack artifact จริง

**ตำแหน่ง**: `verify:809-810` ; adapter `:1025-1028` จัด `static/chunks/turbopack-*` เป็น UNKNOWN เสมอ
**Reproduction** (`p2-semantics.log`): ทุก route มี Flight preload ไปยัง `pdf.js` ที่มี `jsPDF`
```
E_eagerFlightPdf_supported             NQR_BUNDLE_STATIC_CHECK_FAILED [FORBIDDEN_STARTUP_MARKER]
E_eagerFlightPdf_adapterUnknown        NQR_BUNDLE_NEEDS_EMISSION_REVIEW [ADAPTER_STATIC_UNKNOWN]   (เพิ่ม turbopack-runtime.js)
E_eagerFlightPdf_otherUnknownStatement NQR_BUNDLE_NEEDS_EMISSION_REVIEW [ADAPTER_STATIC_UNKNOWN]
E_startupReachable ["static/chunks/entry.js","static/chunks/pdf.js"]   (graph ระบุ pdf.js ได้แล้วแม้ UNKNOWN)
```
Edge ของ Flight preload เป็น literal ที่พิสูจน์ได้แม้ส่วนอื่นของ graph จะเป็น UNKNOWN แต่ผลกลับเป็น BLOCKED ขณะที่ legacy marker ในกรณีคล้ายกันได้ FAIL และบน artifact จริงที่มี runtime chunk ทุกครั้ง `FORBIDDEN_STARTUP_MARKER` จะไม่มีทางเกิดขึ้น ตัว gate ยัง fail closed (exit 1) และ §5 ของ spec ระบุว่า marker เป็นหลักฐานเสริม จึงให้ P3 **ข้อเสนอแก้**: เมื่อ record ถูก admit ให้รัน scan บน edge ที่พิสูจน์แล้ว (HTML roots และ Flight preload) โดยไม่ขึ้นกับ `staticStatus` แล้วให้ FAIL ชนะ UNKNOWN หรือถ้าไม่แก้ ให้ระบุข้อจำกัดนี้ในรายงาน

### N3 — P3: mutant ที่ยังรอด (test gaps)

จาก `mutants.log`:

| Mutant | ความหมาย | หมายเหตุ |
| --- | --- | --- |
| M17 `startupReachableChunks` ไม่ตาม static import จาก inline module script | derivation ส่วนนี้ไม่มีเทสต์ | รายงานผู้เขียนอ้างว่าครอบคลุม "their static imports" |
| M18 ไม่ตาม static import ต่อเป็นทอด (`reachable.has(edge.from)`) | ไม่มีเทสต์ | เหมือน M17 |
| M26 `declarations.length < 1` (ยอมสอง declaration) | ไม่มีเทสต์ | เกี่ยวกับ N1 |
| M19 ไม่ตรวจรูปแบบ ISO ของ `collectedAt` | ไม่มีเทสต์ | |
| M03b ไม่ตรวจ `browser.version` | ไม่มีเทสต์ | |
| M09 ไม่ตรวจ read race ของ `readBoundFile` | ไม่มีเทสต์ | admission ใช้ hash อยู่แล้ว น้ำหนักต่ำ |
| M22 `PRELOAD_FLAG` ไม่จับ `--require/-r` | เทสต์มีแค่ `--import` | defense in depth |
| M27 ลบการเทียบความยาว startup scan | ส่วนใหญ่เป็น equivalent mutant (index ที่ขาดยังได้ INCOMPLETE) | ไม่ต้องแก้ |

M17/M18 ควรมีเทสต์: HTML `<script type="module">import "/_next/static/chunks/a.js"</script>` → `a.js` import `b.js` ที่มี marker → `FORBIDDEN_STARTUP_MARKER` (ตั้ง fixture ให้ legacy ไม่เห็น) ส่วนที่เหลือเป็น negative variant แบบบรรทัดเดียว

### N4 — P3: nit ของ evidence validation

- `isoInstant` (`verify:566-569`) ยอมรับวันที่ไม่มีจริง: `Date.parse("2026-02-30T00:00:00Z")` คืนค่าตัวเลขได้ (ตรวจแล้ว)
- `LOCAL_ORIGIN` (`:541`) ยอม port ถึง 99999 ทั้งที่ port สูงสุดคือ 65535
- ถ้ารัน `--verify-existing` พร้อม execArgv ใด ๆ (เช่น `node --disable-warning=… scripts/build.mjs`) จะถูกปฏิเสธเป็น `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` เป็นการเลือกที่เข้มโดยเจตนา แต่ควรระบุใน usage/runbook

## 5. สิ่งที่ตรวจแล้วว่าถูกต้องใน iteration 2

- **ไม่มี cycle แล้ว**: admission หลายครั้งไม่เปลี่ยน revision และ PASS ผ่าน CLI จริง (หลักฐานใน §3 F1)
- **เทสต์ใช้ path จริงบน disk**: `withAdmittedGate` copy module ห้าไฟล์ แก้เฉพาะ admission ในไฟล์ แล้ว import ผ่าน `pathToFileURL` ส่วน `readGateRevision` อ่านไฟล์เดียวกับที่รันอยู่ (`test.mjs:896` เทียบ revision) harness ที่ใช้ `data:` URL เหลือเฉพาะเทสต์ลำดับของ wrapper (`:1140-1258`) ซึ่งมี CLI จริงรองรับอีกชั้น (`:906`, `:1260`)
- **Startup reachability** (`verify:596-619`): roots คือ edge `route:` ที่มี `SCRIPT_ROOT/PRELOAD_DECLARATION` (รวม nomodule และ modulepreload) และ `flight-resolve-preload` ทุกตัว closure ตาม static import (`condition === undefined`) จาก chunk ที่ reachable หรือจาก inline script ส่วน `explicit-chunk-load` ของ deferred thunk ไม่ถูกนับ ซึ่งถูกต้องตาม policy ผมไม่พบ under-approximation ภายใน grammar ที่ adapter รองรับ: runtime metadata `otherChunks` ถูกตั้งเป็น UNKNOWN (`adapter:786-788`) จึงไม่มีทางถึง scan ด้วย SUPPORTED ส่วนการนับเกิน (เช่น Flight data ใน chunk ที่ deferred) จะทำให้ fail ไปทางปลอดภัย
- Startup scan อ่านไฟล์แบบ bound และผูก SHA กับ manifest ที่ admit (M23 killed) Flight preload root มีเทสต์ (M16 killed) และมี control ของ deferred ที่ PASS
- Record ต้องเป็น canonical compact JSON (M11 killed) และ `revoked` ถูกลบออก เพราะการ revoke คือการเอา digest ออก ซึ่งสอดคล้องกัน
- Legacy marker ได้ FAIL ในทุกสถานะของ record ; adapter VIOLATION ได้ FAIL ก่อนตรวจ admission ; FAIL ชนะ BLOCKED (`violationNotHidden`)
- Build path ปกติ: parser ของ argument เดิม, spawn แล้ว verifier แบบไม่มี options (BLOCKED เสมอ) ; `verifyInitialBundleBoundary` แบบไม่มี options มีตรรกะเหมือนต้นฉบับ
- verify-existing: ไม่ spawn, พิมพ์เฉพาะ fixed code, error ของ origin/filesystem ถูกแมปเป็น `NQR_ORIGIN_ARTIFACT_CHECK_FAILED`/`NQR_VERIFY_EXISTING_FAILED` และ output ไม่มี absolute path (`test.mjs:943`, `:1222-1228`)
- lint exit 0 และ 276/276

## 6. ข้อจำกัดของรีวิวนี้

- ยังเป็น fixture สังเคราะห์ทั้งหมด ไม่มี Turbopack emission จริง, browser หรือ build ข้อสังเกตเรื่อง gate ยัง PASS บน artifact จริงไม่ได้ (runtime chunk เป็น UNKNOWN) ยังเป็นข้อจำกัดของ Stage A ที่ผู้เขียนรับไว้แล้ว
- ไม่ได้รัน mutant ชุด 39 ตัวของผู้เขียน (`mutants.cjs` ไม่อยู่ใน frozen root) ผลนี้มาจาก mutant ชุดของผมเอง 23 ตัว
- การประเมิน SEC F2 (predicate แบบ graph สำหรับ PDF) และ SEC F6 (NODE_OPTIONS) เป็นขอบเขตของ SECURITY ผมบันทึกเพียงว่า iteration 2 ใช้ marker scan (หลักฐานเสริมตาม §5) ไม่ใช่การจำแนก PDF แบบ graph
- ไม่ได้ทดสอบ race แบบ timing จริง
- เกณฑ์ severity เหมือนรีวิวก่อน: P1 = trust contract หลักของ gate ใช้ไม่ได้, P2 = ต้องแก้ก่อน integrate, P3 = ควรแก้หรือบันทึกไว้
