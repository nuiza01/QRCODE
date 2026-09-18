# NQR-129 Stage B iteration 4 — ปิด P3/LOW ก่อน integrate

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-4

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

ที่มา: iteration 3 (canonical5 `3f168b9c…0bfd`) ได้ ACCEPT จาก [TL](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_3_TL_REVIEW.md) และ [SECURITY](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_3_SECURITY_REVIEW.md) ผู้ใช้เลือก "ซ่อม P3/LOW ก่อน แล้วค่อย integrate" iteration 3 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb-b3/project`

แก้เฉพาะสามไฟล์ของ Stage B ใน `scratchpad/nqr-stageb-b4/project` (adapter และเทสต์ของ adapter ไม่เปลี่ยน) ไม่มี install/build/server/browser/network/DB/deploy/commit SOURCE185 ยังเป็น `3b0c6a72…00df` และไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` |
| verify-initial-bundle-boundary.test.mjs | `1df0fcdf8170663e42a2c25790c10655af91814216e0aa0cd5cc137992616bd8` |
| build.mjs | `2f5093cd14186a7dcff5edff9c08f07f929c2c3e986e4323517a47ebe124fbe2` |

- Canonical5: **`7fc1ae29a4b3ef05e17655ad7cf0025b3f0290c1beb8da95a0dc550231a77eef`**
- Delta i3→i4: `5ff2891a125f718bf5bf5cadeef7a1600264dea5747040003ada7beac6a5a72f`
- Diff i3→i4 อยู่ในภาคผนวก SHA `95a5eae67cf9dfb655f0308d8fae64e034e2db7eae7d1edb10bb19f00a4f009f` (288 บรรทัด) และ `patch -p1` บน i3 ได้ hash ตรงทั้งห้าไฟล์

## 2. สิ่งที่แก้

| Finding | การแก้ |
| --- | --- |
| SEC S1 — jsdom ไม่ถูก pin และโหลดก่อน admission | `build.mjs` เพิ่ม `VERIFY_EXISTING_DEPENDENCIES` hash closure ของ `jsdom`, `parse5`, `entities` (dependencies + optional + peer ที่ติดตั้งอยู่ ไม่นับ `node_modules` ที่ซ้อนอยู่ข้างใน ตอนนี้มี 40 package 1,866 ไฟล์) รวมกับ `next/package.json` และ `next/dist/compiled/acorn/acorn.js` ใช้เฉพาะ builtin ของ Node และทำ **ก่อน** import verifier ถ้าเจอ symlink ในต้นไม้ หรือ digest ไม่ตรง `6d45f6c294eb3176a7f494cf9c8d57e501666efeac30ad79fb19aa5044567cfc` → `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` เทสต์ CLI จริงใช้สำเนา `node_modules` ที่ copy `jsdom` จริงออกมา: ถ้าไม่แก้ → exit 0 ถ้าต่อท้าย `lib/api.js` หนึ่งบรรทัด → exit 1 โดยยังไม่ได้โหลด verifier |
| SEC S2 — environment ของ operator | ปฏิเสธถ้ามี env `DYLD_*` หรือ `LD_PRELOAD` (เพิ่มจาก Node flag/`NODE_OPTIONS`) comment ใน `build.mjs` ระบุไว้ว่า `node` ปลอมใน PATH ตรวจจับไม่ได้ |
| SEC C1/C2 | เขียน admission checklist ไว้ใน comment ติดกับ `ADMITTED_ACCEPTANCE_SHA256`: QA/TL/SECURITY ต้องตรวจ `startupChunks` ทุกตัว และ dependency pin ต้องเป็นปัจจุบัน ส่วน C2 ถูกบังคับด้วย S1 ในโค้ดแล้ว |
| TL R1 — ไม่มีเทสต์ wrapper สำหรับ scan ตอน UNKNOWN | เทสต์บน disk: artifact มี `turbopack-runtime.js` (adapter → UNKNOWN) และ Flight preload ของ PDF chunk ที่มี marker record ที่ admit แล้ว → verifier และ CLI ได้ `NQR_BUNDLE_STATIC_CHECK_FAILED` พร้อม reasons `ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER` |
| TL R2 — edge case ของ scan | เขียนไว้ใน JSDoc ของ `startupReachableChunks`: ไฟล์เกิน limit ต่อไฟล์ทำให้ไม่มี graph (ผลเป็น BLOCKED แทน FAIL) และ Flight ใน chunk ที่โหลดทีหลังจะถูกนับเป็น startup (อาจได้ false FAIL) ทั้งสองกรณี fail closed |
| TL R3 — M09/M32/M33 | M09: เทสต์ที่ patch `fs.open` ให้ record ถูก append ระหว่างอ่าน → `UNREADABLE_ACCEPTANCE_RECORD`; M32: เทสต์ที่แก้ `Array.prototype.includes` และ `Set.prototype.has` ระหว่างเรียก evaluator ต้องยังได้ `ACCEPTANCE_NOT_ADMITTED`; M33: ถอดเช็ก `Object.isFrozen` ออก เพราะ grammar ที่เข้มบังคับ `Object.freeze` อยู่แล้ว ทำให้เช็กนี้ไม่มีทางถูกเรียกใช้ |

