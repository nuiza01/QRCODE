# NQR-129 Stage B iteration 2 — ซ่อมตาม TL/SECURITY review

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-2

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำบน bytes ชุดนี้ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต: [TL review](PHASE2A_RELEASE_GATE_STAGE_B_TL_REVIEW.md) SHA `4330e50ecfa8983e5396f5574e2cdc3936c8bdff12382c4ac5b6863266eb4b34` และ [SECURITY review](PHASE2A_RELEASE_GATE_STAGE_B_SECURITY_REVIEW.md) SHA `243b2ab996c0d2b7fa6990ac4267c0a27c65530ce7e83e13b6e4ef68b9d48393` ทั้งคู่ได้ REQUEST_CHANGES บน canonical5 `3e5b8c60…a6f7` (iteration 1 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb/project`)

ไม่มี install/build/typegen/server/browser/network/DB/deploy/commit/push แก้เฉพาะห้าไฟล์ใน root ใหม่ `scratchpad/nqr-stageb-b2/project` หลังงาน SOURCE185 ยังเป็น `3b0c6a72…00df` และ `node_modules` ของ SOURCE ไม่มีไฟล์ถูกเขียน

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` |
| verify-initial-bundle-boundary.mjs | `bf01b55e7e5ad8bd6796451191ed702a22cf139d213a422fca2d88696fb63246` |
| verify-initial-bundle-boundary.test.mjs | `9c5167a5b89452bfbe2b7256bb6d6c51e17fe799ecabafcfd090067050584ae3` |
| build.mjs | `96e128a143d00a3fc083340620889fd3a512fc4905078ad8d823f6fe86ea2ab0` |

- Canonical5 `{sha256,path}`: **`6866da8a21c18d906e9a722d2fd821f7abce06b043bb94ad437f12ad4f162126`**
- Delta iteration1→2 `{after,before,path}`: `2388bdf63f7be2611e0d0fbbd761f06c3da76beb1d1a65382f01b3d392f4c05d`
- Diff iteration1→2 ทั้งห้าไฟล์อยู่ในภาคผนวก SHA `bdf7478c259410e929282c86d44c30a6359fcb4266531664e8fa8de29236c479` (1,436 บรรทัด) ทดสอบแล้วว่า `patch -p1` บน iteration 1 ได้ hash ตรงทั้งห้าไฟล์

## 2. Disposition ของ finding

| Finding | การแก้ใน iteration 2 |
| --- | --- |
| TL F1 / SEC F1 — admission กับ gate revision วนกลับหากัน (P1) | Gate revision ใช้ `verifierLogicSha256` ซึ่ง hash ไฟล์ verifier หลัง normalize บรรทัดประกาศ `ADMITTED_ACCEPTANCE_SHA256` (ต้องพบบรรทัดเดียวพอดี) ให้เป็นรายการว่าง การ admit จึงไม่เปลี่ยน revision เพิ่ม `readGateRevision()` แบบ export เทสต์ใหม่ทำ admission ด้วยการเขียนไฟล์จริงในสำเนา แล้ว import ผ่าน file URL ไม่มีการแก้ใน memory ยืนยันว่า revision ของสำเนาเท่ากับต้นฉบับ, verifier ได้ `PASS_BUNDLE_SCOPE` และ **CLI จริง `--verify-existing` exit 0** เลือกวิธีนี้แทนการแยกไฟล์ admission ที่ TL เสนอ เพื่ออยู่ในขอบเขตห้าไฟล์ |
| TL F2 / SEC F3 — violation ถูกซ่อนเมื่อไม่มี/ไม่ admit/record invalid | Wrapper รัน legacy inspector ก่อนเสมอ ถ้า record อ่านไม่ได้, ไม่ถูก admit หรือ invalid แล้วพบ marker → FAIL (`NQR_BUNDLE_STATIC_CHECK_FAILED`) ส่วน evaluator ตรวจ legacy marker นอก branch ของ record |
| SEC F2 — ไม่ได้ตรวจ PDF deferral แบบ static; chunk ที่ Flight preload ไม่ถูกสแกน | เพิ่ม `startupReachableChunks(inspection)` จาก adapter graph (HTML script/preload roots, Flight preload และ static import ต่อจากนั้น ไม่นับ deferred chunk load) wrapper อ่าน chunk เหล่านั้นแบบ bound (O_NOFOLLOW, realpath, stable identity) evaluator ผูก SHA กับ manifest ที่ admit ถ้าเจอ marker → FAIL `FORBIDDEN_STARTUP_MARKER` เทสต์: marker ใน chunk ที่ Flight preload → FAIL; chunk เดียวกันที่โหลดผ่าน deferred loader → PASS |
| TL F3 — evidence schema ไม่ครบ §4; gate revision ไม่ครอบคลุม wrapper/origin | Timing evidence เพิ่ม `artifactFullSha256`, `collectedAt{start,end}` (ISO, end≥start), `localOrigin` (เฉพาะ `http://127.0.0.1:port` หรือ `http://localhost:port`), `evidenceBundleSha256` ต่อ scenario เพิ่ม `observationsSha256`, `preIdentitySha256`, `postIdentitySha256` (= full identity) Review เพิ่ม `reviewedGateRevisionSha256` Gate revision = adapter, build wrapper, origin artifacts, origin gate และ verifier logic |
| TL F4 — route coverage ดูแค่ผลรวม | `TIMING_SCENARIO_ROUTES`: startup และ warm = 22 route; valid initial preview, empty→valid, non-PDF และ PDF = 20 generator route แต่ละ scenario ต้องตรงชุดพอดี ไม่ซ้ำ ไม่เกิน |
| TL F5 — mutation survivors | เปลี่ยนเป็นเทสต์ที่ assert reason code ตรงตัว มี record variant 32 แบบ + evaluator-input 18 แบบ + hostile input Mutation 39 แบบ (รวม 12 ตัวที่ TL พบว่ารอด พร้อม guard ใหม่ทั้งหมด) **ทุกตัวถูกจับ** (ดู §3) |
| TL F6 — symlink ใน artifact เป็น FAIL | Adapter `NON_REGULAR_ARTIFACT_NODE` เปลี่ยนเป็น UNKNOWN (BLOCKED) และอัปเดตเทสต์ adapter |
| TL F7 / SEC F4 — TOCTOU ระหว่าง bundle กับ origin check | `--verify-existing` รัน bundle gate ซ้ำหลัง origin check ถ้า byte เปลี่ยนระหว่างนั้น → BLOCKED ที่เหลือคือการเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่าน ซึ่ง path-based check พิสูจน์ไม่ได้ (เหมือน Stage A C4) |
| TL F8 — build path import verifier ก่อน spawn | ย้าย dynamic import กลับไปไว้หลัง `next build` ใน build path แล้ว |
| TL F9 — reason code หาย | `BundleBoundaryError.reasonCodes` (frozen, enum เท่านั้น) และ verify-existing พิมพ์ `reasons: …` |
| TL F10 — ไม่มี mapping legacy→adapter ราย class | `LEGACY_CLOSURE` ระบุ predicate ของ adapter ที่ปิดแต่ละ class ทั้ง 5 class พร้อมเทสต์ราย class |
| SEC F5 — error message หลุด path | verify-existing พิมพ์เฉพาะ fixed code: `NQR_BUNDLE_*` + reasons, `NQR_ORIGIN_ARTIFACT_CHECK_FAILED`, `NQR_VERIFY_EXISTING_FAILED`, `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` (build path เดิมไม่เปลี่ยน) |
| SEC F6 — `NODE_OPTIONS` preload | Defense in depth: verify-existing ปฏิเสธถ้า `process.execArgv` ไม่ว่าง หรือ `NODE_OPTIONS` มี `--import/--require/-r/--loader` ยังเลี่ยงได้ถ้าโค้ด preload ลบร่องรอยตัวเองก่อน จึงไม่ถือเป็นขอบเขตความปลอดภัย |
| SEC F7 — JSON key ซ้ำ; `revoked` ใน bytes ที่ pin | Record ต้องเป็น canonical compact JSON (`JSON.stringify(JSON.parse(text)) === text`) key ซ้ำหรือ pretty-print → `INVALID_ACCEPTANCE_RECORD` ลบ field `revoked` ออก การ revoke คือการลบ digest ออกจาก admission set ใน source |

## 3. Verification ที่รันจริง (Node v24.14.1)

- `node --check` ห้าไฟล์: exit0
- Affected suite (verifier, origin-gate, origin-artifacts, adapter) บน bytes ที่ freeze แล้ว 2 รอบ: **276/276 ทั้งสองรอบ** log `dea37e3f…50a6` และ `82b28f37…021f` TMPDIR ว่างหลังรัน
- eslint ห้าไฟล์: ไม่มี error/warning (ลบ import และตัวแปรที่ไม่ใช้ออกแล้ว)
- **Mutation 39 แบบ ถูกจับทั้งหมด** (`mutants.cjs` `5caae17d…b25f`, log `6d71111d…f5fa6`) รายการ: M01 wrapper admission precheck, M02 review SHA format, M03 browser fields, M04 timing policy, M05 timing scope binding, M06 record policy/profile, M07 legacy shape, M08 acceptance realpath, M10 route set, M11 reviewed revision, M12 size limit, M13 legacy identity sha, M14 re-verify, M15 canonical JSON, M16 startup scan, M17 startup scan identity, M18 unadmitted marker FAIL, M19 gate revision normalization (F1 regression), M20 runtime check, M21 raw error message, M22 timing full identity, M23 pre/post identity, M24 local origin, M25 collection order, M26 evidence bundle, M27 observations, M28 origin binding, M29 legacy marker FAIL, M30 timing FAIL, M31 closure ขยายไปถึง resource limit, M32 PDF route set, M33 warm/cold, M34 duplicate scenario, M35 duplicate review role, M36 deferred เข้า startup, M37 gate revision compare, M38 identity compare, M39 options exact keys, M40 default path
  - M32/M34/M35 รอดในรอบแรกเพราะ variant ไปชนเงื่อนไขอื่นก่อน จึงปรับให้เป็น variant ที่แยกเฉพาะเงื่อนไขนั้น แล้วรันทั้งสามซ้ำจนถูกจับ ส่วน 36 ตัวที่เหลือรันก่อนการปรับนี้ ซึ่งแก้เฉพาะ variant สองตัวและบรรทัดที่ไม่ได้ใช้

## 4. ข้อจำกัดที่ยังอยู่

- ผู้เขียนเป็นคนเดียวกับ iteration 1 และยังไม่มี review ซ้ำบน canonical5 `6866da8a…2126`
- **Gate ยังผ่านบน artifact Turbopack จริงไม่ได้:** adapter จัด chunk `static/chunks/turbopack-*` เป็น `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` เสมอ (TL review §4) ต้องมี fresh build และ review runtime model แยก ซึ่งยังไม่อยู่ในสิทธิ์
- Startup marker scan ใช้ marker string เป็นหลักฐานเสริม ไม่ได้พิสูจน์ว่าไม่มีโค้ด PDF ที่เปลี่ยนชื่อ การพิสูจน์ timing จริงยังขึ้นกับ browser evidence ที่ PM admit
- `COLD_VALID_INITIAL_PREVIEW` ยังบังคับเป็น PASS ถ้าแอปไม่มี flow นี้ ต้องให้ Product Owner ตัดสิน
- NODE_OPTIONS/execArgv check เป็นเพียง defense in depth และการเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่านยังพิสูจน์ไม่ได้
- ถ้าหลักฐาน admission ในอนาคตถูกเขียนเป็น JSON ที่ไม่ compact จะถูกปฏิเสธโดยเจตนา

## 5. ขั้นถัดไป

ส่ง canonical5 `6866da8a…2126` ให้ TL และ SECURITY reviewer ตรวจซ้ำ ถ้าทั้งคู่ ACCEPT จะถามผู้ใช้เรื่อง SOURCE integration เป็นข้อถัดไป

## ภาคผนวก — diff iteration 1 → 2

```diff
--- a/scripts/inspect-turbopack-emission.mjs
+++ b/scripts/inspect-turbopack-emission.mjs
@@ -958,7 +958,7 @@
     const inventory = await walkFiles(physicalRoot, state);
     const actualFull = inventory.rows;
     if (actualFull.some((row) => row.type !== "file")) {
-      addDiagnostic(state, "NON_REGULAR_ARTIFACT_NODE", "VIOLATION", "artifact");
+      addDiagnostic(state, "NON_REGULAR_ARTIFACT_NODE", "UNKNOWN", "artifact");
     }
     if (expectedFull) rowsEqualByPath(actualFull, expectedFull, "artifact-full", state);
     const actualScope = actualFull.filter((row) => row.path === "BUILD_ID"
--- a/scripts/inspect-turbopack-emission.test.mjs
+++ b/scripts/inspect-turbopack-emission.test.mjs
@@ -305,7 +305,7 @@
   t.after(() => rm(item.root, { recursive: true, force: true }));
   await symlink("entry.js", join(item.root, "static/chunks/link.js"));
   const result = await inspect(item);
-  assert.equal(result.staticStatus, STATIC_VIOLATION, JSON.stringify(result.diagnostics));
+  assert.equal(result.staticStatus, STATIC_UNKNOWN, JSON.stringify(result.diagnostics));
   assert.ok(result.diagnostics.some((entry) => entry.code === "NON_REGULAR_ARTIFACT_NODE"));
 });
 
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -47,10 +47,12 @@
 }
 
 export class BundleBoundaryError extends Error {
-  constructor(code) {
+  constructor(code, reasonCodes = []) {
     super(code);
     this.name = "BundleBoundaryError";
     this.code = code;
+    // Fixed enum reason codes only; never payloads, paths or caught exception text.
+    this.reasonCodes = Object.freeze([...reasonCodes]);
   }
 }
 
@@ -498,34 +500,52 @@
 // Trusted admission boundary (NQR129 §4). An acceptance record counts only when the SHA-256 of its exact bytes
 // is listed here, in reviewed source. No argument, file, flag, reviewer name or caller hash can extend this set,
 // so a locally authored record stays BLOCKED until PM admits real QA/review evidence through a reviewed change.
+// Revoking evidence means removing its digest. The gate revision hashes this file with this one declaration
+// normalized to an empty list, so admitting a record never changes the logic revision the record is bound to.
 export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);
 
+const ADMISSION_DECLARATION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[[^\]]*\]\);$/gm;
+const EMPTY_ADMISSION_DECLARATION = "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);";
+
 export const BUNDLE_DECISION = Object.freeze({ PASS: "PASS_BUNDLE_SCOPE", BLOCKED: "BLOCKED", FAIL: "FAIL" });
 
-export const REQUIRED_TIMING_SCENARIOS = Object.freeze([
-  "COLD_EMPTY_INVALID_STARTUP",
-  "COLD_VALID_INITIAL_PREVIEW",
-  "EMPTY_TO_VALID_PREVIEW",
-  "NON_PDF_ACTIONS",
-  "FIRST_ELIGIBLE_PDF_REQUEST",
-  "WARM_REPETITION",
-]);
+const ALL_ROUTES = Object.freeze([...SUPPORTED_PROFILE.routes].sort());
+const GENERATOR_ROUTES = Object.freeze(ALL_ROUTES.filter((route) => route.includes("/qr/")));
 
+// NQR129 §7: startup and warm repetition cover landing plus generator routes; generator interactions cover
+// every generator route. Each scenario must list exactly its set, once each.
+export const TIMING_SCENARIO_ROUTES = Object.freeze({
+  COLD_EMPTY_INVALID_STARTUP: ALL_ROUTES,
+  COLD_VALID_INITIAL_PREVIEW: GENERATOR_ROUTES,
+  EMPTY_TO_VALID_PREVIEW: GENERATOR_ROUTES,
+  NON_PDF_ACTIONS: GENERATOR_ROUTES,
+  FIRST_ELIGIBLE_PDF_REQUEST: GENERATOR_ROUTES,
+  WARM_REPETITION: ALL_ROUTES,
+});
+export const REQUIRED_TIMING_SCENARIOS = Object.freeze(Object.keys(TIMING_SCENARIO_ROUTES));
+
+// NQR129 §4 per-class closure: which reviewed adapter predicate closes each legacy closed-grammar gap. A class
+// closes only when the adapter returns STATIC_SUPPORTED for the same admitted bytes. Resource limits,
+// unreadable/escaped inputs and forbidden markers have no closure.
+export const LEGACY_CLOSURE = Object.freeze({
+  UNSUPPORTED_EXECUTABLE_FORM: "every top-level statement matched a reviewed Flight, registration, factory or import form",
+  UNSUPPORTED_STATIC_SPECIFIER: "every static import normalized to a contained static/chunks path",
+  UNSUPPORTED_SCRIPT_TYPE: "every executable script type is in the reviewed set; inert JSON is not executed",
+  UNSUPPORTED_LINK_MODE: "every preload/modulepreload records one execution mode per chunk",
+  UNSUPPORTED_MIXED_SCRIPT_MODE: "no chunk is admitted with conflicting execution modes",
+});
+
 const REQUIRED_REVIEW_ROLES = Object.freeze(["QA", "SECURITY", "TL"]);
 const ACCEPTANCE_BYTES_LIMIT = 12 * 1024 * 1024;
 const HEX_64 = /^[a-f0-9]{64}$/;
-const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin";
-const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,revoked,schemaVersion,timingEvidence";
-const TIMING_KEYS = "artifactScopeSha256,browser,buildId,policyVersion,scenarios,schemaVersion";
-// Closed-grammar gaps that only a STATIC_SUPPORTED adapter inspection of the same admitted bytes may close.
-// Resource limits, unreadable/escaped inputs and forbidden markers are never superseded.
-const ADAPTER_CLOSED_LEGACY_CODES = new Set([
-  "UNSUPPORTED_EXECUTABLE_FORM",
-  "UNSUPPORTED_STATIC_SPECIFIER",
-  "UNSUPPORTED_SCRIPT_TYPE",
-  "UNSUPPORTED_LINK_MODE",
-  "UNSUPPORTED_MIXED_SCRIPT_MODE",
-]);
+const LOCAL_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/;
+const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin,startupScan";
+const GATE_REVISION_KEYS = "adapterSha256,buildWrapperSha256,originArtifactsSha256,originGateSha256,verifierLogicSha256";
+const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,schemaVersion,timingEvidence";
+const TIMING_KEYS = "artifactFullSha256,artifactScopeSha256,browser,buildId,collectedAt,evidenceBundleSha256,localOrigin,"
+  + "policyVersion,scenarios,schemaVersion";
+const SCENARIO_KEYS = "id,observationsSha256,postIdentitySha256,preIdentitySha256,routes,state,status";
+const REVIEW_KEYS = "disposition,reportSha256,reviewedGateRevisionSha256,role";
 
 function plainRecord(value) {
   if (!value || typeof value !== "object" || Array.isArray(value)) return false;
@@ -543,6 +563,11 @@
   return typeof value === "string" && value.length > 0 && value.length <= 128;
 }
 
+function isoInstant(value) {
+  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
+    && !Number.isNaN(Date.parse(value));
+}
+
 function inspectionIdentity(inspection) {
   const identity = plainRecord(inspection) ? inspection.identity : null;
   if (!plainRecord(identity)) return null;
@@ -559,6 +584,38 @@
     artifactFullSha256: expectedInputs?.artifactFull?.canonicalSha256,
     artifactScopeSha256: expectedInputs?.artifactScope?.canonicalSha256,
   };
+}
+
+function manifestRows(expectedInputs) {
+  const rows = Array.isArray(expectedInputs?.artifactFull?.rows) ? expectedInputs.artifactFull.rows : [];
+  return new Map(rows.map((row) => [row?.path, row?.sha256]));
+}
+
+/** Chunks a browser may fetch or evaluate at startup per the adapter graph: HTML script/preload roots,
+ * Flight preloads and their static imports. Deferred explicit chunk loads are excluded by design. */
+export function startupReachableChunks(inspection) {
+  const edges = Array.isArray(inspection?.graph?.edges) ? inspection.graph.edges : [];
+  const chunk = (value) => typeof value === "string" && value.startsWith("static/chunks/") && value.endsWith(".js");
+  const reachable = new Set();
+  for (const edge of edges) {
+    if ((edge?.kind === "synchronous-instantiation" && typeof edge.from === "string" && edge.from.startsWith("route:")
+      && ["SCRIPT_ROOT", "PRELOAD_DECLARATION"].includes(edge.condition)) || edge?.kind === "flight-resolve-preload") {
+      if (chunk(edge.to)) reachable.add(edge.to);
+    }
+  }
+  let grew = true;
+  while (grew) {
+    grew = false;
+    for (const edge of edges) {
+      if (edge?.kind === "synchronous-instantiation" && edge.condition === undefined && chunk(edge.to)
+        && (reachable.has(edge.from) || (typeof edge.from === "string" && edge.from.startsWith("inline:")))
+        && !reachable.has(edge.to)) {
+        reachable.add(edge.to);
+        grew = true;
+      }
+    }
+  }
+  return [...reachable].sort();
 }
 
 function checkLegacyInspection(legacy, expectedInputs, reasons) {
@@ -573,47 +630,80 @@
     if (item?.code === "FORBIDDEN_INITIAL_MARKER") {
       failed = true;
       reasons.add("FORBIDDEN_INITIAL_MARKER");
-    } else if (!ADAPTER_CLOSED_LEGACY_CODES.has(item?.code)) {
+    } else if (!Object.hasOwn(LEGACY_CLOSURE, item?.code)) {
       reasons.add("LEGACY_INSPECTION_INCOMPLETE");
     }
   }
   // Both inspections must describe the same admitted bytes, not two different reads of a changing directory.
-  const rows = new Map((Array.isArray(expectedInputs?.artifactFull?.rows) ? expectedInputs.artifactFull.rows : [])
-    .map((row) => [row?.path, row?.sha256]));
-  for (const file of evidence.inputManifest.files) {
-    const path = typeof file?.path === "string" && file.path.startsWith("/_next/") ? file.path.slice(7) : file?.path;
-    if (!rows.has(path) || rows.get(path) !== file?.sha256) {
-      reasons.add("LEGACY_INSPECTION_IDENTITY_MISMATCH");
-      break;
+  if (expectedInputs) {
+    const rows = manifestRows(expectedInputs);
+    for (const file of evidence.inputManifest.files) {
+      const path = typeof file?.path === "string" && file.path.startsWith("/_next/") ? file.path.slice(7) : file?.path;
+      if (!rows.has(path) || rows.get(path) !== file?.sha256) {
+        reasons.add("LEGACY_INSPECTION_IDENTITY_MISMATCH");
+        break;
+      }
     }
   }
   return failed;
 }
 
+function checkStartupScan(scan, inspection, expectedInputs, reasons) {
+  const expected = startupReachableChunks(inspection);
+  if (!Array.isArray(scan) || scan.length !== expected.length) {
+    reasons.add("STARTUP_SCAN_INCOMPLETE");
+    return false;
+  }
+  const rows = manifestRows(expectedInputs);
+  let failed = false;
+  for (let index = 0; index < expected.length; index += 1) {
+    const item = scan[index];
+    if (!exactKeys(item, "markers,path,sha256") || item.path !== expected[index] || !Array.isArray(item.markers)) {
+      reasons.add("STARTUP_SCAN_INCOMPLETE");
+      continue;
+    }
+    if (rows.get(item.path) !== item.sha256) {
+      reasons.add("STARTUP_SCAN_IDENTITY_MISMATCH");
+      continue;
+    }
+    if (item.markers.length > 0) {
+      failed = true;
+      reasons.add("FORBIDDEN_STARTUP_MARKER");
+    }
+  }
+  return failed;
+}
+
 function checkTimingEvidence(timing, identity, reasons) {
   if (!exactKeys(timing, TIMING_KEYS) || timing.schemaVersion !== 1 || timing.policyVersion !== SUPPORTED_PROFILE.policyVersion
     || !exactKeys(timing.browser, "name,version") || !shortString(timing.browser.name) || !shortString(timing.browser.version)
-    || !Array.isArray(timing.scenarios)) {
+    || !exactKeys(timing.collectedAt, "end,start") || !isoInstant(timing.collectedAt.start) || !isoInstant(timing.collectedAt.end)
+    || Date.parse(timing.collectedAt.end) < Date.parse(timing.collectedAt.start)
+    || typeof timing.localOrigin !== "string" || !LOCAL_ORIGIN.test(timing.localOrigin)
+    || !HEX_64.test(timing.evidenceBundleSha256) || !Array.isArray(timing.scenarios)) {
     reasons.add("INVALID_TIMING_EVIDENCE");
     return false;
   }
-  if (!identity || timing.buildId !== identity.buildId || timing.artifactScopeSha256 !== identity.artifactScopeSha256) {
+  if (!identity || timing.buildId !== identity.buildId || timing.artifactScopeSha256 !== identity.artifactScopeSha256
+    || timing.artifactFullSha256 !== identity.artifactFullSha256) {
     reasons.add("TIMING_EVIDENCE_IDENTITY_MISMATCH");
   }
-  const profileRoutes = new Set(SUPPORTED_PROFILE.routes);
-  const coveredRoutes = new Set();
   const seen = new Set();
   let failed = false;
   for (const scenario of timing.scenarios) {
-    if (!exactKeys(scenario, "id,routes,state,status") || !REQUIRED_TIMING_SCENARIOS.includes(scenario.id)
-      || seen.has(scenario.id) || !Array.isArray(scenario.routes) || scenario.routes.length === 0
-      || !scenario.routes.every((route) => profileRoutes.has(route))
+    const required = TIMING_SCENARIO_ROUTES[scenario?.id];
+    if (!exactKeys(scenario, SCENARIO_KEYS) || !Object.hasOwn(TIMING_SCENARIO_ROUTES, scenario.id) || seen.has(scenario.id)
+      || !Array.isArray(scenario.routes) || !HEX_64.test(scenario.observationsSha256)
+      || JSON.stringify([...scenario.routes].sort()) !== JSON.stringify(required)
       || scenario.state !== (scenario.id === "WARM_REPETITION" ? "warm" : "cold")) {
       reasons.add("TIMING_EVIDENCE_INCOMPLETE");
       continue;
     }
     seen.add(scenario.id);
-    for (const route of scenario.routes) coveredRoutes.add(route);
+    if (!identity || scenario.preIdentitySha256 !== identity.artifactFullSha256
+      || scenario.postIdentitySha256 !== identity.artifactFullSha256) {
+      reasons.add("TIMING_EVIDENCE_IDENTITY_MISMATCH");
+    }
     if (scenario.status === "FAIL") {
       failed = true;
       reasons.add("TIMING_POLICY_VIOLATION");
@@ -621,21 +711,20 @@
       reasons.add("TIMING_EVIDENCE_INCOMPLETE");
     }
   }
-  if (seen.size !== REQUIRED_TIMING_SCENARIOS.length || coveredRoutes.size !== profileRoutes.size) {
-    reasons.add("TIMING_EVIDENCE_INCOMPLETE");
-  }
+  if (seen.size !== REQUIRED_TIMING_SCENARIOS.length) reasons.add("TIMING_EVIDENCE_INCOMPLETE");
   return failed;
 }
 
-function checkReviews(reviews, reasons) {
+function checkReviews(reviews, gateRevision, reasons) {
   const accepted = new Set();
+  const reviewedRevision = sha256(JSON.stringify(gateRevision));
   if (!Array.isArray(reviews)) {
     reasons.add("REVIEW_NOT_ACCEPTED");
     return;
   }
   for (const review of reviews) {
-    if (!exactKeys(review, "disposition,reportSha256,role") || !REQUIRED_REVIEW_ROLES.includes(review.role)
-      || review.disposition !== "ACCEPT" || !HEX_64.test(review.reportSha256) || accepted.has(review.role)) {
+    if (!exactKeys(review, REVIEW_KEYS) || !REQUIRED_REVIEW_ROLES.includes(review.role) || review.disposition !== "ACCEPT"
+      || !HEX_64.test(review.reportSha256) || review.reviewedGateRevisionSha256 !== reviewedRevision || accepted.has(review.role)) {
       reasons.add("REVIEW_NOT_ACCEPTED");
       continue;
     }
@@ -644,9 +733,19 @@
   if (accepted.size !== REQUIRED_REVIEW_ROLES.length) reasons.add("REVIEW_NOT_ACCEPTED");
 }
 
+function decision(status, reasons, identity) {
+  return {
+    status,
+    reasonCodes: [...reasons].sort(),
+    identity: status === BUNDLE_DECISION.PASS ? identity : null,
+    policyVersion: SUPPORTED_PROFILE.policyVersion,
+  };
+}
+
 /**
  * Pure bundle-scope decision over evidence already collected by the trusted verifier. Never reads files,
- * executes code or loads URLs. PASS_BUNDLE_SCOPE covers this bundle policy only, never deployment.
+ * executes code or loads URLs. A proven violation is FAIL even when admission or other evidence is missing.
+ * PASS_BUNDLE_SCOPE covers this bundle policy only, never deployment.
  */
 export function evaluateBundleBoundary(input) {
   const reasons = new Set();
@@ -655,76 +754,76 @@
   try {
     if (!exactKeys(input, DECISION_INPUT_KEYS)) {
       reasons.add("INVALID_DECISION_INPUT");
+      return decision(BUNDLE_DECISION.BLOCKED, reasons, null);
+    }
+    const { acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan } = input;
+    identity = inspectionIdentity(inspection);
+    const inspectionShaped = plainRecord(inspection) && inspection.schemaVersion === 1 && inspection.releaseDecision === "BLOCKED"
+      && inspection.policyVersion === SUPPORTED_PROFILE.policyVersion && inspection.profileId === SUPPORTED_PROFILE.profileId;
+    if (!inspectionShaped) {
+      reasons.add("INVALID_ADAPTER_INSPECTION");
+    } else if (inspection.staticStatus === "STATIC_VIOLATION") {
+      failed = true;
+      reasons.add("ADAPTER_STATIC_VIOLATION");
+    } else if (inspection.staticStatus !== "STATIC_SUPPORTED") {
+      reasons.add("ADAPTER_STATIC_UNKNOWN");
+    }
+    if (inspectionShaped && !identity) reasons.add("INCOMPLETE_ARTIFACT_IDENTITY");
+
+    let record = null;
+    if (!(acceptanceBytes instanceof Uint8Array)) {
+      reasons.add("MISSING_ACCEPTANCE_RECORD");
+    } else if (acceptanceBytes.length > ACCEPTANCE_BYTES_LIMIT) {
+      reasons.add("ACCEPTANCE_RESOURCE_LIMIT");
+    } else if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) {
+      reasons.add("ACCEPTANCE_NOT_ADMITTED");
     } else {
-      const { acceptanceBytes, gateRevision, inspection, legacyInspection, origin } = input;
-      identity = inspectionIdentity(inspection);
-      if (!plainRecord(inspection) || inspection.schemaVersion !== 1 || inspection.releaseDecision !== "BLOCKED"
-        || inspection.policyVersion !== SUPPORTED_PROFILE.policyVersion || inspection.profileId !== SUPPORTED_PROFILE.profileId) {
-        reasons.add("INVALID_ADAPTER_INSPECTION");
-      } else if (inspection.staticStatus === "STATIC_VIOLATION") {
-        failed = true;
-        reasons.add("ADAPTER_STATIC_VIOLATION");
-      } else if (inspection.staticStatus !== "STATIC_SUPPORTED") {
-        reasons.add("ADAPTER_STATIC_UNKNOWN");
+      try {
+        const text = new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes);
+        const parsed = JSON.parse(text);
+        // Canonical compact JSON only: duplicate keys or alternate spellings cannot hide a field.
+        if (JSON.stringify(parsed) === text) record = parsed;
+      } catch {
+        record = null;
       }
-      if (!identity) reasons.add("INCOMPLETE_ARTIFACT_IDENTITY");
+      if (!exactKeys(record, RECORD_KEYS) || record.schemaVersion !== 1 || record.policyVersion !== SUPPORTED_PROFILE.policyVersion
+        || record.profileId !== SUPPORTED_PROFILE.profileId || !plainRecord(record.expectedInputs)) {
+        reasons.add("INVALID_ACCEPTANCE_RECORD");
+        record = null;
+      }
+    }
 
-      if (!(acceptanceBytes instanceof Uint8Array)) {
-        reasons.add("MISSING_ACCEPTANCE_RECORD");
-      } else if (acceptanceBytes.length > ACCEPTANCE_BYTES_LIMIT) {
-        reasons.add("ACCEPTANCE_RESOURCE_LIMIT");
-      } else if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) {
-        reasons.add("ACCEPTANCE_NOT_ADMITTED");
-      } else {
-        let record = null;
-        try {
-          record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes));
-        } catch {
-          reasons.add("INVALID_ACCEPTANCE_RECORD");
-        }
-        if (record !== null) {
-          if (!exactKeys(record, RECORD_KEYS) || record.schemaVersion !== 1
-            || record.policyVersion !== SUPPORTED_PROFILE.policyVersion || record.profileId !== SUPPORTED_PROFILE.profileId
-            || !plainRecord(record.expectedInputs)) {
-            reasons.add("INVALID_ACCEPTANCE_RECORD");
-          } else {
-            const expected = recordIdentity(record.expectedInputs);
-            if (!identity || Object.keys(expected).some((field) => expected[field] !== identity[field])) {
-              reasons.add("ACCEPTANCE_IDENTITY_MISMATCH");
-            }
-            if (record.revoked !== false) reasons.add("ACCEPTANCE_REVOKED");
-            if (typeof origin !== "string" || record.productionOrigin !== origin) reasons.add("ORIGIN_NOT_BOUND");
-            if (!exactKeys(gateRevision, "adapterSha256,verifierSha256") || !exactKeys(record.gateRevision, "adapterSha256,verifierSha256")
-              || !HEX_64.test(gateRevision.adapterSha256) || !HEX_64.test(gateRevision.verifierSha256)
-              || record.gateRevision.adapterSha256 !== gateRevision.adapterSha256
-              || record.gateRevision.verifierSha256 !== gateRevision.verifierSha256) {
-              reasons.add("GATE_REVISION_MISMATCH");
-            }
-            if (checkLegacyInspection(legacyInspection, record.expectedInputs, reasons)) failed = true;
-            if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
-            checkReviews(record.reviews, reasons);
-          }
-        }
+    // Legacy markers need no record: a proven marker is FAIL regardless of admission state.
+    if (checkLegacyInspection(legacyInspection, record?.expectedInputs ?? null, reasons)) failed = true;
+
+    if (record) {
+      const expected = recordIdentity(record.expectedInputs);
+      if (!identity || Object.keys(expected).some((field) => expected[field] !== identity[field])) {
+        reasons.add("ACCEPTANCE_IDENTITY_MISMATCH");
       }
+      if (typeof origin !== "string" || record.productionOrigin !== origin) reasons.add("ORIGIN_NOT_BOUND");
+      if (!exactKeys(gateRevision, GATE_REVISION_KEYS) || !exactKeys(record.gateRevision, GATE_REVISION_KEYS)
+        || !Object.keys(gateRevision).every((key) => HEX_64.test(gateRevision[key]) && record.gateRevision[key] === gateRevision[key])) {
+        reasons.add("GATE_REVISION_MISMATCH");
+      }
+      if (inspectionShaped && inspection.staticStatus === "STATIC_SUPPORTED"
+        && checkStartupScan(startupScan, inspection, record.expectedInputs, reasons)) failed = true;
+      if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
+      checkReviews(record.reviews, gateRevision, reasons);
     }
   } catch {
     reasons.add("INVALID_DECISION_INPUT");
   }
   const status = failed ? BUNDLE_DECISION.FAIL : reasons.size ? BUNDLE_DECISION.BLOCKED : BUNDLE_DECISION.PASS;
-  return {
-    status,
-    reasonCodes: [...reasons].sort(),
-    identity: status === BUNDLE_DECISION.PASS ? identity : null,
-    policyVersion: SUPPORTED_PROFILE.policyVersion,
-  };
+  return decision(status, reasons, identity);
 }
 
-async function readAcceptanceRecord(path) {
+async function readBoundFile(path, limit) {
   let handle;
   try {
     handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
     const before = await handle.stat({ bigint: true });
-    if (!before.isFile() || before.size > BigInt(ACCEPTANCE_BYTES_LIMIT) || await realpath(path) !== path) return null;
+    if (!before.isFile() || before.size > BigInt(limit) || await realpath(path) !== path) return null;
     const bytes = Buffer.alloc(Number(before.size));
     let offset = 0;
     while (offset < bytes.length) {
@@ -741,48 +840,80 @@
   }
 }
 
+/** Code revision the acceptance record and reviews bind to: every module on the verify-existing decision path. */
+export async function readGateRevision() {
+  const text = async (name) => readFile(fileURLToPath(new URL(name, VERIFIER_URL)), "utf8");
+  const verifier = await readFile(fileURLToPath(VERIFIER_URL), "utf8");
+  const declarations = verifier.match(ADMISSION_DECLARATION) || [];
+  if (declarations.length !== 1) throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["UNREADABLE_GATE_REVISION"]);
+  return {
+    adapterSha256: sha256(await text("./inspect-turbopack-emission.mjs")),
+    buildWrapperSha256: sha256(await text("./build.mjs")),
+    originArtifactsSha256: sha256(await text("./verify-origin-artifacts.mjs")),
+    originGateSha256: sha256(await text("./origin-gate.mjs")),
+    verifierLogicSha256: sha256(verifier.replace(ADMISSION_DECLARATION, EMPTY_ADMISSION_DECLARATION)),
+  };
+}
+
+async function scanStartupChunks(artifactRoot, inspection) {
+  const scan = [];
+  for (const path of startupReachableChunks(inspection)) {
+    const bytes = await readBoundFile(join(artifactRoot, path), INSPECTION_LIMITS.bytesPerFile);
+    if (!bytes) return null;
+    scan.push({
+      markers: FORBIDDEN_INITIAL_MARKERS.filter((marker) => bytes.includes(Buffer.from(marker))),
+      path,
+      sha256: sha256(bytes),
+    });
+  }
+  return scan;
+}
+
 async function decideExistingArtifact(buildDir, options) {
-  const blocked = (code) => ({
-    status: BUNDLE_DECISION.BLOCKED, reasonCodes: [code], identity: null, policyVersion: SUPPORTED_PROFILE.policyVersion,
-  });
+  const blocked = (codes) => decision(BUNDLE_DECISION.BLOCKED, new Set(codes), null);
   let acceptancePath;
   let origin;
   try {
-    if (!exactKeys(options, "acceptancePath,origin")) return blocked("INVALID_VERIFY_OPTIONS");
+    if (!exactKeys(options, "acceptancePath,origin")) return blocked(["INVALID_VERIFY_OPTIONS"]);
     ({ acceptancePath, origin } = options);
   } catch {
-    return blocked("INVALID_VERIFY_OPTIONS");
+    return blocked(["INVALID_VERIFY_OPTIONS"]);
   }
   if (typeof buildDir !== "string" || !isAbsolute(buildDir) || typeof acceptancePath !== "string"
-    || !isAbsolute(acceptancePath) || typeof origin !== "string") return blocked("INVALID_VERIFY_OPTIONS");
-  const acceptanceBytes = await readAcceptanceRecord(acceptancePath);
-  if (!acceptanceBytes) return blocked("UNREADABLE_ACCEPTANCE_RECORD");
+    || !isAbsolute(acceptancePath) || typeof origin !== "string") return blocked(["INVALID_VERIFY_OPTIONS"]);
+  const artifactRoot = resolve(buildDir);
+  // The legacy closed inspector needs no evidence, so its proven markers are reported even without admission.
+  const legacyInspection = await inspectInitialBundleBoundary(artifactRoot);
+  const legacyOnly = (codes) => {
+    const reasons = new Set(codes);
+    const failed = checkLegacyInspection(legacyInspection, null, reasons);
+    return decision(failed ? BUNDLE_DECISION.FAIL : BUNDLE_DECISION.BLOCKED, reasons, null);
+  };
+  const acceptanceBytes = await readBoundFile(acceptancePath, ACCEPTANCE_BYTES_LIMIT);
+  if (!acceptanceBytes) return legacyOnly(["UNREADABLE_ACCEPTANCE_RECORD"]);
   // Unadmitted bytes are never parsed or used to steer inspection.
-  if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) return blocked("ACCEPTANCE_NOT_ADMITTED");
+  if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) return legacyOnly(["ACCEPTANCE_NOT_ADMITTED"]);
   let expectedInputs;
   try {
     expectedInputs = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes)).expectedInputs;
   } catch {
-    return blocked("INVALID_ACCEPTANCE_RECORD");
+    return legacyOnly(["INVALID_ACCEPTANCE_RECORD"]);
   }
-  const artifactRoot = resolve(buildDir);
-  const legacyInspection = await inspectInitialBundleBoundary(artifactRoot);
   const inspection = await inspectTurbopackEmission({ artifactRoot, expectedInputs, profile: SUPPORTED_PROFILE });
+  const startupScan = await scanStartupChunks(artifactRoot, inspection);
   let gateRevision;
   try {
-    gateRevision = {
-      adapterSha256: sha256(await readFile(fileURLToPath(new URL("./inspect-turbopack-emission.mjs", VERIFIER_URL)))),
-      verifierSha256: sha256(await readFile(fileURLToPath(VERIFIER_URL))),
-    };
+    gateRevision = await readGateRevision();
   } catch {
-    return blocked("UNREADABLE_GATE_REVISION");
+    return legacyOnly(["UNREADABLE_GATE_REVISION"]);
   }
-  return evaluateBundleBoundary({ acceptanceBytes, gateRevision, inspection, legacyInspection, origin });
+  return evaluateBundleBoundary({ acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan });
 }
 
 /**
  * Without options this remains the always-blocking closed inspector. With explicit options it resolves only for
  * PASS_BUNDLE_SCOPE on an existing artifact and an admitted acceptance record; it never builds or runs Next.
+ * Rejections carry fixed reason codes only.
  */
 export async function verifyInitialBundleBoundary(buildDir = ".next", options) {
   if (options === undefined) {
@@ -792,8 +923,8 @@
     }
     throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
   }
-  const decision = await decideExistingArtifact(buildDir, options);
-  if (decision.status === BUNDLE_DECISION.PASS) return decision;
-  throw new BundleBoundaryError(decision.status === BUNDLE_DECISION.FAIL
-    ? "NQR_BUNDLE_STATIC_CHECK_FAILED" : "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+  const result = await decideExistingArtifact(buildDir, options);
+  if (result.status === BUNDLE_DECISION.PASS) return result;
+  throw new BundleBoundaryError(result.status === BUNDLE_DECISION.FAIL
+    ? "NQR_BUNDLE_STATIC_CHECK_FAILED" : "NQR_BUNDLE_NEEDS_EMISSION_REVIEW", result.reasonCodes);
 }
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -2,7 +2,6 @@
 import { spawn, spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
 import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
-import { createRequire } from "node:module";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { fileURLToPath, pathToFileURL } from "node:url";
@@ -11,13 +10,16 @@
 import { SUPPORTED_PROFILE, inspectTurbopackEmission } from "./inspect-turbopack-emission.mjs";
 import {
   ADMITTED_ACCEPTANCE_SHA256,
-  BUNDLE_DECISION,
   BundleBoundaryError,
   FORBIDDEN_INITIAL_MARKERS,
   INSPECTION_LIMITS,
+  LEGACY_CLOSURE,
   REQUIRED_TIMING_SCENARIOS,
+  TIMING_SCENARIO_ROUTES,
   evaluateBundleBoundary,
   inspectInitialBundleBoundary,
+  readGateRevision,
+  startupReachableChunks,
   verifyInitialBundleBoundary,
 } from "./verify-initial-bundle-boundary.mjs";
 import { routePaths } from "./verify-origin-artifacts.mjs";
@@ -646,7 +648,7 @@
       .replace('import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrSpawnSync;")
       .replace('import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});')
       .replace('import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=()=>null;")
-      .replace('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrVerifierModule()");
+      .replaceAll('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrVerifierModule()");
     assert.notEqual(harness, original);
     const previousExitCode = process.exitCode;
     const errors = [];
@@ -680,15 +682,19 @@
 
 const STAGE_B_ORIGIN = "https://nqr.orenvis.com";
 const STAGE_B_WIRE = '1:I[7,["/_next/static/chunks/entry.js"],"default"]\n';
-const STAGE_B_REGISTRATION = '(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{}]);';
 const stageBHash = (value) => createHash("sha256").update(value).digest("hex");
 const asciiOrder = (a, b) => Buffer.from(a).compare(Buffer.from(b));
+const stageBRegistration = (id, factory = "t=>{}") =>
+  `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,${id},${factory}]);`;
+const STAGE_B_MODULES = ["inspect-turbopack-emission.mjs", "verify-initial-bundle-boundary.mjs", "build.mjs",
+  "origin-gate.mjs", "verify-origin-artifacts.mjs"];
+const EMPTY_ADMISSION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[\]\);$/gm;
 
-async function stageBRows(root, directory = root, prefix = "", rows = []) {
+async function stageBRows(directory, prefix = "", rows = []) {
   for (const name of (await readdir(directory)).sort(asciiOrder)) {
     const path = join(directory, name);
     const relativePath = prefix ? `${prefix}/${name}` : name;
-    if ((await lstat(path)).isDirectory()) await stageBRows(root, path, relativePath, rows);
+    if ((await lstat(path)).isDirectory()) await stageBRows(path, relativePath, rows);
     else {
       const bytes = await readFile(path);
       rows.push({ sha256: stageBHash(bytes), path: relativePath, size: bytes.length, type: "file" });
@@ -712,7 +718,30 @@
   };
 }
 
-async function withStageBArtifact(callback) {
+function stageBAlternates(suffix) {
+  return ["th", "en", "x-default"].map((language) =>
+    `${STAGE_B_ORIGIN}/${language === "x-default" ? "th" : language}${suffix}`);
+}
+
+// Origin-valid, adapter-supported synthetic HTML so the real verify-existing CLI can reach PASS.
+function stageBHtml(route, wire, extraBody) {
+  const locale = route.split("/")[1];
+  const suffix = route.slice(locale.length + 1);
+  const alternates = stageBAlternates(suffix).map((href, index) =>
+    `<link rel="alternate" hreflang="${["th", "en", "x-default"][index]}" href="${href}">`).join("");
+  const jsonLd = suffix
+    ? `<script type="application/ld+json">${JSON.stringify({ "@type": "SoftwareApplication", url: STAGE_B_ORIGIN + route,
+      publisher: { url: `${STAGE_B_ORIGIN}/${locale}` } })}</script><script type="application/ld+json">${JSON.stringify({
+      "@type": "BreadcrumbList", itemListElement: [{ item: `${STAGE_B_ORIGIN}/${locale}` }, { item: STAGE_B_ORIGIN + route }] })}</script>`
+    : "";
+  return '<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script>'
+    + `<link rel="canonical" href="${STAGE_B_ORIGIN}${route}"><meta property="og:url" content="${STAGE_B_ORIGIN}${route}">`
+    + `${alternates}${jsonLd}</head><body><script>(self.__next_f=self.__next_f||[]).push([0])</script>`
+    + `<script>self.__next_f.push([1,${JSON.stringify(wire)}])</script>${extraBody}</body></html>`;
+}
+
+async function withStageBArtifact({ entry = stageBRegistration(7), wire = STAGE_B_WIRE, extraBody = "", extraFiles = {} } = {},
+  callback) {
   const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-"));
   const root = join(base, "artifact");
   try {
@@ -721,27 +750,26 @@
     for (const route of routePaths) {
       const path = join(root, "server/app", `${route.slice(1)}.html`);
       await mkdir(join(path, ".."), { recursive: true });
-      await writeFile(path, '<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script></head><body>'
-        + `<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,${JSON.stringify(STAGE_B_WIRE)}])</script>`
-        + "</body></html>");
+      await writeFile(path, stageBHtml(route, wire, extraBody));
     }
-    await writeFile(join(root, "static/chunks/entry.js"), STAGE_B_REGISTRATION);
+    await writeFile(join(root, "server/app/sitemap.xml.body"), '<?xml version="1.0" encoding="UTF-8"?>'
+      + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
+      + routePaths.map((route) => `<url><loc>${STAGE_B_ORIGIN}${route}</loc>${stageBAlternates(route.slice(3)).map((href, index) =>
+        `<xhtml:link rel="alternate" hreflang="${["th", "en", "x-default"][index]}" href="${href}"/>`).join("")}</url>`).join("")
+      + "</urlset>");
+    await writeFile(join(root, "server/app/robots.txt.body"), `User-agent: *\nAllow: /\nSitemap: ${STAGE_B_ORIGIN}/sitemap.xml\n`);
+    await writeFile(join(root, "static/chunks/entry.js"), entry);
+    for (const [path, bytes] of Object.entries(extraFiles)) await writeFile(join(root, path), bytes);
     return await callback({ base, root, expectedInputs: await stageBExpectedInputs(root) });
   } finally {
     await rm(base, { recursive: true, force: true });
   }
 }
 
-async function stageBGateRevision() {
-  return {
-    adapterSha256: stageBHash(await readFile(new URL("./inspect-turbopack-emission.mjs", import.meta.url))),
-    verifierSha256: stageBHash(await readFile(new URL("./verify-initial-bundle-boundary.mjs", import.meta.url))),
-  };
-}
-
 // Synthetic records exist only to exercise predicates; the shipped admission set never contains them.
-function stageBRecord(expectedInputs, gateRevision, change = (record) => record) {
-  const record = {
+function stageBRecordObject(expectedInputs, gateRevision) {
+  const full = expectedInputs.artifactFull.canonicalSha256;
+  return {
     schemaVersion: 1,
     policyVersion: SUPPORTED_PROFILE.policyVersion,
     profileId: SUPPORTED_PROFILE.profileId,
@@ -752,227 +780,405 @@
       schemaVersion: 1,
       policyVersion: SUPPORTED_PROFILE.policyVersion,
       buildId: expectedInputs.buildId,
+      artifactFullSha256: full,
       artifactScopeSha256: expectedInputs.artifactScope.canonicalSha256,
       browser: { name: "SyntheticBrowser", version: "0" },
+      collectedAt: { start: "2026-09-17T00:00:00Z", end: "2026-09-17T01:00:00Z" },
+      localOrigin: "http://127.0.0.1:3100",
+      evidenceBundleSha256: stageBHash("synthetic-evidence-bundle"),
       scenarios: REQUIRED_TIMING_SCENARIOS.map((id) => ({
-        id, routes: [...SUPPORTED_PROFILE.routes], state: id === "WARM_REPETITION" ? "warm" : "cold", status: "PASS",
+        id,
+        observationsSha256: stageBHash(`synthetic-observations-${id}`),
+        postIdentitySha256: full,
+        preIdentitySha256: full,
+        routes: [...TIMING_SCENARIO_ROUTES[id]],
+        state: id === "WARM_REPETITION" ? "warm" : "cold",
+        status: "PASS",
       })),
     },
     reviews: ["QA", "SECURITY", "TL"].map((role) => ({
-      role, disposition: "ACCEPT", reportSha256: stageBHash(`synthetic-${role}`),
-    })),
-    revoked: false,
+      disposition: "ACCEPT",
+      reportSha256: stageBHash(`synthetic-${role}`),
+      reviewedGateRevisionSha256: stageBHash(JSON.stringify(gateRevision)),
+      role,
+    })),
   };
-  return Buffer.from(JSON.stringify(change(structuredClone(record))));
 }
 
-// Loads the real verifier source with a test-only admission set. Only the admission constant and module
-// locations are rewritten; the decision logic under test is byte-for-byte the shipped verifier.
-async function stageBVerifierAdmitting(recordBytes) {
-  const verifierUrl = new URL("./verify-initial-bundle-boundary.mjs", import.meta.url);
-  const source = await readFile(verifierUrl, "utf8");
-  const replacements = [
-    ["export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);",
-      `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze(${JSON.stringify(recordBytes.map((bytes) => stageBHash(bytes)))});`],
-    ["const VERIFIER_URL = import.meta.url;", `const VERIFIER_URL = ${JSON.stringify(verifierUrl.href)};`],
-    ['from "jsdom";', `from ${JSON.stringify(pathToFileURL(createRequire(verifierUrl).resolve("jsdom")).href)};`],
-    ['from "./inspect-turbopack-emission.mjs";', `from ${JSON.stringify(new URL("./inspect-turbopack-emission.mjs", verifierUrl).href)};`],
-    ['from "./verify-origin-artifacts.mjs";', `from ${JSON.stringify(new URL("./verify-origin-artifacts.mjs", verifierUrl).href)};`],
-  ];
-  let harness = source;
-  for (const [from, to] of replacements) {
-    assert.ok(harness.includes(from), from);
-    harness = harness.replace(from, to);
+function stageBRecord(expectedInputs, gateRevision, change = (record) => record) {
+  return Buffer.from(JSON.stringify(change(structuredClone(stageBRecordObject(expectedInputs, gateRevision)))));
+}
+
+// Real on-disk admission: copies the gate modules, writes the digests into the copied verifier file and imports it
+// through its file URL. Nothing is rewritten in memory, so the gate revision is computed from the running bytes.
+async function withAdmittedGate(recordBytes, callback) {
+  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
+  try {
+    await mkdir(join(base, "scripts"));
+    for (const name of STAGE_B_MODULES) {
+      let source = await readFile(new URL(`./${name}`, import.meta.url), "utf8");
+      if (name === "verify-initial-bundle-boundary.mjs") {
+        assert.equal(source.match(EMPTY_ADMISSION)?.length, 1);
+        source = source.replace(EMPTY_ADMISSION, `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n${
+          recordBytes.map((bytes) => `  ${JSON.stringify(stageBHash(bytes))},`).join("\n")}\n]);`);
+      }
+      await writeFile(join(base, "scripts", name), source);
+    }
+    await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
+    const gate = await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href);
+    return await callback({ base, gate, buildScript: join(base, "scripts/build.mjs") });
+  } finally {
+    await rm(base, { recursive: true, force: true });
   }
-  return import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}`);
 }
 
