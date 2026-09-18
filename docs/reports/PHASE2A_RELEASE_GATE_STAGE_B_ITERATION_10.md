# NQR-129 Stage B iteration 10 — หลักฐาน `COLD_VALID_INITIAL_PREVIEW` ครอบทั้งต้นไม้ `src/`

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation iteration-10

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ซ้ำ ไม่ได้ integrate และ release ยัง BLOCKED**

## 0. อินพุต: iteration 9 ถูกปฏิเสธโดยทั้งสองฝ่าย

- [TL review i9](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_9_TL_REVIEW.md) `4de92c9b9bba038b84336a6988f270fe054b284bb1f4defd01d7be45dfc18798` — REQUEST_CHANGES
- [SECURITY review i9](PHASE2A_RELEASE_GATE_STAGE_B_ITERATION_9_SECURITY_REVIEW.md) `9f7a40cdb48cb20f3b972565e1a979e3605144713841c719b2c5e18e46e2d899` — REQUEST_CHANGES

ทั้งคู่เจาะทะลุกลไกเดียวกันโดยไม่ได้ประสานกัน: รายการไฟล์ที่ pin ไว้สี่ไฟล์ไม่ใช่ขอบเขตจริงของ flow

| finding | สิ่งที่ reviewer ทำ | ผล |
| --- | --- | --- |
| TL P1 | แก้ `src/components/generator/payload.ts` (`validateDraft`) ให้ draft ว่างของชนิด `url` กลายเป็น payload ที่ valid | digest ไม่ขยับ |
| SEC F1 | แก้ barrel `src/components/generator/index.ts` ให้ re-export wrapper ที่ prefill | digest ไม่ขยับ, CLI จริง exit 0 |
| TL P2 | ตัดไฟล์หนึ่งออกจากรายการแล้ว re-pin | เทสต์ยังผ่าน 147/147 |
| TL P2 / SEC F2 | หลักฐานอ่านจาก checkout ของ gate เอง ไม่ผูกกับ artifact | ยังเป็นข้อจำกัดเชิงกระบวนการ |
| TL P3 | reason code เดียวปนสามความหมาย | แก้แล้ว |
| TL P3 | fixture near-miss ใช้ `slice(0,63)+"0"` ซึ่งซ้ำกับค่าจริงได้ | แก้แล้ว |
| SEC F5 | ไม่มี containment check ตอน join path | ดู §3 ข้อ 5 |
| SEC F6 / TL P3 | runbook ยังไม่มี reason code ใหม่ | จะแก้ตอน integrate |

## 1. สิ่งที่เปลี่ยน

1. **เลิกใช้รายการไฟล์** `COLD_PREVIEW_ABSENCE_SOURCES` ถูกลบทิ้งทั้งก้อน แทนที่ด้วย `COLD_PREVIEW_ABSENCE = {root:"src", maxFiles:2048, maxTotalBytes:32MiB, maxDepth:24}` และ `readColdPreviewAbsence()` เดินทั้งต้นไม้
2. **การเดินต้นไม้** เรียงชื่อในแต่ละไดเรกทอรี, path ใน digest เป็น path สัมพัทธ์แบบเต็ม, `lstat` ปฏิเสธทุก entry ที่ไม่ใช่ไฟล์ธรรมดาหรือไดเรกทอรี (symlink, socket, device), เทียบ `dev:ino` ของไดเรกทอรีก่อนและหลังการ list เพื่อกันการสลับระหว่างอ่าน, มีเพดานจำนวนไฟล์ ไบต์ และความลึก ทุกความไม่แน่นอนคืน `null` = พิสูจน์ไม่ได้ = บล็อก ส่วน symlink ที่ root หรือ parent ถูกปฏิเสธโดย `opendir` และโดยตัวอ่านไฟล์ที่ใช้ `O_NOFOLLOW` และบังคับ `realpath(path) === path` อยู่แล้ว
3. **pin ใหม่** `COLD_PREVIEW_ABSENCE_SHA256 = 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a` (154 ไฟล์ใน `src/`)
4. **แยก reason code สามตัว** ตามที่ TL ขอ
   - `SCENARIO_NOT_APPLICABLE_FORBIDDEN` — ยกเว้นฉากที่ไม่ใช่ฉากที่ได้รับอนุญาต
   - `COLD_PREVIEW_PROOF_UNREADABLE` — อ่านต้นไม้ไม่ได้ (หาย, symlink, สิทธิ์, เกินเพดาน)
   - `COLD_PREVIEW_PROOF_MISMATCH` — อ่านได้แต่ต้นไม้เปลี่ยนไปจากที่ review
5. **คอมเมนต์ใหม่ที่ไม่อ้างเกินจริง** ระบุชัดว่า digest นี้ครอบทุกไฟล์ในต้นไม้ของ checkout ที่ gate รันอยู่ และ **ไม่ได้** พูดถึง artifact ที่กำลังตรวจ การรัน gate คนละ checkout กับที่ build ทำให้หลักฐานนี้ไม่มีความหมาย ซึ่งเป็นขั้นตอนใน runbook ไม่ใช่สิ่งที่โค้ดบังคับได้
6. **ลดโค้ดที่พิสูจน์แล้วว่าไม่จำเป็น** mutation testing แสดงว่า guard สามชุดบังกันเอง จึงเหลือไว้เฉพาะตัวที่แยกทดสอบได้: การเช็กชนิดจาก dirent ถูกตัด (ซ้ำกับ `lstat` และยังเสี่ยงบล็อกเกินจริงบนไฟล์ระบบที่รายงานชนิดไม่ได้), containment check ที่ SEC F5 เสนอไม่ได้ใส่เพราะเข้าไม่ถึง (ชื่อมาจากการ list ไดเรกทอรีนั้นเอง, root มาจากค่าคงที่), และตัวตรวจ identity เหลือแค่ `dev:ino` เพราะ `isDirectory`/`isSymbolicLink`/`realpath` ถูกบังด้วย `opendir` และตัวอ่านไฟล์อยู่แล้ว ทุกจุดมีคอมเมนต์ระบุว่าอะไรถูกบังคับที่ไหน