## 3. Verification (Node v24.14.1)

- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **282/282 ทั้งสองรอบ** log `94833d85…eb4` และ `0e464017…f9c1` TMPDIR ว่าง
- eslint ห้าไฟล์: ไม่มี error/warning
- **Mutation 55 แบบ** (`mutants.cjs` `4188b90a…3115`, log `69e56e73…85ca`): **54 ตัวที่ใช้ได้ถูกจับทั้งหมด** รวมตัวใหม่ B01 ลบ dependency check, B02 ไม่สนใจ digest, B03 ยอม DYLD/LD_PRELOAD, B04 ใช้ `includes` แทน lookup ที่ capture ไว้ และ B05 ไม่ตรวจ read race ตัวที่เหลือ N09 ใช้ไม่ได้ (anchor ไม่มีแล้ว) เพราะโค้ดส่วนนั้นถูกถอดตั้งแต่ iteration 3

## 4. ข้อจำกัด

- Dependency pin ต้องอัปเดตทุกครั้งที่ติดตั้ง/อัปเดต jsdom, parse5, entities หรือ next และต้องผ่าน review ก่อน ถ้าไม่อัปเดต verify-existing จะ BLOCKED ไว้ก่อนโดยตั้งใจ
- Pin ครอบเฉพาะ package ที่ verify-existing โหลด ไม่ใช่ full dependency digest ทั้ง repo และไม่ได้กัน `node` binary ปลอม
- ข้อจำกัดเดิมทั้งหมดยังอยู่ ได้แก่ runtime chunk ของ Turbopack จริงยังเป็น UNKNOWN, `COLD_VALID_INITIAL_PREVIEW` รอการตัดสิน, marker scan เป็นหลักฐานเสริม และการเปลี่ยนแล้วเปลี่ยนกลับระหว่างการอ่านยังพิสูจน์ไม่ได้

## ภาคผนวก — diff iteration 3 → 4

