# NQR-129 Stage B iteration 9 — `COLD_VALID_INITIAL_PREVIEW` เป็น NOT_APPLICABLE ได้เมื่อพิสูจน์ได้ว่าไม่มี flow

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-9

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ยังไม่ integrate เข้า SOURCE และ release ยัง BLOCKED**

## 0. ที่มา

iteration 8 (canonical5 `1c4bdab3…edb7`) ถูก ACCEPT ทั้งสองฝ่ายและ integrate เข้า SOURCE แล้ว เงื่อนไขที่ยังค้างคือฉาก `COLD_VALID_INITIAL_PREVIEW` ที่ gate บังคับให้ต้อง PASS

ผลตรวจโค้ด (อ่านอย่างเดียว): แอปไม่มีทางแสดง preview ที่ valid ตั้งแต่เปิดหน้า

- `Generator` เริ่มด้วย `useState<DraftMap>(emptyDrafts)` และ `emptyDrafts()` คืนค่าว่างทุกชนิด (`src/components/generator/drafts.ts`)
- prop มีแค่ `locale`, `initialType`, `accountEnabled`, `className` ซึ่ง `initialType` เลือกแท็บเท่านั้น
- ทั้ง `src/` ไม่มี `searchParams`, `localStorage`, `sessionStorage` หรือ `document.cookie` เลย จึงไม่มีทาง prefill
- preview/Test Scan mount เฉพาะเมื่อ payload ผ่าน validation

2026-09-18 Product Owner เลือก "ให้เป็น NOT_APPLICABLE ได้" iteration นี้จึงเปิดช่องนั้นแบบผูกกับหลักฐาน ไม่ใช่แบบเชื่อคำประกาศใน record

## 1. สิ่งที่เปลี่ยน (แก้สองไฟล์ใน `scratchpad/nqr-stageb-b9/project`)

1. เพิ่มรายการซอร์สที่ใช้เป็นหลักฐาน `COLD_PREVIEW_ABSENCE_SOURCES` สี่ไฟล์ (สองหน้าเพจที่ render Generator, ตัว Generator และ drafts) และค่า pin `COLD_PREVIEW_ABSENCE_SHA256 = 4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453`
2. เพิ่ม `readColdPreviewAbsence(repoRoot)` ซึ่งอ่านสี่ไฟล์นั้นผ่าน `readBoundFile` (ปฏิเสธ symlink, ตรวจ realpath, จำกัดขนาด) แล้วคืน digest ของ `[{path,sha256}]` ถ้าไฟล์ใดหายหรืออ่านไม่ได้จะคืน `null`
3. `decideExistingArtifact` คำนวณค่านี้จาก repo root ของ gate ที่กำลังรันจริง แล้วส่งเข้า `evaluateBundleBoundary` เป็น input ใหม่ `coldPreviewAbsence` (อยู่ใน `DECISION_INPUT_KEYS` จึง **ต้อง** มีเสมอ และต้องเป็น string หรือ null)
4. `checkTimingEvidence` ยอมรับ `status === "NOT_APPLICABLE"` เฉพาะเมื่อ scenario เป็น `COLD_VALID_INITIAL_PREVIEW` **และ** `coldPreviewAbsence` ตรงกับค่าที่ pin ไว้ กรณีอื่นทั้งหมดได้ reason code ใหม่ `SCENARIO_NOT_APPLICABLE_UNPROVEN` และผลเป็น BLOCKED
5. ฉากนั้นยังต้องมี route ครบ, identity ตรง, `observationsSha256` และ state เหมือนเดิม QA จึงยังต้องไปที่ทุก route และบันทึกสิ่งที่เห็นจริง

**เหตุผลของดีไซน์:** หลักฐานว่า "ทำไม่ได้" ต้องไม่มาจาก record ที่คนเขียน ถ้าวันหน้ามีการเพิ่ม prefill เข้าไปในสี่ไฟล์นี้ digest จะเปลี่ยนทันที ฉากนี้จะกลับมาบังคับ PASS เองโดยไม่ต้องมีใครจำ และถ้า gate ถูกรันในที่ที่ไม่มีซอร์ส (เช่นสำเนาเฉพาะ scripts/) ผลจะเป็น BLOCKED ไม่ใช่ผ่าน

