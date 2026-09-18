# NQR-130 — Stage A iteration 4 (ซ่อมโดย Claude)

วันที่ 2026-09-16 (Asia/Bangkok) | Claude | implementation iteration-4

**Outcome: DONE / AUTHOR-VERIFIED — ยังไม่ใช่ independent acceptance. Stage A และ release ยัง BLOCKED**

ผู้ใช้สั่งเมื่อ 2026-09-16 ให้ Claude "จัดการเองทั้งหมด" หลัง [review i3](PHASE2A_EMISSION_ADAPTER_STAGE_A_ITERATION_3_CLAUDE_REVIEW.md) ได้ REQUEST_CHANGES งานนี้ซ่อม C1–C6 เฉพาะสองไฟล์ Stage A ใน root แยก ผู้ซ่อมเป็นคนเดียวกับผู้ตรวจ i3 ตาม WORKING_AGREEMENT/TEAM_REPORTING ผลในรายงานนี้จึงเป็น **author verification** ไม่ใช่ independent TL/SECURITY review และยังไม่ปลดล็อก Stage B

ไม่ได้แก้ SOURCE, package/lock, wrapper หรือ verifier ไม่มี install/build/typegen/server/browser/network/DB/deploy/commit/push และไม่สร้าง task/agent/automation

## 1. Identity

| รายการ | ค่า |
| --- | --- |
| Base (i3 ที่กู้ได้) | adapter `63fc9453…c51c`, test `6103a6f4…2454`, canonical2 `da69c466…c559e` |
| Root i4 | `scratchpad/nqr-i4/project` 98 ไฟล์ = authored 2 + prep 96 (copy ของ i3 root ที่ตรวจ hash แล้ว) |
| **i4 adapter** | `d391fe92663e0ba4d70be47888101f9caafdefec6a69f0a97bf25e069317f462`, 52,505 B / 1,122 บรรทัด, mode 0444 |
| **i4 test** | `8394ca27adf4cdc0e2117ab5e0a6d60c1fbb1230d27892cb162983524ed3bd8f`, 40,800 B / 771 บรรทัด, mode 0444 |
| **i4 canonical2** `{sha256,path}` path `project/scripts/…` | `d174b5d1fe49105a695c32651a83ddef521c5c94ec516d5dff4cec877552d03b` |
| i3→i4 delta `{after,before,path}` | `a10adfbfbdefac09612dd5928d887f1687520cbaba23a07cd619f5cf9eaed797` |
| Unified diff ในภาคผนวก | `9829c9a4a93014d7638902f0c13017ea410112b60c6ad4a001ae132edde472ce` (433 บรรทัด) |

i4 สร้างซ้ำได้โดยใช้สคริปต์ replay ใน [รายงาน recovery](PM_PHASE2A_STAGE_A_I3_EVIDENCE_RECOVERY.md) เพื่อสร้าง i3 แล้ว apply diff ในภาคผนวก ผลต้องตรง hash ข้างบน

## 2. การแก้ตาม finding

| Finding | การแก้ |
| --- | --- |
| C1 embedded documents | `iframe`, `frame`, `frameset`, `object`, `embed`, `portal`, `fencedframe` → UNKNOWN `UNMODELED_NESTED_BROWSING_CONTEXT` และไม่ descend ลงไป |
| C2 Flight row ID alias | รับเฉพาะ ID ที่ตรง `^(?:0\|[1-9a-f][0-9a-f]{0,6})$` คือไม่มีเลข 0 นำหน้า และไม่เกิน 28 bit ซึ่งไม่ล้น fold 32-bit ของ runtime ID อื่นได้ UNKNOWN `UNSUPPORTED_FLIGHT_ROW_ID` แล้วเทียบ duplicate/conflict ด้วยค่าตัวเลข |
| C3 nomodule root | `<script nomodule src>` ไม่นับเป็น route root ที่ module พร้อมใช้อีกต่อไป |
| C4 leaf-open ancestor swap | สำหรับไฟล์ใน artifact walk หลังอ่านเสร็จต้องได้ `realpath(path) === path` และ `lstat(path)` ต้องตรง identity ของ handle เดิม บันทึก `dev:ino` ของแต่ละไฟล์ และเทียบกับ final rewalk (`ARTIFACT_FILE_IDENTITY_CHANGED`) |
| C5 budget coverage | ลบ export `testExecutableByteBudget` ที่เป็น test seam สาธารณะ แล้วเพิ่มเทสต์ที่ผ่าน call site จริง: 64MiB พอดี → SUPPORTED, +1 byte → UNKNOWN `RESOURCE_LIMIT` |
| C6 Flight chunk list | เปลี่ยนเป็น flat URL list ตาม `preloadModule` ของ `react-server-dom-turbopack` browser client ทุก element ต้องเป็น string และผ่าน `normalizeChunkReference` ถ้าเป็นคู่แบบ webpack `[1,"…"]` จะได้ UNKNOWN `UNSUPPORTED_FLIGHT_IMPORT_RECORD` fixture ของเทสต์เดิม 9 จุดถูกเปลี่ยนเป็น flat list |