+async function stageBStartupScan(root, inspection) {
+  const scan = [];
+  for (const path of startupReachableChunks(inspection)) {
+    const bytes = await readFile(join(root, path));
+    scan.push({ markers: FORBIDDEN_INITIAL_MARKERS.filter((marker) => bytes.includes(Buffer.from(marker))), path,
+      sha256: stageBHash(bytes) });
+  }
+  return scan;
+}
+
 async function stageBInputs({ root, expectedInputs }, acceptanceBytes) {
+  const inspection = await inspectTurbopackEmission({ artifactRoot: root, expectedInputs, profile: SUPPORTED_PROFILE });
   return {
     acceptanceBytes,
-    gateRevision: await stageBGateRevision(),
-    inspection: await inspectTurbopackEmission({ artifactRoot: root, expectedInputs, profile: SUPPORTED_PROFILE }),
+    gateRevision: await readGateRevision(),
+    inspection,
     legacyInspection: await inspectInitialBundleBoundary(root),
     origin: STAGE_B_ORIGIN,
+    startupScan: await stageBStartupScan(root, inspection),
   };
 }
 
-const rejectsWith = (code) => (error) => error instanceof BundleBoundaryError && error.code === code;
+async function rejection(promise) {
+  try {
+    await promise;
+  } catch (error) {
+    return { code: error.code, reasonCodes: [...(error.reasonCodes || [])], name: error.name };
+  }
+  return { code: "RESOLVED" };
+}
 
