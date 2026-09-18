# NQR-129 Stage B iteration 6 — ปิด shadow ที่ไม่มี package.json

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-6

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต:
- [SECURITY review i5](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_5_SECURITY_REVIEW.md) `4dda1ad4bb25d184c61ec03f394ff5e3e80712124941f9d974fa2555efc1b6fa`: ACCEPT พร้อม LOW S5-1 และ S5-2
- [TL review i5](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_5_TL_REVIEW.md) `7414bea0d5d29f50360d17e2ef8e1cdced4fee448ab70c35af36559696c1e0e2`: REQUEST_CHANGES ด้วย D1 (P2) และ D2 (P3)

ผู้ใช้เลือกไว้แล้วว่าให้ปิด finding ก่อน integrate iteration 5 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb-b5/project`

แก้เฉพาะ `build.mjs` กับเทสต์ของ verifier ใน `scratchpad/nqr-stageb-b6/project` ไม่มี install/build/server/browser/network/DB/deploy/commit SOURCE185 ยังเป็น `3b0c6a72…00df` และไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.test.mjs | `cb1a993088feb6dfb2c7852cb240df69469ed310c86df43f62d2b62a98834745` |
| build.mjs | `d43028a5310b753d68e97cf110e255c63ba576412dbe6c53bca30b8145a16be2` |

- Canonical5: **`36d81deb5eef5a584a6799fe150cc802b976363d908b7daf38ce32db76c782d4`**
- Delta i5→i6: `3fca63bbe695c02ea1f4a5d0d2b54bfd1c1d49c289b7cb9af8b46b75506d9e0e`
- Diff i5→i6 อยู่ในภาคผนวก SHA `0b595c0334af602b1388d1af0ecd2e5dc60a63772f54ec52e328954be01c32f5` (132 บรรทัด) และ `patch -p1` บน i5 ได้ hash ตรงทั้งห้าไฟล์
- Dependency pin ยังเป็น `753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c` เพราะ tree ปกติไม่มี shadow ใดๆ

## 2. การแก้

| Finding | การแก้ |
| --- | --- |
| TL D1 (P2) / SEC S5-1 (LOW) — Node โหลดไฟล์หรือโฟลเดอร์ที่ไม่มี `package.json` ซึ่ง pin มองไม่เห็น | `resolvePackage` ไล่ search folder ของ Node ตามลำดับ ในแต่ละโฟลเดอร์ ถ้า `<name>.js`/`.json`/`.node` เป็นไฟล์ → mismatch (CommonJS ลองไฟล์ก่อนโฟลเดอร์) ถ้า `<name>` เป็นไฟล์หรือไม่ใช่โฟลเดอร์ → mismatch ถ้าเป็นโฟลเดอร์ที่ไม่มี `package.json` → mismatch (ESM folder resolution และ index lookup ของ CommonJS รับได้) โฟลเดอร์ที่มี `package.json` เท่านั้นที่นับเป็น package ส่วนชื่อที่ไม่มีรูปใดเลยในทุกโฟลเดอร์ถูกบันทึกเป็น `absent` ตรวจแล้วว่าใน `node_modules` ปัจจุบันไม่มีชื่อชนแบบ `decimal.js`/`punycode.js` ที่จะเกิด false positive |
| Comment ที่อ้างเกินจริง | JSDoc ของ `dependencyDigest` อธิบายกฎข้างบนตามจริง |
| TL D2 (P3) — ข้อความ re-pin ไม่บอก `env -i` และโหมด print พิมพ์ `ENOENT` พร้อม path | `USAGE`, comment ของ pin และข้อความในเทสต์บอกให้ใช้ `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest` และระบุว่าต้องตรวจ tree เทียบ lockfile/registry integrity จาก process แยกก่อน re-pin (ค่าที่ print ไม่ใช่การตรวจนั้น) โหมด print เปลี่ยน error ทุกแบบเป็น `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` |
| SEC S5-2 — preload ที่ลบ `NODE_OPTIONS` ของตัวเอง | ยอมรับเป็นข้อจำกัดตามที่ comment ระบุไว้แล้วว่าเป็น defense in depth runbook ต้องบังคับ `env -i` |

## 3. Verification (Node v24.14.1)

- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **283/283 ทั้งสองรอบ** log `a4a713da…370b` และ `910c0ef8…c9cc5` TMPDIR ว่าง eslint ไม่มี error/warning
- เทสต์ CLI จริงที่เพิ่ม (ทุกกรณี exit 1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH` และไม่มีผลลัพธ์ของ bundle gate) ได้แก่ `canvas` ที่ไม่มีนามสกุล, `canvas.js` และ `canvas/index.js` ที่ไม่มี `package.json` ใน parent folder, `canvas.js` ใน `node_modules` ของโปรเจกต์, `symbol-tree.js` ข้าง package ที่ติดตั้งจริง และ `scripts/node_modules/jsdom/index.js` ที่ไม่มี `package.json` ส่วนโหมด print เมื่อไฟล์ที่ pin ไว้ของ `next` หายไป ต้องพิมพ์เฉพาะ fixed code ไม่มี `ENOENT` และไม่มี path
- **Mutation** (`mutants.cjs` `e3c62987…a816`, log `1c0e087f…a013`): รันชุดที่เกี่ยวกับ runtime/dependency 15 ตัวบน bytes สุดท้าย **ถูกจับทั้งหมด** ได้แก่ M20, B01–B03, P01, P02, P04–P07 และตัวใหม่ S01 ไม่สนใจไฟล์ข้าง package, S02 ข้ามโฟลเดอร์ที่ไม่มี manifest, S03 ข้าม candidate ที่ไม่ใช่โฟลเดอร์ และ S04 print แสดง error ดิบ ส่วน mutant อื่นใน verifier ไม่ได้รันซ้ำ เพราะ verifier ไม่เปลี่ยนจาก i4/i5 และเทสต์ที่แก้เป็นการเพิ่มกรณีเท่านั้น