## 3. Verification ที่รันจริง (Node v24.14.1, TMPDIR อยู่ใน root แยก)

- `node --check` adapter และ test: exit0
- `node --test`: **36/36 ผ่าน** ไม่มี fail/skip/todo ใช้เวลาราว 2.2 วินาที log `56dfb007167b329c4b86ac8de0803404bd22c749a4a458feeff5ef3a1a074515` รันซ้ำอีก 3 รอบก่อน freeze ผ่าน 36/36 ทุกรอบ ไม่มีไฟล์ค้างใน TMPDIR
  - จำนวน 36 = 35 เดิม − seam test 1 + real-call-site budget 1 + leaf-open swap 1 ส่วน object/embed/frameset, webpack pair, nomodule, ID alias ถูกเพิ่มในเทสต์เดิม
- Probe ชุดเดียวกับที่ใช้ review i3 (ใช้ fixture flat list) บน bytes ที่ freeze แล้ว: 35 records, **ทุกกรณีได้ผลตามที่คาด, ทุก result เป็น BLOCKED**
  - C1: object html/svg, embed, frameset → UNKNOWN; control plain/comment/textarea/SVG → SUPPORTED
  - C2: `01`, `100000001` → UNKNOWN; distinct IDs → SUPPORTED; string ซ้ำ → UNKNOWN
  - C3: nomodule → UNKNOWN; classic root → SUPPORTED; orphan/missing → UNKNOWN
  - C4: swap ตอนเปิด leaf ยังเปิดไฟล์พี่น้องได้จริง แต่ผลเป็น UNKNOWN (`ARTIFACT_PATH_IDENTITY_MISMATCH`)
  - กลุ่ม 2 และ 6 ยังปิดเหมือนเดิม
- Budget probe: 67,108,864 B → SUPPORTED; 67,108,865 B → UNKNOWN `RESOURCE_LIMIT`
- Positive controls (รันบน i4 ก่อนตัดบรรทัด revalidation ที่ซ้ำซ้อนออก ซึ่งไม่เกี่ยวกับ path นี้): capped severity ทั้งสองลำดับ → VIOLATION, count 1, truncated; benign IIFE/metadata → UNKNOWN; API null/getter/Proxy/string → `INVALID_API_INPUT` ไม่ echo

### Mutation sensitivity (รันบน bytes สุดท้าย)

| ลด guard | เทสต์ i4 |
| --- | --- |
| nested context เหลือแค่ iframe | fail 1 ✔ |
| ลบ row ID check | fail 1 ✔ |
| กลับไปรับ webpack pair | fail 1 ✔ |
| นับ nomodule root | fail 1 ✔ |
| ลบ budget charge | fail 1 ✔ |
| ลบ post-read path check + final identity compare | fail 1 ✔ |
| ลบเฉพาะ post-read path check | pass 36: final identity compare ยังจับได้ (defense in depth) |
| key ด้วย string แทนตัวเลข | pass 36: regex ทำให้ string กับตัวเลขเทียบกันได้หนึ่งต่อหนึ่งอยู่แล้ว จึงไม่ใช่ช่องโหว่ |

ระหว่างทำงาน ผมลองเพิ่ม directory revalidation ตอนจบแต่ละโฟลเดอร์ แต่ไม่มีเทสต์ใดจับการลบได้และไม่เปลี่ยนผล probe จึงตัดออกก่อน freeze

## 4. ข้อจำกัดที่ยังอยู่

