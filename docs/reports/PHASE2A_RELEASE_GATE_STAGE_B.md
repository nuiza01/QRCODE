# NQR-129 Stage B — conditional bundle gate และ verify-existing (isolated candidate)

วันที่ 2026-09-16 (Asia/Bangkok) | Claude | implementation iteration-1

**Outcome: DONE / AUTHOR-VERIFIED — candidate ห้าไฟล์ครบใน root แยก ไม่ได้ integrate เข้า SOURCE Release ยัง BLOCKED**

## 1. Authority และการตัดสินใจที่บันทึก

- 2026-09-10: ผู้ใช้อนุมัติ workflow ห้าไฟล์ตาม NQR129 ใน isolated space โดย Stage B ต้องรอ independent TL/SEC acceptance ของ Stage A
- 2026-09-16: หลัง [i4](PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_4.md) ได้สถานะ AUTHOR-VERIFIED Claude ถามว่าจะยกเว้นข้อกำหนด independent review ของ Stage A หรือไม่ ผู้ใช้ตอบ **"ทำ B ต่อ"** Claude บันทึกคำตอบนี้เป็นการยกเว้นข้อกำหนด independent review ของ **Stage A i4** โดย Product Owner เพื่อให้เริ่ม Stage B ได้ การยกเว้นนี้ไม่ครอบคลุม independent review ของ Stage B, SOURCE integration, build หรือ deploy
- งานนี้ไม่มี install/build/typegen/analyzer/server/browser/DB/network/deploy/commit/push และไม่สร้าง task/agent/automation ไม่แก้ SOURCE: canonical SOURCE185 หลังงานยังเป็น `3b0c6a72…00df` และ `node_modules` ของ SOURCE ไม่มีไฟล์ที่ถูกเขียนระหว่างรันเทสต์

## 2. Candidate identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 | ก่อนหน้า |
| --- | --- | --- |
| inspect-turbopack-emission.mjs | `d391fe92663e0ba4d70be47888101f9caafdefec6a69f0a97bf25e069317f462` | ใหม่ (i4) |
| inspect-turbopack-emission.test.mjs | `8394ca27adf4cdc0e2117ab5e0a6d60c1fbb1230d27892cb162983524ed3bd8f` | ใหม่ (i4) |
| verify-initial-bundle-boundary.mjs | `e6a5df2dd50a54348d6aaa25345374ca6102e56fb6a6cdcf76251eb7d6a03b64` | SOURCE `a48002f4…3650` |
| verify-initial-bundle-boundary.test.mjs | `fac5f89d6e697c979c3a9da4f8c3e670f3bdf84b94390f9bdc1a23aa5c7457b9` | SOURCE `c7c26601…e240` |
| build.mjs | `ee66c8c257f9ab3ed7685028618d3c19176356c280c1d693484a84a8d63e67ff` | SOURCE `584dce0c…1ecf` |

- Canonical5 `{sha256,path}` ตามลำดับข้างบน: `3e5b8c60503a91d107817102364ba6524fed6fa3b0cec0d1a2e5ff948718a6f7`
- Delta5 `{after,before,path}` (before=`null` สำหรับไฟล์ใหม่): `b1a52792eed2e58aeae59c96cd5ae4c039ca7c37438c565cce4af3a9b380e0fe`
- Diff SOURCE→Stage B ของสามไฟล์เดิมอยู่ในภาคผนวก SHA `7629a828c9ad62b8572a5147552674eb2cd9da403dca237089f8a88b8d68d530` ทดสอบแล้วว่า `patch -p1` บน SOURCE ปัจจุบันได้ hash ตรงทั้งสามไฟล์ ส่วนสองไฟล์ของ adapter สร้างซ้ำได้จาก diff ในรายงาน i4

Root ทดสอบคือ `scratchpad/nqr-stageb/project` ซึ่งมีห้าไฟล์ข้างบน, `origin-gate.mjs`/`verify-origin-artifacts.mjs` และเทสต์ของสองไฟล์นี้ (copy จาก SOURCE ไม่แก้), `package.json`, lock, `AGENTS.md`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `src/i18n/config.ts` (ที่ `next.config.ts` ต้องใช้) และ `node_modules` ที่เป็น symlink ไปยัง SOURCE แบบอ่านอย่างเดียว

## 3. สิ่งที่ implement

### verifier (`verify-initial-bundle-boundary.mjs`)

- `inspectInitialBundleBoundary` เดิม **ไม่เปลี่ยน** และ `verifyInitialBundleBoundary(buildDir)` แบบไม่มี options ยัง throw เสมอเหมือนเดิม (marker → `NQR_BUNDLE_STATIC_CHECK_FAILED`, อย่างอื่น → `NQR_BUNDLE_NEEDS_EMISSION_REVIEW`)
- **Trusted admission:** `ADMITTED_ACCEPTANCE_SHA256` เป็น frozen array **ว่าง** อยู่ใน source ที่ต้องผ่าน review record จะมีผลก็ต่อเมื่อ SHA-256 ของ bytes ตรงกับที่อยู่ใน array นี้ ไม่มี argument, ไฟล์, field `approved`, ชื่อ reviewer หรือ hash ใดจาก caller ที่เพิ่มชุดนี้ได้ ผลคือ record ที่เขียนเองยัง BLOCKED จนกว่า PM จะ admit หลักฐาน QA/review จริงผ่าน code change ที่ review แล้ว ซึ่งตรงกับ NQR129 §4 ที่ไม่ให้สร้างระบบ signing ใหม่
- **`evaluateBundleBoundary(input)`:** pure ไม่อ่านไฟล์ ไม่ execute input ต้องมี key ครบพอดี `acceptanceBytes, gateRevision, inspection, legacyInspection, origin` ผลเป็น `{status, reasonCodes, identity, policyVersion}` โดย status คือ `PASS_BUNDLE_SCOPE` / `BLOCKED` / `FAIL` และ FAIL ชนะ BLOCKED เสมอ
  - Adapter: `STATIC_VIOLATION` → FAIL; `STATIC_UNKNOWN` หรือ inspection ที่ไม่ถูกต้อง → BLOCKED; identity ต้องครบ
  - Record ที่ admit แล้วต้องมี key ครบพอดี (ห้ามมี field เกิน) ต้องมี policy/profile ตรง, identity ตรงกับ adapter ทุก field, `revoked === false`, `productionOrigin` ตรงกับ origin ที่ใช้จริง และ `gateRevision` ตรงกับ SHA ของ adapter/verifier ที่รันอยู่
  - Legacy closed inspector: marker → FAIL, diagnostics ที่ adapter ปิดได้มีเพียง `UNSUPPORTED_EXECUTABLE_FORM`, `…STATIC_SPECIFIER`, `…SCRIPT_TYPE`, `…LINK_MODE`, `…MIXED_SCRIPT_MODE` ส่วน resource limit, input ที่อ่านไม่ได้หรือ escape → BLOCKED ไฟล์ทุกไฟล์ที่ legacy อ่านต้องมี SHA ตรงกับ manifest ที่ adapter admit
  - Timing evidence: browser name/version, build/scope identity และ scenario ครบ 6 ตัว ไม่ซ้ำ (`COLD_EMPTY_INVALID_STARTUP`, `COLD_VALID_INITIAL_PREVIEW`, `EMPTY_TO_VALID_PREVIEW`, `NON_PDF_ACTIONS`, `FIRST_ELIGIBLE_PDF_REQUEST`, `WARM_REPETITION`) state cold/warm ถูกต้อง รวมแล้วครอบคลุมครบ 22 route; `FAIL` → FAIL; สถานะอื่นนอกจาก `PASS` → BLOCKED
  - Reviews: ต้องมี `QA`, `SECURITY`, `TL` อย่างละหนึ่ง disposition `ACCEPT` พร้อม report SHA ถ้ามี dissent, role ซ้ำ หรือ role ที่ไม่รู้จัก → BLOCKED