## 2. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `5f9ee31f18e846186775d4077ca7f787cbd68f5958de17be7007ea8b81de08ab` (ไม่เปลี่ยน) |
| inspect-turbopack-emission.test.mjs | `11ce4371791dd13be01dfd8c60cd0919ae2e536eed6fe42d28ec74657b78cb6a` (ไม่เปลี่ยน) |
| verify-initial-bundle-boundary.mjs | `c0f6142161e765042a0c2a408a718b7c00278b94edf00a081409a214f3fd3f11` |
| verify-initial-bundle-boundary.test.mjs | `3f5dcfcfdb710b7106a987ca2aeaa541f1ff80bcde540ee3a65374a40a0675fb` |
| build.mjs | `3808dfc648ced48cd5b6491c0ac45eceb0a07c306a03c0cc6926c3c4b7b0cf33` (ไม่เปลี่ยน) |

- Canonical5: **`df3c1bb03697ec66d9a393b53eeffabb25baac365af3428a395c032424183b8b`**
- Diff i9→i10 อยู่ในภาคผนวก SHA-256 `959d05ae45f39b639ab35e836b82f6d03c468f82b1231e607ad17db641e9b99f` (468 บรรทัด) ตรวจแล้วว่า `patch -p1` บนสำเนา i9 ให้ canonical5 ตรงกัน
- `COLD_PREVIEW_ABSENCE_SHA256 = 79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a` คิดจาก 154 ไฟล์ใน `src/` ของ SOURCE ปัจจุบัน
- Dependency pin `753c9343…969c` และ `ADMITTED_ACCEPTANCE_SHA256` (ว่าง) ไม่เปลี่ยน gate revision เปลี่ยนอีกครั้งเพราะ verifier เปลี่ยน

## 3. เทสต์ (สี่ชุดในไฟล์เทสต์ของ verifier)

1. `NOT_APPLICABLE is accepted only for the exempt scenario and only while the tree proves the absence` — แยกผลสามทางครบ (forbidden / unreadable / mismatch), ฉากอื่นยกเว้นไม่ได้ทั้งตอนมีและไม่มีหลักฐาน, สถานะที่เกือบเหมือน (`"NOT_APPLICABLE "`) ยังเป็น `TIMING_EVIDENCE_INCOMPLETE`, input ที่ขาด key หรือผิดชนิดได้ `INVALID_DECISION_INPUT` ค่า near-miss ถูกสร้างแบบพลิกหลักสุดท้ายให้ต่างจาก pin เสมอ (แก้ TL P3)
2. `the cold-preview proof covers every file in the tree, including the ways past reviews walked around it` — เดินซ้ำเส้นทางที่ reviewer ใช้เจาะจริง: แก้ barrel (SEC F1), แก้ `payload.ts` (TL P1), แก้เพจ, แก้ `Generator.tsx` และเพิ่มไฟล์ใหม่ในต้นไม้ ทุกกรณี digest ต้องขยับ แล้วกลับมาตรงเมื่อคืนค่าเดิม
3. `the cold-preview proof fails closed on anything it cannot read exactly` — ไม่มีต้นไม้, ต้นไม้ว่าง, ไฟล์กลายเป็น symlink, ไดเรกทอรีกลายเป็น symlink, symlink แปลกปลอมข้าง ๆ, ไฟล์อ่านไม่ได้ (chmod 000), root เป็น symlink, เข้าถึงผ่าน parent ที่เป็น symlink, เกินเพดานจำนวนไฟล์, เกินเพดานความลึก และการสลับไดเรกทอรีระหว่าง `opendir` (ทดสอบด้วยการแทนที่ `fs.opendir` ชั่วคราว) ทั้งหมดต้องได้ `null` ส่วนไดเรกทอรีที่มาแทนที่ไฟล์นั้นอ่านได้แต่ต้นไม้เปลี่ยน จึงต้องได้ digest ที่ต่างจาก pin และอีกเทสต์ยืนยันว่าลำดับการสร้างไฟล์ไม่มีผลต่อ digest
4. `the real CLI accepts the exempt scenario with the tree present and blocks without it` — รัน `build.mjs --verify-existing` จริงบนสำเนา gate ที่ admit แล้ว: มีต้นไม้ → exit 0, แก้ barrel ในต้นไม้นั้น → exit 1 `COLD_PREVIEW_PROOF_MISMATCH`, ไม่มีต้นไม้เลย → exit 1 `COLD_PREVIEW_PROOF_UNREADABLE`

## 4. Verification (Node v24.14.1)