- **ไม่มี independent review ของ i4** ผู้ซ่อมคือผู้ตรวจ i3 และไม่มี reviewer คนที่สองใน session นี้
- C4 เป็นการแคบ window ลง ไม่ใช่ snapshot แบบ atomic Node ไม่มี `openat` ผู้โจมตีที่สลับ directory กลับไปกลับมาหลายครั้งด้วย timing ที่แม่นยำยังอาจผ่านการตรวจแบบจุดเวลาได้ สมมติฐานว่า artifact directory ต้องไม่ถูกแก้ระหว่างตรวจยังเป็น prerequisite ต้องประกาศไว้ตอน admission
- C6 ผูก grammar กับ browser client ที่ติดตั้งอยู่ แต่ยังไม่ได้ยืนยันกับ Turbopack emission จริง เพราะ diagnostic artifact หายไปและการ build ใหม่ยังไม่อยู่ในสิทธิ์ ถ้า artifact จริงใช้รูปแบบอื่น ผลจะเป็น UNKNOWN (fail closed) ไม่ใช่ PASS
- ไม่ได้รันผล real-artifact diagnostic, browser timing, memory/CPU adversarial หรือ probe i2 ของ TL/SEC ที่ต้องใช้ artifact/python
- bytes ของ i4 อยู่ใน `/private/tmp/claude-501/…/scratchpad` ซึ่งอาจถูกล้าง แหล่งที่ทนกว่าคือ diff ในภาคผนวก + replay ของ i3

## 5. ขั้นถัดไป

Stage B ตาม NQR129 ต้องรอ independent TL + SECURITY acceptance ของ Stage A ต้องได้อย่างใดอย่างหนึ่ง: reviewer อิสระตรวจ i4 หรือ Product Owner ยกเว้นข้อกำหนดความเป็นอิสระของ Stage A อย่างชัดเจน ห้ามตีความคำสั่ง "จัดการเองทั้งหมด" เป็นการยกเว้นนี้โดยอัตโนมัติ SOURCE integration, build และ deploy ยังห้าม

## ภาคผนวก — diff i3 → i4

