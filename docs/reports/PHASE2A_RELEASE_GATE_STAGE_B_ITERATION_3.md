# NQR-129 Stage B iteration 3 — ซ่อมตาม review ซ้ำของ iteration 2

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-3

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต: [TL review i2](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_2_TL_REVIEW.md) `dbcbaf628b2ded69b9b188d11861e28c1d94b53a6f391bfa79bb4b0b94a0996e` และ [SECURITY review i2](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_2_SECURITY_REVIEW.md) `4b6985b751f8d924d4ce39f79bd82d39bf43660ccab347847290641514a676a0` ทั้งคู่ได้ REQUEST_CHANGES บน canonical5 `6866da8a…2126` (iteration 2 ยังเก็บไว้ที่ `scratchpad/nqr-stageb-b2/project` โดยไม่แก้)

แก้เฉพาะห้าไฟล์ใน root ใหม่ `scratchpad/nqr-stageb-b3/project` ไม่มี install/build/server/browser/network/DB/deploy/commit SOURCE185 ยังเป็น `3b0c6a72…00df` และไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยนจาก i2) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยนจาก i2) |
| verify-initial-bundle-boundary.mjs | `b04ba37e04740261dc0cc2994c17e36396a82708f5045f98faef6820e18b40a3` |
| verify-initial-bundle-boundary.test.mjs | `8a42da551d6a6c31ee004d3f10c3550218e01c879b9dbb7948e5c41dcc5a0a98` |
| build.mjs | `9a5e57c989ba1d2eaabc6609d50335e174bfdcc367616c543073809e48140533` |

- Canonical5: **`3f168b9ce6abe6d2f6c4b8000a7e7df10644eb6bfaa7fb5a69ee5eefcd670bfd`**
- Delta i2→i3: `2a1ba5ab5b4cdac279571b90daaaa1fb2e9b51795f0f666f1a5eb6cea8dd5941`
- Diff i2→i3 อยู่ในภาคผนวก SHA `e2f30d029d82e9a9422c3fb94d432e1f4f7f16869857727d3c0623ecfda4b1ce` ทดสอบแล้วว่า `patch -p1` บน i2 ได้ hash ตรงทั้งห้าไฟล์

## 2. Disposition

