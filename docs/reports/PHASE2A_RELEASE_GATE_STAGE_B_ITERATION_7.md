# NQR-129 Stage B iteration 7 — ปิด S6-1 และ G1

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-7

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต: iteration 6 (canonical5 `36d81deb…82d4`) ได้ **ACCEPT จากทั้งสองฝ่าย**
- [SECURITY review i6](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_6_SECURITY_REVIEW.md) `169a0e9bc60e4757cf1ebe97321c2a4b4c9a42aaf337a2890214972f962cbc6d`: LOW S6-1
- [TL review i6](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_6_TL_REVIEW.md) `75c80deed7351cd3152975ab3036188b27a9d1b5421b3397b698e0a1912a98f7`: P3 G1

ผู้ใช้เลือกไว้ว่าให้ปิด P3/LOW ก่อน integrate iteration 6 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb-b6/project` แก้เฉพาะ `build.mjs` กับเทสต์ของ verifier ใน `scratchpad/nqr-stageb-b7/project` SOURCE185 ยังเป็น `3b0c6a72…00df` และไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.test.mjs | `3f0f3e0b4053e1d5961b63b9d6ad59ad9c825492ee1240e91be43cf8fdeca764` |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` |

- Canonical5: **`a5aef1e5039d135aca7eb42795f62662a6a558d2659da052a6d608dc47f5c73a`**
- Delta i6→i7: `dea94f2af899fc3111d24cd37952c4bada1f81e9b5f4abee5c8d48983d8c5ae5`
- Diff i6→i7 อยู่ในภาคผนวก SHA `0e9ce26b2b39263dce84e47f9b22abb1e3c0372cf87477047676d6a69252fb16` (84 บรรทัด) และ `patch -p1` บน i6 ได้ hash ตรงทั้งห้าไฟล์
- Dependency pin ยังเป็น `753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c`

## 2. การแก้

| Finding | การแก้ |
| --- | --- |
| SEC S6-1 (LOW) — package scope ที่ชื่อ `jsdom` ใกล้ `scripts/` ถูกโหลดผ่าน self-reference | ก่อน hash ให้หา `package.json` ที่ใกล้ที่สุดตั้งแต่ `scripts/` ขึ้นไป ถ้า `name` ตรงกับ package ที่ pin (`jsdom`, `parse5`, `entities`, `next`) → mismatch ถ้า JSON ไม่ถูกต้อง → mismatch (fail closed) |
| TL G1 (P3) — ไฟล์ `acorn` ที่ไม่มีนามสกุลถูกโหลดก่อน `acorn.js` ที่ pin | เพิ่ม `subpaths` ใน pin: `next/dist/compiled/acorn/acorn` ต้อง resolve ด้วย `createRequire(scripts/…).resolve` แล้ว realpath ตรงกับ `acorn.js` ที่ hash ไว้ ถ้าไม่ตรงหรือ resolve ไม่ได้ → mismatch |
| SEC S5-2 | คงไว้เป็นข้อจำกัดที่บันทึกแล้ว (defense in depth, runbook ต้องบังคับ `env -i`) |

## 3. Verification (Node v24.14.1)

- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **283/283 ทั้งสองรอบ** log `80bd130a…f9a8` และ `a59f3e21…acaa` TMPDIR ว่าง eslint ไม่มี error/warning
- เทสต์ CLI จริงที่เพิ่ม:
  - `scripts/package.json` ที่ชื่ออื่น → exit 0
  - `scripts/package.json` ที่ชื่อ `jsdom` พร้อม `exports` → exit 1 `NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH`
  - `next` ขั้นต่ำที่ copy `package.json` กับ `dist/compiled/acorn` → exit 0
  - เพิ่มไฟล์ `acorn` ที่ไม่มีนามสกุล → exit 1
- **Mutation** (`mutants.cjs` `e81afaaa…890b`, log `a923dd8d…d09`): ชุด runtime/dependency 16 ตัวบน bytes สุดท้าย **ถูกจับทั้งหมด** รวมตัวใหม่ T01 (ไม่สนใจ scope self-reference) และ T02 (ไม่ตรวจการ resolve subpath)

## 4. ข้อจำกัด

- ข้อจำกัดเดิมทั้งหมดยังอยู่:
  - pin เป็น drift detection ภายใน process
  - การสลับไฟล์ระหว่าง hash กับ import, library ที่ dyld inject, preload ที่ลบร่องรอยตัวเอง และ `node` ปลอม
- เงื่อนไข C1/C2 ต้องมี runbook ก่อนการ admit ครั้งแรก: ตรวจ tree จาก process แยกบน snapshot ที่อ่านอย่างเดียวเทียบ lockfile/registry integrity และรันด้วย `env -i` กับ `node` ที่เชื่อถือได้
- Finding ตั้งแต่ iteration 4 เป็นคลาสเดียวกันทั้งหมด คือผู้ที่เขียน `node_modules`, `scripts/` หรือ package scope ของโปรเจกต์ได้อยู่แล้ว ซึ่งสุดท้ายต้องพึ่ง C2
- False positive ที่ fail closed ตาม TL i6: `jsdom.js` ข้าง package, โฟลเดอร์ว่างที่เหลือจากการ uninstall หรือชื่อชนใน global folder จะแสดงเป็น `DEPENDENCY_MISMATCH` เฉยๆ runbook ควรระบุไว้
- Runtime chunk ของ Turbopack จริงยังเป็น UNKNOWN และ `COLD_VALID_INITIAL_PREVIEW` รอการตัดสิน