```diff
--- a/scripts/inspect-turbopack-emission.mjs
+++ b/scripts/inspect-turbopack-emission.mjs
@@ -76,6 +76,9 @@
 const ALLOWED_SCRIPT_TYPES = new Set(["", "text/javascript", "application/javascript", "module"]);
 const INERT_SCRIPT_TYPES = new Set(["application/json", "application/ld+json"]);
 const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
+const NESTED_CONTEXT_TAGS = new Set(["iframe", "frame", "frameset", "object", "embed", "portal", "fencedframe"]);
+// React Flight folds row IDs as 32-bit hex nibbles, so leading zeros and long IDs alias shorter ones.
+const FLIGHT_ROW_ID = /^(?:0|[1-9a-f][0-9a-f]{0,6})$/;
 
 function sha256(value) {
   return createHash("sha256").update(value).digest("hex");
@@ -132,29 +135,11 @@
   };
 }
 
-function executableBudgetAfter(current, size, limit) {
-  const total = current + size;
-  return { accepted: total <= limit, total };
-}
-
-export function testExecutableByteBudget(sizes, limit) {
-  if (!Array.isArray(sizes) || !Number.isSafeInteger(limit) || limit < 0
-    || !sizes.every((size) => Number.isSafeInteger(size) && size >= 0)) {
-    return { accepted: false, total: 0 };
-  }
-  let result = { accepted: true, total: 0 };
-  for (const size of sizes) {
-    result = executableBudgetAfter(result.total, size, limit);
-    if (!result.accepted) return result;
-  }
-  return result;
-}
-
 function chargeExecutableBytes(state, size, subject) {
-  const result = executableBudgetAfter(state.executableBytes, size, SUPPORTED_PROFILE.limits.executableBytes);
-  state.executableBytes = result.total;
-  if (!result.accepted) addDiagnostic(state, "RESOURCE_LIMIT", "UNKNOWN", subject);
-  return result.accepted;
+  state.executableBytes += size;
+  const accepted = state.executableBytes <= SUPPORTED_PROFILE.limits.executableBytes;
+  if (!accepted) addDiagnostic(state, "RESOURCE_LIMIT", "UNKNOWN", subject);
+  return accepted;
 }
 
 function addDiagnostic(state, code, severity, subject, span) {
@@ -186,7 +171,7 @@
   state.nodes.push(node);
 }
 
-async function readStableFile(path, byteLimit, state, subject) {
+async function readStableFile(path, byteLimit, state, subject, fileIdentities = null) {
   let handle;
   try {
     handle = await open(path, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0));
@@ -204,6 +189,13 @@
     }
     const after = await handle.stat({ bigint: true });
     if (offset !== bytes.length || stableIdentity(before) !== stableIdentity(after)) throw new Error("READ_RACE");
+    if (fileIdentities) {
+      // Artifact leaves must still resolve to the opened inode without a substituted ancestor after the read.
+      if (await realpath(path) !== path) throw new Error("PATH_IDENTITY");
+      const afterPath = await lstat(path, { bigint: true });
+      if (!afterPath.isFile() || stableIdentity(after) !== stableIdentity(afterPath)) throw new Error("PATH_IDENTITY");
+      fileIdentities.set(subject, `${before.dev}:${before.ino}`);
+    }
     return bytes;
   } catch (error) {
     const code = error?.message === "FILE_LIMIT"
@@ -220,6 +212,7 @@
 async function walkFiles(root, state, retainSemantic = true) {
   const rows = [];
   const semanticBuffers = new Map();
+  const fileIdentities = new Map();
   let totalBytes = 0;
   let visitedNodes = 0;
   let stopped = false;
@@ -295,7 +288,7 @@
           stopped = true;
           return;
         }
-        const bytes = await readStableFile(path, SUPPORTED_PROFILE.limits.identityBytes, state, itemPath);
+        const bytes = await readStableFile(path, SUPPORTED_PROFILE.limits.identityBytes, state, itemPath, fileIdentities);
         if (bytes) {
           rows.push({ sha256: sha256(bytes), path: itemPath, size: bytes.length, type: "file" });
           const executable = (itemPath.startsWith(HTML_PREFIX) && itemPath.endsWith(".html"))
@@ -314,7 +307,7 @@
     }
   }
   await visit(root);
-  return { rows, semanticBuffers, stopped };
+  return { rows, semanticBuffers, fileIdentities, stopped };
 }
 
 function manifestShape(manifest, label, state) {
@@ -453,7 +446,7 @@
       addDiagnostic(state, "UNMODELED_HTML_EVENT_HANDLER", "UNKNOWN", `route:${route}`);
     }
     if (tag === "base") addDiagnostic(state, "UNSUPPORTED_HTML_BASE", "UNKNOWN", `route:${route}`);
-    if (tag === "iframe") {
+    if (NESTED_CONTEXT_TAGS.has(tag)) {
       addDiagnostic(state, "UNMODELED_NESTED_BROWSING_CONTEXT", "UNKNOWN", `route:${route}`);
       return true;
     }
@@ -574,14 +567,19 @@
       addDiagnostic(state, "UNSUPPORTED_FLIGHT_WIRE_RECORD", "UNKNOWN", subject);
       continue;
     }
+    if (!FLIGHT_ROW_ID.test(match[1])) {
+      addDiagnostic(state, "UNSUPPORTED_FLIGHT_ROW_ID", "UNKNOWN", subject);
+      continue;
+    }
+    const rowId = String(Number.parseInt(match[1], 16));
     const routeRecords = state.flightRecords.get(route) || new Map();
-    const priorRecord = routeRecords.get(match[1]);
+    const priorRecord = routeRecords.get(rowId);
     if (priorRecord === match[2]) {
       addDiagnostic(state, "DUPLICATE_FLIGHT_RECORD_UNPROVEN", "UNKNOWN", subject);
     } else if (priorRecord != null) {
       addDiagnostic(state, "CONFLICTING_FLIGHT_RECORD_UNPROVEN", "UNKNOWN", subject);
     } else {
-      routeRecords.set(match[1], match[2]);
+      routeRecords.set(rowId, match[2]);
       state.flightRecords.set(route, routeRecords);
     }
     let parsed;
@@ -593,26 +591,21 @@
     const [moduleId, references] = parsed;
     addEdge(state, { kind: "synchronous-instantiation", from: subject, to: `module:${moduleId}`, condition: "FLIGHT_IMPORT" });
     const referencedChunks = [];
-    for (let index = 0; index < references.length; index += 2) {
-      const raw = references[index + 1];
+    for (const raw of references) {
       const path = normalizeChunkReference(raw, subject, state);
       if (path) {
         referencedChunks.push(path);
-        addEdge(state, { kind: "flight-resolve-preload", from: subject, to: path, moduleId,
-          chunkId: references[index] });
+        addEdge(state, { kind: "flight-resolve-preload", from: subject, to: path, moduleId });
       }
     }
     state.moduleRequirements.push({ kind: "flight", moduleId, route, subject, chunks: referencedChunks });
   }
 }
 
+// The installed Turbopack browser client passes every metadata[1] entry to __turbopack_load_by_url__.
 function literalWireModule(value) {
-  if (value.length !== 3 || !Number.isSafeInteger(value[0]) || value[0] < 0 || !Array.isArray(value[1])
-    || value[1].length === 0 || value[1].length % 2 !== 0 || typeof value[2] !== "string") return false;
-  for (let index = 0; index < value[1].length; index += 2) {
-    if (!Number.isSafeInteger(value[1][index]) || value[1][index] < 0 || typeof value[1][index + 1] !== "string") return false;
-  }
-  return true;
+  return value.length === 3 && Number.isSafeInteger(value[0]) && value[0] >= 0 && Array.isArray(value[1])
+    && value[1].every((chunk) => typeof chunk === "string") && typeof value[2] === "string";
 }
 
 function registrationHead(node) {
@@ -1000,7 +993,7 @@
           const modes = modesByChunk.get(entry.path) || new Set();
           modes.add(entry.mode);
           modesByChunk.set(entry.path, modes);
-          if (entry.kind === "script") {
+          if (entry.kind === "script" && entry.mode !== "nomodule") {
             const roots = state.routeRootChunks.get(route) || new Set();
             roots.add(entry.path);
             state.routeRootChunks.set(route, roots);
@@ -1061,6 +1054,11 @@
     } else {
       const finalInventory = await walkFiles(physicalRoot, state, false);
       rowsEqualByPath(finalInventory.rows, expectedFull || [], "artifact-final", state);
+      for (const [path, fileIdentity] of inventory.fileIdentities) {
+        if (finalInventory.fileIdentities.get(path) !== fileIdentity) {
+          addDiagnostic(state, "ARTIFACT_FILE_IDENTITY_CHANGED", "UNKNOWN", path);
+        }
+      }
     }
     return finalize(state, identity);
   } catch {
--- a/scripts/inspect-turbopack-emission.test.mjs
+++ b/scripts/inspect-turbopack-emission.test.mjs
@@ -7,8 +7,6 @@
 import { syncBuiltinESMExports } from "node:module";
 import test from "node:test";
 
-import * as emissionAdapter from "./inspect-turbopack-emission.mjs";
-
 import {
   EDGE_KINDS,
   STATIC_SUPPORTED,
@@ -54,7 +52,7 @@
   return `<!doctype html><html><head><script src="${script}" async=""></script></head><body>${inline}</body></html>`;
 }
 
-function bootstrapAndFlight(wire = "1:I[7,[1,\"/_next/static/chunks/entry.js\"],\"default\"]\n") {
+function bootstrapAndFlight(wire = "1:I[7,[\"/_next/static/chunks/entry.js\"],\"default\"]\n") {
   return `<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,${JSON.stringify(wire)}])</script>`;
 }
 
@@ -180,11 +178,11 @@
 });
 
 test("Flight tuples validate every URL and registered module destination", async (t) => {
-  const external = await fixture({ inline: bootstrapAndFlight("1:I[7,[1,\"https://example.invalid/eager.js\"],\"default\"]\n") });
+  const external = await fixture({ inline: bootstrapAndFlight("1:I[7,[\"https://example.invalid/eager.js\"],\"default\"]\n") });
   t.after(() => rm(external.root, { recursive: true, force: true }));
   assert.equal((await inspect(external)).staticStatus, STATIC_VIOLATION);
 
-  const missing = await fixture({ inline: bootstrapAndFlight("1:I[999,[1,\"/_next/static/chunks/entry.js\"],\"default\"]\n") });
+  const missing = await fixture({ inline: bootstrapAndFlight("1:I[999,[\"/_next/static/chunks/entry.js\"],\"default\"]\n") });
   t.after(() => rm(missing.root, { recursive: true, force: true }));
   const missingResult = await inspect(missing);
   assert.equal(missingResult.staticStatus, STATIC_UNKNOWN);
@@ -193,6 +191,13 @@
   const malformed = await fixture({ inline: bootstrapAndFlight("1:I[7,[1,2],\"default\"]\n") });
   t.after(() => rm(malformed.root, { recursive: true, force: true }));
   assert.equal((await inspect(malformed)).staticStatus, STATIC_UNKNOWN);
+
+  // Turbopack's browser client loads every chunk entry by URL; webpack-style id/path pairs are not this profile.
+  const webpackPair = await fixture({ inline: bootstrapAndFlight("1:I[7,[1,\"/_next/static/chunks/entry.js\"],\"default\"]\n") });
+  t.after(() => rm(webpackPair.root, { recursive: true, force: true }));
+  const webpackPairResult = await inspect(webpackPair);
+  assert.equal(webpackPairResult.staticStatus, STATIC_UNKNOWN);
+  assert.ok(webpackPairResult.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FLIGHT_IMPORT_RECORD"));
 });
 
 test("deferred loader requires exact closure binding and destination", async (t) => {
@@ -463,7 +468,7 @@
 });
 
 test("Flight budgets accumulate per route and graph nodes are capped", async (t) => {
-  const recordBatch = Array.from({ length: 100 }, (_, index) => `${index.toString(16)}:I[7,[1,"/_next/static/chunks/entry.js"],"default"]`).join("\n");
+  const recordBatch = Array.from({ length: 100 }, (_, index) => `${index.toString(16)}:I[7,["/_next/static/chunks/entry.js"],"default"]`).join("\n");
   const inline = Array.from({ length: 21 }, () => `<script>self.__next_f.push([1,${JSON.stringify(`${recordBatch}\n`)}])</script>`).join("");
   const flightItem = await fixture({ inline });
   t.after(() => rm(flightItem.root, { recursive: true, force: true }));
@@ -486,6 +491,9 @@
     `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><script xlink:href="https://example.invalid/inert.js"></script></svg>`,
     `<iframe srcdoc="&lt;script&gt;unknown()&lt;/script&gt;"></iframe>`,
     `<iframe src="https://example.invalid/inert.html"></iframe>`,
+    `<object type="text/html" data="https://example.invalid/inert.html"></object>`,
+    `<object type="image/svg+xml" data="https://example.invalid/active.svg"></object>`,
+    `<embed type="image/svg+xml" src="https://example.invalid/active.svg">`,
   ];
   for (const [index, suffix] of cases.entries()) {
     const item = await fixture({ inline: `${bootstrapAndFlight()}${suffix}` });
@@ -498,6 +506,17 @@
   const plainSvg = await fixture({ inline: `${bootstrapAndFlight()}<svg><path d="M0 0"></path></svg>` });
   t.after(() => rm(plainSvg.root, { recursive: true, force: true }));
   assert.equal((await inspect(plainSvg)).staticStatus, STATIC_SUPPORTED);
+
+  const frameset = await fixture();
+  t.after(() => rm(frameset.root, { recursive: true, force: true }));
+  for (const route of SUPPORTED_PROFILE.routes) {
+    await writeFile(join(frameset.root, "server/app", `${route.slice(1)}.html`),
+      `<!doctype html><html><head><script src="/_next/static/chunks/entry.js" async=""></script>${bootstrapAndFlight()}</head><frameset><frame src="https://example.invalid/inert.html"></frameset></html>`);
+  }
+  frameset.expected = await manifests(frameset.root);
+  const framesetResult = await inspect(frameset);
+  assert.equal(framesetResult.staticStatus, STATIC_UNKNOWN, JSON.stringify(framesetResult.diagnostics));
+  assert.ok(framesetResult.diagnostics.some((entry) => entry.code === "UNMODELED_NESTED_BROWSING_CONTEXT"));
 });
 
 test("deferred loader requires a free global Promise binding", async (t) => {
@@ -520,7 +539,7 @@
 test("module destinations must be registered in their modeled load context", async (t) => {
   const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,`;
   const orphanFlight = await fixture({
-    inline: bootstrapAndFlight(`1:I[999,[1,"/_next/static/chunks/entry.js"],"default"]\n`),
+    inline: bootstrapAndFlight(`1:I[999,["/_next/static/chunks/entry.js"],"default"]\n`),
     extraFiles: { "static/chunks/unreferenced.js": `${head}999,t=>{}]);` },
   });
   t.after(() => rm(orphanFlight.root, { recursive: true, force: true }));