| Finding | การแก้ |
| --- | --- |
| TL N1 (P1) / SEC N1 (MEDIUM) — admission list ซ่อนโค้ดได้ | Declaration ต้องเป็น data เท่านั้น: `Object.freeze([])` หรือหนึ่งบรรทัดต่อหนึ่ง entry รูปแบบ `  "<64 hex ตัวเล็ก>",` ต้องมี strict declaration พอดี 1 จุด และมี statement `export const ADMITTED_ACCEPTANCE_SHA256` พอดี 1 จุด รายการที่รันจริงต้องเท่ากับรายการที่ parse จาก source และ array ต้อง frozen ถ้าไม่ครบ → `UNREADABLE_GATE_REVISION` (BLOCKED) Lookup ใช้ `Set` กับ `Set.prototype.has` ที่ capture ตอน load เทสต์ CLI จริงแบบ child process ครอบ 6 กรณี: env list, IIFE ที่ patch `Set.prototype.has`, entry ผสมโค้ด, spacing หลวม, declaration ที่สองใน comment, statement ที่สองใน comment และ decoy ใน comment ที่มีโค้ดจริงอยู่บรรทัดอื่น ทุกกรณี exit 1; control exit 0 |
| SEC N2 (MEDIUM) — marker ถูกเลี่ยงด้วยการเข้ารหัส | ยืนยันตาม NQR129 §5 ว่า marker string เป็นหลักฐานเสริม เพิ่ม `startupChunks` ใน record (`{path, sha256}` ตามลำดับ path) ซึ่งต้องตรงพอดีกับ startup scan ของ artifact ถ้าไม่ตรง → `STARTUP_CHUNKS_NOT_ATTESTED` แปลว่า startup chunk ที่เปลี่ยนชื่อหรือเข้ารหัสจะเข้า PASS ได้ต่อเมื่อ QA/reviewer ตรวจ bytes ชุดนั้นแล้วเท่านั้น |
| TL N2 (P3) — startup scan ทำเฉพาะ SUPPORTED | Scan ทำงานกับทุก adapter inspection ที่ well-formed (marker ใน chunk ที่ graph ระบุว่า startup → FAIL แม้ adapter เป็น UNKNOWN) มีเทสต์ `unknownWithStartupMarker` |
| SEC N3 (LOW) — NODE_OPTIONS เลี่ยงได้ | `--verify-existing` ปฏิเสธถ้า `NODE_OPTIONS` ไม่ว่างหรือมี Node flag ใดก็ตาม ให้รันแบบ `node scripts/build.mjs --verify-existing …` เปล่าๆ เทสต์ CLI ครอบ `--import` ธรรมดา, แบบมี quote, `"--require=…"`, `--max-old-space-size` และ `--no-warnings` |
| TL N3 (P3) — mutation survivors | เพิ่ม unit test ของ `startupReachableChunks` (root, preload, Flight, static import ทอดต่อ, inline import, deferred ไม่นับ), declaration ที่สอง, ISO/วันที่ไม่มีจริง, browser version และ NODE_OPTIONS ทุกรูปแบบ |
| TL N4 (P3) — nit | `collectedAt` ต้องอยู่ในรูป `Date#toISOString()` พอดี (มิลลิวินาที, `Z`) วันที่ไม่มีจริงเช่น `2026-02-30` ใช้ไม่ได้ `localOrigin` port ≤ 65535 ส่วนข้อห้าม Node flag ระบุไว้ใน comment ของ `build.mjs` และในรายงานนี้ |
| SEC N4 (LOW) — marker ใน Flight chunk ตอน record ไม่ถูก admit ได้ BLOCKED | **ยอมรับเป็นข้อจำกัด** ถ้าไม่มี record ที่ admit ก็ไม่มี manifest ให้ adapter สร้าง graph ผลจึงยังเป็น exit 1 ส่วน marker ที่ legacy inspector เห็นยังเป็น FAIL |
| TL F7 / SEC N5 (LOW) — เปลี่ยนแล้วเปลี่ยนกลับระหว่างสองรอบตรวจ | **ยอมรับเป็นข้อจำกัด** ตามที่ระบุไว้แล้วใน i2 |

ใน iteration นี้ผมลองให้ scan เก็บ chunk ที่อ่านไม่ได้ไว้ แล้วรายงาน marker ของ chunk อื่นต่อ แต่ไม่มีเทสต์ใดจับการลบได้ (ใช้ได้เฉพาะ race ที่ไฟล์หายระหว่างตรวจ ซึ่งยัง BLOCKED อยู่แล้ว) จึงถอนออกก่อน freeze

## 3. Verification (Node v24.14.1)

- `node --check` ของไฟล์ที่เปลี่ยน: exit0
- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **278/278 ทั้งสองรอบ** log `1bb8e2b9…57b7` และ `54d02b22…2cf5` TMPDIR ว่าง
- eslint ห้าไฟล์: ไม่มี error/warning
- **Mutation 50 แบบ** (`mutants.cjs` `54a8da24…0505`, log `3d204748…113d2a`): รอบแรกจับได้ 47 ตัว
  - N02 (ยอม statement ที่สอง) และ N03 (ไม่เทียบรายการ runtime กับ source) รอด จึงเพิ่มเทสต์ `secondStatement` และ `commentDecoy` แล้วรันซ้ำ ถูกจับทั้งคู่
  - N09 (scan คืน null เมื่ออ่านไม่ได้) ถูกถอนการเปลี่ยนแปลงออกตามข้างบน
  - ผลรวม: guard ทุกตัวที่อยู่ใน bytes สุดท้ายถูกจับด้วยเทสต์

