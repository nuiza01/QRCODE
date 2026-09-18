# NQR-129 Stage B iteration 8 — เทสต์ bare specifier ต้องถูก pin (TL O1)

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-8

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต: iteration 7 (canonical5 `a5aef1e5…c73a`) ได้ ACCEPT จากทั้งสองฝ่าย โดยไม่มี finding ค้าง
- [SECURITY review i7](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_7_SECURITY_REVIEW.md) `90742e193131d9791b21941ab482ecc397462114cd2b69b97d6385ebe48ed54a`
- [TL review i7](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_7_TL_REVIEW.md) `ecbeec70f424786cc2e810a64c07d89aba23987099413fb609d9c02b8340dcf1` มีหมายเหตุ O1 ที่ไม่บังคับ

ผู้ใช้เลือก "เพิ่ม O1 ก่อน แล้วค่อย integrate" iteration 7 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb-b7/project`

แก้เฉพาะ `verify-initial-bundle-boundary.test.mjs` ใน `scratchpad/nqr-stageb-b8/project` **โค้ด runtime ทั้งสี่ไฟล์ไม่เปลี่ยนจาก iteration 7** SOURCE185 ยังเป็น `3b0c6a72…00df` และไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.test.mjs | `c253599162ba7a7b4ddca001e4bd52893d393369cc02ce53cd9cc7ac5458f161` |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` (ไม่เปลี่ยน) |

- Canonical5: **`1c4bdab39842797014f0d82a224261392dd7a1cfb274ed1e9067764f37c2edb7`**
- Delta i7→i8: `1c7b4cce7f015bfb47415778234933ba47c4941f619ba97c58b6f61b3b5cc940`
- Diff i7→i8 อยู่ในภาคผนวก SHA `dd714482400b615cf95931260c8af09e45c57d4cbbdcddbfb465a94ccd43f98c` (78 บรรทัด) และ `patch -p1` บน i7 ได้ hash ตรง
- Gate revision ของ runtime และ dependency pin `753c9343…969c` ไม่เปลี่ยน

## 2. เทสต์ใหม่

`stage B: every bare specifier the gate files load is covered by the dependency pin`
- Parse ไฟล์ gate ทั้งห้า (`build.mjs`, verifier, adapter, `origin-gate.mjs`, `verify-origin-artifacts.mjs`) ด้วย acorn แล้วเก็บ specifier จาก `import`/`export … from`, `import()`, `require()` และ `require.resolve()`
- อ่าน `VERIFY_EXISTING_DEPENDENCIES` จาก AST ของ `build.mjs` เอง โดยไม่ copy รายการมาไว้ในเทสต์
- Specifier ที่ไม่ใช่ literal → fail (ต้องให้เทสต์วิเคราะห์ได้)
- Bare specifier ที่ไม่ใช่ builtin และไม่ใช่ relative ต้องอยู่ใน `packages` (ครอบ subpath ของ package ที่ hash ทั้ง tree) หรือตรงกับ `subpaths` พอดี
- ยกเว้นเพียงตัวเดียวที่ระบุชื่อไว้ คือ `build.mjs:next/dist/bin/next` เพราะเป็น build mode เท่านั้น เทสต์ assert ว่ามีข้อยกเว้นนี้พอดีหนึ่งตัว ถ้ามี `next/dist/bin/next` เพิ่มในไฟล์อื่นเทสต์จะ fail
- ทุก key ใน `subpaths` ต้องเป็นของ package ที่อยู่ใน `files`

## 3. Verification (Node v24.14.1)

- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **284/284 ทั้งสองรอบ** log `43b04d7b…815c` และ `beeb237c…3764` TMPDIR ว่าง eslint ไม่มี error/warning
- **Mutation 4 แบบของเทสต์ใหม่ ถูกจับทั้งหมด** (log `396ca49d…aa4e`):
  - เพิ่ม `import "whatwg-url"` ใน origin artifacts
  - เพิ่ม `import(name)` ที่ไม่ใช่ literal ใน verifier
  - ลบ `parse5` ออกจาก pin
  - เพิ่ม `require.resolve("next/dist/bin/next")` ใน adapter
- ไม่ได้รัน mutant ของ runtime ซ้ำ เพราะโค้ด runtime ไม่เปลี่ยนจาก iteration 7 ที่ reviewer ทั้งสอง accept แล้ว

## 4. ข้อจำกัด