@@ -542,11 +561,28 @@
     extraFiles: { "static/chunks/lazy.js": `${head}9,t=>{}]);` } });
   t.after(() => rm(reachableDeferred.root, { recursive: true, force: true }));
   assert.equal((await inspect(reachableDeferred)).staticStatus, STATIC_SUPPORTED);
+
+  const rootWire = `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n2:I[999,["/_next/static/chunks/entry.js"],"default"]\n`;
+  const classicRoot = await fixture({
+    inline: `${bootstrapAndFlight(rootWire)}<script src="/_next/static/chunks/legacy.js"></script>`,
+    extraFiles: { "static/chunks/legacy.js": `${head}999,t=>{}]);` },
+  });
+  t.after(() => rm(classicRoot.root, { recursive: true, force: true }));
+  assert.equal((await inspect(classicRoot)).staticStatus, STATIC_SUPPORTED);
+
+  const nomoduleRoot = await fixture({
+    inline: `${bootstrapAndFlight(rootWire)}<script nomodule src="/_next/static/chunks/legacy.js"></script>`,
+    extraFiles: { "static/chunks/legacy.js": `${head}999,t=>{}]);` },
+  });
+  t.after(() => rm(nomoduleRoot.root, { recursive: true, force: true }));
+  const nomoduleResult = await inspect(nomoduleRoot);
+  assert.equal(nomoduleResult.staticStatus, STATIC_UNKNOWN);
+  assert.ok(nomoduleResult.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));
 });
 
 test("duplicate or conflicting Flight wire record identities remain unproved", async (t) => {
   const duplicate = await fixture({ inline: bootstrapAndFlight(
-    `1:I[7,[1,"/_next/static/chunks/entry.js"],"default"]\n1:I[7,[1,"/_next/static/chunks/entry.js"],"default"]\n`,
+    `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n1:I[7,["/_next/static/chunks/entry.js"],"default"]\n`,
   ) });
   t.after(() => rm(duplicate.root, { recursive: true, force: true }));
   const duplicateResult = await inspect(duplicate);
@@ -555,20 +591,67 @@
   const conflict = await fixture({
     chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
     inline: bootstrapAndFlight(
-      `1:I[7,[1,"/_next/static/chunks/entry.js"],"default"]\n1:I[9,[1,"/_next/static/chunks/entry.js"],"other"]\n`,
+      `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n1:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
     ),
   });
   t.after(() => rm(conflict.root, { recursive: true, force: true }));
   const conflictResult = await inspect(conflict);
   assert.equal(conflictResult.staticStatus, STATIC_UNKNOWN);
   assert.ok(conflictResult.diagnostics.some((entry) => entry.code === "CONFLICTING_FLIGHT_RECORD_UNPROVEN"));
+
+  // The runtime folds hex nibbles into a 32-bit row ID: "01" and "100000001" both alias row 1.
+  for (const aliasId of ["01", "100000001"]) {
+    const alias = await fixture({
+      chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
+      inline: bootstrapAndFlight(
+        `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n${aliasId}:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
+      ),
+    });
+    t.after(() => rm(alias.root, { recursive: true, force: true }));
+    const aliasResult = await inspect(alias);
+    assert.equal(aliasResult.staticStatus, STATIC_UNKNOWN);
+    assert.ok(aliasResult.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FLIGHT_ROW_ID"));
+  }
+  const distinct = await fixture({
+    chunk: supportedChunk.replace("7,t=>{}", "7,t=>{},9,t=>{}"),
+    inline: bootstrapAndFlight(
+      `1:I[7,["/_next/static/chunks/entry.js"],"default"]\n2:I[9,["/_next/static/chunks/entry.js"],"other"]\n`,
+    ),
+  });
+  t.after(() => rm(distinct.root, { recursive: true, force: true }));
+  assert.equal((await inspect(distinct)).staticStatus, STATIC_SUPPORTED);
 });
 