## ภาคผนวก — diff iteration 6 → 7

```diff
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -1386,13 +1386,30 @@
       await rm(join(base, "node_modules/jsdom"));
       await cp(join(elsewhere, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });
 
+      // A package scope above scripts/ named like a pinned package wins through ESM/CommonJS self-reference.
+      await writeFile(join(base, "scripts/package.json"), '{"name":"nqr-scripts-scope"}');
+      assert.equal(run().status, 0, "unrelated scripts/package.json");
+      await writeFile(join(base, "scripts/package.json"), '{"name":"jsdom","exports":"./jsdom-self.mjs"}');
+      await writeFile(join(base, "scripts/jsdom-self.mjs"), 'export * from "../node_modules/jsdom/lib/api.js";\n');
+      expectMismatch("self-referencing scripts/package.json");
+      await rm(join(base, "scripts/package.json"));
+      await rm(join(base, "scripts/jsdom-self.mjs"));
+
+      // A partially pinned package: the required subpath must resolve to the hashed acorn.js, not an earlier candidate.
+      await rm(join(base, "node_modules/next"));
+      await mkdir(join(base, "node_modules/next/dist/compiled"), { recursive: true });
+      await cp(join(installed, "next/package.json"), join(base, "node_modules/next/package.json"));
+      await cp(join(installed, "next/dist/compiled/acorn"), join(base, "node_modules/next/dist/compiled/acorn"), { recursive: true });
+      assert.equal(run().status, 0, "minimal next copy");
+      await writeFile(join(base, "node_modules/next/dist/compiled/acorn/acorn"), "module.exports = {};\n");
+      expectMismatch("extensionless file ahead of the pinned acorn.js");
+      await rm(join(base, "node_modules/next/dist/compiled/acorn/acorn"));
+
       await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
       expectMismatch("tampered package file");
 
       // Print mode reports a fixed code, not a filesystem error with an absolute path, when a pinned file is missing.
-      await rm(join(base, "node_modules/next"));
-      await mkdir(join(base, "node_modules/next"));
-      await writeFile(join(base, "node_modules/next/package.json"), await readFile(join(installed, "next/package.json")));
+      await rm(join(base, "node_modules/next/dist"), { recursive: true });
       const printed = spawnSync(process.execPath, [buildScript, "--print-dependency-digest"],
         { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
       assert.equal(printed.status, 1);
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -26,6 +26,8 @@
 const VERIFY_EXISTING_DEPENDENCIES = Object.freeze({
   packages: Object.freeze(["jsdom", "parse5", "entities"]),
   files: Object.freeze({ next: Object.freeze(["package.json", "dist/compiled/acorn/acorn.js"]) }),
+  // Subpath specifiers the gate requires from a partially pinned package, and the pinned file each must resolve to.
+  subpaths: Object.freeze({ "next/dist/compiled/acorn/acorn": "dist/compiled/acorn/acorn.js" }),
   sha256: "753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c",
 });
 
@@ -47,11 +49,22 @@
  * resolver would try first (<name>, <name>.js/.json/.node) or a <name> directory without package.json (which ESM and
  * CommonJS index lookup accept) is a mismatch. A dependency that no search folder provides in any form (for example
  * jsdom's optional canvas peer) is recorded as absent. A symlink inside a package or a node_modules directory below a
- * package root is also a mismatch.
+ * package root is also a mismatch, as is a package scope above scripts/ whose name matches a pinned package (ESM and
+ * CommonJS self-reference would load it instead of node_modules), or a pinned subpath that Node's resolver maps to any
+ * file other than the hashed one.
  */
 async function dependencyDigest(scriptsDir) {
   const rows = [];
   const visited = new Set();
+  const pinnedNames = [...VERIFY_EXISTING_DEPENDENCIES.packages, ...Object.keys(VERIFY_EXISTING_DEPENDENCIES.files)];
+  for (let dir = scriptsDir; ; dir = dirname(dir)) {
+    const manifest = await readFile(join(dir, "package.json"), "utf8").catch(() => null);
+    if (manifest !== null) {
+      if (pinnedNames.includes(JSON.parse(manifest).name)) throw dependencyMismatch();
+      break;
+    }
+    if (dirname(dir) === dir) break;
+  }
   async function resolvePackage(name, fromDir) {
     // The trailing slash forces package lookup for names that are also Node builtins (punycode).
     for (const base of createRequire(join(fromDir, "resolve.js")).resolve.paths(`${name}/`) ?? []) {
@@ -114,6 +127,12 @@
     const key = `${found.manifest.name}@${found.manifest.version}`;
     for (const file of files) rows.push({ file, package: key, sha256: digestOf(await readFile(join(found.dir, ...file.split("/")))) });
   }
+  for (const [specifier, file] of Object.entries(VERIFY_EXISTING_DEPENDENCIES.subpaths)) {
+    const found = await resolvePackage(specifier.split("/")[0], scriptsDir);
+    // An extensionless or other earlier candidate must not win over the hashed file.
+    const resolved = await realpath(createRequire(join(scriptsDir, "resolve.js")).resolve(specifier)).catch(() => null);
+    if (!found || resolved !== await realpath(join(found.dir, ...file.split("/")))) throw dependencyMismatch();
+  }
   return digestOf(JSON.stringify(rows.map((row) => JSON.stringify(row)).sort(ascending)));
 }
 
```