- `npm run test:scripts` ในพื้นที่ candidate: **288/288 สองรอบ** eslint ไม่มี error และไม่มี warning
- **Mutation รวม 24 ตัวใน 4 รอบ ถูกจับ 21 ตัว** รอบแรกจับ 14/18 ตัวที่รอดทำให้พบว่า guard สามชุดบังกันเอง จึงแก้โค้ดตามผลนั้นแล้วยิงซ้ำ
  - จับได้: ยกเว้นทุกฉาก, ไม่ต้องมีหลักฐาน, ยอมรับ digest ที่ไม่ตรง, ตัด type guard, ไม่บังคับ key ใน `DECISION_INPUT_KEYS`, ข้ามไฟล์ที่ไม่ใช่ไฟล์ธรรมดา, ข้ามไฟล์ที่อ่านไม่ได้, ไม่ตรวจ identity ซ้ำ, ยอมรับต้นไม้ว่าง, ตัดเพดานจำนวนไฟล์, ตัดเพดานความลึก, ไม่เรียงชื่อ, ใช้ชื่อไฟล์แบนแทน path, ตัด path ออกจากแถว digest, ไม่ join root, identity เป็นค่าคงที่ (สองรอบ)
  - **แก้ตามผล mutation:** การเช็กชนิดจาก dirent ซ้ำกับ `lstat` (M6/M7 บังกันเอง) จึงตัดตัวแรกทิ้ง, containment check ที่ SEC F5 เสนอพิสูจน์แล้วว่าเข้าไม่ถึงจึงไม่ใส่, และ `isDirectory`/`isSymbolicLink`/`realpath` ในตัวตรวจ identity ถูกบังด้วย `opendir` และตัวอ่านไฟล์ที่ใช้ `O_NOFOLLOW`+`realpath` อยู่แล้ว จึงเหลือเฉพาะการเทียบ `dev:ino` ก่อน/หลัง ซึ่งมีเทสต์จับตรง ๆ
  - **ตัวที่รอดโดยตั้งใจ (equivalent) หนึ่งตัว:** `before === null ||` ในการเทียบ identity ถ้าตัดออก การอ่านที่ล้มเหลวสองครั้งจะเทียบว่าเท่ากัน แต่ `opendir` ล้มเหลวก่อนเสมอ จึงไม่มีเทสต์แยกได้ คงไว้เพราะเป็นความถูกต้องของการเปรียบเทียบเอง และเขียนเหตุผลไว้ในคอมเมนต์
- SOURCE ไม่ถูกแก้ ไม่มี install/build/typegen/server/browser/network/DB/deploy/commit/push

## 5. ข้อจำกัดและของค้าง

- **หลักฐานนี้ไม่ผูกกับ artifact** (TL P2 / SEC F2) gate อ่านต้นไม้ที่อยู่ข้างตัวเอง การรันคนละ checkout กับที่ build ทำให้หลักฐานไม่มีความหมาย บังคับด้วยโค้ดไม่ได้ ต้องเป็นขั้นตอนใน runbook §5 ซึ่งจะเพิ่มตอน integrate พร้อม reason code ใหม่ (SEC F6)
- การแก้ไฟล์ใด ๆ ใน `src/` ทำให้ต้อง re-pin และ review นโยบายนี้ใหม่ ซึ่งสอดคล้องกับความจริงที่ว่าการแก้ `src/` ทำให้ artifact เปลี่ยนและต้องออกหลักฐานใหม่อยู่แล้ว
- `SUPPORTED_PROFILE.sourceInventorySha256` ยังเป็นค่าก่อน integrate (`3b0c6a72…00df`) ขณะที่ค่าจริงคือ `99f67d49…67c3` การ admit ครั้งแรกจะติด `ADAPTER_STATIC_UNKNOWN` จนกว่าจะอัปเดตพร้อมรอบ build จริง — เป็นงานคนละ iteration ดู [PM_PHASE2A_NEXT_GATES_PLAN.md](PM_PHASE2A_NEXT_GATES_PLAN.md) §8
- ข้อจำกัดเดิมยังอยู่ทั้งหมด: runtime chunk ของ Turbopack ยัง UNKNOWN, S5-2, การสลับไฟล์ระหว่าง hash กับ import, เงื่อนไข C1/C2
- การอนุญาตนี้เป็นการตัดสินใจเชิงนโยบายของ Product Owner ไม่ใช่ข้อสรุปว่าผู้ใช้ไม่ต้องการ flow นี้

## 6. ภาคผนวก — diff i9→i10 (`patch -p1` บน iteration 9)