## 4. ข้อจำกัดที่ยังอยู่

- Adapter ยังจัด runtime chunk `turbopack-*` ของ artifact จริงเป็น UNKNOWN gate จึงยังผ่านบน build จริงไม่ได้ ต้องมี runtime model และ fresh build (ต้องได้สิทธิ์ใหม่)
- `COLD_VALID_INITIAL_PREVIEW` ยังบังคับเป็น PASS ต้องให้ Product Owner ตัดสิน
- การตรวจ `NODE_OPTIONS`/execArgv เป็นเพียง defense in depth, marker scan เป็นหลักฐานเสริม และการเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่านยังพิสูจน์ไม่ได้
- ผู้เขียนคนเดียวกับ iteration ก่อนหน้า ความเป็นอิสระมาจาก reviewer subagent ซึ่งเป็นโมเดลตระกูลเดียวกัน

## ภาคผนวก — diff iteration 2 → 3

```diff
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -502,10 +502,17 @@
 // so a locally authored record stays BLOCKED until PM admits real QA/review evidence through a reviewed change.
 // Revoking evidence means removing its digest. The gate revision hashes this file with this one declaration
 // normalized to an empty list, so admitting a record never changes the logic revision the record is bound to.
+// The list is data only: each entry is one lowercase 64-hex string literal on its own line ("  \"<hex>\",").
+// Any other spelling, code or a second declaration makes the gate revision unreadable, which blocks.
 export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);
 
-const ADMISSION_DECLARATION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[[^\]]*\]\);$/gm;
+const ADMISSION_DECLARATION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[(?:\n {2}"[a-f0-9]{64}",)*\n?\]\);$/gm;
+const ADMISSION_STATEMENT = /^export const ADMITTED_ACCEPTANCE_SHA256\b/gm;
 const EMPTY_ADMISSION_DECLARATION = "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);";
+// Captured at load so later prototype changes cannot widen admission.
+const ADMITTED_SET = new Set(ADMITTED_ACCEPTANCE_SHA256);
+const setHas = Set.prototype.has;
+const isAdmitted = (digest) => typeof digest === "string" && Reflect.apply(setHas, ADMITTED_SET, [digest]);
 
 export const BUNDLE_DECISION = Object.freeze({ PASS: "PASS_BUNDLE_SCOPE", BLOCKED: "BLOCKED", FAIL: "FAIL" });
 
@@ -538,10 +545,11 @@
 const REQUIRED_REVIEW_ROLES = Object.freeze(["QA", "SECURITY", "TL"]);
 const ACCEPTANCE_BYTES_LIMIT = 12 * 1024 * 1024;
 const HEX_64 = /^[a-f0-9]{64}$/;
-const LOCAL_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/;
+const LOCAL_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/;
 const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin,startupScan";
 const GATE_REVISION_KEYS = "adapterSha256,buildWrapperSha256,originArtifactsSha256,originGateSha256,verifierLogicSha256";
-const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,schemaVersion,timingEvidence";
+const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,schemaVersion,startupChunks,"
+  + "timingEvidence";
 const TIMING_KEYS = "artifactFullSha256,artifactScopeSha256,browser,buildId,collectedAt,evidenceBundleSha256,localOrigin,"
   + "policyVersion,scenarios,schemaVersion";
 const SCENARIO_KEYS = "id,observationsSha256,postIdentitySha256,preIdentitySha256,routes,state,status";
@@ -564,10 +572,19 @@
 }
 
 function isoInstant(value) {
-  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
-    && !Number.isNaN(Date.parse(value));
+  // Exact Date#toISOString form only; impossible calendar dates do not round-trip.
+  try {
+    return typeof value === "string" && new Date(value).toISOString() === value;
+  } catch {
+    return false;
+  }
 }
 
+function localOrigin(value) {
+  const match = typeof value === "string" ? LOCAL_ORIGIN.exec(value) : null;
+  return Boolean(match) && Number(match[1]) <= 65535;
+}
+
 function inspectionIdentity(inspection) {
   const identity = plainRecord(inspection) ? inspection.identity : null;
   if (!plainRecord(identity)) return null;
@@ -648,7 +665,7 @@
   return failed;
 }
 
-function checkStartupScan(scan, inspection, expectedInputs, reasons) {
+function checkStartupScan(scan, inspection, expectedInputs, attested, reasons) {
   const expected = startupReachableChunks(inspection);
   if (!Array.isArray(scan) || scan.length !== expected.length) {
     reasons.add("STARTUP_SCAN_INCOMPLETE");
@@ -671,6 +688,10 @@
       reasons.add("FORBIDDEN_STARTUP_MARKER");
     }
   }
+  // Marker strings are supplemental evidence only; the admitted record must name the exact startup chunk bytes
+  // that QA and reviewers examined, so renamed or encoded code cannot enter the startup set unreviewed.
+  const scanned = JSON.stringify(scan.map((item) => ({ path: item?.path, sha256: item?.sha256 })));
+  if (!Array.isArray(attested) || JSON.stringify(attested) !== scanned) reasons.add("STARTUP_CHUNKS_NOT_ATTESTED");
   return failed;
 }
 
@@ -679,7 +700,7 @@
     || !exactKeys(timing.browser, "name,version") || !shortString(timing.browser.name) || !shortString(timing.browser.version)
     || !exactKeys(timing.collectedAt, "end,start") || !isoInstant(timing.collectedAt.start) || !isoInstant(timing.collectedAt.end)
     || Date.parse(timing.collectedAt.end) < Date.parse(timing.collectedAt.start)
-    || typeof timing.localOrigin !== "string" || !LOCAL_ORIGIN.test(timing.localOrigin)
+    || !localOrigin(timing.localOrigin)
     || !HEX_64.test(timing.evidenceBundleSha256) || !Array.isArray(timing.scenarios)) {
     reasons.add("INVALID_TIMING_EVIDENCE");
     return false;
@@ -775,7 +796,7 @@
       reasons.add("MISSING_ACCEPTANCE_RECORD");
     } else if (acceptanceBytes.length > ACCEPTANCE_BYTES_LIMIT) {
       reasons.add("ACCEPTANCE_RESOURCE_LIMIT");
-    } else if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) {
+    } else if (!isAdmitted(sha256(acceptanceBytes))) {
       reasons.add("ACCEPTANCE_NOT_ADMITTED");
     } else {
       try {
@@ -806,8 +827,10 @@
         || !Object.keys(gateRevision).every((key) => HEX_64.test(gateRevision[key]) && record.gateRevision[key] === gateRevision[key])) {
         reasons.add("GATE_REVISION_MISMATCH");
       }
-      if (inspectionShaped && inspection.staticStatus === "STATIC_SUPPORTED"
-        && checkStartupScan(startupScan, inspection, record.expectedInputs, reasons)) failed = true;
+      // Runs for any well-formed inspection: an unknown elsewhere in the graph must not hide an eager marker.
+      if (inspectionShaped && checkStartupScan(startupScan, inspection, record.expectedInputs, record.startupChunks, reasons)) {
+        failed = true;
+      }
       if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
       checkReviews(record.reviews, gateRevision, reasons);
     }
@@ -845,7 +868,13 @@
   const text = async (name) => readFile(fileURLToPath(new URL(name, VERIFIER_URL)), "utf8");
   const verifier = await readFile(fileURLToPath(VERIFIER_URL), "utf8");
   const declarations = verifier.match(ADMISSION_DECLARATION) || [];
-  if (declarations.length !== 1) throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["UNREADABLE_GATE_REVISION"]);
+  const statements = verifier.match(ADMISSION_STATEMENT) || [];
+  const listed = declarations.length === 1 ? [...declarations[0].matchAll(/"([a-f0-9]{64})"/g)].map((match) => match[1]) : [];
+  // The running list must be exactly the data parsed from the hashed source text.
+  if (declarations.length !== 1 || statements.length !== 1 || !Object.isFrozen(ADMITTED_ACCEPTANCE_SHA256)
+    || JSON.stringify([...listed].sort()) !== JSON.stringify([...ADMITTED_ACCEPTANCE_SHA256].sort())) {
+    throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["UNREADABLE_GATE_REVISION"]);
+  }
   return {
     adapterSha256: sha256(await text("./inspect-turbopack-emission.mjs")),
     buildWrapperSha256: sha256(await text("./build.mjs")),
@@ -892,7 +921,7 @@
   const acceptanceBytes = await readBoundFile(acceptancePath, ACCEPTANCE_BYTES_LIMIT);
   if (!acceptanceBytes) return legacyOnly(["UNREADABLE_ACCEPTANCE_RECORD"]);
   // Unadmitted bytes are never parsed or used to steer inspection.
-  if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) return legacyOnly(["ACCEPTANCE_NOT_ADMITTED"]);
+  if (!isAdmitted(sha256(acceptanceBytes))) return legacyOnly(["ACCEPTANCE_NOT_ADMITTED"]);
   let expectedInputs;
   try {
     expectedInputs = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes)).expectedInputs;
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -767,8 +767,9 @@
 }
 
 // Synthetic records exist only to exercise predicates; the shipped admission set never contains them.
-function stageBRecordObject(expectedInputs, gateRevision) {
+function stageBRecordObject(expectedInputs, gateRevision, startupPaths = ["static/chunks/entry.js"]) {
   const full = expectedInputs.artifactFull.canonicalSha256;
+  const rows = new Map(expectedInputs.artifactFull.rows.map((row) => [row.path, row.sha256]));
   return {
     schemaVersion: 1,
     policyVersion: SUPPORTED_PROFILE.policyVersion,
@@ -776,6 +777,7 @@
     productionOrigin: STAGE_B_ORIGIN,
     expectedInputs,
     gateRevision,
+    startupChunks: startupPaths.map((path) => ({ path, sha256: rows.get(path) })),
     timingEvidence: {
       schemaVersion: 1,
       policyVersion: SUPPORTED_PROFILE.policyVersion,
@@ -783,7 +785,7 @@
       artifactFullSha256: full,
       artifactScopeSha256: expectedInputs.artifactScope.canonicalSha256,
       browser: { name: "SyntheticBrowser", version: "0" },
-      collectedAt: { start: "2026-09-17T00:00:00Z", end: "2026-09-17T01:00:00Z" },
+      collectedAt: { start: "2026-09-17T00:00:00.000Z", end: "2026-09-17T01:00:00.000Z" },
       localOrigin: "http://127.0.0.1:3100",
       evidenceBundleSha256: stageBHash("synthetic-evidence-bundle"),
       scenarios: REQUIRED_TIMING_SCENARIOS.map((id) => ({
@@ -805,13 +807,13 @@
   };
 }
 
-function stageBRecord(expectedInputs, gateRevision, change = (record) => record) {
-  return Buffer.from(JSON.stringify(change(structuredClone(stageBRecordObject(expectedInputs, gateRevision)))));
+function stageBRecord(expectedInputs, gateRevision, change = (record) => record, startupPaths = undefined) {
+  return Buffer.from(JSON.stringify(change(structuredClone(stageBRecordObject(expectedInputs, gateRevision, startupPaths)))));
 }
 
 // Real on-disk admission: copies the gate modules, writes the digests into the copied verifier file and imports it
 // through its file URL. Nothing is rewritten in memory, so the gate revision is computed from the running bytes.
-async function withAdmittedGate(recordBytes, callback) {
+async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true } = {}) {
   const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
   try {
     await mkdir(join(base, "scripts"));
@@ -819,13 +821,14 @@
       let source = await readFile(new URL(`./${name}`, import.meta.url), "utf8");
       if (name === "verify-initial-bundle-boundary.mjs") {
         assert.equal(source.match(EMPTY_ADMISSION)?.length, 1);
-        source = source.replace(EMPTY_ADMISSION, `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n${
-          recordBytes.map((bytes) => `  ${JSON.stringify(stageBHash(bytes))},`).join("\n")}\n]);`);
+        const admitted = declaration ?? `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([${
+          recordBytes.map((bytes) => `\n  ${JSON.stringify(stageBHash(bytes))},`).join("")}\n]);`;
+        source = source.replace(EMPTY_ADMISSION, () => admitted);
       }
       await writeFile(join(base, "scripts", name), source);
     }
     await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
-    const gate = await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href);
+    const gate = importGate ? await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href) : null;
     return await callback({ base, gate, buildScript: join(base, "scripts/build.mjs") });
   } finally {
     await rm(base, { recursive: true, force: true });
@@ -908,15 +911,15 @@
       assert.match(passed.stdout, /\[verify-existing\] bundle and origin scopes PASS/);
       assert.doesNotMatch(passed.stdout + passed.stderr, /Creating an optimized|Next\.js/);
 
-      for (const execArgv of [["--no-warnings"]]) {
-        const preloaded = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, execArgv);
-        assert.equal(preloaded.status, 1);
-        assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
+      const flagged = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN }, ["--no-warnings"]);
+      assert.equal(flagged.status, 1);
+      assert.match(flagged.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
+      for (const nodeOptions of ["--import=data:text/javascript,0", '"--import=data:text/javascript,0"',
+        '"--require=/dev/null"', "--max-old-space-size=256"]) {
+        const preloaded = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NODE_OPTIONS: nodeOptions });
+        assert.equal(preloaded.status, 1, nodeOptions);
+        assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, nodeOptions);
       }
-      const nodeOptions = runVerifyExisting(buildScript, item, acceptancePath,
-        { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NODE_OPTIONS: "--import=data:text/javascript,0" });
-      assert.equal(nodeOptions.status, 1);
-      assert.match(nodeOptions.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
 
       const linkedDirectory = join(item.base, "linked");
       await symlink(item.base, linkedDirectory);
@@ -972,7 +975,8 @@
     async (item) => {
       const legacy = await inspectInitialBundleBoundary(item.root);
       assert.ok(!legacy.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER"));
-      const record = stageBRecord(item.expectedInputs, await readGateRevision());
+      const record = stageBRecord(item.expectedInputs, await readGateRevision(), undefined,
+        ["static/chunks/entry.js", "static/chunks/pdf.js"]);
       await withAdmittedGate([record], async ({ gate }) => {
         const acceptancePath = join(item.base, "acceptance.json");
         await writeFile(acceptancePath, record);
@@ -1037,8 +1041,19 @@
       browserEmpty: [(record) => { record.timingEvidence.browser.name = ""; return record; }, "BLOCKED", ["INVALID_TIMING_EVIDENCE"]],
       publicLocalOrigin: [(record) => { record.timingEvidence.localOrigin = STAGE_B_ORIGIN; return record; }, "BLOCKED",
         ["INVALID_TIMING_EVIDENCE"]],
-      reversedCollection: [(record) => { record.timingEvidence.collectedAt.end = "2026-09-16T00:00:00Z"; return record; }, "BLOCKED",
+      reversedCollection: [(record) => { record.timingEvidence.collectedAt.end = "2026-09-16T00:00:00.000Z"; return record; }, "BLOCKED",
         ["INVALID_TIMING_EVIDENCE"]],
+      impossibleDate: [(record) => { record.timingEvidence.collectedAt.start = "2026-02-30T00:00:00.000Z"; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      nonIsoDate: [(record) => { record.timingEvidence.collectedAt.start = "2026-09-17 00:00:00"; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      browserVersionEmpty: [(record) => { record.timingEvidence.browser.version = ""; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      localOriginPortTooHigh: [(record) => { record.timingEvidence.localOrigin = "http://127.0.0.1:99999"; return record; }, "BLOCKED",
+        ["INVALID_TIMING_EVIDENCE"]],
+      startupNotAttested: [(record) => { record.startupChunks = []; return record; }, "BLOCKED", ["STARTUP_CHUNKS_NOT_ATTESTED"]],
+      startupAttestedOtherBytes: [(record) => { record.startupChunks[0].sha256 = "9".repeat(64); return record; }, "BLOCKED",
+        ["STARTUP_CHUNKS_NOT_ATTESTED"]],
       evidenceBundleNotDigest: [(record) => { record.timingEvidence.evidenceBundleSha256 = "bundle"; return record; }, "BLOCKED",
         ["INVALID_TIMING_EVIDENCE"]],
       rejectedSecurity: [(record) => { record.reviews[1].disposition = "REQUEST_CHANGES"; return record; }, "BLOCKED", ["REVIEW_NOT_ACCEPTED"]],
@@ -1099,7 +1114,12 @@
           ["FORBIDDEN_STARTUP_MARKER"]],
         ["startupMissing", { startupScan: [] }, "BLOCKED", ["STARTUP_SCAN_INCOMPLETE"]],
         ["startupBytes", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, sha256: "8".repeat(64) })) }, "BLOCKED",
-          ["STARTUP_SCAN_IDENTITY_MISMATCH"]],
+          ["STARTUP_CHUNKS_NOT_ATTESTED", "STARTUP_SCAN_IDENTITY_MISMATCH"]],
+        ["startupUnreadable", { startupScan: inputs.startupScan.map((entry) => ({ ...entry, sha256: null })) }, "BLOCKED",
+          ["STARTUP_CHUNKS_NOT_ATTESTED", "STARTUP_SCAN_IDENTITY_MISMATCH"]],
+        ["unknownWithStartupMarker", { inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" },
+          startupScan: inputs.startupScan.map((entry) => ({ ...entry, markers: ["jsPDF"] })) }, "FAIL",
+          ["ADAPTER_STATIC_UNKNOWN", "FORBIDDEN_STARTUP_MARKER"]],
         ["notBytes", { acceptanceBytes: "not-bytes" }, "BLOCKED", ["MISSING_ACCEPTANCE_RECORD"]],
         ["oversized", { acceptanceBytes: Buffer.alloc(12 * 1024 * 1024 + 1) }, "BLOCKED", ["ACCEPTANCE_RESOURCE_LIMIT"]],
         ["unadmittedWithUnknown", { acceptanceBytes: Buffer.from("{}"), inspection: { ...inspection, staticStatus: "STATIC_UNKNOWN" } },
@@ -1137,13 +1157,68 @@
   });
 });
 
+test("stage B: startup reachability follows roots, Flight preloads and static imports but not deferred loads", () => {
+  const edge = (kind, from, to, condition) => ({ kind, from, to, ...(condition ? { condition } : {}) });
+  const inspection = { graph: { edges: [
+    edge("synchronous-instantiation", "static/chunks/import-a.js", "static/chunks/import-b.js"),
+    edge("synchronous-instantiation", "static/chunks/root.js", "static/chunks/import-a.js"),
+    edge("synchronous-instantiation", "route:/th", "static/chunks/root.js", "SCRIPT_ROOT"),
+    edge("synchronous-instantiation", "route:/th", "static/chunks/preload.js", "PRELOAD_DECLARATION"),
+    edge("flight-resolve-preload", "inline:th:1", "static/chunks/flight.js"),
+    edge("synchronous-instantiation", "inline:th:2", "static/chunks/inline-import.js"),
+    edge("explicit-chunk-load", "thunk:static/chunks/root.js:7", "static/chunks/deferred.js", "DEFERRED_INVOCATION"),
+    edge("synchronous-instantiation", "static/chunks/deferred.js", "static/chunks/deferred-import.js"),
+    edge("synchronous-instantiation", "thunk:static/chunks/root.js:7", "module:9", "AFTER_CHUNK_LOAD"),
+    edge("synchronous-instantiation", "inline:th:1", "module:7", "FLIGHT_IMPORT"),
+    edge("synchronous-instantiation", "route:/th", "static/chunks/unlisted.js", "OTHER_CONDITION"),
+  ] } };
+  assert.deepEqual(startupReachableChunks(inspection), ["static/chunks/flight.js", "static/chunks/import-a.js",
+    "static/chunks/import-b.js", "static/chunks/inline-import.js", "static/chunks/preload.js", "static/chunks/root.js"]);
+  assert.deepEqual(startupReachableChunks({}), []);
+});
+
+test("stage B: the admission list is data only; code, loose spelling or a second declaration blocks", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
+    const digest = stageBHash(record);
+    const acceptancePath = join(item.base, "acceptance.json");
+    await writeFile(acceptancePath, record);
+    const env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NQR_STAGE_B_ADMIT: digest };
+    const control = `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n]);`;
+    const declarations = {
+      control,
+      environment: "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([process.env.NQR_STAGE_B_ADMIT]);",
+      prototypePatch: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([(() => { Set.prototype.has = () => true; return "${digest}"; })()]);`,
+      mixedEntry: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n  process.env.NQR_STAGE_B_ADMIT,\n]);`,
+      looseSpacing: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([ "${digest}" ]);`,
+      secondDeclaration: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/`,
+      secondStatement: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = unreviewed;\n*/`,
+      // The only strict-form declaration is an inert comment; the running list comes from code on another line.
+      commentDecoy: "const nqrStageBDecoy = 0; export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([process.env.NQR_STAGE_B_ADMIT]);\n"
+        + "/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/",
+    };
+    for (const [name, declaration] of Object.entries(declarations)) {
+      await withAdmittedGate([record], async ({ buildScript }) => {
+        const result = runVerifyExisting(buildScript, item, acceptancePath, env);
+        if (name === "control") {
+          assert.equal(result.status, 0, result.stderr);
+        } else {
+          assert.equal(result.status, 1, name);
+          // A prototype patch also disturbs other checks; what matters is that the unreadable revision blocks.
+          assert.match(result.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: (?:[A-Z_]+,)*UNREADABLE_GATE_REVISION(?:,[A-Z_]+)*$/m, name);
+        }
+      }, { declaration, importGate: false });
+    }
+  });
+});
+
 async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
   const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
   const replacements = [
     ['import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;"],
     ['import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});'],
     ['import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;"],
-    ['process.execArgv.length > 0 || PRELOAD_FLAG.test(process.env.NODE_OPTIONS || "")', "globalThis.__nqrStageB.untrustedRuntime()"],
+    ['process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""', "globalThis.__nqrStageB.untrustedRuntime()"],
   ];
   let harness = original;
   for (const [from, to] of replacements) {
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -6,11 +6,11 @@
 const require = createRequire(import.meta.url);
 const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
   + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>";
-const PRELOAD_FLAG = /(?:^|\s)(?:--import|--require|-r|--loader|--experimental-loader)(?:[=\s]|$)/;
 
 async function verifyExisting(artifact, acceptancePath, origin) {
-  // Defense in depth only: code injected before this module could already patch anything it checks.
-  if (process.execArgv.length > 0 || PRELOAD_FLAG.test(process.env.NODE_OPTIONS || "")) {
+  // Defense in depth only: code injected before this module could already patch anything it checks. Run as a plain
+  // `node scripts/build.mjs --verify-existing …` with no Node flags and no NODE_OPTIONS; anything else is refused.
+  if (process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== "") {
     throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
   }
   const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
```