-test("stage B: a complete self-authored acceptance record stays blocked without reviewed admission", async () => {
+function runVerifyExisting(buildScript, item, acceptancePath, env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, execArgv = []) {
+  return spawnSync(process.execPath, [...execArgv, buildScript, "--verify-existing", "--artifact", item.root,
+    "--acceptance", acceptancePath], { encoding: "utf8", env: { PATH: process.env.PATH, ...env }, timeout: 30000 });
+}
+
+test("stage B: a complete self-authored acceptance record stays blocked and unadmitted bytes are never parsed", async () => {
   assert.ok(Object.isFrozen(ADMITTED_ACCEPTANCE_SHA256));
   assert.deepEqual(ADMITTED_ACCEPTANCE_SHA256, []);
-  await withStageBArtifact(async (item) => {
-    const record = stageBRecord(item.expectedInputs, await stageBGateRevision());
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
     const acceptancePath = join(item.base, "acceptance.json");
     await writeFile(acceptancePath, record);
-    await assert.rejects(() => verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
-      rejectsWith("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"));
-    const decision = evaluateBundleBoundary(await stageBInputs(item, record));
-    assert.equal(decision.status, BUNDLE_DECISION.BLOCKED);
-    assert.ok(decision.reasonCodes.includes("ACCEPTANCE_NOT_ADMITTED"));
-    assert.equal(decision.identity, null);
-    const smuggled = { ...(await stageBInputs(item, record)), admittedAcceptanceSha256: [stageBHash(record)] };
-    assert.deepEqual(evaluateBundleBoundary(smuggled).reasonCodes, ["INVALID_DECISION_INPUT"]);
+    assert.deepEqual(await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
+      { code: "NQR_BUNDLE_NEEDS_EMISSION_REVIEW", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED"], name: "BundleBoundaryError" });
+    await writeFile(acceptancePath, Buffer.from([0xff, 0xfe, 0x7b]));
+    assert.deepEqual((await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }))).reasonCodes,
+      ["ACCEPTANCE_NOT_ADMITTED"]);
+    const inputs = await stageBInputs(item, record);
+    assert.deepEqual(evaluateBundleBoundary(inputs),
+      { status: "BLOCKED", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED"], identity: null, policyVersion: SUPPORTED_PROFILE.policyVersion });
+    assert.deepEqual(evaluateBundleBoundary({ ...inputs, admittedAcceptanceSha256: [stageBHash(record)] }).reasonCodes,
+      ["INVALID_DECISION_INPUT"]);
   });
 });
 
-test("stage B: admitted evidence passes bundle scope only for the exact artifact and record bytes", async () => {
-  await withStageBArtifact(async (item) => {
-    const record = stageBRecord(item.expectedInputs, await stageBGateRevision());
-    const verifier = await stageBVerifierAdmitting([record]);
-    const acceptancePath = join(item.base, "acceptance.json");
-    await writeFile(acceptancePath, record);
-    const decision = await verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
-    assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
-    assert.deepEqual(decision.reasonCodes, []);
-    assert.equal(decision.identity.artifactFullSha256, item.expectedInputs.artifactFull.canonicalSha256);
-    assert.equal("releaseDecision" in decision, false);
+test("stage B: on-disk admission reaches PASS through the real CLI and admitting never changes the gate revision", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const revision = await readGateRevision();
+    const record = stageBRecord(item.expectedInputs, revision);
+    await withAdmittedGate([record], async ({ base, gate, buildScript }) => {
+      assert.deepEqual(await gate.readGateRevision(), revision);
+      assert.notEqual(stageBHash(await readFile(join(base, "scripts/verify-initial-bundle-boundary.mjs"))),
+        stageBHash(await readFile(new URL("./verify-initial-bundle-boundary.mjs", import.meta.url))));
+      const acceptancePath = join(item.base, "acceptance.json");
+      await writeFile(acceptancePath, record);
+      const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
+      assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
+      assert.deepEqual(decision.reasonCodes, []);
+      assert.equal(decision.identity.artifactFullSha256, item.expectedInputs.artifactFull.canonicalSha256);
 
-    // Default invocation of the same module remains the always-blocking closed inspector.
-    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root), (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+      const passed = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(passed.status, 0, passed.stderr);
+      assert.match(passed.stdout, /\[verify-existing\] bundle and origin scopes PASS/);
+      assert.doesNotMatch(passed.stdout + passed.stderr, /Creating an optimized|Next\.js/);
 
-    const symlinked = join(item.base, "acceptance-link.json");
-    await symlink(acceptancePath, symlinked);
-    for (const options of [
-      { acceptancePath: symlinked, origin: STAGE_B_ORIGIN },
-      { acceptancePath, origin: "https://other.example" },
-      { acceptancePath: "acceptance.json", origin: STAGE_B_ORIGIN },
-      { acceptancePath, origin: STAGE_B_ORIGIN, approved: true },
-      { acceptancePath },
-      null,
-      Object.defineProperty({ origin: STAGE_B_ORIGIN }, "acceptancePath", { enumerable: true, get: () => acceptancePath }),
-    ]) {
-      await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, options),
-        (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
-    }
-    await assert.rejects(() => verifier.verifyInitialBundleBoundary(".next", { acceptancePath, origin: STAGE_B_ORIGIN }),
-      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+      for (const execArgv of [["--no-warnings"]]) {
+        const preloaded = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, execArgv);
+        assert.equal(preloaded.status, 1);
+        assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
+      }
+      const nodeOptions = runVerifyExisting(buildScript, item, acceptancePath,
+        { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NODE_OPTIONS: "--import=data:text/javascript,0" });
+      assert.equal(nodeOptions.status, 1);
+      assert.match(nodeOptions.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
 
-    await writeFile(acceptancePath, Buffer.concat([record, Buffer.from(" ")]));
-    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
-      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+      const linkedDirectory = join(item.base, "linked");
+      await symlink(item.base, linkedDirectory);
+      for (const [options, reasons] of [
+        [{ acceptancePath: join(linkedDirectory, "acceptance.json"), origin: STAGE_B_ORIGIN }, ["UNREADABLE_ACCEPTANCE_RECORD"]],
+        [{ acceptancePath: "acceptance.json", origin: STAGE_B_ORIGIN }, ["INVALID_VERIFY_OPTIONS"]],
+        [{ acceptancePath, origin: STAGE_B_ORIGIN, approved: true }, ["INVALID_VERIFY_OPTIONS"]],
+        [{ acceptancePath }, ["INVALID_VERIFY_OPTIONS"]],
+        [null, ["INVALID_VERIFY_OPTIONS"]],
+        [Object.defineProperty({ origin: STAGE_B_ORIGIN }, "acceptancePath", { enumerable: true, get: () => acceptancePath }),
+          ["INVALID_VERIFY_OPTIONS"]],
+        [{ acceptancePath, origin: "https://other.example" }, ["ORIGIN_NOT_BOUND"]],
+      ]) {
+        assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(item.root, options))).reasonCodes, reasons,
+          JSON.stringify(options));
+      }
+      assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(".next", { acceptancePath, origin: STAGE_B_ORIGIN })))
+        .reasonCodes, ["INVALID_VERIFY_OPTIONS"]);
+
+      await writeFile(join(item.root, "static/chunks/entry.js"), `${stageBRegistration(7)} `);
+      const changed = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(changed.status, 1);
+      assert.match(changed.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: .*ADAPTER_STATIC_UNKNOWN/m);
+      assert.doesNotMatch(changed.stderr, /\/private|\/Users|artifact\//);
+    });
+  });
+});
+
+test("stage B: proven markers FAIL even when the record is missing, unadmitted or invalid", async () => {
+  await withStageBArtifact({ entry: `${stageBRegistration(7)}/*jsPDF*/` }, async (item) => {
+    const acceptancePath = join(item.base, "acceptance.json");
+    assert.deepEqual(await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
+      { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["FORBIDDEN_INITIAL_MARKER", "UNREADABLE_ACCEPTANCE_RECORD"],
+        name: "BundleBoundaryError" });
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
     await writeFile(acceptancePath, record);
-    await writeFile(join(item.root, "static/chunks/entry.js"), `${STAGE_B_REGISTRATION} `);
-    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
-      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+    assert.deepEqual((await rejection(verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }))),
+      { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["ACCEPTANCE_NOT_ADMITTED", "FORBIDDEN_INITIAL_MARKER"],
+        name: "BundleBoundaryError" });
+    const pretty = Buffer.from(JSON.stringify(stageBRecordObject(item.expectedInputs, await readGateRevision()), null, 2));
+    await withAdmittedGate([pretty], async ({ gate }) => {
+      await writeFile(acceptancePath, pretty);
+      assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
+        { code: "NQR_BUNDLE_STATIC_CHECK_FAILED",
+          reasonCodes: ["FORBIDDEN_INITIAL_MARKER", "INVALID_ACCEPTANCE_RECORD"], name: "BundleBoundaryError" });
+    });
   });
 });
 