- **`verifyInitialBundleBoundary(buildDir, {acceptancePath, origin})`:** ต้องเป็น absolute path และ key ต้องตรงพอดี อ่าน record ด้วย `O_NOFOLLOW`, ตรวจ realpath, stable identity และขนาดไม่เกิน 12MiB bytes ที่ยังไม่ admit จะไม่ถูก parse แล้วจึงรัน legacy inspector และ adapter บน artifact เดียวกัน, hash gate revision และส่งเข้า evaluator Resolve เฉพาะ PASS นอกนั้น throw fixed code

### wrapper (`build.mjs`)

- Build path เดิมคงไว้: spawn `next build` แล้วเรียก verifier แบบไม่มี options ซึ่งยัง BLOCKED เสมอ
- โหมดใหม่ `node scripts/build.mjs --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>` ต้องมีตำแหน่ง argument ตรงพอดี ไม่รวมกับ `--production`/`--preview` และไม่มี default หรือ fallback ใช้ origin แบบ production ที่ต้องระบุ `NEXT_PUBLIC_APP_URL` ชัดเจน **ไม่ spawn Next** แล้วรัน bundle gate และ `verifyOriginArtifacts` บน artifact เดียวกัน ข้อความ PASS ระบุว่า "not deployment approval"

## 4. Verification ที่รันจริง (Node v24.14.1)

- Baseline ก่อนแก้ (SOURCE scripts + i4 ใน root แยก): 268/268
- `node --check` ทั้งสามไฟล์: exit0
- Affected suite (`verify-initial-bundle-boundary`, `origin-gate`, `verify-origin-artifacts`, `inspect-turbopack-emission`) รัน 2 รอบบน bytes ที่ freeze แล้ว: **273/273 ทั้งสองรอบ** ไม่มี fail/skip/todo log `e958f0cb…c22c88` และ `79d3274f…a97351` TMPDIR ว่างหลังรัน
- `eslint` บนห้าไฟล์: exit0 มีเพียงข้อความแจ้งว่าไม่มีโฟลเดอร์ pages ซึ่งไม่ใช่ error
- เทสต์ใหม่ 5 ตัว:
  1. Record ครบถ้วนที่เขียนเองยัง BLOCKED ทั้งผ่าน verifier และ evaluator และการยัด admitted set เข้า input → `INVALID_DECISION_INPUT`
  2. Record ที่ admit (ผ่าน harness ที่แทนเฉพาะค่าคงที่ admission และตำแหน่ง module) → `PASS_BUNDLE_SCOPE` แต่ถ้าเปลี่ยน 1 byte ของ artifact หรือ record, ใช้ symlink, origin อื่น, path สัมพัทธ์, key เกิน, getter หรือ `.next` → BLOCKED
  3. Record predicate 15 แบบ + legacy 3 แบบ + adapter/gate/origin ต่างได้ status และ reason ที่คาดไว้ violation ไม่ถูกซ่อนแม้มี unknown ร่วมด้วย และ input ที่เป็นอันตรายไม่ echo
  4. Wrapper harness: `--verify-existing` spawn 0 ครั้ง, เรียก verifier ด้วย options ตรงพอดี, origin check ใช้ artifact เดียวกัน, argument ผิด 9 แบบ → usage โดยไม่เรียกอะไรต่อ, build path เดิมยัง spawn 1 ครั้งและ BLOCKED
  5. CLI จริงแบบ child process: record ที่ยังไม่ admit → exit1 `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` ไม่มี output ของ Next ถ้าไม่มี origin → exit1 ก่อนเรียก verifier

### Mutation sensitivity (16 แบบ ทุกแบบมีเทสต์ fail)

bypass admission ที่ evaluator, bypass ทั้ง wrapper และ evaluator, ลบ origin binding, marker ไม่เป็น FAIL, timing FAIL กลายเป็น BLOCKED, ลบ review check, ลบ revocation, ลบ gate revision, ลบ legacy identity binding, ให้ legacy resource limit ถูก supersede, ลบ scenario completeness, default call ไปใช้ options path, record ไม่ต้อง key ตรงพอดี, verify-existing spawn, verify-existing ข้าม origin artifacts, verify-existing ยอม path สัมพัทธ์

## 5. ข้อจำกัดและสิ่งที่ยังไม่ได้พิสูจน์

- **ไม่มี independent TL/SECURITY review ของ Stage B** ตาม NQR129 §8 ผู้เขียนห้ามอนุมัติงานตัวเอง Stage B จึงยังไม่พร้อม integrate
- **Gate PASS ไม่ได้จริงในตอนนี้โดยตั้งใจ** เพราะ admission set ว่าง และยังไม่มีหลักฐาน browser/QA ของ artifact ที่ build ใหม่ (BrowserOS neo ยังเชื่อมต่อไม่ได้, การ build ยังไม่อยู่ในสิทธิ์)
- Evaluator ตรวจโครงสร้างและ binding ของ timing evidence เท่านั้น ไม่ได้ตรวจ trace ดิบ (initiator/cache/evaluation) ความถูกต้องของเนื้อหาจึงขึ้นกับการ admit record ของ PM หลังตรวจหลักฐานจริง
- `COLD_VALID_INITIAL_PREVIEW` ถูกบังคับให้เป็น PASS ถ้าแอปไม่มี flow นี้ NQR129 §7 ให้ระบุว่า unsupported ซึ่งจะทำให้ gate BLOCKED จนกว่า Product Owner จะตัดสินนโยบาย
- Gate revision ผูกเฉพาะ adapter/verifier ไม่ได้ผูก `build.mjs`, `origin-gate.mjs` หรือ dependency tree ทั้งหมด (full dependency digest ยังเป็น carried provenance)
- Legacy marker ยังเป็น FAIL ตามพฤติกรรมเดิม ถ้า artifact จริงมี marker ใน initial root ที่ policy ใหม่อนุญาต ต้องมีการจัดประเภทใหม่ผ่าน review แยก
- C4/C6 ของ i4 และข้อจำกัด i4 อื่นยังคงอยู่ (ดูรายงาน i4)

## 6. ขั้นถัดไป

1. Independent review ของ Stage B (TL + SECURITY) บน canonical5 `3e5b8c60…a6f7` หรือ Product Owner ยกเว้นอย่างชัดเจนอีกครั้ง
2. การตัดสินใจเรื่อง SOURCE integration ของห้าไฟล์นี้ต้องแยกจาก build/deploy
3. จากนั้นจึงเป็น authority แยกสำหรับ fresh build, browser QA ตาม NQR129 §7 และการ admit acceptance record จริงเข้า source ที่ผ่าน review

## ภาคผนวก — diff SOURCE → Stage B (สามไฟล์เดิม)