## 2. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `629eb10bf84792c81447d97a63c0b54344483353ede6934be75e7f8998870959` |
| verify-initial-bundle-boundary.test.mjs | `81612f4142597b7058c2c5be2aced34e30314fb3ebad1de74cc74dbb8dd249fb` |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` (ไม่เปลี่ยน) |

- Canonical5 (สูตรเดิม `sha256(JSON.stringify([{sha256,path:"project/scripts/<file>"}…]))` เรียงตามลำดับ adapter, adapter test, verifier, verifier test, build): **`f551d9ca7fc0e08d044ac547b450cb424d7a651b46d8448d459e86acc0b6e7cb`**
- Delta เฉพาะสองไฟล์ที่เปลี่ยน (สูตร canonical เดียวกัน): `fe338032958895ee3cd9e801ec88839c226ce432bf90444c1c0092477968eef1`
- Diff i8→i9 อยู่ในภาคผนวก SHA-256 `da8435a32351e04fc30f1afce297216f223ae1323fdcfc05b86193fca5e37a7a` (272 บรรทัด) ตรวจแล้วว่า `patch -p1` บนสำเนา i8 ได้ canonical5 ข้างบนตรงกัน
- Dependency pin `753c9343…969c` และ `ADMITTED_ACCEPTANCE_SHA256` (ว่าง) ไม่เปลี่ยน
- หมายเหตุ: `verifierLogicSha256` เปลี่ยนเพราะโค้ด verifier เปลี่ยน ดังนั้น **gate revision เปลี่ยน** record ที่เคย admit ไว้ (ยังไม่มี) จะต้องออกใหม่

## 3. เทสต์ที่เพิ่ม (สามชุด)

1. `NOT_APPLICABLE is accepted only for the exempt scenario and only while the sources prove the absence` — ฉากที่ยกเว้นผ่านเมื่อมี digest ตรง, ไม่ผ่านเมื่อ digest เป็น null/ว่าง/ผิดหนึ่งตัวอักษร/ตัวพิมพ์ใหญ่, ฉากอื่นยกเว้นไม่ได้แม้มีหลักฐาน, สตริงสถานะที่คล้ายกัน (`"NOT_APPLICABLE "`) ยังเป็น `TIMING_EVIDENCE_INCOMPLETE` และ input ที่ขาด key หรือใส่ชนิดอื่นได้ `INVALID_DECISION_INPUT`
2. `the cold-preview proof is read from the reviewed sources and fails closed when they move or change` — ยืนยันว่า pin ตรงกับซอร์สจริงของ repo, โฟลเดอร์ว่างได้ `null`, แก้ไฟล์ใดไฟล์หนึ่งทำให้ digest เปลี่ยน, ลบไฟล์ได้ `null` และ symlink แทนไฟล์จริงก็ได้ `null`
3. `the real CLI accepts the exempt scenario with the sources present and blocks without them` — รัน `build.mjs --verify-existing` จริงสองรอบบนสำเนา gate ที่ admit แล้ว รอบที่มีซอร์สสี่ไฟล์ exit 0 รอบที่ไม่มี exit 1 พร้อม `reasons: SCENARIO_NOT_APPLICABLE_UNPROVEN`

## 4. Verification (Node v24.14.1)

- `npm run test:scripts` ในพื้นที่ candidate: **287/287 สองรอบ** (ฐานเดิม 284 + สามเทสต์ใหม่) eslint ไม่มี error และไม่มี warning
- **Mutation 11 แบบ ถูกจับทั้งหมด (11/11)** โดยรัน suite ของ verifier ต่อหนึ่ง mutant
  - M1 ยอมให้ทุก scenario ยกเว้นได้ → killed
  - M2 ไม่ต้องมีหลักฐาน → killed
  - M3 ยกเว้นเสมอ → killed
  - M4 ตัด type guard ของ input → killed
  - M5 ไม่บังคับ key ใน `DECISION_INPUT_KEYS` → killed (12 เทสต์ fail)
  - M6 ข้ามไฟล์ที่หายแทนที่จะคืน null → killed
  - M7 ตัด `path` ออกจากแถว digest → killed
  - M8 ใช้ค่า pin แทนการอ่านไฟล์จริง → killed
  - M9 อ่านด้วย path สัมพัทธ์ → killed
  - M10 เปลี่ยนรูป digest → killed
  - M11 อ่านแค่ไฟล์แรก → killed
- SOURCE ไม่ถูกแก้ในงานนี้ ไม่มี install/build/typegen/server/browser/network/DB/deploy/commit/push

## 5. ข้อจำกัดที่ยังอยู่

- ยังไม่มี runtime model ของ Turbopack ดังนั้น artifact จริงยังได้ `ADAPTER_STATIC_UNKNOWN` (ดู [PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md](PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md))
- หลักฐานนี้ผูกกับซอร์สสี่ไฟล์ ถ้ามีการเพิ่มหน้าใหม่ที่ render `Generator` ด้วย prop อื่น รายการนี้ต้องถูกทบทวน — เทสต์จับได้เฉพาะการเปลี่ยนสี่ไฟล์ที่ระบุ ไม่ได้จับการเพิ่มไฟล์ใหม่ที่ไหนก็ได้ นี่เป็นข้อจำกัดที่ reviewer ควรพิจารณาว่าพอหรือไม่
- S5-2, การสลับไฟล์ระหว่าง hash กับ import และเงื่อนไข C1/C2 ยังเหมือน iteration 8
- การอนุญาตนี้เป็นการตัดสินใจเชิงนโยบายของ Product Owner ไม่ใช่ข้อสรุปว่า flow นี้ไม่จำเป็นต่อผู้ใช้

## 6. ภาคผนวก — diff i8→i9 (`patch -p1` บน iteration 8)

```diff
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -533,6 +533,21 @@
 });
 export const REQUIRED_TIMING_SCENARIOS = Object.freeze(Object.keys(TIMING_SCENARIO_ROUTES));
 