-test("semantic byte accounting has a bounded test seam and exact exhaustion behavior", () => {
-  assert.equal(typeof emissionAdapter.testExecutableByteBudget, "function");
-  assert.deepEqual(emissionAdapter.testExecutableByteBudget([3, 4], 7), { accepted: true, total: 7 });
-  assert.deepEqual(emissionAdapter.testExecutableByteBudget([3, 5], 7), { accepted: false, total: 8 });
-  assert.deepEqual(emissionAdapter.testExecutableByteBudget([4, 4], 7), { accepted: false, total: 8 });
+test("cumulative executable budget is charged at the real admission call site", async (t) => {
+  const item = await fixture();
+  t.after(() => rm(item.root, { recursive: true, force: true }));
+  const { limits } = SUPPORTED_PROFILE;
+  let used = 0;
+  for (const row of item.expected.full.rows) {
+    if ((row.path.startsWith("server/app/") && row.path.endsWith(".html"))
+      || (row.path.startsWith("static/chunks/") && row.path.endsWith(".js"))) used += row.size;
+  }
+  let remaining = limits.executableBytes - used;
+  const pads = [];
+  for (let index = 0; remaining > 0; index += 1) {
+    const size = Math.min(limits.bytesPerExecutableFile, remaining);
+    const path = join(item.root, `static/chunks/pad-${index}.js`);
+    await writeFile(path, `/*${"a".repeat(size - 4)}*/`);
+    pads.push(path);
+    remaining -= size;
+  }
+  item.expected = await manifests(item.root);
+  const exact = await inspect(item);
+  assert.equal(exact.staticStatus, STATIC_SUPPORTED, JSON.stringify(exact.diagnostics));
+
+  const last = pads.at(-1);
+  const lastBytes = await readFile(last);
+  await writeFile(last, `/*a${lastBytes.subarray(2).toString("latin1")}`);
+  item.expected = await manifests(item.root);
+  const over = await inspect(item);
+  assert.equal(over.staticStatus, STATIC_UNKNOWN);
+  assert.ok(over.diagnostics.some((entry) => entry.code === "RESOURCE_LIMIT"));
+  assert.equal(over.releaseDecision, "BLOCKED");
 });
 
 test("ancestor-directory substitution is detected even when bytes and final paths are restored", async (t) => {
@@ -622,6 +705,55 @@
   assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_DIRECTORY_IDENTITY_MISMATCH"));
 });
 
+test("ancestor substitution during a leaf open cannot admit a file outside the artifact root", async (t) => {
+  const item = await fixture();
+  t.after(() => rm(item.root, { recursive: true, force: true }));
+  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr130-leaf-swap-"));
+  t.after(() => rm(base, { recursive: true, force: true }));
+  const chunks = join(item.root, "static/chunks");
+  const target = join(chunks, "entry.js");
+  const parked = join(base, "parked-chunks");
+  const sibling = join(base, "owned-sibling");
+  await mkdir(sibling, { recursive: true });
+  await writeFile(join(sibling, "entry.js"), await readFile(target));
+  const originalLstat = fs.lstat;
+  let redirected = false;
+  let restored = false;
+  // Swap after the directory's last anchor check and restore before the reader's own path identity check.
+  fs.lstat = async function patchedLstat(path, options) {
+    if (path === target && !options?.bigint && !redirected) {
+      await fs.rename(chunks, parked);
+      await symlink(sibling, chunks);
+      redirected = true;
+    }
+    const stat = await originalLstat.call(this, path, options);
+    if (path === target && options?.bigint && redirected && !restored) {
+      await fs.unlink(chunks);
+      await fs.rename(parked, chunks);
+      restored = true;
+    }
+    return stat;
+  };
+  syncBuiltinESMExports();
+  let result;
+  try {
+    result = await inspect(item);
+  } finally {
+    fs.lstat = originalLstat;
+    syncBuiltinESMExports();
+    if (redirected && !restored) {
+      await fs.unlink(chunks);
+      await fs.rename(parked, chunks);
+      restored = true;
+    }
+  }
+  assert.equal(redirected, true);
+  assert.equal(restored, true);
+  assert.equal(result.staticStatus, STATIC_UNKNOWN, JSON.stringify(result.diagnostics));
+  assert.ok(result.diagnostics.some((entry) => entry.code === "ARTIFACT_PATH_IDENTITY_MISMATCH"
+    || entry.code === "ARTIFACT_FILE_IDENTITY_CHANGED"));
+});
+
 test("runCli contains hostile argument reads while leaving writer failures distinct", async () => {
   const marker = new Error("NQR130_PRIVATE_SYNTHETIC_MARKER");
   for (const args of [
```
