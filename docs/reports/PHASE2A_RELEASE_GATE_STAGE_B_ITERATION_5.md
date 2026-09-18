# NQR-129 Stage B iteration 5 — แก้ dependency pin ตาม review ของ iteration 4

วันที่ 2026-09-17 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-5

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

อินพุต: [TL review i4](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_4_TL_REVIEW.md) `2b7e168b2dc0c20a37f7bcaad792da07e8157da88f42fe5eae1eb1ee0d1e02d4` และ [SECURITY review i4](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_4_SECURITY_REVIEW.md) `9f60e3b464a9d5e7009bf47e7fe9e78ea4a92504f3f0793b19ab4a3bb56b1424` ทั้งคู่ได้ REQUEST_CHANGES เพราะ dependency pin ของ iteration 4 ถูก bypass ได้ (ทุกวิธีต้องคุม environment, เขียน `scripts/` หรือ `node_modules` ได้ หรือเขียนไฟล์ระหว่าง gate รัน) และรายงาน i4 อ้างเกินจริงว่าปิด S1 กับ C2 แล้ว iteration 4 ยังเก็บไว้ไม่แก้ที่ `scratchpad/nqr-stageb-b4/project`

แก้เฉพาะ `build.mjs` กับเทสต์ของ verifier ใน `scratchpad/nqr-stageb-b5/project` ไม่มี install/build/server/browser/network/DB/deploy/commit SOURCE185 ยังเป็น `3b0c6a72…00df` ไม่มีไฟล์ถูกเขียนลง `node_modules` ของ SOURCE และไม่มี `scripts/node_modules` ใน SOURCE

## 1. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `97827d1884f7a66ca867bd31e64a7be8a7f43cf71a411e001bc099b5977a2957` (ไม่เปลี่ยนจาก i4) |
| verify-initial-bundle-boundary.test.mjs | `a979f49a609623173705b27d4776d7f37e0c04483d3218b868adada886af0d45` |
| build.mjs | `674551ea91cb36d64496d7853f57642504a42ce4f184324a4d6ee9ca0ac55428` |

- Canonical5: **`a88595efd036e75612d95bb078f685cad6779d34f56c950ee32777e02f87bf55`**
- Delta i4→i5: `3f27ca73d8058a1c636e423bbeb224db295b7bb04a16ed917aff7b85e61565f3`
- Diff i4→i5 อยู่ในภาคผนวก SHA `cf29ea558e372484baf758ef0cd81e08569d7f47b7f254af1dd1e87d5935f2cf` (382 บรรทัด) และ `patch -p1` บน i4 ได้ hash ตรงทั้งห้าไฟล์
- Dependency pin ใหม่: `753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c` ตรงกันทั้งเมื่อ `node_modules` เป็น symlink, ย้ายโปรเจกต์ไปที่อื่น และ copy jsdom จริงออกมา

## 2. การแก้