+// NQR129 §7 wants evidence for every scenario, but this application never renders a valid preview on first paint:
+// every draft field starts empty and nothing prefills them from the URL, cookies or storage, so QA cannot observe
+// COLD_VALID_INITIAL_PREVIEW at all. On 2026-09-18 the Product Owner allowed that one scenario to be recorded
+// NOT_APPLICABLE while the absence stays proven. The proof is not taken from the record: the verifier re-reads the
+// reviewed sources below at verify time and accepts NOT_APPLICABLE only while their digest matches the pinned value,
+// so adding any prefill path changes the digest and blocks until this policy is reviewed again.
+export const COLD_PREVIEW_ABSENCE_SOURCES = Object.freeze([
+  "src/app/[locale]/page.tsx",
+  "src/app/[locale]/qr/[type]/page.tsx",
+  "src/components/generator/Generator.tsx",
+  "src/components/generator/drafts.ts",
+]);
+export const COLD_PREVIEW_ABSENCE_SHA256 = "4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453";
+const NOT_APPLICABLE_SCENARIO = "COLD_VALID_INITIAL_PREVIEW";
+
 // NQR129 §4 per-class closure: which reviewed adapter predicate closes each legacy closed-grammar gap. A class
 // closes only when the adapter returns STATIC_SUPPORTED for the same admitted bytes. Resource limits,
 // unreadable/escaped inputs and forbidden markers have no closure.
@@ -548,7 +563,7 @@
 const ACCEPTANCE_BYTES_LIMIT = 12 * 1024 * 1024;
 const HEX_64 = /^[a-f0-9]{64}$/;
 const LOCAL_ORIGIN = /^http:\/\/(?:127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/;
-const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin,startupScan";
+const DECISION_INPUT_KEYS = "acceptanceBytes,coldPreviewAbsence,gateRevision,inspection,legacyInspection,origin,startupScan";
 const GATE_REVISION_KEYS = "adapterSha256,buildWrapperSha256,originArtifactsSha256,originGateSha256,verifierLogicSha256";
 const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,schemaVersion,startupChunks,"
   + "timingEvidence";
@@ -700,7 +715,7 @@
   return failed;
 }
 