```diff
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -1,12 +1,16 @@
 import { createHash } from "node:crypto";
+import { constants as fsConstants } from "node:fs";
 import { createRequire } from "node:module";
-import { open, realpath } from "node:fs/promises";
+import { open, readFile, realpath } from "node:fs/promises";
 import { isAbsolute, join, relative, resolve, sep } from "node:path";
+import { fileURLToPath } from "node:url";
 import { JSDOM, VirtualConsole } from "jsdom";
 
+import { SUPPORTED_PROFILE, inspectTurbopackEmission } from "./inspect-turbopack-emission.mjs";
 import { routePaths } from "./verify-origin-artifacts.mjs";
 
-const require = createRequire(import.meta.url);
+const VERIFIER_URL = import.meta.url;
+const require = createRequire(VERIFIER_URL);
 const acorn = require("next/dist/compiled/acorn/acorn");
 
 export const INSPECTION_LIMITS = Object.freeze({
@@ -491,10 +495,305 @@
   return finalize(state);
 }
 
-export async function verifyInitialBundleBoundary(buildDir = ".next") {
-  const result = await inspectInitialBundleBoundary(buildDir);
-  if (result.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER")) {
-    throw new BundleBoundaryError("NQR_BUNDLE_STATIC_CHECK_FAILED");
-  }
-  throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+// Trusted admission boundary (NQR129 §4). An acceptance record counts only when the SHA-256 of its exact bytes
+// is listed here, in reviewed source. No argument, file, flag, reviewer name or caller hash can extend this set,
+// so a locally authored record stays BLOCKED until PM admits real QA/review evidence through a reviewed change.
+export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);
+
+export const BUNDLE_DECISION = Object.freeze({ PASS: "PASS_BUNDLE_SCOPE", BLOCKED: "BLOCKED", FAIL: "FAIL" });
+
+export const REQUIRED_TIMING_SCENARIOS = Object.freeze([
+  "COLD_EMPTY_INVALID_STARTUP",
+  "COLD_VALID_INITIAL_PREVIEW",
+  "EMPTY_TO_VALID_PREVIEW",
+  "NON_PDF_ACTIONS",
+  "FIRST_ELIGIBLE_PDF_REQUEST",
+  "WARM_REPETITION",
+]);
+
+const REQUIRED_REVIEW_ROLES = Object.freeze(["QA", "SECURITY", "TL"]);
+const ACCEPTANCE_BYTES_LIMIT = 12 * 1024 * 1024;
+const HEX_64 = /^[a-f0-9]{64}$/;
+const DECISION_INPUT_KEYS = "acceptanceBytes,gateRevision,inspection,legacyInspection,origin";
+const RECORD_KEYS = "expectedInputs,gateRevision,policyVersion,productionOrigin,profileId,reviews,revoked,schemaVersion,timingEvidence";
+const TIMING_KEYS = "artifactScopeSha256,browser,buildId,policyVersion,scenarios,schemaVersion";
+// Closed-grammar gaps that only a STATIC_SUPPORTED adapter inspection of the same admitted bytes may close.
+// Resource limits, unreadable/escaped inputs and forbidden markers are never superseded.
+const ADAPTER_CLOSED_LEGACY_CODES = new Set([
+  "UNSUPPORTED_EXECUTABLE_FORM",
+  "UNSUPPORTED_STATIC_SPECIFIER",
+  "UNSUPPORTED_SCRIPT_TYPE",
+  "UNSUPPORTED_LINK_MODE",
+  "UNSUPPORTED_MIXED_SCRIPT_MODE",
+]);
+
+function plainRecord(value) {
+  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
+  const prototype = Object.getPrototypeOf(value);
+  if (prototype !== Object.prototype && prototype !== null) return false;
+  return Object.values(Object.getOwnPropertyDescriptors(value))
+    .every((descriptor) => Object.hasOwn(descriptor, "value") && !descriptor.get && !descriptor.set);
+}
+
+function exactKeys(value, keys) {
+  return plainRecord(value) && Object.keys(value).sort().join(",") === keys;
+}
+
+function shortString(value) {
+  return typeof value === "string" && value.length > 0 && value.length <= 128;
+}
+
+function inspectionIdentity(inspection) {
+  const identity = plainRecord(inspection) ? inspection.identity : null;
+  if (!plainRecord(identity)) return null;
+  const fields = ["buildId", "sourceInventorySha256", "dependencySha256", "artifactFullSha256", "artifactScopeSha256"];
+  if (!fields.every((field) => typeof identity[field] === "string" && identity[field].length > 0)) return null;
+  return Object.fromEntries(fields.map((field) => [field, identity[field]]));
+}
+
+function recordIdentity(expectedInputs) {
+  return {
+    buildId: expectedInputs?.buildId,
+    sourceInventorySha256: expectedInputs?.sourceInventorySha256,
+    dependencySha256: expectedInputs?.dependencySha256,
+    artifactFullSha256: expectedInputs?.artifactFull?.canonicalSha256,
+    artifactScopeSha256: expectedInputs?.artifactScope?.canonicalSha256,
+  };
+}
+
+function checkLegacyInspection(legacy, expectedInputs, reasons) {
+  const evidence = plainRecord(legacy) ? legacy.evidence : null;
+  if (!plainRecord(legacy) || legacy.schemaVersion !== 1 || legacy.scope !== SCOPE || legacy.releaseDecision !== "BLOCKED"
+    || !plainRecord(evidence) || !Array.isArray(evidence.diagnostics) || !Array.isArray(evidence.inputManifest?.files)) {
+    reasons.add("INVALID_LEGACY_INSPECTION");
+    return false;
+  }
+  let failed = false;
+  for (const item of evidence.diagnostics) {
+    if (item?.code === "FORBIDDEN_INITIAL_MARKER") {
+      failed = true;
+      reasons.add("FORBIDDEN_INITIAL_MARKER");
+    } else if (!ADAPTER_CLOSED_LEGACY_CODES.has(item?.code)) {
+      reasons.add("LEGACY_INSPECTION_INCOMPLETE");
+    }
+  }
+  // Both inspections must describe the same admitted bytes, not two different reads of a changing directory.
+  const rows = new Map((Array.isArray(expectedInputs?.artifactFull?.rows) ? expectedInputs.artifactFull.rows : [])
+    .map((row) => [row?.path, row?.sha256]));
+  for (const file of evidence.inputManifest.files) {
+    const path = typeof file?.path === "string" && file.path.startsWith("/_next/") ? file.path.slice(7) : file?.path;
+    if (!rows.has(path) || rows.get(path) !== file?.sha256) {
+      reasons.add("LEGACY_INSPECTION_IDENTITY_MISMATCH");
+      break;
+    }
+  }
+  return failed;
 }
+
+function checkTimingEvidence(timing, identity, reasons) {
+  if (!exactKeys(timing, TIMING_KEYS) || timing.schemaVersion !== 1 || timing.policyVersion !== SUPPORTED_PROFILE.policyVersion
+    || !exactKeys(timing.browser, "name,version") || !shortString(timing.browser.name) || !shortString(timing.browser.version)
+    || !Array.isArray(timing.scenarios)) {
+    reasons.add("INVALID_TIMING_EVIDENCE");
+    return false;
+  }
+  if (!identity || timing.buildId !== identity.buildId || timing.artifactScopeSha256 !== identity.artifactScopeSha256) {
+    reasons.add("TIMING_EVIDENCE_IDENTITY_MISMATCH");
+  }
+  const profileRoutes = new Set(SUPPORTED_PROFILE.routes);
+  const coveredRoutes = new Set();
+  const seen = new Set();
+  let failed = false;
+  for (const scenario of timing.scenarios) {
+    if (!exactKeys(scenario, "id,routes,state,status") || !REQUIRED_TIMING_SCENARIOS.includes(scenario.id)
+      || seen.has(scenario.id) || !Array.isArray(scenario.routes) || scenario.routes.length === 0
+      || !scenario.routes.every((route) => profileRoutes.has(route))
+      || scenario.state !== (scenario.id === "WARM_REPETITION" ? "warm" : "cold")) {
+      reasons.add("TIMING_EVIDENCE_INCOMPLETE");
+      continue;
+    }
+    seen.add(scenario.id);
+    for (const route of scenario.routes) coveredRoutes.add(route);
+    if (scenario.status === "FAIL") {
+      failed = true;
+      reasons.add("TIMING_POLICY_VIOLATION");
+    } else if (scenario.status !== "PASS") {
+      reasons.add("TIMING_EVIDENCE_INCOMPLETE");
+    }
+  }
+  if (seen.size !== REQUIRED_TIMING_SCENARIOS.length || coveredRoutes.size !== profileRoutes.size) {
+    reasons.add("TIMING_EVIDENCE_INCOMPLETE");
+  }
+  return failed;
+}
+
+function checkReviews(reviews, reasons) {
+  const accepted = new Set();
+  if (!Array.isArray(reviews)) {
+    reasons.add("REVIEW_NOT_ACCEPTED");
+    return;
+  }
+  for (const review of reviews) {
+    if (!exactKeys(review, "disposition,reportSha256,role") || !REQUIRED_REVIEW_ROLES.includes(review.role)
+      || review.disposition !== "ACCEPT" || !HEX_64.test(review.reportSha256) || accepted.has(review.role)) {
+      reasons.add("REVIEW_NOT_ACCEPTED");
+      continue;
+    }
+    accepted.add(review.role);
+  }
+  if (accepted.size !== REQUIRED_REVIEW_ROLES.length) reasons.add("REVIEW_NOT_ACCEPTED");
+}
+
+/**
+ * Pure bundle-scope decision over evidence already collected by the trusted verifier. Never reads files,
+ * executes code or loads URLs. PASS_BUNDLE_SCOPE covers this bundle policy only, never deployment.
+ */
+export function evaluateBundleBoundary(input) {
+  const reasons = new Set();
+  let identity = null;
+  let failed = false;
+  try {
+    if (!exactKeys(input, DECISION_INPUT_KEYS)) {
+      reasons.add("INVALID_DECISION_INPUT");
+    } else {
+      const { acceptanceBytes, gateRevision, inspection, legacyInspection, origin } = input;
+      identity = inspectionIdentity(inspection);
+      if (!plainRecord(inspection) || inspection.schemaVersion !== 1 || inspection.releaseDecision !== "BLOCKED"
+        || inspection.policyVersion !== SUPPORTED_PROFILE.policyVersion || inspection.profileId !== SUPPORTED_PROFILE.profileId) {
+        reasons.add("INVALID_ADAPTER_INSPECTION");
+      } else if (inspection.staticStatus === "STATIC_VIOLATION") {
+        failed = true;
+        reasons.add("ADAPTER_STATIC_VIOLATION");
+      } else if (inspection.staticStatus !== "STATIC_SUPPORTED") {
+        reasons.add("ADAPTER_STATIC_UNKNOWN");
+      }
+      if (!identity) reasons.add("INCOMPLETE_ARTIFACT_IDENTITY");
+
+      if (!(acceptanceBytes instanceof Uint8Array)) {
+        reasons.add("MISSING_ACCEPTANCE_RECORD");
+      } else if (acceptanceBytes.length > ACCEPTANCE_BYTES_LIMIT) {
+        reasons.add("ACCEPTANCE_RESOURCE_LIMIT");
+      } else if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) {
+        reasons.add("ACCEPTANCE_NOT_ADMITTED");
+      } else {
+        let record = null;
+        try {
+          record = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes));
+        } catch {
+          reasons.add("INVALID_ACCEPTANCE_RECORD");
+        }
+        if (record !== null) {
+          if (!exactKeys(record, RECORD_KEYS) || record.schemaVersion !== 1
+            || record.policyVersion !== SUPPORTED_PROFILE.policyVersion || record.profileId !== SUPPORTED_PROFILE.profileId
+            || !plainRecord(record.expectedInputs)) {
+            reasons.add("INVALID_ACCEPTANCE_RECORD");
+          } else {
+            const expected = recordIdentity(record.expectedInputs);
+            if (!identity || Object.keys(expected).some((field) => expected[field] !== identity[field])) {
+              reasons.add("ACCEPTANCE_IDENTITY_MISMATCH");
+            }
+            if (record.revoked !== false) reasons.add("ACCEPTANCE_REVOKED");
+            if (typeof origin !== "string" || record.productionOrigin !== origin) reasons.add("ORIGIN_NOT_BOUND");
+            if (!exactKeys(gateRevision, "adapterSha256,verifierSha256") || !exactKeys(record.gateRevision, "adapterSha256,verifierSha256")
+              || !HEX_64.test(gateRevision.adapterSha256) || !HEX_64.test(gateRevision.verifierSha256)
+              || record.gateRevision.adapterSha256 !== gateRevision.adapterSha256
+              || record.gateRevision.verifierSha256 !== gateRevision.verifierSha256) {
+              reasons.add("GATE_REVISION_MISMATCH");
+            }
+            if (checkLegacyInspection(legacyInspection, record.expectedInputs, reasons)) failed = true;
+            if (checkTimingEvidence(record.timingEvidence, identity, reasons)) failed = true;
+            checkReviews(record.reviews, reasons);
+          }
+        }
+      }
+    }
+  } catch {
+    reasons.add("INVALID_DECISION_INPUT");
+  }
+  const status = failed ? BUNDLE_DECISION.FAIL : reasons.size ? BUNDLE_DECISION.BLOCKED : BUNDLE_DECISION.PASS;
+  return {
+    status,
+    reasonCodes: [...reasons].sort(),
+    identity: status === BUNDLE_DECISION.PASS ? identity : null,
+    policyVersion: SUPPORTED_PROFILE.policyVersion,
+  };
+}
+
+async function readAcceptanceRecord(path) {
+  let handle;
+  try {
+    handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
+    const before = await handle.stat({ bigint: true });
+    if (!before.isFile() || before.size > BigInt(ACCEPTANCE_BYTES_LIMIT) || await realpath(path) !== path) return null;
+    const bytes = Buffer.alloc(Number(before.size));
+    let offset = 0;
+    while (offset < bytes.length) {
+      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
+      if (bytesRead === 0) break;
+      offset += bytesRead;
+    }
+    const after = await handle.stat({ bigint: true });
+    return offset === bytes.length && fileIdentity(before) === fileIdentity(after) ? bytes : null;
+  } catch {
+    return null;
+  } finally {
+    await handle?.close().catch(() => {});
+  }
+}
+
+async function decideExistingArtifact(buildDir, options) {
+  const blocked = (code) => ({
+    status: BUNDLE_DECISION.BLOCKED, reasonCodes: [code], identity: null, policyVersion: SUPPORTED_PROFILE.policyVersion,
+  });
+  let acceptancePath;
+  let origin;
+  try {
+    if (!exactKeys(options, "acceptancePath,origin")) return blocked("INVALID_VERIFY_OPTIONS");
+    ({ acceptancePath, origin } = options);
+  } catch {
+    return blocked("INVALID_VERIFY_OPTIONS");
+  }
+  if (typeof buildDir !== "string" || !isAbsolute(buildDir) || typeof acceptancePath !== "string"
+    || !isAbsolute(acceptancePath) || typeof origin !== "string") return blocked("INVALID_VERIFY_OPTIONS");
+  const acceptanceBytes = await readAcceptanceRecord(acceptancePath);
+  if (!acceptanceBytes) return blocked("UNREADABLE_ACCEPTANCE_RECORD");
+  // Unadmitted bytes are never parsed or used to steer inspection.
+  if (!ADMITTED_ACCEPTANCE_SHA256.includes(sha256(acceptanceBytes))) return blocked("ACCEPTANCE_NOT_ADMITTED");
+  let expectedInputs;
+  try {
+    expectedInputs = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(acceptanceBytes)).expectedInputs;
+  } catch {
+    return blocked("INVALID_ACCEPTANCE_RECORD");
+  }
+  const artifactRoot = resolve(buildDir);
+  const legacyInspection = await inspectInitialBundleBoundary(artifactRoot);
+  const inspection = await inspectTurbopackEmission({ artifactRoot, expectedInputs, profile: SUPPORTED_PROFILE });
+  let gateRevision;
+  try {
+    gateRevision = {
+      adapterSha256: sha256(await readFile(fileURLToPath(new URL("./inspect-turbopack-emission.mjs", VERIFIER_URL)))),
+      verifierSha256: sha256(await readFile(fileURLToPath(VERIFIER_URL))),
+    };
+  } catch {
+    return blocked("UNREADABLE_GATE_REVISION");
+  }
+  return evaluateBundleBoundary({ acceptanceBytes, gateRevision, inspection, legacyInspection, origin });
+}
+
+/**
+ * Without options this remains the always-blocking closed inspector. With explicit options it resolves only for
+ * PASS_BUNDLE_SCOPE on an existing artifact and an admitted acceptance record; it never builds or runs Next.
+ */
+export async function verifyInitialBundleBoundary(buildDir = ".next", options) {
+  if (options === undefined) {
+    const result = await inspectInitialBundleBoundary(buildDir);
+    if (result.evidence.diagnostics.some(({ code }) => code === "FORBIDDEN_INITIAL_MARKER")) {
+      throw new BundleBoundaryError("NQR_BUNDLE_STATIC_CHECK_FAILED");
+    }
+    throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+  }
+  const decision = await decideExistingArtifact(buildDir, options);
+  if (decision.status === BUNDLE_DECISION.PASS) return decision;
+  throw new BundleBoundaryError(decision.status === BUNDLE_DECISION.FAIL
+    ? "NQR_BUNDLE_STATIC_CHECK_FAILED" : "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+}
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -1,15 +1,22 @@
 import assert from "node:assert/strict";
-import { spawn } from "node:child_process";
+import { spawn, spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
-import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
+import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
+import { createRequire } from "node:module";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
+import { fileURLToPath, pathToFileURL } from "node:url";
 import test from "node:test";
 
+import { SUPPORTED_PROFILE, inspectTurbopackEmission } from "./inspect-turbopack-emission.mjs";
 import {
+  ADMITTED_ACCEPTANCE_SHA256,
+  BUNDLE_DECISION,
   BundleBoundaryError,
   FORBIDDEN_INITIAL_MARKERS,
   INSPECTION_LIMITS,
+  REQUIRED_TIMING_SCENARIOS,
+  evaluateBundleBoundary,
   inspectInitialBundleBoundary,
   verifyInitialBundleBoundary,
 } from "./verify-initial-bundle-boundary.mjs";
@@ -668,3 +675,387 @@
     }
   });
 });
+
+// ---- Stage B: conditional bundle-scope decision and verify-existing wrapper -----------------------------
+
+const STAGE_B_ORIGIN = "https://nqr.orenvis.com";
+const STAGE_B_WIRE = '1:I[7,["/_next/static/chunks/entry.js"],"default"]\n';
+const STAGE_B_REGISTRATION = '(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{}]);';
+const stageBHash = (value) => createHash("sha256").update(value).digest("hex");
+const asciiOrder = (a, b) => Buffer.from(a).compare(Buffer.from(b));
+
+async function stageBRows(root, directory = root, prefix = "", rows = []) {
+  for (const name of (await readdir(directory)).sort(asciiOrder)) {
+    const path = join(directory, name);
+    const relativePath = prefix ? `${prefix}/${name}` : name;
+    if ((await lstat(path)).isDirectory()) await stageBRows(root, path, relativePath, rows);
+    else {
+      const bytes = await readFile(path);
+      rows.push({ sha256: stageBHash(bytes), path: relativePath, size: bytes.length, type: "file" });
+    }
+  }
+  return rows;
+}
+
+async function stageBExpectedInputs(root) {
+  const full = await stageBRows(root);
+  const scope = full.filter((row) => row.path === "BUILD_ID" || row.path.startsWith("server/app/")
+    || row.path.startsWith("static/")).sort((a, b) => asciiOrder(a.path, b.path));
+  return {
+    buildId: "stage-b-build",
+    sourceInventorySha256: SUPPORTED_PROFILE.sourceInventorySha256,
+    dependencySha256: SUPPORTED_PROFILE.dependencySha256,
+    nextPackageSha256: SUPPORTED_PROFILE.nextPackageSha256,
+    parserSha256: SUPPORTED_PROFILE.parserSha256,
+    artifactFull: { count: full.length, canonicalSha256: stageBHash(JSON.stringify(full)), rows: full },
+    artifactScope: { count: scope.length, canonicalSha256: stageBHash(JSON.stringify(scope)), rows: scope },
+  };
+}
+
+async function withStageBArtifact(callback) {
+  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-"));
+  const root = join(base, "artifact");
+  try {
+    await mkdir(join(root, "static/chunks"), { recursive: true });
+    await writeFile(join(root, "BUILD_ID"), "stage-b-build\n");
+    for (const route of routePaths) {
+      const path = join(root, "server/app", `${route.slice(1)}.html`);
+      await mkdir(join(path, ".."), { recursive: true });
+      await writeFile(path, '<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script></head><body>'
+        + `<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,${JSON.stringify(STAGE_B_WIRE)}])</script>`
+        + "</body></html>");
+    }
+    await writeFile(join(root, "static/chunks/entry.js"), STAGE_B_REGISTRATION);
+    return await callback({ base, root, expectedInputs: await stageBExpectedInputs(root) });
+  } finally {
+    await rm(base, { recursive: true, force: true });
+  }
+}
+
+async function stageBGateRevision() {
+  return {
+    adapterSha256: stageBHash(await readFile(new URL("./inspect-turbopack-emission.mjs", import.meta.url))),
+    verifierSha256: stageBHash(await readFile(new URL("./verify-initial-bundle-boundary.mjs", import.meta.url))),
+  };
+}
+
+// Synthetic records exist only to exercise predicates; the shipped admission set never contains them.
+function stageBRecord(expectedInputs, gateRevision, change = (record) => record) {
+  const record = {
+    schemaVersion: 1,
+    policyVersion: SUPPORTED_PROFILE.policyVersion,
+    profileId: SUPPORTED_PROFILE.profileId,
+    productionOrigin: STAGE_B_ORIGIN,
+    expectedInputs,
+    gateRevision,
+    timingEvidence: {
+      schemaVersion: 1,
+      policyVersion: SUPPORTED_PROFILE.policyVersion,
+      buildId: expectedInputs.buildId,
+      artifactScopeSha256: expectedInputs.artifactScope.canonicalSha256,
+      browser: { name: "SyntheticBrowser", version: "0" },
+      scenarios: REQUIRED_TIMING_SCENARIOS.map((id) => ({
+        id, routes: [...SUPPORTED_PROFILE.routes], state: id === "WARM_REPETITION" ? "warm" : "cold", status: "PASS",
+      })),
+    },
+    reviews: ["QA", "SECURITY", "TL"].map((role) => ({
+      role, disposition: "ACCEPT", reportSha256: stageBHash(`synthetic-${role}`),
+    })),
+    revoked: false,
+  };
+  return Buffer.from(JSON.stringify(change(structuredClone(record))));
+}
+
+// Loads the real verifier source with a test-only admission set. Only the admission constant and module
+// locations are rewritten; the decision logic under test is byte-for-byte the shipped verifier.
+async function stageBVerifierAdmitting(recordBytes) {
+  const verifierUrl = new URL("./verify-initial-bundle-boundary.mjs", import.meta.url);
+  const source = await readFile(verifierUrl, "utf8");
+  const replacements = [
+    ["export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);",
+      `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze(${JSON.stringify(recordBytes.map((bytes) => stageBHash(bytes)))});`],
+    ["const VERIFIER_URL = import.meta.url;", `const VERIFIER_URL = ${JSON.stringify(verifierUrl.href)};`],
+    ['from "jsdom";', `from ${JSON.stringify(pathToFileURL(createRequire(verifierUrl).resolve("jsdom")).href)};`],
+    ['from "./inspect-turbopack-emission.mjs";', `from ${JSON.stringify(new URL("./inspect-turbopack-emission.mjs", verifierUrl).href)};`],
+    ['from "./verify-origin-artifacts.mjs";', `from ${JSON.stringify(new URL("./verify-origin-artifacts.mjs", verifierUrl).href)};`],
+  ];
+  let harness = source;
+  for (const [from, to] of replacements) {
+    assert.ok(harness.includes(from), from);
+    harness = harness.replace(from, to);
+  }
+  return import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}`);
+}
+
+async function stageBInputs({ root, expectedInputs }, acceptanceBytes) {
+  return {
+    acceptanceBytes,
+    gateRevision: await stageBGateRevision(),
+    inspection: await inspectTurbopackEmission({ artifactRoot: root, expectedInputs, profile: SUPPORTED_PROFILE }),
+    legacyInspection: await inspectInitialBundleBoundary(root),
+    origin: STAGE_B_ORIGIN,
+  };
+}
+
+const rejectsWith = (code) => (error) => error instanceof BundleBoundaryError && error.code === code;
+
+test("stage B: a complete self-authored acceptance record stays blocked without reviewed admission", async () => {
+  assert.ok(Object.isFrozen(ADMITTED_ACCEPTANCE_SHA256));
+  assert.deepEqual(ADMITTED_ACCEPTANCE_SHA256, []);
+  await withStageBArtifact(async (item) => {
+    const record = stageBRecord(item.expectedInputs, await stageBGateRevision());
+    const acceptancePath = join(item.base, "acceptance.json");
+    await writeFile(acceptancePath, record);
+    await assert.rejects(() => verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
+      rejectsWith("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"));
+    const decision = evaluateBundleBoundary(await stageBInputs(item, record));
+    assert.equal(decision.status, BUNDLE_DECISION.BLOCKED);
+    assert.ok(decision.reasonCodes.includes("ACCEPTANCE_NOT_ADMITTED"));
+    assert.equal(decision.identity, null);
+    const smuggled = { ...(await stageBInputs(item, record)), admittedAcceptanceSha256: [stageBHash(record)] };
+    assert.deepEqual(evaluateBundleBoundary(smuggled).reasonCodes, ["INVALID_DECISION_INPUT"]);
+  });
+});
+
+test("stage B: admitted evidence passes bundle scope only for the exact artifact and record bytes", async () => {
+  await withStageBArtifact(async (item) => {
+    const record = stageBRecord(item.expectedInputs, await stageBGateRevision());
+    const verifier = await stageBVerifierAdmitting([record]);
+    const acceptancePath = join(item.base, "acceptance.json");
+    await writeFile(acceptancePath, record);
+    const decision = await verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
+    assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
+    assert.deepEqual(decision.reasonCodes, []);
+    assert.equal(decision.identity.artifactFullSha256, item.expectedInputs.artifactFull.canonicalSha256);
+    assert.equal("releaseDecision" in decision, false);
+
+    // Default invocation of the same module remains the always-blocking closed inspector.
+    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root), (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+
+    const symlinked = join(item.base, "acceptance-link.json");
+    await symlink(acceptancePath, symlinked);
+    for (const options of [
+      { acceptancePath: symlinked, origin: STAGE_B_ORIGIN },
+      { acceptancePath, origin: "https://other.example" },
+      { acceptancePath: "acceptance.json", origin: STAGE_B_ORIGIN },
+      { acceptancePath, origin: STAGE_B_ORIGIN, approved: true },
+      { acceptancePath },
+      null,
+      Object.defineProperty({ origin: STAGE_B_ORIGIN }, "acceptancePath", { enumerable: true, get: () => acceptancePath }),
+    ]) {
+      await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, options),
+        (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+    }
+    await assert.rejects(() => verifier.verifyInitialBundleBoundary(".next", { acceptancePath, origin: STAGE_B_ORIGIN }),
+      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+
+    await writeFile(acceptancePath, Buffer.concat([record, Buffer.from(" ")]));
+    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
+      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+    await writeFile(acceptancePath, record);
+    await writeFile(join(item.root, "static/chunks/entry.js"), `${STAGE_B_REGISTRATION} `);
+    await assert.rejects(() => verifier.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }),
+      (error) => error.code === "NQR_BUNDLE_NEEDS_EMISSION_REVIEW");
+  });
+});
+
+test("stage B: every decision predicate is mutation-sensitive and a proven violation is never hidden", async () => {
+  await withStageBArtifact(async (item) => {
+    const revision = await stageBGateRevision();
+    const scenario = (id) => (record) => record.timingEvidence.scenarios.find((entry) => entry.id === id);
+    const variants = {
+      base: (record) => record,
+      missingScenario: (record) => { record.timingEvidence.scenarios.pop(); return record; },
+      failedScenario: (record) => { scenario("FIRST_ELIGIBLE_PDF_REQUEST")(record).status = "FAIL"; return record; },
+      unverifiedScenario: (record) => { scenario("NON_PDF_ACTIONS")(record).status = "UNVERIFIED"; return record; },
+      warmColdSwap: (record) => { scenario("WARM_REPETITION")(record).state = "cold"; return record; },
+      duplicateScenario: (record) => {
+        record.timingEvidence.scenarios[1] = { ...record.timingEvidence.scenarios[0] };
+        return record;
+      },
+      partialRoutes: (record) => {
+        for (const entry of record.timingEvidence.scenarios) entry.routes = entry.routes.slice(1);
+        return record;
+      },
+      timingBuildMismatch: (record) => { record.timingEvidence.buildId = "other-build"; return record; },
+      rejectedSecurity: (record) => { record.reviews[1].disposition = "REQUEST_CHANGES"; return record; },
+      missingQa: (record) => { record.reviews.shift(); return record; },
+      duplicateTl: (record) => { record.reviews[1] = { ...record.reviews[2] }; return record; },
+      revoked: (record) => { record.revoked = true; return record; },
+      selfApprovalField: (record) => ({ ...record, approved: true }),
+      identityMismatch: (record) => { record.expectedInputs.buildId = "other-build"; return record; },
+      staleGate: (record) => { record.gateRevision.adapterSha256 = "0".repeat(64); return record; },
+      originMismatch: (record) => { record.productionOrigin = "https://other.example"; return record; },
+    };
+    const records = Object.fromEntries(Object.entries(variants)
+      .map(([name, change]) => [name, stageBRecord(item.expectedInputs, revision, change)]));
+    const verifier = await stageBVerifierAdmitting(Object.values(records));
+    const inputs = await stageBInputs(item, records.base);
+    const evaluate = (changes = {}) => verifier.evaluateBundleBoundary({ ...inputs, ...changes });
+    const expectDecision = (decision, status, code) => {
+      assert.equal(decision.status, status, JSON.stringify(decision));
+      if (code) assert.ok(decision.reasonCodes.includes(code), JSON.stringify(decision));
+    };
+
+    expectDecision(evaluate(), "PASS_BUNDLE_SCOPE");
+    const expectations = {
+      missingScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
+      failedScenario: ["FAIL", "TIMING_POLICY_VIOLATION"],
+      unverifiedScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
+      warmColdSwap: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
+      duplicateScenario: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
+      partialRoutes: ["BLOCKED", "TIMING_EVIDENCE_INCOMPLETE"],
+      timingBuildMismatch: ["BLOCKED", "TIMING_EVIDENCE_IDENTITY_MISMATCH"],
+      rejectedSecurity: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
+      missingQa: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
+      duplicateTl: ["BLOCKED", "REVIEW_NOT_ACCEPTED"],
+      revoked: ["BLOCKED", "ACCEPTANCE_REVOKED"],
+      selfApprovalField: ["BLOCKED", "INVALID_ACCEPTANCE_RECORD"],
+      identityMismatch: ["BLOCKED", "ACCEPTANCE_IDENTITY_MISMATCH"],
+      staleGate: ["BLOCKED", "GATE_REVISION_MISMATCH"],
+      originMismatch: ["BLOCKED", "ORIGIN_NOT_BOUND"],
+    };
+    for (const [name, [status, code]] of Object.entries(expectations)) {
+      expectDecision(evaluate({ acceptanceBytes: records[name] }), status, code);
+    }
+
+    const legacy = structuredClone(inputs.legacyInspection);
+    expectDecision(evaluate({ inspection: { ...inputs.inspection, staticStatus: "STATIC_VIOLATION" } }), "FAIL", "ADAPTER_STATIC_VIOLATION");
+    expectDecision(evaluate({ inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }), "BLOCKED", "ADAPTER_STATIC_UNKNOWN");
+    expectDecision(evaluate({ inspection: { ...inputs.inspection, releaseDecision: "PASS" } }), "BLOCKED", "INVALID_ADAPTER_INSPECTION");
+    expectDecision(evaluate({ gateRevision: { ...inputs.gateRevision, verifierSha256: "1".repeat(64) } }), "BLOCKED", "GATE_REVISION_MISMATCH");
+    expectDecision(evaluate({ origin: "https://other.example" }), "BLOCKED", "ORIGIN_NOT_BOUND");
+    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
+      diagnostics: [...legacy.evidence.diagnostics, { code: "FORBIDDEN_INITIAL_MARKER", subject: "x" }] } } }), "FAIL", "FORBIDDEN_INITIAL_MARKER");
+    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
+      diagnostics: [...legacy.evidence.diagnostics, { code: "UNSUPPORTED_RESOURCE_LIMIT", subject: "x" }] } } }), "BLOCKED", "LEGACY_INSPECTION_INCOMPLETE");
+    const alteredFiles = structuredClone(legacy.evidence.inputManifest.files);
+    alteredFiles[0].sha256 = "2".repeat(64);
+    expectDecision(evaluate({ legacyInspection: { ...legacy, evidence: { ...legacy.evidence,
+      inputManifest: { ...legacy.evidence.inputManifest, files: alteredFiles } } } }), "BLOCKED", "LEGACY_INSPECTION_IDENTITY_MISMATCH");
+    // A proven violation plus unrelated unknowns still reports FAIL.
+    expectDecision(evaluate({ acceptanceBytes: records.failedScenario, origin: "https://other.example",
+      inspection: { ...inputs.inspection, staticStatus: "STATIC_UNKNOWN" } }), "FAIL", "TIMING_POLICY_VIOLATION");
+    for (const hostile of [null, "x", [], new Proxy({}, { ownKeys() { throw new Error("NQR_STAGE_B_MARKER"); } })]) {
+      const decision = verifier.evaluateBundleBoundary(hostile);
+      assert.deepEqual(decision.reasonCodes, ["INVALID_DECISION_INPUT"]);
+      assert.ok(!JSON.stringify(decision).includes("NQR_STAGE_B_MARKER"));
+    }
+    expectDecision(evaluate({ acceptanceBytes: "not-bytes" }), "BLOCKED", "MISSING_ACCEPTANCE_RECORD");
+  });
+});
+
+async function runBuildHarness(args, { verifier, originArtifacts, admission } = {}) {
+  const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
+  let harness = original
+    .replace('import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;")
+    .replace('import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});')
+    .replace('import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;")
+    .replace('await import("./verify-initial-bundle-boundary.mjs")', "await globalThis.__nqrStageB.verifierModule()")
+    .replaceAll('await import("./verify-origin-artifacts.mjs")', "await globalThis.__nqrStageB.originModule()");
+  assert.notEqual(harness, original);
+  assert.ok(!harness.includes('import("./'));
+  const calls = { spawn: 0, origin: [], verifier: [], originArtifacts: [] };
+  const errors = [];
+  const logs = [];
+  const previous = { argv: process.argv, exitCode: process.exitCode, error: console.error, log: console.log };
+  globalThis.__nqrStageB = {
+    spawnSync: () => { calls.spawn += 1; return { status: 0 }; },
+    assertBuildOrigin: (env, requested) => {
+      calls.origin.push(requested);
+      return admission === undefined ? { mode: "production", source: "explicit", origin: STAGE_B_ORIGIN } : admission();
+    },
+    verifierModule: async () => ({
+      verifyInitialBundleBoundary: async (...received) => {
+        calls.verifier.push(received);
+        return verifier ? verifier(...received) : { status: "PASS_BUNDLE_SCOPE" };
+      },
+    }),
+    originModule: async () => ({
+      verifyOriginArtifacts: async (...received) => { calls.originArtifacts.push(received); return originArtifacts?.(...received); },
+    }),
+  };
+  process.argv = [process.execPath, "/stage-b/scripts/build.mjs", ...args];
+  process.exitCode = undefined;
+  console.error = (...line) => errors.push(line.join(" "));
+  console.log = (...line) => logs.push(line.join(" "));
+  try {
+    await import(`data:text/javascript;base64,${Buffer.from(harness).toString("base64")}#${stageBHash(JSON.stringify(args))}${Math.random()}`);
+    return { calls, errors, logs, exitCode: process.exitCode };
+  } finally {
+    process.argv = previous.argv;
+    process.exitCode = previous.exitCode;
+    console.error = previous.error;
+    console.log = previous.log;
+    delete globalThis.__nqrStageB;
+  }
+}
+
+test("stage B: verify-existing never spawns Next and binds bundle plus origin checks to one artifact", async () => {
+  const valid = ["--verify-existing", "--artifact", "/stage-b/artifact", "--acceptance", "/stage-b/acceptance.json"];
+  const passed = await runBuildHarness(valid);
+  assert.equal(passed.exitCode, undefined);
+  assert.equal(passed.calls.spawn, 0);
+  assert.deepEqual(passed.calls.origin, ["production"]);
+  assert.deepEqual(passed.calls.verifier, [["/stage-b/artifact", { acceptancePath: "/stage-b/acceptance.json", origin: STAGE_B_ORIGIN }]]);
+  assert.deepEqual(passed.calls.originArtifacts, [[STAGE_B_ORIGIN, "/stage-b/artifact"]]);
+  assert.ok(passed.logs.some((line) => line.includes("not deployment approval")));
+
+  const blocked = await runBuildHarness(valid, {
+    verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); },
+  });
+  assert.equal(blocked.exitCode, 1);
+  assert.equal(blocked.calls.spawn, 0);
+  assert.deepEqual(blocked.calls.originArtifacts, []);
+  assert.deepEqual(blocked.errors, ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]);
+
+  const originFailure = await runBuildHarness(valid, { originArtifacts: () => { throw new Error("origin: mismatch"); } });
+  assert.equal(originFailure.exitCode, 1);
+  assert.ok(!originFailure.logs.some((line) => line.includes("[verify-existing]")));
+
+  const noOrigin = await runBuildHarness(valid, { admission: () => { throw new Error("[origin] explicit origin required"); } });
+  assert.equal(noOrigin.exitCode, 1);
+  assert.equal(noOrigin.calls.spawn + noOrigin.calls.verifier.length, 0);
+
+  for (const args of [
+    ["--verify-existing"],
+    ["--verify-existing", "--artifact", "/stage-b/artifact"],
+    ["--verify-existing", "--artifact", "relative", "--acceptance", "/stage-b/acceptance.json"],
+    ["--verify-existing", "--artifact", "/stage-b/artifact", "--acceptance", "acceptance.json"],
+    ["--verify-existing", "--acceptance", "/stage-b/acceptance.json", "--artifact", "/stage-b/artifact"],
+    ["--verify-existing", "--artifact", "/a", "--artifact", "/b"],
+    [...valid, "--production"],
+    ["--production", ...valid],
+    ["--preview", "--verify-existing"],
+  ]) {
+    const rejected = await runBuildHarness(args);
+    assert.equal(rejected.exitCode, 1, JSON.stringify(args));
+    assert.match(rejected.errors.join("\n"), /^Usage: /);
+    assert.equal(rejected.calls.spawn + rejected.calls.origin.length + rejected.calls.verifier.length, 0);
+  }
+
+  const build = await runBuildHarness([], { admission: () => null,
+    verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
+  assert.equal(build.calls.spawn, 1);
+  assert.deepEqual(build.calls.verifier, [[]]);
+  assert.equal(build.exitCode, 1);
+});
+
+test("stage B: the real verify-existing CLI rejects unadmitted evidence without starting Next", async () => {
+  await withStageBArtifact(async (item) => {
+    const acceptancePath = join(item.base, "acceptance.json");
+    await writeFile(acceptancePath, stageBRecord(item.expectedInputs, await stageBGateRevision()));
+    const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
+    const run = (env) => spawnSync(process.execPath,
+      [script, "--verify-existing", "--artifact", item.root, "--acceptance", acceptancePath],
+      { encoding: "utf8", env: { PATH: process.env.PATH, ...env }, timeout: 20000 });
+    const unadmitted = run({ NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN });
+    assert.equal(unadmitted.status, 1);
+    assert.match(unadmitted.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW$/m);
+    assert.doesNotMatch(unadmitted.stdout + unadmitted.stderr, /Creating an optimized|Next\.js|\[verify-existing\]/);
+    const missingOrigin = run({});
+    assert.equal(missingOrigin.status, 1);
+    assert.match(missingOrigin.stderr, /NEXT_PUBLIC_APP_URL/);
+    assert.doesNotMatch(missingOrigin.stdout + missingOrigin.stderr, /Creating an optimized|NQR_BUNDLE/);
+  });
+});
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -1,14 +1,21 @@
 import { spawnSync } from "node:child_process";
 import { createRequire } from "node:module";
+import { isAbsolute } from "node:path";
 import { assertBuildOrigin } from "./origin-gate.mjs";
 
 const require = createRequire(import.meta.url);
+const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
+  + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>";
 try {
   const args = process.argv.slice(2);
-  if (args.length > 1 || (args.length && !["--production", "--preview"].includes(args[0]))) {
-    throw new Error("Usage: node scripts/build.mjs [--production|--preview]");
+  const verifyExisting = args[0] === "--verify-existing";
+  if (verifyExisting
+    ? args.length !== 5 || args[1] !== "--artifact" || args[3] !== "--acceptance" || !isAbsolute(args[2]) || !isAbsolute(args[4])
+    : args.length > 1 || (args.length && !["--production", "--preview"].includes(args[0]))) {
+    throw new Error(USAGE);
   }
-  const admission = assertBuildOrigin(process.env, args[0]?.slice(2));
+  // verify-existing checks the accepted production origin; it has no default artifact or evidence path.
+  const admission = assertBuildOrigin(process.env, verifyExisting ? "production" : args[0]?.slice(2));
   // These exports have priority over Next's .env files. Gate and build therefore
   // use the same explicit origin. No dotenv loader, database or network in gate.
   const env = { ...process.env };
@@ -17,15 +24,24 @@
     if (admission.source === "explicit") env.NEXT_PUBLIC_APP_URL = admission.origin;
     console.log(`[origin] ${admission.mode} configuration PASS (${admission.source})`);
   }
-  const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
-    env, stdio: "inherit",
-  });
-  if (build.error || build.status !== 0) process.exit(build.status || 1);
   const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
-  await verifyInitialBundleBoundary();
-  if (admission) {
+  if (verifyExisting) {
+    // Existing artifact only: never spawns Next, typegen, an analyzer, a server, a browser or a database.
+    await verifyInitialBundleBoundary(args[2], { acceptancePath: args[4], origin: admission.origin });
     const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
-    await verifyOriginArtifacts(admission.origin);
+    await verifyOriginArtifacts(admission.origin, args[2]);
+    console.log("[verify-existing] bundle and origin scopes PASS for this exact artifact; not deployment approval");
+  } else {
+    const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
+      env, stdio: "inherit",
+    });
+    if (build.error || build.status !== 0) process.exit(build.status || 1);
+    // A fresh build has no admitted QA evidence yet, so this always stays blocked.
+    await verifyInitialBundleBoundary();
+    if (admission) {
+      const { verifyOriginArtifacts } = await import("./verify-origin-artifacts.mjs");
+      await verifyOriginArtifacts(admission.origin);
+    }
   }
 } catch (error) {
   console.error(error.message);
```