| Finding | การแก้ |
| --- | --- |
| SEC S4-1 A / TL P1-dep — `NODE_PATH`/`HOME` พา `canvas` ปลอมเข้ามา | Environment เป็น **allowlist** ได้เฉพาะ `PATH`, `NEXT_PUBLIC_APP_URL`, `TMPDIR`, `LANG`, `LC_ALL`, `TZ` และ `__CF_USER_TEXT_ENCODING` (macOS เติมให้ทุก process) ตัวแปรอื่นรวม `NODE_*`, `HOME`, `DYLD_*`, `LD_*` → `NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME` วิธีรันคือ `env -i PATH="$PATH" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing …` Dependency ที่ resolve ไม่ได้ (เช่น optional peer `canvas`) บันทึกเป็น `absent` ใน digest ถ้าไปโผล่ในโฟลเดอร์ใดก็ตามที่ Node ค้นหา (ทดสอบด้วย parent folder) digest จะเปลี่ยน |
| SEC B — package เงาใน `scripts/node_modules` | Resolve ด้วย `createRequire(<dir>/resolve.js).resolve.paths(\`\${name}/\`)` ของ Node เอง โดยเริ่มจาก `scripts/` ซึ่งเป็นตำแหน่งที่ gate import จริง (slash ท้ายชื่อบังคับให้ค้นเป็น package เช่น `punycode` ที่ชื่อชนกับ builtin) |
| SEC C — shim ใน `node_modules` ซ้อน | ถ้าพบ `node_modules` ลึกกว่า root ของ package → mismatch ส่วน `node_modules` ที่ root ของ package ให้บันทึกรายชื่อ (รวม scoped) ลง digest ด้วย การเพิ่ม package ที่ไม่ได้ประกาศจึงถูกจับ |
| SEC D — symlink package ไปยังสำเนาที่ dependency ข้างเคียงถูกแก้ | อ่าน package ผ่าน `realpath` และ resolve dependency จาก real path แบบเดียวกับ Node row ใช้ key `name@version` + path ภายใน package จึงไม่ขึ้นกับตำแหน่ง |
| TL P3-a — ไม่มีวิธี re-pin | เพิ่ม `node scripts/build.mjs --print-dependency-digest` ซึ่งใช้ allowlist เดียวกัน และเพิ่มเทสต์ที่เทียบค่ากับ pin พร้อมข้อความบอกให้ review ก่อน re-pin |
| TL P3-b — symlink ใน package ไม่มีเทสต์ | เพิ่มเทสต์ CLI (mutant ที่ข้าม symlink ถูกจับ) |
| SEC E / TL P3-c — สลับไฟล์ระหว่าง hash กับ import | **ยอมรับเป็นข้อจำกัด** เขียนไว้ใน comment ของ `verifyExisting` |
| SEC S4-2 — `DYLD_*` ถูกโหลดก่อน JavaScript | **ยอมรับเป็นข้อจำกัด** allowlist ยังปฏิเสธตัวแปรเหล่านี้ แต่ comment ระบุว่า library ที่ถูก inject ทำงานไปก่อนแล้ว และ `node` ปลอมใน PATH ตรวจจับไม่ได้ |
| ถ้อยคำของ C2 | Comment ของ `VERIFY_EXISTING_DEPENDENCIES` ระบุว่าเป็นเพียง drift detection ภายใน process ของ gate ไม่ใช่ boundary กับผู้ที่เขียน `node_modules`, `scripts/` หรือไฟล์ระหว่างรันได้ **C2 ยังต้องเป็นขั้นตอนใน runbook:** ตรวจ tree จาก process แยกบน snapshot ที่อ่านอย่างเดียว |

ระหว่างทำงาน mutant P08 (ไม่ throw เมื่อ dependency ที่จำเป็นหายไป) รอด เพราะ dependency ที่หายไปทำให้ digest เปลี่ยนอยู่แล้ว จึงตัดทางแยก optional/required ออก ให้ทุกตัวที่ resolve ไม่ได้บันทึกเป็น `absent` และ digest ยังเท่าเดิม

## 3. Verification (Node v24.14.1)

- Affected suite บน bytes ที่ freeze แล้ว 2 รอบ: **283/283 ทั้งสองรอบ** log `f9a37039…523a` และ `d8aa5f42…22cf1` TMPDIR ว่าง
- eslint ห้าไฟล์: ไม่มี error/warning
- เทสต์ CLI จริงของ dependency (สำเนา `node_modules` ที่ copy jsdom และ symbol-tree จริงออกมา): ถ้าไม่แก้ → exit 0 ส่วนกรณีต่อไปนี้ได้ exit 1 ทุกกรณี: `NODE_PATH`, `HOME`, ตัวแปรที่ไม่อยู่ใน allowlist, `canvas` ใน parent folder, `scripts/node_modules/parse5` ที่ถูกแก้, shim ใน `jsdom/lib/node_modules`, package ที่ไม่ได้ประกาศใน `jsdom/node_modules`, symlink ใน jsdom, jsdom ที่เป็น symlink ไปยังสำเนาที่ `symbol-tree` ข้างเคียงถูกแก้ และ `jsdom/lib/api.js` ที่ถูกแก้
- **Mutation 62 แบบ** (`mutants.cjs` `dbe318ae…ac57`, log `c926c544…c9a`): รอบแรกจับได้ 61 ตัว P08 รอดตามที่อธิบายข้างบน หลังตัดทางแยกออกแล้ว ได้รัน mutant ของ pin ซ้ำ (P01 resolve จาก project root, P02 ข้าม nested node_modules, P04 ข้าม symlink, P05 ไม่ใช้ realpath, P06 ไม่บันทึกรายชื่อที่ root) **ถูกจับทั้งหมด**