-function checkTimingEvidence(timing, identity, reasons) {
+function checkTimingEvidence(timing, identity, reasons, coldPreviewAbsence) {
   if (!exactKeys(timing, TIMING_KEYS) || timing.schemaVersion !== 1 || timing.policyVersion !== SUPPORTED_PROFILE.policyVersion
     || !exactKeys(timing.browser, "name,version") || !shortString(timing.browser.name) || !shortString(timing.browser.version)
     || !exactKeys(timing.collectedAt, "end,start") || !isoInstant(timing.collectedAt.start) || !isoInstant(timing.collectedAt.end)
@@ -733,6 +748,11 @@
     if (scenario.status === "FAIL") {
       failed = true;
       reasons.add("TIMING_POLICY_VIOLATION");
+    } else if (scenario.status === "NOT_APPLICABLE") {
+      // Only the one scenario the Product Owner exempted, and only while the sources still prove it cannot occur.
+      if (scenario.id !== NOT_APPLICABLE_SCENARIO || coldPreviewAbsence !== COLD_PREVIEW_ABSENCE_SHA256) {
+        reasons.add("SCENARIO_NOT_APPLICABLE_UNPROVEN");
+      }
     } else if (scenario.status !== "PASS") {
       reasons.add("TIMING_EVIDENCE_INCOMPLETE");
     }
@@ -782,7 +802,11 @@
       reasons.add("INVALID_DECISION_INPUT");
       return decision(BUNDLE_DECISION.BLOCKED, reasons, null);
     }
-    const { acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan } = input;
+    const { acceptanceBytes, coldPreviewAbsence, gateRevision, inspection, legacyInspection, origin, startupScan } = input;
+    if (coldPreviewAbsence !== null && typeof coldPreviewAbsence !== "string") {
+      reasons.add("INVALID_DECISION_INPUT");
+      return decision(BUNDLE_DECISION.BLOCKED, reasons, null);
+    }
     identity = inspectionIdentity(inspection);
     const inspectionShaped = plainRecord(inspection) && inspection.schemaVersion === 1 && inspection.releaseDecision === "BLOCKED"
       && inspection.policyVersion === SUPPORTED_PROFILE.policyVersion && inspection.profileId === SUPPORTED_PROFILE.profileId;
@@ -836,7 +860,7 @@
       if (inspectionShaped && checkStartupScan(startupScan, inspection, record.expectedInputs, record.startupChunks, reasons)) {
         failed = true;
       }
-      if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
+      if (checkTimingEvidence(record.timingEvidence, identity, reasons, coldPreviewAbsence)) failed = true;
       checkReviews(record.reviews, gateRevision, reasons);
     }
   } catch {
@@ -889,6 +913,20 @@
   };
 }
 