- เทสต์นี้อ่านเฉพาะ specifier ที่เขียนใน source ของไฟล์ gate ส่วน dependency ภายในของ package ครอบด้วยการ hash ทั้ง tree ตามเดิม
- ข้อจำกัดและเงื่อนไขเดิมยังอยู่: S5-2, การสลับไฟล์ระหว่าง hash กับ import, runbook C1/C2 (รวมรายการ false positive) ก่อนการ admit ครั้งแรก, runtime chunk ของ Turbopack จริงยังเป็น UNKNOWN และ `COLD_VALID_INITIAL_PREVIEW` รอการตัดสิน

## ภาคผนวก — diff iteration 7 → 8

```diff
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -2,7 +2,7 @@
 import { spawn, spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
 import fs, { appendFile, cp, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
-import { syncBuiltinESMExports } from "node:module";
+import { createRequire, isBuiltin, syncBuiltinESMExports } from "node:module";
 import { tmpdir } from "node:os";
 import { dirname, join } from "node:path";
 import { fileURLToPath, pathToFileURL } from "node:url";
@@ -1432,6 +1432,66 @@
     { encoding: "utf8", env: { PATH: process.env.PATH, NODE_PATH: "/nonexistent" }, timeout: 30000 });
   assert.equal(refused.status, 1);
   assert.match(refused.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
+});
+
+test("stage B: every bare specifier the gate files load is covered by the dependency pin", async () => {
+  const acorn = createRequire(import.meta.url)("next/dist/compiled/acorn/acorn");
+  const parse = async (name) => acorn.parse(await readFile(new URL(`./${name}`, import.meta.url), "utf8"),
+    { ecmaVersion: "latest", sourceType: "module" });
+  const visit = (node, callback) => {
+    if (!node || typeof node.type !== "string") return;
+    callback(node);
+    for (const value of Object.values(node)) {
+      if (Array.isArray(value)) value.forEach((child) => visit(child, callback));
+      else if (value && typeof value === "object") visit(value, callback);
+    }
+  };
+  const unfreeze = (node) => (node?.type === "CallExpression" && node.callee?.object?.name === "Object"
+    && node.callee?.property?.name === "freeze" ? node.arguments[0] : node);
+
+  let pin = null;
+  visit(await parse("build.mjs"), (node) => {
+    if (node.type === "VariableDeclarator" && node.id?.name === "VERIFY_EXISTING_DEPENDENCIES") pin = unfreeze(node.init);
+  });
+  const pinned = (key) => unfreeze(pin.properties.find((entry) => entry.key.name === key).value);
+  const packages = pinned("packages").elements.map((element) => element.value);
+  const partiallyPinned = pinned("files").properties.map((entry) => entry.key.name);
+  const subpaths = pinned("subpaths").properties.map((entry) => entry.key.value);
+  // Build mode only: resolves Next to spawn `next build`; never reached on the --verify-existing path.
+  const buildModeOnly = ["next/dist/bin/next"];
+
+  const unpinned = [];
+  const unanalysable = [];
+  const buildOnlySeen = [];
+  for (const file of ["build.mjs", "verify-initial-bundle-boundary.mjs", "inspect-turbopack-emission.mjs", "origin-gate.mjs",
+    "verify-origin-artifacts.mjs"]) {
+    const sources = [];
+    visit(await parse(file), (node) => {
+      if (["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration", "ImportExpression"].includes(node.type)
+        && node.source) sources.push(node.source);
+      if (node.type === "CallExpression" && (node.callee?.name === "require"
+        || (node.callee?.type === "MemberExpression" && node.callee.object?.name === "require"))) sources.push(node.arguments[0]);
+    });
+    for (const source of sources) {
+      if (source?.type !== "Literal" || typeof source.value !== "string") {
+        unanalysable.push(file);
+        continue;
+      }
+      const specifier = source.value;
+      if (specifier.startsWith("./") || specifier.startsWith("../") || isBuiltin(specifier)) continue;
+      if (buildModeOnly.includes(specifier)) {
+        buildOnlySeen.push(`${file}:${specifier}`);
+        continue;
+      }
+      const packageName = specifier.split("/").slice(0, specifier.startsWith("@") ? 2 : 1).join("/");
+      if (!packages.includes(packageName) && !subpaths.includes(specifier)) unpinned.push(`${file}:${specifier}`);
+    }
+  }
+  assert.deepEqual(unanalysable, [], "Gate files must load modules only through literal specifiers the pin test can read.");
+  assert.deepEqual(unpinned, [], "A gate file loads a package that VERIFY_EXISTING_DEPENDENCIES does not pin; pin it (packages "
+    + "or subpaths), re-pin the digest after review, and re-review the gate.");
+  assert.deepEqual(buildOnlySeen, ["build.mjs:next/dist/bin/next"]);
+  for (const specifier of subpaths) assert.ok(partiallyPinned.includes(specifier.split("/")[0]), specifier);
 });
 
 async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
```