## 4. ข้อจำกัด

- Pin เป็น drift detection ภายใน process เท่านั้น การสลับไฟล์ระหว่าง hash กับ import, library ที่ dyld inject และ `node` ปลอมยังทำได้ถ้าผู้โจมตีคุมเครื่องหรือ environment ได้ C2 ยังต้องทำตาม runbook
- ทุกครั้งที่ติดตั้งหรืออัปเดต jsdom, parse5, entities, next หรือ dependency ของตัวเหล่านี้ ต้อง review แล้ว re-pin ใหม่
- Allowlist ของ environment เข้มโดยเจตนา operator ต้องรันด้วย `env -i`
- ข้อจำกัดเดิมยังอยู่: runtime chunk ของ Turbopack จริงเป็น UNKNOWN, `COLD_VALID_INITIAL_PREVIEW` รอการตัดสิน และ marker scan เป็นหลักฐานเสริม

## ภาคผนวก — diff iteration 4 → 5

```diff
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -814,9 +814,12 @@
 
 // Real on-disk admission: copies the gate modules, writes the digests into the copied verifier file and imports it
 // through its file URL. Nothing is rewritten in memory, so the gate revision is computed from the running bytes.
-async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true } = {}) {
-  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
+async function withAdmittedGate(recordBytes, callback, { declaration, importGate = true, nested = false } = {}) {
+  // nested puts the copy one level below a private folder so tests can plant files in folders Node searches.
+  const outer = await mkdtemp(join(await realpath(tmpdir()), "nqr-stage-b-admitted-"));
+  const base = nested ? join(outer, "gate") : outer;
   try {
+    if (nested) await mkdir(base);
     await mkdir(join(base, "scripts"));
     for (const name of STAGE_B_MODULES) {
       let source = await readFile(new URL(`./${name}`, import.meta.url), "utf8");
@@ -830,9 +833,9 @@
     }
     await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
     const gate = importGate ? await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href) : null;
-    return await callback({ base, gate, buildScript: join(base, "scripts/build.mjs") });
+    return await callback({ base, outer, gate, buildScript: join(base, "scripts/build.mjs") });
   } finally {
-    await rm(base, { recursive: true, force: true });
+    await rm(outer, { recursive: true, force: true });
   }
 }
 
@@ -921,7 +924,8 @@
         assert.equal(preloaded.status, 1, nodeOptions);
         assert.match(preloaded.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, nodeOptions);
       }
-      for (const [name, value] of [["LD_PRELOAD", "/nonexistent/preload.so"], ["DYLD_NQR_STAGE_B_UNUSED", "1"]]) {
+      for (const [name, value] of [["LD_PRELOAD", "/nonexistent/preload.so"], ["DYLD_NQR_STAGE_B_UNUSED", "1"],
+        ["NODE_PATH", "/nonexistent"], ["HOME", "/nonexistent"], ["NQR_UNLISTED", "1"]]) {
         const injected = runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, [name]: value });
         assert.equal(injected.status, 1, name);
         assert.match(injected.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, name);
@@ -1189,18 +1193,19 @@
     const digest = stageBHash(record);
     const acceptancePath = join(item.base, "acceptance.json");
     await writeFile(acceptancePath, record);
-    const env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, NQR_STAGE_B_ADMIT: digest };
+    // The verify-existing environment allowlist refuses extra variables, so no variant can read one at runtime.
+    const env = { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN };
     const control = `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n]);`;
     const declarations = {
       control,
       environment: "export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([process.env.NQR_STAGE_B_ADMIT]);",
       prototypePatch: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([(() => { Set.prototype.has = () => true; return "${digest}"; })()]);`,