+/**
+ * Digest over the reviewed sources that prove the application has no cold valid initial preview. Returns null when
+ * any of them is missing or unreadable, which keeps a NOT_APPLICABLE scenario unproven and therefore blocking.
+ */
+export async function readColdPreviewAbsence(repoRoot) {
+  const rows = [];
+  for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
+    const bytes = await readBoundFile(join(repoRoot, path), INSPECTION_LIMITS.bytesPerFile);
+    if (!bytes) return null;
+    rows.push({ path, sha256: sha256(bytes) });
+  }
+  return sha256(JSON.stringify(rows));
+}
+
 async function scanStartupChunks(artifactRoot, inspection) {
   const scan = [];
   for (const path of startupReachableChunks(inspection)) {
@@ -935,13 +973,16 @@
   }
   const inspection = await inspectTurbopackEmission({ artifactRoot, expectedInputs, profile: SUPPORTED_PROFILE });
   const startupScan = await scanStartupChunks(artifactRoot, inspection);
+  const coldPreviewAbsence = await readColdPreviewAbsence(fileURLToPath(new URL("../", VERIFIER_URL)));
   let gateRevision;
   try {
     gateRevision = await readGateRevision();
   } catch {
     return legacyOnly(["UNREADABLE_GATE_REVISION"]);
   }
-  return evaluateBundleBoundary({ acceptanceBytes, gateRevision, inspection, legacyInspection, origin, startupScan });
+  return evaluateBundleBoundary({
+    acceptanceBytes, coldPreviewAbsence, gateRevision, inspection, legacyInspection, origin, startupScan,
+  });
 }
 
 /**
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -12,6 +12,8 @@
 import {
   ADMITTED_ACCEPTANCE_SHA256,
   BundleBoundaryError,
+  COLD_PREVIEW_ABSENCE_SHA256,
+  COLD_PREVIEW_ABSENCE_SOURCES,
   FORBIDDEN_INITIAL_MARKERS,
   INSPECTION_LIMITS,
   LEGACY_CLOSURE,
@@ -19,6 +21,7 @@
   TIMING_SCENARIO_ROUTES,
   evaluateBundleBoundary,
   inspectInitialBundleBoundary,
+  readColdPreviewAbsence,
   readGateRevision,
   startupReachableChunks,
   verifyInitialBundleBoundary,
@@ -814,7 +817,7 @@
 
 // Real on-disk admission: copies the gate modules, writes the digests into the copied verifier file and imports it
 // through its file URL. Nothing is rewritten in memory, so the gate revision is computed from the running bytes.
-async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true, nested = false } = {}) {
+async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true, nested = false, sources = false } = {}) {
   // nested puts the copy one level below a private folder so tests can plant files in folders Node searches.
   const outer = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
   const base = nested ? join(outer, "gate") : outer;
@@ -830,6 +833,12 @@
         source = source.replace(EMPTY_ADMISSION, () => admitted);
       }
       await writeFile(join(base, "scripts", name), source);
+    }
+    if (sources) {
+      for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
+        await mkdir(dirname(join(base, path)), { recursive: true });
+        await cp(fileURLToPath(new URL(`../${path}`, import.meta.url)), join(base, path));
+      }
     }
     await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
     const gate = importGate ? await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href) : null;
@@ -853,6 +862,7 @@
   const inspection = await inspectTurbopackEmission({ artifactRoot: root, expectedInputs, profile: SUPPORTED_PROFILE });
   return {
     acceptanceBytes,
+    coldPreviewAbsence: COLD_PREVIEW_ABSENCE_SHA256,
     gateRevision: await readGateRevision(),
     inspection,
     legacyInspection: await inspectInitialBundleBoundary(root),
@@ -1630,5 +1640,107 @@
     assert.equal(missingOrigin.status, 1);
     assert.match(missingOrigin.stderr, /NEXT_PUBLIC_APP_URL/);
     assert.doesNotMatch(missingOrigin.stdout + missingOrigin.stderr, /Creating an optimized|NQR_BUNDLE/);
+  });
+});
+
+// Iteration 9: the Product Owner exempted COLD_VALID_INITIAL_PREVIEW because the application cannot produce it.
+// The exemption is only as good as the proof, so these tests pin every predicate that guards it.
+test("stage B: NOT_APPLICABLE is accepted only for the exempt scenario and only while the sources prove the absence", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const revision = await readGateRevision();
+    const exempt = (id) => (record) => {
+      const scenario = record.timingEvidence.scenarios.find((entry) => entry.id === id);
+      scenario.status = "NOT_APPLICABLE";
+      return record;
+    };
+    const variants = {
+      base: [(record) => record],
+      coldPreview: [exempt("COLD_VALID_INITIAL_PREVIEW")],
+      otherScenario: [exempt("EMPTY_TO_VALID_PREVIEW")],
+      unknownStatus: [(record) => {
+        record.timingEvidence.scenarios[1].status = "NOT_APPLICABLE ";
+        return record;
+      }],
+    };
+    const records = Object.fromEntries(Object.entries(variants)
+      .map(([name, [change]]) => [name, stageBRecord(item.expectedInputs, revision, change)]));
+    await withAdmittedGate(Object.values(records), async ({ gate }) => {
+      const inputs = await stageBInputs(item, records.base);
+      const evaluate = (changes) => gate.evaluateBundleBoundary({ ...inputs, ...changes });
+      assert.equal(evaluate({ acceptanceBytes: records.base }).status, "PASS_BUNDLE_SCOPE");
+      // The exempt scenario passes only with the pinned digest present.
+      assert.equal(evaluate({ acceptanceBytes: records.coldPreview }).status, "PASS_BUNDLE_SCOPE");
+      for (const absence of [null, "", `${COLD_PREVIEW_ABSENCE_SHA256.slice(0, 63)}0`, COLD_PREVIEW_ABSENCE_SHA256.toUpperCase()]) {
+        assert.deepEqual(evaluate({ acceptanceBytes: records.coldPreview, coldPreviewAbsence: absence }),
+          { status: "BLOCKED", reasonCodes: ["SCENARIO_NOT_APPLICABLE_UNPROVEN"], identity: null,
+            policyVersion: SUPPORTED_PROFILE.policyVersion }, JSON.stringify(absence));
+      }
+      // No other scenario may be exempted, even with the proof present.
+      assert.deepEqual(evaluate({ acceptanceBytes: records.otherScenario }).reasonCodes, ["SCENARIO_NOT_APPLICABLE_UNPROVEN"]);
+      // A near miss of the status string is still incomplete evidence, not an exemption.
+      assert.deepEqual(evaluate({ acceptanceBytes: records.unknownStatus }).reasonCodes, ["TIMING_EVIDENCE_INCOMPLETE"]);
+      // The proof is an input of the decision, so it must be declared even when nothing is exempted.
+      const without = { ...inputs };
+      delete without.coldPreviewAbsence;
+      assert.deepEqual(gate.evaluateBundleBoundary(without).reasonCodes, ["INVALID_DECISION_INPUT"]);
+      for (const absence of [undefined, 0, false, ["x"], { toString: () => COLD_PREVIEW_ABSENCE_SHA256 }]) {
+        assert.deepEqual(evaluate({ acceptanceBytes: records.base, coldPreviewAbsence: absence }).reasonCodes,
+          ["INVALID_DECISION_INPUT"], JSON.stringify(absence ?? null));
+      }
+    });
   });
 });
+
+test("stage B: the cold-preview proof is read from the reviewed sources and fails closed when they move or change", async () => {
+  assert.deepEqual([...COLD_PREVIEW_ABSENCE_SOURCES].sort(), [...COLD_PREVIEW_ABSENCE_SOURCES]);
+  assert.equal(new Set(COLD_PREVIEW_ABSENCE_SOURCES).size, COLD_PREVIEW_ABSENCE_SOURCES.length);
+  // The pin must describe the application as it is now; editing any listed source blocks until this is reviewed again.
+  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
+  assert.equal(await readColdPreviewAbsence(repoRoot), COLD_PREVIEW_ABSENCE_SHA256);
+
+  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-"));
+  try {
+    assert.equal(await readColdPreviewAbsence(base), null);
+    for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
+      await mkdir(dirname(join(base, path)), { recursive: true });
+      await cp(join(repoRoot, path), join(base, path));
+    }
+    assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
+    const [first, second] = COLD_PREVIEW_ABSENCE_SOURCES;
+    await appendFile(join(base, first), "\n");
+    assert.notEqual(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
+    await cp(join(repoRoot, first), join(base, first));
+    assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
+    // Each listed source is part of the digest, so removing any one of them is unproven, not merely shorter.
+    await rm(join(base, second));
+    assert.equal(await readColdPreviewAbsence(base), null);
+    await symlink(join(repoRoot, second), join(base, second));
+    assert.equal(await readColdPreviewAbsence(base), null);
+  } finally {
+    await rm(base, { recursive: true, force: true });
+  }
+});
+
+test("stage B: the real CLI accepts the exempt scenario with the sources present and blocks without them", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision(), (value) => {
+      value.timingEvidence.scenarios.find((entry) => entry.id === "COLD_VALID_INITIAL_PREVIEW").status = "NOT_APPLICABLE";
+      return value;
+    });
+    const acceptancePath = join(item.base, "acceptance.json");
+    await writeFile(acceptancePath, record);
+    await withAdmittedGate([record], async ({ gate, buildScript }) => {
+      const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
+      assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
+      const passed = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(passed.status, 0, passed.stderr);
+    }, { sources: true });
+    await withAdmittedGate([record], async ({ gate, buildScript }) => {
+      assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })))
+        .reasonCodes, ["SCENARIO_NOT_APPLICABLE_UNPROVEN"]);
+      const blockedRun = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(blockedRun.status, 1);
+      assert.match(blockedRun.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: SCENARIO_NOT_APPLICABLE_UNPROVEN$/m);
+    });
+  });
+});
```