## 4. ข้อจำกัด

- ข้อจำกัดเดิมยังอยู่ทั้งหมด:
  - pin เป็น drift detection ภายใน process
  - การสลับไฟล์ระหว่าง hash กับ import, library ที่ dyld inject, preload ที่ลบร่องรอยตัวเอง และ `node` ปลอม
  - ทุกครั้งที่อัปเดต dependency ต้อง review และ re-pin
- C2 ยังต้องมี runbook ก่อนการ admit ครั้งแรก: ตรวจ tree จาก process แยกบน snapshot ที่อ่านอย่างเดียวเทียบ lockfile หรือ registry integrity และรันด้วย `env -i` กับ `node` ที่เชื่อถือได้
- Runtime chunk ของ Turbopack จริงยังเป็น UNKNOWN, `COLD_VALID_INITIAL_PREVIEW` รอการตัดสิน และ marker scan เป็นหลักฐานเสริม

## ภาคผนวก — diff iteration 5 → 6

```diff
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -4,7 +4,7 @@
 import fs, { appendFile, cp, lstat, mkdtemp, mkdir, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
 import { syncBuiltinESMExports } from "node:module";
 import { tmpdir } from "node:os";
-import { join } from "node:path";
+import { dirname, join } from "node:path";
 import { fileURLToPath, pathToFileURL } from "node:url";
 import test from "node:test";
 
@@ -1334,6 +1334,21 @@
       await writeFile(join(outer, "node_modules/canvas/package.json"), '{"name":"canvas","version":"0.0.0"}');
       expectMismatch("parent-folder canvas");
       await rm(join(outer, "node_modules"), { recursive: true });
+
+      // Forms Node loads without a package.json: CommonJS file lookups and directory index/ESM folder resolution.
+      for (const [label, path, cleanup] of [
+        ["parent-folder extensionless canvas file", join(outer, "node_modules/canvas"), join(outer, "node_modules")],
+        ["parent-folder canvas.js", join(outer, "node_modules/canvas.js"), join(outer, "node_modules")],
+        ["parent-folder canvas/index.js without package.json", join(outer, "node_modules/canvas/index.js"), join(outer, "node_modules")],
+        ["project node_modules/canvas.js", join(base, "node_modules/canvas.js"), join(base, "node_modules/canvas.js")],
+        ["file beside an installed package", join(base, "node_modules/symbol-tree.js"), join(base, "node_modules/symbol-tree.js")],
+        ["scripts/node_modules/jsdom without package.json", join(base, "scripts/node_modules/jsdom/index.js"), join(base, "scripts/node_modules")],
+      ]) {
+        await mkdir(dirname(path), { recursive: true });
+        await writeFile(path, "module.exports = {};\n");
+        expectMismatch(label);
+        await rm(cleanup, { recursive: true });
+      }
 
       // A shadow package where Node resolves the gate's own imports from scripts/.
       await cp(join(installed, "parse5"), join(base, "scripts/node_modules/parse5"), { recursive: true });
@@ -1373,6 +1388,16 @@
 
       await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
       expectMismatch("tampered package file");
+
+      // Print mode reports a fixed code, not a filesystem error with an absolute path, when a pinned file is missing.
+      await rm(join(base, "node_modules/next"));
+      await mkdir(join(base, "node_modules/next"));
+      await writeFile(join(base, "node_modules/next/package.json"), await readFile(join(installed, "next/package.json")));
+      const printed = spawnSync(process.execPath, [buildScript, "--print-dependency-digest"],
+        { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
+      assert.equal(printed.status, 1);
+      assert.match(printed.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH\n$/);
+      assert.doesNotMatch(printed.stderr, /ENOENT|\//);
     }, { nested: true, importGate: false });
   });
 });
@@ -1384,7 +1409,8 @@
     { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
   assert.equal(printed.status, 0, printed.stderr);
   assert.equal(printed.stdout.trim(), pinned, "Installed jsdom/parse5/entities/next bytes differ from VERIFY_EXISTING_DEPENDENCIES; "
-    + "review the dependency change, then re-pin with `node scripts/build.mjs --print-dependency-digest`.");
+    + "check the changed tree against the lockfile/registry integrity from a separate process, then re-pin with "
+    + "`env -i PATH=\"$PATH\" node scripts/build.mjs --print-dependency-digest`.");
   const refused = spawnSync(process.execPath, [script, "--print-dependency-digest"],
     { encoding: "utf8", env: { PATH: process.env.PATH, NODE_PATH: "/nonexistent" }, timeout: 30000 });
   assert.equal(refused.status, 1);
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -1,6 +1,6 @@
 import { spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
-import { readFile, readdir, realpath } from "node:fs/promises";
+import { lstat, readFile, readdir, realpath, stat } from "node:fs/promises";
 import { createRequire } from "node:module";
 import { dirname, isAbsolute, join, relative, sep } from "node:path";
 import { fileURLToPath } from "node:url";
@@ -8,7 +8,8 @@
 
 const require = createRequire(import.meta.url);
 const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
-  + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file> | --print-dependency-digest";
+  + " | env -i PATH=\"$PATH\" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing --artifact <absolute-dir>"
+  + " --acceptance <absolute-file> | env -i PATH=\"$PATH\" node scripts/build.mjs --print-dependency-digest";
 
 // Only these variables may be set for --verify-existing and --print-dependency-digest: NODE_OPTIONS, NODE_PATH,
 // HOME (global module folders) and loader variables all change what Node loads. Run as
@@ -20,7 +21,8 @@
 // Drift detection for the package code that --verify-existing loads (verifier, adapter, origin checks), hashed before
 // any of it is imported. It is not a boundary against anyone who can write node_modules, scripts/ or these files while
 // the gate runs; SECURITY C2 still requires verifying the tree from a separate process on a read-only snapshot.
-// Re-pin after a reviewed dependency change with `node scripts/build.mjs --print-dependency-digest` (same environment).
+// Re-pin only after the changed tree has been checked against the lockfile/registry integrity from a separate process:
+// `env -i PATH="$PATH" node scripts/build.mjs --print-dependency-digest`. The printed value is not itself that check.
 const VERIFY_EXISTING_DEPENDENCIES = Object.freeze({
   packages: Object.freeze(["jsdom", "parse5", "entities"]),
   files: Object.freeze({ next: Object.freeze(["package.json", "dist/compiled/acorn/acorn.js"]) }),
@@ -41,9 +43,11 @@
 /**
  * Hashes the pinned packages' dependency closure as Node would resolve it from scripts/, without loading package
  * code: lookups use Node's own search paths, packages are read through their real paths, and rows are keyed by
- * name@version so the digest does not depend on where the project lives. A dependency that no search path provides
- * (for example jsdom's optional canvas peer) is recorded as absent, so installing it anywhere Node looks changes the
- * digest. A symlink inside a package or a node_modules directory below a package root is a mismatch.
+ * name@version so the digest does not depend on where the project lives. In each search folder, a file Node's CommonJS
+ * resolver would try first (<name>, <name>.js/.json/.node) or a <name> directory without package.json (which ESM and
+ * CommonJS index lookup accept) is a mismatch. A dependency that no search folder provides in any form (for example
+ * jsdom's optional canvas peer) is recorded as absent. A symlink inside a package or a node_modules directory below a
+ * package root is also a mismatch.
  */
 async function dependencyDigest(scriptsDir) {
   const rows = [];
@@ -52,8 +56,15 @@
     // The trailing slash forces package lookup for names that are also Node builtins (punycode).
     for (const base of createRequire(join(fromDir, "resolve.js")).resolve.paths(`${name}/`) ?? []) {
       const candidate = join(base, name);
+      for (const suffix of [".js", ".json", ".node"]) {
+        if ((await stat(`${candidate}${suffix}`).catch(() => null))?.isFile()) throw dependencyMismatch();
+      }
+      if (!await lstat(candidate).catch(() => null)) continue;
+      const target = await stat(candidate).catch(() => null);
+      if (!target?.isDirectory()) throw dependencyMismatch();
       const manifest = await readFile(join(candidate, "package.json"), "utf8").catch(() => null);
-      if (manifest !== null) return { dir: await realpath(candidate), manifest: JSON.parse(manifest) };
+      if (manifest === null) throw dependencyMismatch();
+      return { dir: await realpath(candidate), manifest: JSON.parse(manifest) };
     }
     return null;
   }
@@ -133,7 +144,8 @@
   const args = process.argv.slice(2);
   if (args.length === 1 && args[0] === "--print-dependency-digest") {
     assertTrustedRuntime();
-    console.log(await dependencyDigest(dirname(fileURLToPath(import.meta.url))));
+    // Fixed code only: a missing pinned file would otherwise print an absolute path.
+    console.log(await dependencyDigest(dirname(fileURLToPath(import.meta.url))).catch(() => { throw dependencyMismatch(); }));
     process.exit(0);
   }
   const existing = args[0] === "--verify-existing";
```