```diff
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -504,6 +504,8 @@
 // normalized to an empty list, so admitting a record never changes the logic revision the record is bound to.
 // The list is data only: each entry is one lowercase 64-hex string literal on its own line ("  \"<hex>\",").
 // Any other spelling, code or a second declaration makes the gate revision unreadable, which blocks.
+// Admission checklist (Stage B SECURITY C1/C2): add a digest only after QA, TL and SECURITY have inspected every
+// startupChunks entry for PDF-specific or unreviewed code, and after the dependency pin in build.mjs is current.
 export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);
 
 const ADMISSION_DECLARATION = /^export const ADMITTED_ACCEPTANCE_SHA256 = Object\.freeze\(\[(?:\n {2}"[a-f0-9]{64}",)*\n?\]\);$/gm;
@@ -609,7 +611,10 @@
 }
 
 /** Chunks a browser may fetch or evaluate at startup per the adapter graph: HTML script/preload roots,
- * Flight preloads and their static imports. Deferred explicit chunk loads are excluded by design. */
+ * Flight preloads and their static imports. Deferred explicit chunk loads are excluded by design.
+ * Edge cases, both fail closed: an artifact file over the per-file limit stops the adapter before a graph exists,
+ * so markers elsewhere report BLOCKED rather than FAIL; Flight data inside a chunk that only loads later is still
+ * treated as startup, which can report a false FAIL. */
 export function startupReachableChunks(inspection) {
   const edges = Array.isArray(inspection?.graph?.edges) ? inspection.graph.edges : [];
   const chunk = (value) => typeof value === "string" && value.startsWith("static/chunks/") && value.endsWith(".js");
@@ -871,7 +876,7 @@
   const statements = verifier.match(ADMISSION_STATEMENT) || [];
   const listed = declarations.length === 1 ? [...declarations[0].matchAll(/"([a-f0-9]{64})"/g)].map((match) => match[1]) : [];
   // The running list must be exactly the data parsed from the hashed source text.
-  if (declarations.length !== 1 || statements.length !== 1 || !Object.isFrozen(ADMITTED_ACCEPTANCE_SHA256)
+  if (declarations.length !== 1 || statements.length !== 1
     || JSON.stringify([...listed].sort()) !== JSON.stringify([...ADMITTED_ACCEPTANCE_SHA256].sort())) {
     throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW", ["UNREADABLE_GATE_REVISION"]);
   }
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -1,7 +1,8 @@
 import assert from "node:assert/strict";
 import { spawn, spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
-import { lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
+import fs, { appendFile, cp, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
+import { syncBuiltinESMExports } from "node:module";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { fileURLToPath, pathToFileURL } from "node:url";
@@ -919,6 +920,11 @@
         const preloaded = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NODE_OPTIONS: nodeOptions });
         assert.equal(preloaded.status, 1, nodeOptions);
         assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, nodeOptions);
+      }
+      for (const [name, value] of [["LD_PRELOAD", "/nonexistent/preload.so"], ["DYLD_NQR_STAGE_B_UNUSED", "1"]]) {
+        const injected = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, [name]: value });
+        assert.equal(injected.status, 1, name);
+        assert.match(injected.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, name);
       }
 
       const linkedDirectory = join(item.base, "linked");
@@ -1208,17 +1214,114 @@
           assert.match(result.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: (?:[A-Z_]+,)*UNREADABLE_GATE_REVISION(?:,[A-Z_]+)*$/m, name);
         }
       }, { declaration, importGate: false });
+    }
+  });
+});
+
+test("stage B: an admitted record still FAILs an eager PDF preload while a runtime chunk keeps the adapter UNKNOWN", async () => {
+  const wire = `${STAGE_B_WIRE}2:I[9,["/_next/static/chunks/pdf.js"],"default"]\n`;
+  await withStageBArtifact({ wire, extraFiles: { "static/chunks/pdf.js": `${stageBRegistration(9)}/*jsPDF*/`,
+    "static/chunks/turbopack-runtime.js": stageBRegistration(11) } }, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision(), undefined,
+      ["static/chunks/entry.js", "static/chunks/pdf.js"]);
+    await withAdmittedGate([record], async ({ gate, buildScript }) => {
+      const acceptancePath = join(item.base, "acceptance.json");
+      await writeFile(acceptancePath, record);
+      assert.deepEqual(await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })),
+        { code: "NQR_BUNDLE_STATIC_CHECK_FAILED", reasonCodes: ["ADAPTER_STATIC_UNKNOWN", "FORBIDDEN_STARTUP_MARKER"],
+          name: "BundleBoundaryError" });
+      const cli = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(cli.status, 1);
+      assert.match(cli.stderr, /^NQR_BUNDLE_STATIC_CHECK_FAILED\nreasons: ADAPTER_STATIC_UNKNOWN,FORBIDDEN_STARTUP_MARKER$/m);
+    });
+  });
+});
+
+test("stage B: an acceptance record that changes while it is read is not admitted", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
+    await withAdmittedGate([record], async ({ gate }) => {
+      const acceptancePath = join(item.base, "acceptance.json");
+      await writeFile(acceptancePath, record);
+      const originalOpen = fs.open;
+      fs.open = async function openDuringReview(path, ...args) {
+        const handle = await originalOpen.call(this, path, ...args);
+        if (path !== acceptancePath) return handle;
+        return {
+          stat: (...options) => handle.stat(...options),
+          close: () => handle.close(),
+          read: async (...options) => {
+            const result = await handle.read(...options);
+            await appendFile(acceptancePath, " ");
+            return result;
+          },
+        };
+      };
+      syncBuiltinESMExports();
+      let result;
+      try {
+        result = await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN }));
+      } finally {
+        fs.open = originalOpen;
+        syncBuiltinESMExports();
+      }
+      assert.deepEqual(result.reasonCodes, ["UNREADABLE_ACCEPTANCE_RECORD"]);
+    });
+  });
+});
+
+test("stage B: admission uses the lookup captured at load, not a later prototype change", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const inputs = await stageBInputs(item, stageBRecord(item.expectedInputs, await readGateRevision()));
+    const originalIncludes = Array.prototype.includes;
+    const originalHas = Set.prototype.has;
+    let decision;
+    try {
+      Array.prototype.includes = function alwaysIncluded() { return true; };
+      Set.prototype.has = function alwaysPresent() { return true; };
+      decision = evaluateBundleBoundary(inputs);
+    } finally {
+      Array.prototype.includes = originalIncludes;
+      Set.prototype.has = originalHas;
     }
+    assert.ok(decision.reasonCodes.includes("ACCEPTANCE_NOT_ADMITTED"), JSON.stringify(decision));
+    assert.notEqual(decision.status, "PASS_BUNDLE_SCOPE");
   });
 });
 
+test("stage B: verify-existing refuses unpinned dependency bytes before loading them", async () => {
+  await withStageBArtifact({}, async (item) => {
+    const record = stageBRecord(item.expectedInputs, await readGateRevision());
+    await withAdmittedGate([record], async ({ base, buildScript }) => {
+      const acceptancePath = join(item.base, "acceptance.json");
+      await writeFile(acceptancePath, record);
+      const installed = await realpath(join(base, "node_modules"));
+      await rm(join(base, "node_modules"));
+      await mkdir(join(base, "node_modules"));
+      for (const name of await readdir(installed)) {
+        if (name !== "jsdom") await symlink(join(installed, name), join(base, "node_modules", name));
+      }
+      await cp(join(installed, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });
+      const intact = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(intact.status, 0, intact.stderr);
+      await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
+      const tampered = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(tampered.status, 1);
+      assert.match(tampered.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH$/m);
+      assert.doesNotMatch(tampered.stdout + tampered.stderr, /\[verify-existing\]|NQR_BUNDLE/);
+    });
+  });
+});
+
 async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
   const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
   const replacements = [
     ['import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;"],
     ['import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});'],
     ['import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;"],
-    ['process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""', "globalThis.__nqrStageB.untrustedRuntime()"],
+    ['process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""\n    || Object.keys(process.env).some((name) => name.startsWith("DYLD_") || name === "LD_PRELOAD")',
+      "globalThis.__nqrStageB.untrustedRuntime()"],
+    ["  await verifyDependencies();\n", "  await globalThis.__nqrStageB.dependencies();\n"],
   ];
   let harness = original;
   for (const [from, to] of replacements) {
@@ -1236,6 +1339,7 @@
   const previous = { argv: process.argv, exitCode: process.exitCode, error: console.error, log: console.log };
   globalThis.__nqrStageB = {
     spawnSync: () => { events.push("spawn"); return { status: 0 }; },
+    dependencies: async () => { events.push("dependencies"); },
     untrustedRuntime,
     assertBuildOrigin: (env, requested) => {
       calls.origin.push(requested);
@@ -1277,7 +1381,7 @@
   const options = { acceptancePath: "/stage-b/acceptance.json", origin: STAGE_B_ORIGIN };
   const passed = await runBuildHarness(valid);
   assert.equal(passed.exitCode, undefined);
-  assert.deepEqual(passed.events, ["verifier", "origin", "verifier"]);
+  assert.deepEqual(passed.events, ["dependencies", "verifier", "origin", "verifier"]);
   assert.deepEqual(passed.calls.origin, ["production"]);
   assert.deepEqual(passed.calls.verifier, [["/stage-b/artifact", options], ["/stage-b/artifact", options]]);
   assert.deepEqual(passed.calls.originArtifacts, [[STAGE_B_ORIGIN, "/stage-b/artifact"]]);
@@ -1292,7 +1396,7 @@
   assert.ok(!changedAfterOrigin.logs.some((line) => line.includes("[verify-existing]")));
 
   const blocked = await runBuildHarness(valid, { verifier: () => { throw new BundleBoundaryError("NQR_BUNDLE_NEEDS_EMISSION_REVIEW"); } });
-  assert.deepEqual([blocked.exitCode, blocked.events, blocked.errors], [1, ["verifier"], ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]]);
+  assert.deepEqual([blocked.exitCode, blocked.events, blocked.errors], [1, ["dependencies", "verifier"], ["NQR_BUNDLE_NEEDS_EMISSION_REVIEW"]]);
 
   const originFailure = await runBuildHarness(valid, { originArtifacts: () => {
     throw new Error("robots: /private/secret/path/robots.txt.body");
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -1,18 +1,84 @@
 import { spawnSync } from "node:child_process";
+import { createHash } from "node:crypto";
+import { readFile, readdir } from "node:fs/promises";
 import { createRequire } from "node:module";
-import { isAbsolute } from "node:path";
+import { dirname, isAbsolute, join, relative, sep } from "node:path";
+import { fileURLToPath } from "node:url";
 import { assertBuildOrigin } from "./origin-gate.mjs";
 
 const require = createRequire(import.meta.url);
 const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
   + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>";
 
+// Package code that --verify-existing loads (verifier, adapter, origin checks), pinned here and hashed before any of
+// it is imported. Installing, updating or editing these packages blocks until the new bytes are reviewed and re-pinned.
+const VERIFY_EXISTING_DEPENDENCIES = Object.freeze({
+  packages: Object.freeze(["jsdom", "parse5", "entities"]),
+  files: Object.freeze(["node_modules/next/package.json", "node_modules/next/dist/compiled/acorn/acorn.js"]),
+  sha256: "6d45f6c294eb3176a7f494cf9c8d57e501666efeac30ad79fb19aa5044567cfc",
+});
+
+const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
+const digestOf = (bytes) => createHash("sha256").update(bytes).digest("hex");
+
+/** Hashes the dependency closure of the pinned packages without loading any package code. */
+async function dependencyDigest(projectRoot) {
+  const packages = new Set();
+  const toPosix = (path) => relative(projectRoot, path).split(sep).join("/");
+  async function resolvePackage(name, fromDir) {
+    for (let dir = fromDir; ; dir = dirname(dir)) {
+      const candidate = join(dir, "node_modules", name);
+      const manifest = await readFile(join(candidate, "package.json"), "utf8").catch(() => null);
+      if (manifest !== null) return { dir: candidate, manifest: JSON.parse(manifest) };
+      if (dir === projectRoot || dirname(dir) === dir) return null;
+    }
+  }
+  async function visit(name, fromDir) {
+    const found = await resolvePackage(name, fromDir);
+    // An uninstalled optional or peer dependency loads nothing; installing one later changes the digest.
+    if (!found || packages.has(toPosix(found.dir))) return;
+    packages.add(toPosix(found.dir));
+    const { dependencies, optionalDependencies, peerDependencies } = found.manifest;
+    for (const dependency of Object.keys({ ...dependencies, ...optionalDependencies, ...peerDependencies }).sort()) {
+      await visit(dependency, found.dir);
+    }
+  }
+  const rows = [];
+  async function hashTree(dir) {
+    for (const entry of (await readdir(dir, { withFileTypes: true })).sort(byName)) {
+      const path = join(dir, entry.name);
+      if (entry.isDirectory()) {
+        if (entry.name !== "node_modules") await hashTree(path);
+      } else if (entry.isFile()) {
+        rows.push({ path: toPosix(path), sha256: digestOf(await readFile(path)) });
+      } else {
+        throw new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");
+      }
+    }
+  }
+  for (const name of VERIFY_EXISTING_DEPENDENCIES.packages) await visit(name, projectRoot);
+  for (const packagePath of [...packages].sort()) await hashTree(join(projectRoot, ...packagePath.split("/")));
+  for (const file of VERIFY_EXISTING_DEPENDENCIES.files) {
+    rows.push({ path: file, sha256: digestOf(await readFile(join(projectRoot, ...file.split("/")))) });
+  }
+  return digestOf(JSON.stringify(rows));
+}
+
+async function verifyDependencies() {
+  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
+  const digest = await dependencyDigest(projectRoot).catch(() => null);
+  if (digest !== VERIFY_EXISTING_DEPENDENCIES.sha256) throw new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");
+}
+
 async function verifyExisting(artifact, acceptancePath, origin) {
   // Defense in depth only: code injected before this module could already patch anything it checks. Run as a plain
-  // `node scripts/build.mjs --verify-existing …` with no Node flags and no NODE_OPTIONS; anything else is refused.
-  if (process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== "") {
+  // `node scripts/build.mjs --verify-existing …` with no Node flags, no NODE_OPTIONS and no DYLD_*/LD_PRELOAD
+  // variables; anything else is refused. A substituted `node` binary on PATH is outside what this script can detect.
+  if (process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""
+    || Object.keys(process.env).some((name) => name.startsWith("DYLD_") || name === "LD_PRELOAD")) {
     throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
   }
+  await verifyDependencies();
   const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
   const options = { acceptancePath, origin };
   await verifyInitialBundleBoundary(artifact, options);
```