```diff
--- a/scripts/verify-initial-bundle-boundary.mjs
+++ b/scripts/verify-initial-bundle-boundary.mjs
@@ -1,7 +1,7 @@
 import { createHash } from "node:crypto";
 import { constants as fsConstants } from "node:fs";
 import { createRequire } from "node:module";
-import { open, readFile, realpath } from "node:fs/promises";
+import { lstat, open, opendir, readFile, realpath } from "node:fs/promises";
 import { isAbsolute, join, relative, resolve, sep } from "node:path";
 import { fileURLToPath } from "node:url";
 import { JSDOM, VirtualConsole } from "jsdom";
@@ -534,18 +534,25 @@
 export const REQUIRED_TIMING_SCENARIOS = Object.freeze(Object.keys(TIMING_SCENARIO_ROUTES));
 
 // NQR129 §7 wants evidence for every scenario, but this application never renders a valid preview on first paint:
-// every draft field starts empty and nothing prefills them from the URL, cookies or storage, so QA cannot observe
-// COLD_VALID_INITIAL_PREVIEW at all. On 2026-09-18 the Product Owner allowed that one scenario to be recorded
-// NOT_APPLICABLE while the absence stays proven. The proof is not taken from the record: the verifier re-reads the
-// reviewed sources below at verify time and accepts NOT_APPLICABLE only while their digest matches the pinned value,
-// so adding any prefill path changes the digest and blocks until this policy is reviewed again.
-export const COLD_PREVIEW_ABSENCE_SOURCES = Object.freeze([
-  "src/app/[locale]/page.tsx",
-  "src/app/[locale]/qr/[type]/page.tsx",
-  "src/components/generator/Generator.tsx",
-  "src/components/generator/drafts.ts",
-]);
-export const COLD_PREVIEW_ABSENCE_SHA256 = "4ad557f275018160c6e0a38fc21e12cec6979c029c04eb8a93a4e0982b536453";
+// every draft field starts empty, nothing prefills them from the URL, cookies or storage, and no content type
+// validates an empty draft, so QA cannot observe COLD_VALID_INITIAL_PREVIEW at all. On 2026-09-18 the Product Owner
+// allowed that one scenario to be recorded NOT_APPLICABLE while the absence stays proven.
+//
+// What the proof below is and is not. It is a digest of EVERY file under the application source tree of the checkout
+// the verifier itself runs from, recomputed at verify time: any edit anywhere in that tree - a route, the generator,
+// the barrel that re-exports it, a validator that would start accepting an empty draft - changes the digest and
+// blocks until this policy is reviewed again. Reviewers found both of those evasions against an earlier hand-picked
+// four-file list (iteration 9 TL P1 and SECURITY F1), which is why the list is gone.
+// It is NOT a statement about the artifact under test. The gate reads the tree next to itself, not the tree the
+// artifact was built from, so running the gate in a different checkout than the one that produced the artifact
+// voids this proof. The runbook makes that a required step; the gate cannot enforce it.
+export const COLD_PREVIEW_ABSENCE = Object.freeze({
+  root: "src",
+  maxFiles: 2048,
+  maxTotalBytes: 32 * 1024 * 1024,
+  maxDepth: 24,
+});
+export const COLD_PREVIEW_ABSENCE_SHA256 = "79de2baf98ee3c09cb4afc7894dcae631a34d102a2396e314eaf95155c4c9f2a";
 const NOT_APPLICABLE_SCENARIO = "COLD_VALID_INITIAL_PREVIEW";
 
 // NQR129 §4 per-class closure: which reviewed adapter predicate closes each legacy closed-grammar gap. A class
@@ -750,8 +757,14 @@
       reasons.add("TIMING_POLICY_VIOLATION");
     } else if (scenario.status === "NOT_APPLICABLE") {
       // Only the one scenario the Product Owner exempted, and only while the sources still prove it cannot occur.
-      if (scenario.id !== NOT_APPLICABLE_SCENARIO || coldPreviewAbsence !== COLD_PREVIEW_ABSENCE_SHA256) {
-        reasons.add("SCENARIO_NOT_APPLICABLE_UNPROVEN");
+      // The three outcomes are reported apart so an operator can tell a forbidden waiver from an unreadable tree
+      // from a tree that has changed since the policy was reviewed.
+      if (scenario.id !== NOT_APPLICABLE_SCENARIO) {
+        reasons.add("SCENARIO_NOT_APPLICABLE_FORBIDDEN");
+      } else if (coldPreviewAbsence === null) {
+        reasons.add("COLD_PREVIEW_PROOF_UNREADABLE");
+      } else if (coldPreviewAbsence !== COLD_PREVIEW_ABSENCE_SHA256) {
+        reasons.add("COLD_PREVIEW_PROOF_MISMATCH");
       }
     } else if (scenario.status !== "PASS") {
       reasons.add("TIMING_EVIDENCE_INCOMPLETE");
@@ -914,16 +927,67 @@
 }
 
 /**
- * Digest over the reviewed sources that prove the application has no cold valid initial preview. Returns null when
- * any of them is missing or unreadable, which keeps a NOT_APPLICABLE scenario unproven and therefore blocking.
+ * Digest over the whole application source tree, in ASCII path order. Returns null when the tree cannot be read
+ * exactly: an unreadable entry, anything that is not a plain file or directory, a symlink, a directory whose
+ * identity changes while it is listed, or a tree past the declared limits. A null keeps a NOT_APPLICABLE scenario
+ * unproven, so every uncertainty blocks instead of passing.
  */
 export async function readColdPreviewAbsence(repoRoot) {
+  const root = join(repoRoot, COLD_PREVIEW_ABSENCE.root);
   const rows = [];
-  for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
-    const bytes = await readBoundFile(join(repoRoot, path), INSPECTION_LIMITS.bytesPerFile);
-    if (!bytes) return null;
-    rows.push({ path, sha256: sha256(bytes) });
-  }
+  let totalBytes = 0;
+  // The only job of this helper is to name the directory that was listed, so that a swap between the two reads is
+  // visible. What it deliberately does not repeat: opendir already refuses anything that is not a directory, and
+  // every file is read through readBoundFile, which opens with O_NOFOLLOW and requires realpath(path) === path, so a
+  // symlinked entry or a tree reached through a symlinked parent is rejected there. Mutation testing showed those
+  // extra checks changed no outcome here, and unreachable guards in a gate are worse than none.
+  const directoryIdentity = async (directory) => {
+    try {
+      const stat = await lstat(directory, { bigint: true });
+      return `${stat.dev}:${stat.ino}`;
+    } catch {
+      return null;
+    }
+  };
+  const visit = async (directory, prefix, depth) => {
+    if (depth > COLD_PREVIEW_ABSENCE.maxDepth) return false;
+    const before = await directoryIdentity(directory);
+    const names = [];
+    let handle;
+    try {
+      handle = await opendir(directory);
+      for await (const entry of handle) names.push(entry.name);
+    } catch {
+      await handle?.close().catch(() => {});
+      return false;
+    }
+    // A directory swapped for a different one between the two reads is not the directory whose names were listed.
+    // The null test matters on its own: without it two failed reads would compare equal and the walk would go on.
+    if (before === null || await directoryIdentity(directory) !== before) return false;
+    names.sort();
+    for (const name of names) {
+      // Names come from this directory listing, so they cannot escape it; the root itself is the constant
+      // COLD_PREVIEW_ABSENCE.root joined onto the checkout, so there is nothing here for a containment check to catch
+      // (mutation testing proved such a check unreachable, and unreachable code in the gate is not worth carrying).
+      const path = join(directory, name);
+      const itemPath = prefix ? `${prefix}/${name}` : name;
+      const stat = await lstat(path).catch(() => null);
+      if (!stat) return false;
+      if (stat.isDirectory()) {
+        if (!await visit(path, itemPath, depth + 1)) return false;
+        continue;
+      }
+      // A symlink, socket or device in the source tree means these bytes are not pinned by this walk.
+      if (!stat.isFile()) return false;
+      const bytes = await readBoundFile(path, INSPECTION_LIMITS.bytesPerFile);
+      if (!bytes) return false;
+      totalBytes += bytes.length;
+      rows.push({ path: itemPath, sha256: sha256(bytes) });
+      if (rows.length > COLD_PREVIEW_ABSENCE.maxFiles || totalBytes > COLD_PREVIEW_ABSENCE.maxTotalBytes) return false;
+    }
+    return true;
+  };
+  if (!await visit(root, "", 0) || rows.length === 0) return null;
   return sha256(JSON.stringify(rows));
 }
 
--- a/scripts/verify-initial-bundle-boundary.test.mjs
+++ b/scripts/verify-initial-bundle-boundary.test.mjs
@@ -12,8 +12,8 @@
 import {
   ADMITTED_ACCEPTANCE_SHA256,
   BundleBoundaryError,
+  COLD_PREVIEW_ABSENCE,
   COLD_PREVIEW_ABSENCE_SHA256,
-  COLD_PREVIEW_ABSENCE_SOURCES,
   FORBIDDEN_INITIAL_MARKERS,
   INSPECTION_LIMITS,
   LEGACY_CLOSURE,
@@ -835,10 +835,8 @@
       await writeFile(join(base, "scripts", name), source);
     }
     if (sources) {
-      for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
-        await mkdir(dirname(join(base, path)), { recursive: true });
-        await cp(fileURLToPath(new URL(`../${path}`, import.meta.url)), join(base, path));
-      }
+      await cp(fileURLToPath(new URL(`../${COLD_PREVIEW_ABSENCE.root}`, import.meta.url)), join(base, COLD_PREVIEW_ABSENCE.root),
+        { recursive: true });
     }
     await symlink(await realpath(fileURLToPath(new URL("../node_modules", import.meta.url))), join(base, "node_modules"));
     const gate = importGate ? await import(pathToFileURL(join(base, "scripts/verify-initial-bundle-boundary.mjs")).href) : null;
@@ -1643,21 +1641,34 @@
   });
 });
 
-// Iteration 9: the Product Owner exempted COLD_VALID_INITIAL_PREVIEW because the application cannot produce it.
-// The exemption is only as good as the proof, so these tests pin every predicate that guards it.
-test("stage B: NOT_APPLICABLE is accepted only for the exempt scenario and only while the sources prove the absence", async () => {
+// Iteration 10: the Product Owner exempted COLD_VALID_INITIAL_PREVIEW because the application cannot produce it.
+// Iteration 9 proved that with a hand-picked file list; TL P1 and SECURITY F1 both walked around it (the barrel that
+// re-exports Generator, and the validator that decides an empty draft is invalid, were both outside the list), so the
+// proof is now the whole application source tree and these tests pin every predicate that guards it.
+const COLD_PREVIEW_ROOT = fileURLToPath(new URL(`../${COLD_PREVIEW_ABSENCE.root}`, import.meta.url));
+
+async function withSourceCopy(callback) {
+  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-"));
+  try {
+    await cp(COLD_PREVIEW_ROOT, join(base, COLD_PREVIEW_ABSENCE.root), { recursive: true });
+    return await callback(base);
+  } finally {
+    await rm(base, { recursive: true, force: true });
+  }
+}
+
+test("stage B: NOT_APPLICABLE is accepted only for the exempt scenario and only while the tree proves the absence", async () => {
   await withStageBArtifact({}, async (item) => {
     const revision = await readGateRevision();
     const exempt = (id) => (record) => {
-      const scenario = record.timingEvidence.scenarios.find((entry) => entry.id === id);
-      scenario.status = "NOT_APPLICABLE";
+      record.timingEvidence.scenarios.find((entry) => entry.id === id).status = "NOT_APPLICABLE";
       return record;
     };
     const variants = {
       base: [(record) => record],
       coldPreview: [exempt("COLD_VALID_INITIAL_PREVIEW")],
       otherScenario: [exempt("EMPTY_TO_VALID_PREVIEW")],
-      unknownStatus: [(record) => {
+      nearMissStatus: [(record) => {
         record.timingEvidence.scenarios[1].status = "NOT_APPLICABLE ";
         return record;
       }],
@@ -1667,61 +1678,195 @@
     await withAdmittedGate(Object.values(records), async ({ gate }) => {
       const inputs = await stageBInputs(item, records.base);
       const evaluate = (changes) => gate.evaluateBundleBoundary({ ...inputs, ...changes });
+      const reasons = (changes) => evaluate(changes).reasonCodes;
       assert.equal(evaluate({ acceptanceBytes: records.base }).status, "PASS_BUNDLE_SCOPE");
-      // The exempt scenario passes only with the pinned digest present.
       assert.equal(evaluate({ acceptanceBytes: records.coldPreview }).status, "PASS_BUNDLE_SCOPE");
-      for (const absence of [null, "", `${COLD_PREVIEW_ABSENCE_SHA256.slice(0, 63)}0`, COLD_PREVIEW_ABSENCE_SHA256.toUpperCase()]) {
-        assert.deepEqual(evaluate({ acceptanceBytes: records.coldPreview, coldPreviewAbsence: absence }),
-          { status: "BLOCKED", reasonCodes: ["SCENARIO_NOT_APPLICABLE_UNPROVEN"], identity: null,
-            policyVersion: SUPPORTED_PROFILE.policyVersion }, JSON.stringify(absence));
+      // An unreadable tree and a changed tree are reported apart, and neither passes.
+      assert.deepEqual(reasons({ acceptanceBytes: records.coldPreview, coldPreviewAbsence: null }),
+        ["COLD_PREVIEW_PROOF_UNREADABLE"]);
+      const lastDigit = COLD_PREVIEW_ABSENCE_SHA256.endsWith("0") ? "1" : "0";
+      for (const absence of ["", `${COLD_PREVIEW_ABSENCE_SHA256.slice(0, 63)}${lastDigit}`,
+        COLD_PREVIEW_ABSENCE_SHA256.toUpperCase(), ` ${COLD_PREVIEW_ABSENCE_SHA256}`]) {
+        assert.notEqual(absence, COLD_PREVIEW_ABSENCE_SHA256);
+        assert.deepEqual(reasons({ acceptanceBytes: records.coldPreview, coldPreviewAbsence: absence }),
+          ["COLD_PREVIEW_PROOF_MISMATCH"], JSON.stringify(absence));
       }
-      // No other scenario may be exempted, even with the proof present.
-      assert.deepEqual(evaluate({ acceptanceBytes: records.otherScenario }).reasonCodes, ["SCENARIO_NOT_APPLICABLE_UNPROVEN"]);
-      // A near miss of the status string is still incomplete evidence, not an exemption.
-      assert.deepEqual(evaluate({ acceptanceBytes: records.unknownStatus }).reasonCodes, ["TIMING_EVIDENCE_INCOMPLETE"]);
-      // The proof is an input of the decision, so it must be declared even when nothing is exempted.
+      // No other scenario may be waived, with or without the proof.
+      assert.deepEqual(reasons({ acceptanceBytes: records.otherScenario }), ["SCENARIO_NOT_APPLICABLE_FORBIDDEN"]);
+      assert.deepEqual(reasons({ acceptanceBytes: records.otherScenario, coldPreviewAbsence: null }),
+        ["SCENARIO_NOT_APPLICABLE_FORBIDDEN"]);
+      // A near miss of the status string is incomplete evidence, not a waiver.
+      assert.deepEqual(reasons({ acceptanceBytes: records.nearMissStatus }), ["TIMING_EVIDENCE_INCOMPLETE"]);
+      // The proof is a declared input: it must be present and of the right type even when nothing is waived.
       const without = { ...inputs };
       delete without.coldPreviewAbsence;
       assert.deepEqual(gate.evaluateBundleBoundary(without).reasonCodes, ["INVALID_DECISION_INPUT"]);
       for (const absence of [undefined, 0, false, ["x"], { toString: () => COLD_PREVIEW_ABSENCE_SHA256 }]) {
-        assert.deepEqual(evaluate({ acceptanceBytes: records.base, coldPreviewAbsence: absence }).reasonCodes,
+        assert.deepEqual(reasons({ acceptanceBytes: records.base, coldPreviewAbsence: absence }),
           ["INVALID_DECISION_INPUT"], JSON.stringify(absence ?? null));
       }
     });
   });
 });
 
-test("stage B: the cold-preview proof is read from the reviewed sources and fails closed when they move or change", async () => {
-  assert.deepEqual([...COLD_PREVIEW_ABSENCE_SOURCES].sort(), [...COLD_PREVIEW_ABSENCE_SOURCES]);
-  assert.equal(new Set(COLD_PREVIEW_ABSENCE_SOURCES).size, COLD_PREVIEW_ABSENCE_SOURCES.length);
-  // The pin must describe the application as it is now; editing any listed source blocks until this is reviewed again.
-  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
-  assert.equal(await readColdPreviewAbsence(repoRoot), COLD_PREVIEW_ABSENCE_SHA256);
-
-  const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-"));
-  try {
-    assert.equal(await readColdPreviewAbsence(base), null);
-    for (const path of COLD_PREVIEW_ABSENCE_SOURCES) {
-      await mkdir(dirname(join(base, path)), { recursive: true });
-      await cp(join(repoRoot, path), join(base, path));
-    }
+test("stage B: the cold-preview proof covers every file in the tree, including the ways past reviews walked around it", async () => {
+  assert.equal(await readColdPreviewAbsence(fileURLToPath(new URL("../", import.meta.url))), COLD_PREVIEW_ABSENCE_SHA256);
+  await withSourceCopy(async (base) => {
     assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
-    const [first, second] = COLD_PREVIEW_ABSENCE_SOURCES;
-    await appendFile(join(base, first), "\n");
+    // Each edit below defeated the iteration 9 four-file list; none of them may leave the digest unchanged now.
+    for (const [label, path, change] of [
+      ["barrel re-export (SECURITY F1)", "src/components/generator/index.ts", "\nexport const prefill = true;\n"],
+      ["payload validator (TL P1)", "src/components/generator/payload.ts", "\nexport const prefill = true;\n"],
+      ["route page", "src/app/[locale]/page.tsx", "\n"],
+      ["generator", "src/components/generator/Generator.tsx", "\n"],
+    ]) {
+      const target = join(base, path);
+      const before = await readFile(target);
+      await appendFile(target, change);
+      assert.notEqual(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256, label);
+      await writeFile(target, before);
+      assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256, label);
+    }
+    // A file added anywhere in the tree also moves the digest, so no new prefill path can hide in a new file.
+    const added = join(base, "src/components/generator/prefill-shim.ts");
+    await writeFile(added, "export const prefill = true;\n");
     assert.notEqual(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
-    await cp(join(repoRoot, first), join(base, first));
+    await rm(added);
     assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
-    // Each listed source is part of the digest, so removing any one of them is unproven, not merely shorter.
-    await rm(join(base, second));
-    assert.equal(await readColdPreviewAbsence(base), null);
-    await symlink(join(repoRoot, second), join(base, second));
-    assert.equal(await readColdPreviewAbsence(base), null);
+  });
+});
+
+test("stage B: the cold-preview proof fails closed on anything it cannot read exactly", async () => {
+  const empty = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-empty-"));
+  try {
+    assert.equal(await readColdPreviewAbsence(empty), null, "no source tree at all");
+    await mkdir(join(empty, COLD_PREVIEW_ABSENCE.root));
+    assert.equal(await readColdPreviewAbsence(empty), null, "an empty tree proves nothing");
   } finally {
-    await rm(base, { recursive: true, force: true });
+    await rm(empty, { recursive: true, force: true });
   }
+  for (const [label, prepare] of [
+    ["a file replaced by a symlink", async (base) => {
+      const path = join(base, "src/components/generator/index.ts");
+      await rm(path);
+      await symlink(join(COLD_PREVIEW_ROOT, "components/generator/index.ts"), path);
+    }],
+    ["a directory replaced by a symlink", async (base) => {
+      const path = join(base, "src/components/generator");
+      await rm(path, { recursive: true });
+      await symlink(join(COLD_PREVIEW_ROOT, "components/generator"), path);
+    }],
+    ["a symlink added beside the sources", async (base) => {
+      await symlink(join(COLD_PREVIEW_ROOT, "components"), join(base, "src/components-link"));
+    }],
+    ["an unreadable file", async (base) => {
+      await fs.chmod(join(base, "src/components/generator/drafts.ts"), 0o000);
+    }],
+  ]) {
+    await withSourceCopy(async (base) => {
+      await prepare(base);
+      assert.equal(await readColdPreviewAbsence(base), null, label);
+    });
+  }
+  // A directory standing in for a source file is readable, so it is a changed tree rather than an unreadable one:
+  // the digest must still move, which blocks with COLD_PREVIEW_PROOF_MISMATCH instead of the unreadable code.
+  await withSourceCopy(async (base) => {
+    const path = join(base, "src/components/generator/drafts.ts");
+    await rm(path);
+    await mkdir(path);
+    const digest = await readColdPreviewAbsence(base);
+    assert.match(digest, /^[a-f0-9]{64}$/);
+    assert.notEqual(digest, COLD_PREVIEW_ABSENCE_SHA256);
+  });
+  // A plain file standing in for the source root is not a tree at all.
+  const asFile = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-file-"));
+  try {
+    await writeFile(join(asFile, COLD_PREVIEW_ABSENCE.root), "not a directory");
+    assert.equal(await readColdPreviewAbsence(asFile), null, "the source root is a file");
+  } finally {
+    await rm(asFile, { recursive: true, force: true });
+  }
+
+  // The root of the tree gets the same treatment as every directory inside it.
+  await withSourceCopy(async (base) => {
+    const root = join(base, COLD_PREVIEW_ABSENCE.root);
+    await rm(root, { recursive: true });
+    await symlink(COLD_PREVIEW_ROOT, root);
+    assert.equal(await readColdPreviewAbsence(base), null, "the source root itself is a symlink");
+  });
+  await withSourceCopy(async (base) => {
+    // Reaching the same tree through a symlinked parent is not the reviewed checkout either.
+    const link = join(base, "link");
+    await symlink(base, link);
+    assert.equal(await readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
+    assert.equal(await readColdPreviewAbsence(link), null, "reached through a symlinked parent");
+  });
+
+  // The walk is ordered by path, not by creation order, so two identical trees built differently agree.
+  const digests = [];
+  for (const order of [["a.ts", "b.ts", "c.ts"], ["c.ts", "a.ts", "b.ts"]]) {
+    const base = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-order-"));
+    try {
+      await mkdir(join(base, COLD_PREVIEW_ABSENCE.root, "nested"), { recursive: true });
+      for (const name of order) {
+        await writeFile(join(base, COLD_PREVIEW_ABSENCE.root, name), name);
+        await writeFile(join(base, COLD_PREVIEW_ABSENCE.root, "nested", name), `nested-${name}`);
+      }
+      digests.push(await readColdPreviewAbsence(base));
+    } finally {
+      await rm(base, { recursive: true, force: true });
+    }
+  }
+  assert.equal(digests[0], digests[1]);
+  assert.match(digests[0], /^[a-f0-9]{64}$/);
+  // A tree deeper than the declared limit is unprovable rather than truncated.
+  const deep = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-deep-"));
+  try {
+    const parts = Array.from({ length: COLD_PREVIEW_ABSENCE.maxDepth + 1 }, (_unused, index) => `d${index}`);
+    await mkdir(join(deep, COLD_PREVIEW_ABSENCE.root, ...parts), { recursive: true });
+    await writeFile(join(deep, COLD_PREVIEW_ABSENCE.root, ...parts, "leaf.ts"), "x");
+    assert.equal(await readColdPreviewAbsence(deep), null, "past the depth limit");
+    await rm(join(deep, COLD_PREVIEW_ABSENCE.root, parts[0]), { recursive: true });
+    await writeFile(join(deep, COLD_PREVIEW_ABSENCE.root, "shallow.ts"), "x");
+    assert.match(await readColdPreviewAbsence(deep), /^[a-f0-9]{64}$/, "within the depth limit");
+  } finally {
+    await rm(deep, { recursive: true, force: true });
+  }
+
+  // A directory swapped for a different one while it is being listed must not be hashed as if it were stable.
+  await withSourceCopy(async (base) => {
+    const target = join(base, "src/components/generator");
+    const originalOpendir = fs.opendir;
+    fs.opendir = async function opendirDuringWalk(path, ...args) {
+      const handle = await originalOpendir.call(this, path, ...args);
+      if (path === target) {
+        await rm(target, { recursive: true });
+        await mkdir(target);
+      }
+      return handle;
+    };
+    syncBuiltinESMExports();
+    try {
+      assert.equal(await readColdPreviewAbsence(base), null, "directory replaced during the walk");
+    } finally {
+      fs.opendir = originalOpendir;
+      syncBuiltinESMExports();
+    }
+  });
+
+  // A tree past the declared file limit is unprovable rather than partially hashed.
+  const many = await mkdtemp(join(await realpath(tmpdir()), "nqr-cold-preview-many-"));
+  try {
+    await mkdir(join(many, COLD_PREVIEW_ABSENCE.root));
+    await Promise.all(Array.from({ length: COLD_PREVIEW_ABSENCE.maxFiles + 1 },
+      (_unused, index) => writeFile(join(many, COLD_PREVIEW_ABSENCE.root, `f${index}.ts`), "x")));
+    assert.equal(await readColdPreviewAbsence(many), null, "over the file limit");
+  } finally {
+    await rm(many, { recursive: true, force: true });
+  }
 });
 
-test("stage B: the real CLI accepts the exempt scenario with the sources present and blocks without them", async () => {
+test("stage B: the real CLI accepts the exempt scenario with the tree present and blocks without it", async () => {
   await withStageBArtifact({}, async (item) => {
     const record = stageBRecord(item.expectedInputs, await readGateRevision(), (value) => {
       value.timingEvidence.scenarios.find((entry) => entry.id === "COLD_VALID_INITIAL_PREVIEW").status = "NOT_APPLICABLE";
@@ -1729,18 +1874,26 @@
     });
     const acceptancePath = join(item.base, "acceptance.json");
     await writeFile(acceptancePath, record);
-    await withAdmittedGate([record], async ({ gate, buildScript }) => {
+    await withAdmittedGate([record], async ({ base, gate, buildScript }) => {
+      assert.equal(await gate.readColdPreviewAbsence(base), COLD_PREVIEW_ABSENCE_SHA256);
       const decision = await gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN });
       assert.equal(decision.status, "PASS_BUNDLE_SCOPE");
       const passed = runVerifyExisting(buildScript, item, acceptancePath);
       assert.equal(passed.status, 0, passed.stderr);
+      // The same gate copy blocks as soon as the tree it reads stops matching the reviewed policy.
+      await appendFile(join(base, "src/components/generator/index.ts"), "\nexport const prefill = true;\n");
+      assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })))
+        .reasonCodes, ["COLD_PREVIEW_PROOF_MISMATCH"]);
+      const drifted = runVerifyExisting(buildScript, item, acceptancePath);
+      assert.equal(drifted.status, 1);
+      assert.match(drifted.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: COLD_PREVIEW_PROOF_MISMATCH$/m);
     }, { sources: true });
     await withAdmittedGate([record], async ({ gate, buildScript }) => {
       assert.deepEqual((await rejection(gate.verifyInitialBundleBoundary(item.root, { acceptancePath, origin: STAGE_B_ORIGIN })))
-        .reasonCodes, ["SCENARIO_NOT_APPLICABLE_UNPROVEN"]);
+        .reasonCodes, ["COLD_PREVIEW_PROOF_UNREADABLE"]);
       const blockedRun = runVerifyExisting(buildScript, item, acceptancePath);
       assert.equal(blockedRun.status, 1);
-      assert.match(blockedRun.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: SCENARIO_NOT_APPLICABLE_UNPROVEN$/m);
+      assert.match(blockedRun.stderr, /^NQR_BUNDLE_NEEDS_EMISSION_REVIEW\nreasons: COLD_PREVIEW_PROOF_UNREADABLE$/m);
     });
   });
 });
```