-test("stage B: every decision predicate is mutation-sensitive and a proven violation is never hidden", async () => {
-  await withStageBArtifact(async (item) => {
-    const revision = await stageBGateRevision();
-    const scenario = (id) => (record) => record.timingEvidence.scenarios.find((entry) => entry.id === id);
-    const variants = {
-      base: (record) => record,
-      missingScenario: (record) => { record.timingEvidence.scenarios.pop(); return record; },
-      failedScenario: (record) => { scenario("FIRST_ELIGIBLE_PDF_REQUEST")(record).status = "FAIL"; return record; },
-      unverifiedScenario: (record) => { scenario("NON_PDF_ACTIONS")(record).status = "UNVERIFIED"; return record; },
-      warmColdSwap: (record) => { scenario("WARM_REPETITION")(record).state = "cold"; return record; },
-      duplicateScenario: (record) => {
-        record.timingEvidence.scenarios[1] = { ...record.timingEvidence.scenarios[0] };
-        return record;
-      },
-      partialRoutes: (record) => {
-        for (const entry of record.timingEvidence.scenarios) entry.routes = entry.routes.slice(1);
+test("stage B: markers in Flight-preloaded startup chunks FAIL while deferred loads stay allowed", async () => {
+  const eagerWire = `${STAGE_B_WIRE}2:I[9,["/_next/static/chunks/pdf.js"],"default"]\n`;
+  await withStageBArtifact({ wire: eagerWire, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/` } },
+    async (item) => {
+      const legacy = await inspectInitialBundleBoundary(item.root);
+      assert.ok(!legacy.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER"));
+      const record = stageBRecord(item.expectedInputs, await readGateRevision());
+      await withAdmittedGate([record], async ({ gate }) => {
+        const acceptancePath = join(item.base, "acceptance.json");
+        await writeFile(acceptancePath, record);
+        assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
+          { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["FORBIDDEN_STARTUP_MARKER"], name: "BundleBoundaryError" });
+      });
+    });
+  const deferredEntry = stageBRegistration(7,
+    't=>{t.v(l=>Promise.all(["static/chunks/pdf.js"].map(x=>t.l(x))).then(()=>l(9)))}');
+  await withStageBArtifact({ entry: deferredEntry, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/` } },
+    async (item) => {
+      const record = stageBRecord(item.expectedInputs, await readGateRevision());
+      await withAdmittedGate([record], async ({ gate }) => {
+        const acceptancePath = join(item.base, "acceptance.json");
+        await writeFile(acceptancePath, record);
+        const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
+        assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
+        assert.deepEqual(gate.startupReachableChunks(await inspectTurbopackEmission({
+          artifactRoot: item.root, expectedInputs: item.expectedInputs, profile: SUPPORTED_PROFILE })), ["static/chunks/entry.js"]);
+      });
+    });
+});
+
+test("stage B: every decision predicate has an isolated exact-reason negative", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const revision = await readGateRevision();
+    const scenario = (record, id) => record.timingEvidence.scenarios.find((entry) => entry.id === id);
+    const variants = {
+      base: [(record) => record, "PASS_BUNDLE_SCOPE", []],
+      missingScenario: [(record) => { record.timingEvidence.scenarios.pop(); return record; }, "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
+      failedScenario: [(record) => { scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").status = "FAIL"; return record; }, "FAIL",
+        ["TIMING_POLICY_VIOLATION"]],
+      unverifiedScenario: [(record) => { scenario(record, "NON_PDF_ACTIONS").status = "UNVERIFIED"; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_INCOMPLETE"]],
+      warmColdSwap: [(record) => { scenario(record, "WARM_REPETITION").state = "cold"; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_INCOMPLETE"]],
+      duplicateScenario: [(record) => { record.timingEvidence.scenarios.push({ ...record.timingEvidence.scenarios[0] }); return record; },
+        "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
+      pdfOnlyLanding: [(record) => { scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").routes = ["/th"]; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_INCOMPLETE"]],
+      pdfIncludesLandings: [(record) => {
+        scenario(record, "FIRST_ELIGIBLE_PDF_REQUEST").routes = [...TIMING_SCENARIO_ROUTES.COLD_EMPTY_INVALID_STARTUP];
         return record;
-      },
-      timingBuildMismatch: (record) => { record.timingEvidence.buildId = "other-build"; return record; },
-      rejectedSecurity: (record) => { record.reviews[1].disposition = "REQUEST_CHANGES"; return record; },
-      missingQa: (record) => { record.reviews.shift(); return record; },
-      duplicateTl: (record) => { record.reviews[1] = { ...record.reviews[2] }; return record; },
-      revoked: (record) => { record.revoked = true; return record; },
-      selfApprovalField: (record) => ({ ...record, approved: true }),
-      identityMismatch: (record) => { record.expectedInputs.buildId = "other-build"; return record; },
-      staleGate: (record) => { record.gateRevision.adapterSha256 = "0".repeat(64); return record; },
-      originMismatch: (record) => { record.productionOrigin = "https://other.example"; return record; },
+      }, "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
+      duplicateRoute: [(record) => { const entry = scenario(record, "NON_PDF_ACTIONS"); entry.routes[1] = entry.routes[0]; return record; },
+        "BLOCKED", ["TIMING_EVIDENCE_INCOMPLETE"]],
+      routeOutsideProfile: [(record) => { scenario(record, "WARM_REPETITION").routes[0] = "/fr"; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_INCOMPLETE"]],
+      observationsNotDigest: [(record) => { scenario(record, "NON_PDF_ACTIONS").observationsSha256 = "x"; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_INCOMPLETE"]],
+      timingBuildMismatch: [(record) => { record.timingEvidence.buildId = "other-build"; return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+      timingScopeMismatch: [(record) => { record.timingEvidence.artifactScopeSha256 = "3".repeat(64); return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+      timingFullMismatch: [(record) => { record.timingEvidence.artifactFullSha256 = "4".repeat(64); return record; }, "BLOCKED",
+        ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+      preIdentityMismatch: [(record) => { scenario(record, "COLD_EMPTY_INVALID_STARTUP").preIdentitySha256 = "5".repeat(64); return record; },
+        "BLOCKED", ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+      postIdentityMismatch: [(record) => { scenario(record, "WARM_REPETITION").postIdentitySha256 = "6".repeat(64); return record; },
+        "BLOCKED", ["TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+      timingPolicy: [(record) => { record.timingEvidence.policyVersion = "OTHER"; return record; }, "BLOCKED", ["INVALID_TIMING_EVIDENCE"]],
+      browserEmpty: [(record) => { record.timingEvidence.browser.name = ""; return record; }, "BLOCKED", ["INVALID_TIMING_EVIDENCE"]],
+      publicLocalOrigin: [(record) => { record.timingEvidence.localOrigin = STAGE_B_ORIGIN; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      reversedCollection: [(record) => { record.timingEvidence.collectedAt.end = "2026-09-16T00:00:00Z"; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      evidenceBundleNotDigest: [(record) => { record.timingEvidence.evidenceBundleSha256 = "bundle"; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      rejectedSecurity: [(record) => { record.reviews[1].disposition = "REQUEST_CHANGES"; return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
+      missingQa: [(record) => { record.reviews.shift(); return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
+      duplicateTl: [(record) => { record.reviews.push({ ...record.reviews[2] }); return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
+      reviewReportNotDigest: [(record) => { record.reviews[0].reportSha256 = "report"; return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
+      reviewOtherRevision: [(record) => { record.reviews[2].reviewedGateRevisionSha256 = "7".repeat(64); return record; }, "BLOCKED",
+        ["REVIEW_NOT_ACCEPTED"]],
+      selfApprovalField: [(record) => ({ ...record, approved: true }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
+      wrongProfile: [(record) => { record.profileId = "OTHER"; return record; }, "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
+      wrongPolicy: [(record) => { record.policyVersion = "OTHER"; return record; }, "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]],
+      identityMismatch: [(record) => { record.expectedInputs.buildId = "other-build"; return record; }, "BLOCKED",
+        ["ACCEPTANCE_IDENTITY_MISMATCH"]],
+      staleGate: [(record) => { record.gateRevision.adapterSha256 = "0".repeat(64); return record; }, "BLOCKED", ["GATE_REVISION_MISMATCH"]],
+      originMismatch: [(record) => { record.productionOrigin = "https://other.example"; return record; }, "BLOCKED", ["ORIGIN_NOT_BOUND"]],
     };
     const records = Object.fromEntries(Object.entries(variants)
-      .map(([name, change]) => [name, stageBRecord(item.expectedInputs, revision, change)]));
-    const verifier = await stageBVerifierAdmitting(Object.values(records));
-    const inputs = await stageBInputs(item, records.base);
-    const evaluate = (changes = {}) => verifier.evaluateBundleBoundary({ ...inputs, ...changes });
-    const expectDecision = (decision, status, code) => {
-      assert.equal(decision.status, status, JSON.stringify(decision));
-      if (code) assert.ok(decision.reasonCodes.includes(code), JSON.stringify(decision));
-    };
+      .map(([name, [change]]) => [name, stageBRecord(item.expectedInputs, revision, change)]));
+    const base = records.base.toString("utf8");
+    records.duplicateKey = Buffer.from(base.replace('"schemaVersion":1,', '"schemaVersion":2,"schemaVersion":1,'));
+    records.prettyPrinted = Buffer.from(JSON.stringify(JSON.parse(base), null, 1));
+    assert.notEqual(records.duplicateKey.toString(), base);
+    await withAdmittedGate(Object.values(records), async ({ gate }) => {
+      const inputs = await stageBInputs(item, records.base);
+      const evaluate = (changes = {}) => gate.evaluateBundleBoundary({ ...inputs, ...changes });
+      const expectDecision = (label, result, status, reasonCodes) => {
+        assert.equal(result.status, status, `${label}: ${JSON.stringify(result)}`);
+        assert.deepEqual(result.reasonCodes, reasonCodes, label);
+      };
+      for (const [name, [, status, reasons]] of Object.entries(variants)) {
+        expectDecision(name, evaluate({ acceptanceBytes: records[name] }), status, reasons);
+      }
+      expectDecision("duplicateKey", evaluate({ acceptanceBytes: records.duplicateKey }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]);
+      expectDecision("prettyPrinted", evaluate({ acceptanceBytes: records.prettyPrinted }), "BLOCKED", ["INVALID_ACCEPTANCE_RECORD"]);
 
-    expectDecision(evaluate(), "PASS_BUNDLE_SCOPE");
-    const expectations = {
-      missingScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
-      failedScenario: ["FAIL", "TIMING_POLICY_VIOLATION"],
-      unverifiedScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
-      warmColdSwap: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
-      duplicateScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
-      partialRoutes: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
-      timingBuildMismatch: ["BLOCKED", "TIMING_EVIDENCE_IDENTITY_MISMATCH"],
-      rejectedSecurity: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
-      missingQa: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
-      duplicateTl: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
-      revoked: ["BLOCKED", "ACCEPTANCE_REVOKED"],
-      selfApprovalField: ["BLOCKED", "INVALID_ACCEPTANCE_RECORD"],
-      identityMismatch: ["BLOCKED", "ACCEPTANCE_IDENTITY_MISMATCH"],
-      staleGate: ["BLOCKED", "GATE_REVISION_MISMATCH"],
-      originMismatch: ["BLOCKED", "ORIGIN_NOT_BOUND"],
-    };
-    for (const [name, [status, code]] of Object.entries(expectations)) {
-      expectDecision(evaluate({ acceptanceBytes: records[name] }), status, code);
-    }
+      const legacy = inputs.legacyInspection;
+      const legacyWith = (evidence) => ({ ...legacy, evidence: { ...legacy.evidence, ...evidence } });
+      const inspection = inputs.inspection;
+      const cases = [
+        ["adapterViolation", { inspection: { ...inspection, staticStatus: "STATIC_VIOLATION" } }, "FAIL", ["ADAPTER_STATIC_VIOLATION"]],
+        ["adapterUnknown", { inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" } }, "BLOCKED", ["ADAPTER_STATIC_UNKNOWN"]],
+        ["adapterReleasePass", { inspection: { ...inspection, releaseDecision: "PASS" } }, "BLOCKED", ["INVALID_ADAPTER_INSPECTION"]],
+        ["adapterProfile", { inspection: { ...inspection, profileId: "OTHER" } }, "BLOCKED", ["INVALID_ADAPTER_INSPECTION"]],
+        ["adapterIdentityMissing", { inspection: { ...inspection, identity: { ...inspection.identity, buildId: null } } }, "BLOCKED",
+          ["ACCEPTANCE_IDENTITY_MISMATCH", "INCOMPLETE_ARTIFACT_IDENTITY", "TIMING_EVIDENCE_IDENTITY_MISMATCH"]],
+        ["gateRevision", { gateRevision: { ...inputs.gateRevision, verifierLogicSha256: "1".repeat(64) } }, "BLOCKED",
+          ["GATE_REVISION_MISMATCH", "REVIEW_NOT_ACCEPTED"]],
+        ["origin", { origin: "https://other.example" }, "BLOCKED", ["ORIGIN_NOT_BOUND"]],
+        ["legacyMarker", { legacyInspection: legacyWith({ diagnostics: [...legacy.evidence.diagnostics,
+          { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] }) }, "FAIL", ["FORBIDDEN_INITIAL_MARKER"]],
+        ["legacyResourceLimit", { legacyInspection: legacyWith({ diagnostics: [...legacy.evidence.diagnostics,
+          { code: "UNSUPPORTED_RESOURCE_LIMIT", subject: "x" }] }) }, "BLOCKED", ["LEGACY_INSPECTION_INCOMPLETE"]],
+        ["legacyShape", { legacyInspection: { ...legacy, releaseDecision: "PASS" } }, "BLOCKED", ["INVALID_LEGACY_INSPECTION"]],
+        ["legacyBytes", { legacyInspection: legacyWith({ inputManifest: { ...legacy.evidence.inputManifest,
+          files: legacy.evidence.inputManifest.files.map((file, index) => index ? file : { ...file, sha256: "2".repeat(64) }) } }) },
+          "BLOCKED", ["LEGACY_INSPECTION_IDENTITY_MISMATCH"]],
+        ["startupMarker", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, markers: ["jsPDF"] })) }, "FAIL",
+          ["FORBIDDEN_STARTUP_MARKER"]],
+        ["startupMissing", { startupScan: [] }, "BLOCKED", ["STARTUP_SCAN_INCOMPLETE"]],
+        ["startupBytes", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, sha256: "8".repeat(64) })) }, "BLOCKED",
+          ["STARTUP_SCAN_IDENTITY_MISMATCH"]],
+        ["notBytes", { acceptanceBytes: "not-bytes" }, "BLOCKED", ["MISSING_ACCEPTANCE_RECORD"]],
+        ["oversized", { acceptanceBytes: Buffer.alloc(12 * 1024 * 1024 + 1) }, "BLOCKED", ["ACCEPTANCE_RESOURCE_LIMIT"]],
+        ["unadmittedWithUnknown", { acceptanceBytes: Buffer.from("{}"), inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" } },
+          "BLOCKED", ["ACCEPTANCE_NOT_ADMITTED", "ADAPTER_STATIC_UNKNOWN"]],
+        ["unadmittedWithMarker", { acceptanceBytes: Buffer.from("{}"), legacyInspection: legacyWith({ diagnostics: [
+          { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] }) }, "FAIL", ["ACCEPTANCE_NOT_ADMITTED", "FORBIDDEN_INITIAL_MARKER"]],
+      ];
+      for (const [label, changes, status, reasons] of cases) expectDecision(label, evaluate(changes), status, reasons);
+      expectDecision("violationNotHidden", evaluate({ acceptanceBytes: records.failedScenario, origin: "https://other.example" }),
+        "FAIL", ["ORIGIN_NOT_BOUND", "TIMING_POLICY_VIOLATION"]);
+      for (const hostile of [null, "x", [], new Proxy({}, { ownKeys() { throw new Error("NQR_STAGE_B_MARKER"); } })]) {
+        const result = gate.evaluateBundleBoundary(hostile);
+        assert.deepEqual(result.reasonCodes, ["INVALID_DECISION_INPUT"]);
+        assert.ok(!JSON.stringify(result).includes("NQR_STAGE_B_MARKER"));
+      }
+    });
+  });
+});
 
-    const legacy = structuredClone(inputs.legacyInspection);
-    expectDecision(evaluate({ inspection: { ...inputs.inspection, staticStatus: "STATIC_VIOLATION" } }), "FAIL", "ADAPTER_STATIC_VIOLATION");
-    expectDecision(evaluate({ inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }), "BLOCKED", "ADAPTER_STATIC_UNKNOWN");
-    expectDecision(evaluate({ inspection: { ...inputs.inspection, releaseDecision: "PASS" } }), "BLOCKED", "INVALID_ADAPTER_INSPECTION");
-    expectDecision(evaluate({ gateRevision: { ...inputs.gateRevision, verifierSha256: "1".repeat(64) } }), "BLOCKED", "GATE_REVISION_MISMATCH");
-    expectDecision(evaluate({ origin: "https://other.example" }), "BLOCKED", "ORIGIN_NOT_BOUND");
-    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
-      diagnostics: [...legacy.evidence.diagnostics, { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] } } }), "FAIL", "FORBIDDEN_INITIAL_MARKER");
-    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
-      diagnostics: [...legacy.evidence.diagnostics, { code: "UNSUPPORTED_RESOURCE_LIMIT", subject: "x" }] } } }), "BLOCKED", "LEGACY_INSPECTION_INCOMPLETE");
-    const alteredFiles = structuredClone(legacy.evidence.inputManifest.files);
-    alteredFiles[0].sha256 = "2".repeat(64);
-    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
-      inputManifest: { ...legacy.evidence.inputManifest, files: alteredFiles } } } }), "BLOCKED", "LEGACY_INSPECTION_IDENTITY_MISMATCH");
-    // A proven violation plus unrelated unknowns still reports FAIL.
-    expectDecision(evaluate({ acceptanceBytes: records.failedScenario, origin: "https://other.example",
-      inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }), "FAIL", "TIMING_POLICY_VIOLATION");
-    for (const hostile of [null, "x", [], new Proxy({}, { ownKeys() { throw new Error("NQR_STAGE_B_MARKER"); } })]) {
-      const decision = verifier.evaluateBundleBoundary(hostile);
-      assert.deepEqual(decision.reasonCodes, ["INVALID_DECISION_INPUT"]);
-      assert.ok(!JSON.stringify(decision).includes("NQR_STAGE_B_MARKER"));
-    }
-    expectDecision(evaluate({ acceptanceBytes: "not-bytes" }), "BLOCKED", "MISSING_ACCEPTANCE_RECORD");
+test("stage B: each legacy closed-grammar class closes only through a supported adapter inspection", async () => {
+  assert.deepEqual(Object.keys(LEGACY_CLOSURE).sort(), ["UNSUPPORTED_EXECUTABLE_FORM", "UNSUPPORTED_LINK_MODE",
+    "UNSUPPORTED_MIXED_SCRIPT_MODE", "UNSUPPORTED_SCRIPT_TYPE", "UNSUPPORTED_STATIC_SPECIFIER"]);
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
+    await withAdmittedGate([record], async ({ gate }) => {
+      const inputs = await stageBInputs(item, record);
+      for (const code of Object.keys(LEGACY_CLOSURE)) {
+        const legacyInspection = { ...inputs.legacyInspection, evidence: { ...inputs.legacyInspection.evidence,
+          diagnostics: [{ code, subject: "x" }] } };
+        assert.equal(gate.evaluateBundleBoundary({ ...inputs, legacyInspection }).status, "PASS_BUNDLE_SCOPE", code);
+        assert.deepEqual(gate.evaluateBundleBoundary({ ...inputs, legacyInspection,
+          inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }).reasonCodes, ["ADAPTER_STATIC_UNKNOWN"], code);
+      }
+    });
   });
 });
 
-async function runBuildHarness(args, { verifier, originArtifacts, admission } = {}) {
+async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
   const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
-  let harness = original
-    .replace('import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;")
-    .replace('import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});')
-    .replace('import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;")
-    .replace('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrStageB.verifierModule()")
+  const replacements = [
+    ['import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;"],
+    ['import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});'],
+    ['import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;"],
+    ['process.execArgv.length > 0 || PRELOAD_FLAG.test(process.env.NODE_OPTIONS || "")', "globalThis.__nqrStageB.untrustedRuntime()"],
+  ];
+  let harness = original;
+  for (const [from, to] of replacements) {
+    assert.ok(harness.includes(from), from);
+    harness = harness.replace(from, to);
+  }
+  harness = harness
+    .replaceAll('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrStageB.verifierModule()")
     .replaceAll('await import("./verify-origin-artifacts.mjs")', "await globalThis.__nqrStageB.originModule()");
-  assert.notEqual(harness, original);
   assert.ok(!harness.includes('import("./'));
-  const calls = { spawn: 0, origin: [], verifier: [], originArtifacts: [] };
+  const events = [];
+  const calls = { origin: [], verifier: [], originArtifacts: [] };
   const errors = [];
   const logs = [];
   const previous = { argv: process.argv, exitCode: process.exitCode, error: console.error, log: console.log };
   globalThis.__nqrStageB = {
-    spawnSync: () => { calls.spawn += 1; return { status: 0 }; },
+    spawnSync: () => { events.push("spawn"); return { status: 0 }; },
+    untrustedRuntime,
     assertBuildOrigin: (env, requested) => {
       calls.origin.push(requested);
       return admission === undefined ? { mode: "production", source: "explicit", origin: STAGE_B_ORIGIN } : admission();
     },
     verifierModule: async () => ({
       verifyInitialBundleBoundary: async (...received) => {
+        events.push("verifier");
         calls.verifier.push(received);
-        return verifier ? verifier(...received) : { status: "PASS_BUNDLE_SCOPE" };
+        return verifier ? verifier(calls.verifier.length, ...received) : { status: "PASS_BUNDLE_SCOPE" };
       },
     }),
     originModule: async () => ({
-      verifyOriginArtifacts: async (...received) => { calls.originArtifacts.push(received); return originArtifacts?.(...received); },
+      verifyOriginArtifacts: async (...received) => {
+        events.push("origin");
+        calls.originArtifacts.push(received);
+        return originArtifacts?.(...received);
+      },
     }),
   };
   process.argv = [process.execPath, "/stage-b/scripts/build.mjs", ...args];
@@ -981,7 +1187,7 @@
   console.log = (...line) => logs.push(line.join(" "));
   try {
     await import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}#${stageBHash(JSON.stringify(args))}${Math.random()}`);
-    return { calls, errors, logs, exitCode: process.exitCode };
+    return { calls, errors, events, logs, exitCode: process.exitCode };
   } finally {
     process.argv = previous.argv;
     process.exitCode = previous.exitCode;
@@ -991,31 +1197,41 @@
   }
 }
 
-test("stage B: verify-existing never spawns Next and binds bundle plus origin checks to one artifact", async () => {
+test("stage B: verify-existing never spawns Next, re-verifies after the origin read and prints fixed codes only", async () => {
   const valid = ["--verify-existing", "--artifact", "/stage-b/artifact", "--acceptance", "/stage-b/acceptance.json"];
+  const options = { acceptancePath: "/stage-b/acceptance.json", origin: STAGE_B_ORIGIN };
   const passed = await runBuildHarness(valid);
   assert.equal(passed.exitCode, undefined);
-  assert.equal(passed.calls.spawn, 0);
+  assert.deepEqual(passed.events, ["verifier", "origin", "verifier"]);
   assert.deepEqual(passed.calls.origin, ["production"]);
-  assert.deepEqual(passed.calls.verifier, [["/stage-b/artifact", { acceptancePath: "/stage-b/acceptance.json", origin: STAGE_B_ORIGIN }]]);
+  assert.deepEqual(passed.calls.verifier, [["/stage-b/artifact", options], ["/stage-b/artifact", options]]);
   assert.deepEqual(passed.calls.originArtifacts, [[STAGE_B_ORIGIN, "/stage-b/artifact"]]);
   assert.ok(passed.logs.some((line) => line.includes("not deployment approval")));
 
-  const blocked = await runBuildHarness(valid, {
-    verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); },
-  });
-  assert.equal(blocked.exitCode, 1);
-  assert.equal(blocked.calls.spawn, 0);
-  assert.deepEqual(blocked.calls.originArtifacts, []);
-  assert.deepEqual(blocked.errors, ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]);
+  const changedAfterOrigin = await runBuildHarness(valid, { verifier: (call) => {
+    if (call === 2) throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["ADAPTER_STATIC_UNKNOWN"]);
+    return { status: "PASS_BUNDLE_SCOPE" };
+  } });
+  assert.equal(changedAfterOrigin.exitCode, 1);
+  assert.deepEqual(changedAfterOrigin.errors, ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ADAPTER_STATIC_UNKNOWN"]);
+  assert.ok(!changedAfterOrigin.logs.some((line) => line.includes("[verify-existing]")));
 
-  const originFailure = await runBuildHarness(valid, { originArtifacts: () => { throw new Error("origin: mismatch"); } });
-  assert.equal(originFailure.exitCode, 1);
-  assert.ok(!originFailure.logs.some((line) => line.includes("[verify-existing]")));
+  const blocked = await runBuildHarness(valid, { verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
+  assert.deepEqual([blocked.exitCode, blocked.events, blocked.errors], [1, ["verifier"], ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]]);
 
+  const originFailure = await runBuildHarness(valid, { originArtifacts: () => {
+    throw new Error("robots: /private/secret/path/robots.txt.body");
+  } });
+  assert.deepEqual([originFailure.exitCode, originFailure.errors], [1, ["NQR_ORIGIN_ARTIFACT_CHECK_FAILED"]]);
+
+  const unexpected = await runBuildHarness(valid, { verifier: () => { throw new Error("ENOENT: /private/secret/path"); } });
+  assert.deepEqual([unexpected.exitCode, unexpected.errors], [1, ["NQR_VERIFY_EXISTING_FAILED"]]);
+
+  const untrusted = await runBuildHarness(valid, { untrustedRuntime: () => true });
+  assert.deepEqual([untrusted.exitCode, untrusted.errors, untrusted.events], [1, ["NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME"], []]);
+
   const noOrigin = await runBuildHarness(valid, { admission: () => { throw new Error("[origin] explicit origin required"); } });
-  assert.equal(noOrigin.exitCode, 1);
-  assert.equal(noOrigin.calls.spawn + noOrigin.calls.verifier.length, 0);
+  assert.deepEqual([noOrigin.exitCode, noOrigin.events], [1, []]);
 
   for (const args of [
     ["--verify-existing"],
@@ -1031,29 +1247,26 @@
     const rejected = await runBuildHarness(args);
     assert.equal(rejected.exitCode, 1, JSON.stringify(args));
     assert.match(rejected.errors.join("\n"), /^Usage: /);
-    assert.equal(rejected.calls.spawn + rejected.calls.origin.length + rejected.calls.verifier.length, 0);
+    assert.deepEqual([rejected.events, rejected.calls.origin], [[], []]);
   }
 
   const build = await runBuildHarness([], { admission: () => null,
     verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
-  assert.equal(build.calls.spawn, 1);
+  assert.deepEqual(build.events, ["spawn", "verifier"]);
   assert.deepEqual(build.calls.verifier, [[]]);
   assert.equal(build.exitCode, 1);
 });
 
 test("stage B: the real verify-existing CLI rejects unadmitted evidence without starting Next", async () => {
-  await withStageBArtifact(async (item) => {
+  await withStageBArtifact({}, async (item) => {
     const acceptancePath = join(item.base, "acceptance.json");
-    await writeFile(acceptancePath, stageBRecord(item.expectedInputs, await stageBGateRevision()));
+    await writeFile(acceptancePath, stageBRecord(item.expectedInputs, await readGateRevision()));
     const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
-    const run = (env) => spawnSync(process.execPath,
-      [script, "--verify-existing", "--artifact", item.root, "--acceptance", acceptancePath],
-      { encoding: "utf8", env: { PATH: process.env.PATH, ...env }, timeout: 20000 });
-    const unadmitted = run({ NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN });
+    const unadmitted = runVerifyExisting(script, item, acceptancePath);
     assert.equal(unadmitted.status, 1);
-    assert.match(unadmitted.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW$/m);
+    assert.match(unadmitted.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED$/m);
     assert.doesNotMatch(unadmitted.stdout + unadmitted.stderr, /Creating an optimized|Next\.js|\[verify-existing\]/);
-    const missingOrigin = run({});
+    const missingOrigin = runVerifyExisting(script, item, acceptancePath, {});
     assert.equal(missingOrigin.status, 1);
     assert.match(missingOrigin.stderr, /NEXT_PUBLIC_APP_URL/);
     assert.doesNotMatch(missingOrigin.stdout + missingOrigin.stderr, /Creating an optimized|NQR_BUNDLE/);
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -6,37 +6,64 @@
 const require = createRequire(import.meta.url);
 const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
   + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>";
+const PRELOAD_FLAG = /(?:^|\s)(?:--import|--require|-r|--loader|--experimental-loader)(?:[=\s]|$)/;
+
+async function verifyExisting(artifact, acceptancePath, origin) {
+  // Defense in depth only: code injected before this module could already patch anything it checks.
+  if (process.execArgv.length > 0 || PRELOAD_FLAG.test(process.env.NODE_OPTIONS || "")) {
+    throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
+  }
+  const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
+  const options = { acceptancePath, origin };
+  await verifyInitialBundleBoundary(artifact, options);
+  const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
+  try {
+    await verifyOriginArtifacts(origin, artifact);
+  } catch {
+    throw new Error("NQR_ORIGIN_ARTIFACT_CHECK_FAILED");
+  }
+  // Re-verify after the origin read so a change between the two checks cannot be reported as one artifact.
+  // A change reverted between reads is outside what path-based checks can prove (see Stage A C4).
+  await verifyInitialBundleBoundary(artifact, options);
+}
+
 try {
   const args = process.argv.slice(2);
-  const verifyExisting = args[0] === "--verify-existing";
-  if (verifyExisting
+  const existing = args[0] === "--verify-existing";
+  if (existing
     ? args.length !== 5 || args[1] !== "--artifact" || args[3] !== "--acceptance" || !isAbsolute(args[2]) || !isAbsolute(args[4])
     : args.length > 1 || (args.length && !["--production", "--preview"].includes(args[0]))) {
     throw new Error(USAGE);
   }
   // verify-existing checks the accepted production origin; it has no default artifact or evidence path.
-  const admission = assertBuildOrigin(process.env, verifyExisting ? "production" : args[0]?.slice(2));
-  // These exports have priority over Next's .env files. Gate and build therefore
-  // use the same explicit origin. No dotenv loader, database or network in gate.
-  const env = { ...process.env };
-  if (admission) {
-    env.NQR_DEPLOY_TARGET = admission.mode;
-    if (admission.source === "explicit") env.NEXT_PUBLIC_APP_URL = admission.origin;
+  const admission = assertBuildOrigin(process.env, existing ? "production" : args[0]?.slice(2));
+  if (existing) {
     console.log(`[origin] ${admission.mode} configuration PASS (${admission.source})`);
-  }
-  const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
-  if (verifyExisting) {
-    // Existing artifact only: never spawns Next, typegen, an analyzer, a server, a browser or a database.
-    await verifyInitialBundleBoundary(args[2], { acceptancePath: args[4], origin: admission.origin });
-    const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
-    await verifyOriginArtifacts(admission.origin, args[2]);
+    try {
+      // Existing artifact only: never spawns Next, typegen, an analyzer, a server, a browser or a database.
+      await verifyExisting(args[2], args[4], admission.origin);
+    } catch (error) {
+      // Fixed codes only; filesystem errors can carry absolute paths.
+      const code = error?.name === "BundleBoundaryError" || /^NQR_[A-Z_]+$/.test(error?.message || "")
+        ? error.message : "NQR_VERIFY_EXISTING_FAILED";
+      throw new Error(error?.reasonCodes?.length ? `${code}\nreasons: ${error.reasonCodes.join(",")}` : code);
+    }
     console.log("[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval");
   } else {
+    // These exports have priority over Next's .env files. Gate and build therefore
+    // use the same explicit origin. No dotenv loader, database or network in gate.
+    const env = { ...process.env };
+    if (admission) {
+      env.NQR_DEPLOY_TARGET = admission.mode;
+      if (admission.source === "explicit") env.NEXT_PUBLIC_APP_URL = admission.origin;
+      console.log(`[origin] ${admission.mode} configuration PASS (${admission.source})`);
+    }
     const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
       env, stdio: "inherit",
     });
     if (build.error || build.status !== 0) process.exit(build.status || 1);
     // A fresh build has no admitted QA evidence yet, so this always stays blocked.
+    const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
     await verifyInitialBundleBoundary();
     if (admission) {
       const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
```