-      mixedEntry: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n  process.env.NQR_STAGE_B_ADMIT,\n]);`,
+      mixedEntry: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([\n  "${digest}",\n  process.env.PATH,\n]);`,
       looseSpacing: `export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([ "${digest}" ]);`,
       secondDeclaration: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/`,
       secondStatement: `${control}\n/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = unreviewed;\n*/`,
       // The only strict-form declaration is an inert comment; the running list comes from code on another line.
-      commentDecoy: "const nqrStageBDecoy = 0; export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([process.env.NQR_STAGE_B_ADMIT]);\n"
+      commentDecoy: `const nqrStageBDecoy = 0; export const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze(["${digest}"]);\n`
         + "/*\nexport const ADMITTED_ACCEPTANCE_SHA256 = Object.freeze([]);\n*/",
     };
     for (const [name, declaration] of Object.entries(declarations)) {
@@ -1208,6 +1213,9 @@
         const result = runVerifyExisting(buildScript, item, acceptancePath, env);
         if (name === "control") {
           assert.equal(result.status, 0, result.stderr);
+        } else if (name === "environment") {
+          assert.equal(result.status, 1, name);
+          assert.match(result.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: ACCEPTANCE_NOT_ADMITTED$/m, name);
         } else {
           assert.equal(result.status, 1, name);
           // A prototype patch also disturbs other checks; what matters is that the unreadable revision blocks.
@@ -1289,37 +1297,107 @@
   });
 });
 
-test("stage B: verify-existing refuses unpinned dependency bytes before loading them", async () => {
+test("stage B: verify-existing refuses unpinned or shadowing dependency code before loading it", async () => {
   await withStageBArtifact({}, async (item) => {
     const record = stageBRecord(item.expectedInputs, await readGateRevision());
-    await withAdmittedGate([record], async ({ base, buildScript }) => {
+    await withAdmittedGate([record], async ({ base, outer, buildScript }) => {
       const acceptancePath = join(item.base, "acceptance.json");
       await writeFile(acceptancePath, record);
       const installed = await realpath(join(base, "node_modules"));
+      const linkAllExcept = async (directory, copied) => {
+        for (const name of await readdir(installed)) {
+          if (!copied.includes(name)) await symlink(join(installed, name), join(directory, name));
+        }
+      };
       await rm(join(base, "node_modules"));
       await mkdir(join(base, "node_modules"));
-      for (const name of await readdir(installed)) {
-        if (name !== "jsdom") await symlink(join(installed, name), join(base, "node_modules", name));
-      }
+      await linkAllExcept(join(base, "node_modules"), ["jsdom", "symbol-tree"]);
       await cp(join(installed, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });
-      const intact = runVerifyExisting(buildScript, item, acceptancePath);
-      assert.equal(intact.status, 0, intact.stderr);
-      await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
-      const tampered = runVerifyExisting(buildScript, item, acceptancePath);
-      assert.equal(tampered.status, 1);
-      assert.match(tampered.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH$/m);
-      assert.doesNotMatch(tampered.stdout + tampered.stderr, /\[verify-existing\]|NQR_BUNDLE/);
-    });
+      await cp(join(installed, "symbol-tree"), join(base, "node_modules/symbol-tree"), { recursive: true });
+      const run = (env = {}) => runVerifyExisting(buildScript, item, acceptancePath, { NEXT_PUBLIC_APP_URL: STAGE_B_ORIGIN, ...env });
+      const expectMismatch = (label) => {
+        const result = run();
+        assert.equal(result.status, 1, label);
+        assert.match(result.stderr, /^NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH$/m, label);
+        assert.doesNotMatch(result.stdout + result.stderr, /\[verify-existing\]|NQR_BUNDLE/, label);
+      };
+      assert.equal(run().status, 0, "intact copies");
+
+      for (const [name, value] of [["NODE_PATH", join(outer, "node_modules")], ["HOME", outer], ["NQR_UNLISTED", "1"]]) {
+        const result = run({ [name]: value });
+        assert.equal(result.status, 1, name);
+        assert.match(result.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m, name);
+      }
+
+      // jsdom tries require("canvas"); an optional peer planted in a parent folder Node searches must be caught.
+      await mkdir(join(outer, "node_modules/canvas"), { recursive: true });
+      await writeFile(join(outer, "node_modules/canvas/package.json"), '{"name":"canvas","version":"0.0.0"}');
+      expectMismatch("parent-folder canvas");
+      await rm(join(outer, "node_modules"), { recursive: true });
+
+      // A shadow package where Node resolves the gate's own imports from scripts/.
+      await cp(join(installed, "parse5"), join(base, "scripts/node_modules/parse5"), { recursive: true });
+      await appendFile(join(base, "scripts/node_modules/parse5/package.json"), "\n");
+      expectMismatch("scripts/node_modules shadow");
+      await rm(join(base, "scripts/node_modules"), { recursive: true });
+
+      // A shim in a node_modules directory below a package root.
+      await mkdir(join(base, "node_modules/jsdom/lib/node_modules/symbol-tree"), { recursive: true });
+      await writeFile(join(base, "node_modules/jsdom/lib/node_modules/symbol-tree/package.json"), '{"name":"symbol-tree","version":"3.2.4"}');
+      expectMismatch("nested node_modules shim");
+      await rm(join(base, "node_modules/jsdom/lib/node_modules"), { recursive: true });
+
+      // An undeclared package next to a package root would be found first by any require of that name.
+      await mkdir(join(base, "node_modules/jsdom/node_modules/nqr-undeclared"), { recursive: true });
+      await writeFile(join(base, "node_modules/jsdom/node_modules/nqr-undeclared/package.json"), '{"name":"nqr-undeclared","version":"0.0.0"}');
+      expectMismatch("undeclared package at a package root");
+      await rm(join(base, "node_modules/jsdom/node_modules/nqr-undeclared"), { recursive: true });
+
+      await symlink("api.js", join(base, "node_modules/jsdom/lib/nqr-link.js"));
+      expectMismatch("symlink inside a package");
+      await rm(join(base, "node_modules/jsdom/lib/nqr-link.js"));
+      assert.equal(run().status, 0, "restored copies");
+
+      // A symlinked package directory: Node resolves its dependencies from the real path, where a sibling is tampered.
+      const elsewhere = join(outer, "elsewhere/node_modules");
+      await mkdir(elsewhere, { recursive: true });
+      await linkAllExcept(elsewhere, ["jsdom", "symbol-tree"]);
+      await cp(join(base, "node_modules/jsdom"), join(elsewhere, "jsdom"), { recursive: true });
+      await cp(join(installed, "symbol-tree"), join(elsewhere, "symbol-tree"), { recursive: true });
+      await appendFile(join(elsewhere, "symbol-tree/lib/SymbolTree.js"), "\n// unreviewed change\n");
+      await rm(join(base, "node_modules/jsdom"), { recursive: true });
+      await symlink(join(elsewhere, "jsdom"), join(base, "node_modules/jsdom"));
+      expectMismatch("symlinked package with a tampered sibling");
+      await rm(join(base, "node_modules/jsdom"));
+      await cp(join(elsewhere, "jsdom"), join(base, "node_modules/jsdom"), { recursive: true });
+
+      await appendFile(join(base, "node_modules/jsdom/lib/api.js"), "\n// unreviewed change\n");
+      expectMismatch("tampered package file");
+    }, { nested: true, importGate: false });
   });
 });
 
+test("stage B: the pinned dependency digest matches the installed tree and is printed only in a clean runtime", async () => {
+  const script = fileURLToPath(new URL("./build.mjs", import.meta.url));
+  const pinned = /sha256: "([a-f0-9]{64})",\n\}\);/.exec(await readFile(new URL("./build.mjs", import.meta.url), "utf8"))?.[1];
+  const printed = spawnSync(process.execPath, [script, "--print-dependency-digest"],
+    { encoding: "utf8", env: { PATH: process.env.PATH }, timeout: 30000 });
+  assert.equal(printed.status, 0, printed.stderr);
+  assert.equal(printed.stdout.trim(), pinned, "Installed jsdom/parse5/entities/next bytes differ from VERIFY_EXISTING_DEPENDENCIES; "
+    + "review the dependency change, then re-pin with `node scripts/build.mjs --print-dependency-digest`.");
+  const refused = spawnSync(process.execPath, [script, "--print-dependency-digest"],
+    { encoding: "utf8", env: { PATH: process.env.PATH, NODE_PATH: "/nonexistent" }, timeout: 30000 });
+  assert.equal(refused.status, 1);
+  assert.match(refused.stderr, /^NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME$/m);
+});
+
 async function runBuildHarness(args, { verifier, originArtifacts, admission, untrustedRuntime = () => false } = {}) {
   const original = await readFile(new URL("./build.mjs", import.meta.url), "utf8");
   const replacements = [
     ['import { spawnSync } from "node:child_process";', "const spawnSync=globalThis.__nqrStageB.spawnSync;"],
     ['import { createRequire } from "node:module";', 'const createRequire=()=>({resolve:()=>"/not-executed-next"});'],
     ['import { assertBuildOrigin } from "./origin-gate.mjs";', "const assertBuildOrigin=globalThis.__nqrStageB.assertBuildOrigin;"],
-    ['process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""\n    || Object.keys(process.env).some((name) => name.startsWith("DYLD_") || name === "LD_PRELOAD")',
+    ["process.execArgv.length > 0 || Object.keys(process.env).some((name) => !ALLOWED_ENVIRONMENT.has(name))",
       "globalThis.__nqrStageB.untrustedRuntime()"],
     ["  await verifyDependencies();\n", "  await globalThis.__nqrStageB.dependencies();\n"],
   ];
--- a/scripts/build.mjs
+++ b/scripts/build.mjs
@@ -1,6 +1,6 @@
 import { spawnSync } from "node:child_process";
 import { createHash } from "node:crypto";
-import { readFile, readdir } from "node:fs/promises";
+import { readFile, readdir, realpath } from "node:fs/promises";
 import { createRequire } from "node:module";
 import { dirname, isAbsolute, join, relative, sep } from "node:path";
 import { fileURLToPath } from "node:url";
@@ -8,76 +8,111 @@
 
 const require = createRequire(import.meta.url);
 const USAGE = "Usage: node scripts/build.mjs [--production|--preview]"
-  + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file>";
+  + " | --verify-existing --artifact <absolute-dir> --acceptance <absolute-file> | --print-dependency-digest";
 
-// Package code that --verify-existing loads (verifier, adapter, origin checks), pinned here and hashed before any of
-// it is imported. Installing, updating or editing these packages blocks until the new bytes are reviewed and re-pinned.
+// Only these variables may be set for --verify-existing and --print-dependency-digest: NODE_OPTIONS, NODE_PATH,
+// HOME (global module folders) and loader variables all change what Node loads. Run as
+// `env -i PATH="$PATH" NEXT_PUBLIC_APP_URL=<origin> node scripts/build.mjs --verify-existing …` with no Node flags.
+// DYLD_* libraries are loaded before any JavaScript runs, and a substituted `node` on PATH cannot be detected here.
+// macOS CoreFoundation adds __CF_USER_TEXT_ENCODING to every process.
+const ALLOWED_ENVIRONMENT = new Set(["PATH", "NEXT_PUBLIC_APP_URL", "TMPDIR", "LANG", "LC_ALL", "TZ", "__CF_USER_TEXT_ENCODING"]);
+
+// Drift detection for the package code that --verify-existing loads (verifier, adapter, origin checks), hashed before
+// any of it is imported. It is not a boundary against anyone who can write node_modules, scripts/ or these files while
+// the gate runs; SECURITY C2 still requires verifying the tree from a separate process on a read-only snapshot.
+// Re-pin after a reviewed dependency change with `node scripts/build.mjs --print-dependency-digest` (same environment).
 const VERIFY_EXISTING_DEPENDENCIES = Object.freeze({
   packages: Object.freeze(["jsdom", "parse5", "entities"]),
-  files: Object.freeze(["node_modules/next/package.json", "node_modules/next/dist/compiled/acorn/acorn.js"]),
-  sha256: "6d45f6c294eb3176a7f494cf9c8d57e501666efeac30ad79fb19aa5044567cfc",
+  files: Object.freeze({ next: Object.freeze(["package.json", "dist/compiled/acorn/acorn.js"]) }),
+  sha256: "753c93434bf2a8ea029a4c900b0cef8cd0543ac6d2cd014b05e962b97735969c",
 });
 
-const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
+const ascending = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
 const digestOf = (bytes) => createHash("sha256").update(bytes).digest("hex");
+const dependencyMismatch = () => new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");
 
-/** Hashes the dependency closure of the pinned packages without loading any package code. */
-async function dependencyDigest(projectRoot) {
-  const packages = new Set();
-  const toPosix = (path) => relative(projectRoot, path).split(sep).join("/");
+function assertTrustedRuntime() {
+  // Defense in depth only: code injected before this module could already patch anything it checks.
+  if (process.execArgv.length > 0 || Object.keys(process.env).some((name) => !ALLOWED_ENVIRONMENT.has(name))) {
+    throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
+  }
+}
+
+/**
+ * Hashes the pinned packages' dependency closure as Node would resolve it from scripts/, without loading package
+ * code: lookups use Node's own search paths, packages are read through their real paths, and rows are keyed by
+ * name@version so the digest does not depend on where the project lives. A dependency that no search path provides
+ * (for example jsdom's optional canvas peer) is recorded as absent, so installing it anywhere Node looks changes the
+ * digest. A symlink inside a package or a node_modules directory below a package root is a mismatch.
+ */
+async function dependencyDigest(scriptsDir) {
+  const rows = [];
+  const visited = new Set();
   async function resolvePackage(name, fromDir) {
-    for (let dir = fromDir; ; dir = dirname(dir)) {
-      const candidate = join(dir, "node_modules", name);
+    // The trailing slash forces package lookup for names that are also Node builtins (punycode).
+    for (const base of createRequire(join(fromDir, "resolve.js")).resolve.paths(`${name}/`) ?? []) {
+      const candidate = join(base, name);
       const manifest = await readFile(join(candidate, "package.json"), "utf8").catch(() => null);
-      if (manifest !== null) return { dir: candidate, manifest: JSON.parse(manifest) };
-      if (dir === projectRoot || dirname(dir) === dir) return null;
+      if (manifest !== null) return { dir: await realpath(candidate), manifest: JSON.parse(manifest) };
     }
+    return null;
   }
-  async function visit(name, fromDir) {
-    const found = await resolvePackage(name, fromDir);
-    // An uninstalled optional or peer dependency loads nothing; installing one later changes the digest.
-    if (!found || packages.has(toPosix(found.dir))) return;
-    packages.add(toPosix(found.dir));
-    const { dependencies, optionalDependencies, peerDependencies } = found.manifest;
-    for (const dependency of Object.keys({ ...dependencies, ...optionalDependencies, ...peerDependencies }).sort()) {
-      await visit(dependency, found.dir);
-    }
-  }
-  const rows = [];
-  async function hashTree(dir) {
-    for (const entry of (await readdir(dir, { withFileTypes: true })).sort(byName)) {
+  async function hashTree(root, dir, key) {
+    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => ascending(a.name, b.name))) {
       const path = join(dir, entry.name);
-      if (entry.isDirectory()) {
-        if (entry.name !== "node_modules") await hashTree(path);
+      if (entry.isDirectory() && entry.name === "node_modules") {
+        if (dir !== root) throw dependencyMismatch();
+        const names = [];
+        for (const child of (await readdir(path, { withFileTypes: true })).sort((a, b) => ascending(a.name, b.name))) {
+          if (child.name.startsWith("@") && child.isDirectory()) {
+            for (const scoped of (await readdir(join(path, child.name))).sort(ascending)) names.push(`${child.name}/${scoped}`);
+          } else {
+            names.push(child.name);
+          }
+        }
+        rows.push({ nodeModules: names, package: key });
+      } else if (entry.isDirectory()) {
+        await hashTree(root, path, key);
       } else if (entry.isFile()) {
-        rows.push({ path: toPosix(path), sha256: digestOf(await readFile(path)) });
+        rows.push({ file: relative(root, path).split(sep).join("/"), package: key, sha256: digestOf(await readFile(path)) });
       } else {
-        throw new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");
+        throw dependencyMismatch();
       }
     }
   }
-  for (const name of VERIFY_EXISTING_DEPENDENCIES.packages) await visit(name, projectRoot);
-  for (const packagePath of [...packages].sort()) await hashTree(join(projectRoot, ...packagePath.split("/")));
-  for (const file of VERIFY_EXISTING_DEPENDENCIES.files) {
-    rows.push({ path: file, sha256: digestOf(await readFile(join(projectRoot, ...file.split("/")))) });
+  async function visit(name, fromDir, requester) {
+    const found = await resolvePackage(name, fromDir);
+    if (!found) {
+      rows.push({ absent: name, requester });
+      return;
+    }
+    if (visited.has(found.dir)) return;
+    visited.add(found.dir);
+    const key = `${found.manifest.name}@${found.manifest.version}`;
+    await hashTree(found.dir, found.dir, key);
+    const { dependencies = {}, optionalDependencies = {}, peerDependencies = {} } = found.manifest;
+    for (const dependency of [...new Set([...Object.keys(dependencies), ...Object.keys(optionalDependencies),
+      ...Object.keys(peerDependencies)])].sort(ascending)) {
+      await visit(dependency, found.dir, key);
+    }
   }
-  return digestOf(JSON.stringify(rows));
+  for (const name of VERIFY_EXISTING_DEPENDENCIES.packages) await visit(name, scriptsDir, "scripts");
+  for (const [name, files] of Object.entries(VERIFY_EXISTING_DEPENDENCIES.files)) {
+    const found = await resolvePackage(name, scriptsDir);
+    if (!found) throw dependencyMismatch();
+    const key = `${found.manifest.name}@${found.manifest.version}`;
+    for (const file of files) rows.push({ file, package: key, sha256: digestOf(await readFile(join(found.dir, ...file.split("/")))) });
+  }
+  return digestOf(JSON.stringify(rows.map((row) => JSON.stringify(row)).sort(ascending)));
 }
 
 async function verifyDependencies() {
-  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
-  const digest = await dependencyDigest(projectRoot).catch(() => null);
-  if (digest !== VERIFY_EXISTING_DEPENDENCIES.sha256) throw new Error("NQR_VERIFY_EXISTING_DEPENDENCY_MISMATCH");
+  const digest = await dependencyDigest(dirname(fileURLToPath(import.meta.url))).catch(() => null);
+  if (digest !== VERIFY_EXISTING_DEPENDENCIES.sha256) throw dependencyMismatch();
 }
 
 async function verifyExisting(artifact, acceptancePath, origin) {
-  // Defense in depth only: code injected before this module could already patch anything it checks. Run as a plain
-  // `node scripts/build.mjs --verify-existing …` with no Node flags, no NODE_OPTIONS and no DYLD_*/LD_PRELOAD
-  // variables; anything else is refused. A substituted `node` binary on PATH is outside what this script can detect.
-  if (process.execArgv.length > 0 || (process.env.NODE_OPTIONS ?? "") !== ""
-    || Object.keys(process.env).some((name) => name.startsWith("DYLD_") || name === "LD_PRELOAD")) {
-    throw new Error("NQR_VERIFY_EXISTING_UNTRUSTED_RUNTIME");
-  }
+  assertTrustedRuntime();
   await verifyDependencies();
   const { verifyInitialBundleBoundary } = await import("./verify-initial-bundle-boundary.mjs");
   const options = { acceptancePath, origin };
@@ -89,12 +124,18 @@
     throw new Error("NQR_ORIGIN_ARTIFACT_CHECK_FAILED");
   }
   // Re-verify after the origin read so a change between the two checks cannot be reported as one artifact.
-  // A change reverted between reads is outside what path-based checks can prove (see Stage A C4).
+  // Changes reverted between reads, including dependency files swapped between hashing and import, are outside what
+  // these path-based checks can prove (Stage A C4, Stage B S1/E).
   await verifyInitialBundleBoundary(artifact, options);
 }
 
 try {
   const args = process.argv.slice(2);
+  if (args.length === 1 && args[0] === "--print-dependency-digest") {
+    assertTrustedRuntime();
+    console.log(await dependencyDigest(dirname(fileURLToPath(import.meta.url))));
+    process.exit(0);
+  }
   const existing = args[0] === "--verify-existing";
   if (existing
     ? args.length !== 5 || args[1] !== "--artifact" || args[3] !== "--acceptance" || !isAbsolute(args[2]) || !isAbsolute(args[4])
```
