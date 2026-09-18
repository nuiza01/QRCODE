# NQR-129 Stage A iteration 6 — ถอนข้ออ้างระดับ statement แล้วตรวจเฉพาะสิ่งที่ดึงไบต์ได้

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation Stage A iteration-6 ต่อจาก iteration 5

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ยังไม่ integrate และ release ยัง BLOCKED**

## 1. การตัดสินใจที่อยู่เบื้องหลัง

2026-09-18 Product Owner เลือก "ถอนข้ออ้างระดับ statement" หลังเห็นหลักฐานว่า เนื้อของ factory คือโค้ดของโมดูลเอง การบังคับให้ทุก statement อยู่ในรูปแบบที่ review แล้ว จึงเท่ากับ review ภาษา JavaScript ทั้งภาษา ([หลักฐานและตัวเลข](PM_PHASE2A_ADAPTER_GRAMMAR_GAP.md)) นโยบายใหม่บันทึกไว้ใน [spec v2 §2.3](../PHASE2A_RELEASE_GATE_SPEC_V2.md)

## 2. สิ่งที่เปลี่ยนในโค้ด (แก้ adapter กับไฟล์เทสต์เท่านั้น)

`inspectFactory` ถูกเขียนใหม่ทั้งฟังก์ชัน จากเดิม "ไล่ตรวจ statement ชั้นบนสุดทีละตัวว่าอยู่ในรูปแบบที่อนุญาตไหม" เป็น "เดินทั้ง AST แล้วมองหาสิ่งที่ดึงไบต์ได้"

| สิ่งที่พบ | การกระทำ |
| --- | --- |
| `context.l` / `context.L` / `context.b` / `context.w` / `context.u` พร้อม literal | edge `explicit-chunk-load` ผ่าน `normalizeChunkReference` เดิม จึงถูกกฎ path escape และ URL ภายนอกเหมือนทางอื่น |
| `import(...)` พร้อม literal | เหมือนกัน (`CONTEXT_DYNAMIC_IMPORT`) |
| construct ข้างบนที่เป้าหมายไม่ใช่ literal หรือไม่มี argument | `UNRESOLVED_CHUNK_LOAD` (UNKNOWN) |
| `context.r` / `i` / `A` / `f` / `s` พร้อม module id | edge + requirement ว่าโมดูลนั้นต้องมีลงทะเบียนอยู่ใน artifact |
| อ้างโมดูลด้วยค่าที่ไม่ใช่ literal | `UNRESOLVED_MODULE_REFERENCE` (UNKNOWN) |
| deferred loader รูปที่ review แล้ว (`context.v(...)`) | คงเดิมทุกประการ รวมทั้งการปฏิเสธเมื่อ `Promise` ถูก shadow |
| path ของ chunk ที่โผล่นอก construct ที่รู้จัก | `UNREVIEWED_CHUNK_REFERENCE` (UNKNOWN) |
| โค้ดอื่นทั้งหมด (class, for-in, function declaration, `Object.defineProperty`, IIFE ฯลฯ) | ไม่ใช่เรื่องของ gate ไม่มี diagnostic |

ลายเซ็นของ factory ยังบังคับ: ต้องมีพารามิเตอร์ 1–3 ตัวเป็น Identifier ที่ไม่ซ้ำกัน ไม่ async ไม่ generator เหตุผลที่ยังบังคับแม้จะถอนข้ออ้างอื่นแล้ว: factory ที่ไม่รับพารามิเตอร์สามารถเข้าถึง context ผ่าน `arguments` ซึ่ง adapter ตามไม่ได้ จึงต้องปฏิเสธรูปนั้น

โค้ดที่นโยบายใหม่ไม่ใช้แล้วถูกลบออก (`reviewedExportBindings`) แทนที่จะปล่อยค้างไว้ให้ดูเหมือนยังมีการตรวจ

## 3. ผลกับ artifact จริง

| ขั้น | UNKNOWN ในชุด startup (10 chunk) |
| --- | --- |
| ก่อน iteration 5 | ทุกอย่างถูกบล็อกที่ runtime chunk |
| iteration 5 (runtime model) | 117 |
| รับ factory signature จริง | 516 (เพราะเพิ่งเดินเข้าไปอ่านเนื้อได้) |
| **iteration 6** | **3** |

สามรายการที่เหลือคือของจริงที่ควรถูกถาม ไม่ใช่เสียงรบกวน: `UNRESOLVED_CHUNK_LOAD` หนึ่ง และ `UNRESOLVED_MODULE_REFERENCE` สอง ซึ่ง QA/reviewer ต้องไปดูว่าโค้ดตรงนั้นคืออะไร

นอกชุด startup ยังมี `UNSUPPORTED_FLIGHT_WIRE_RECORD` 478 และ `UNSUPPORTED_FLIGHT_IMPORT_RECORD` 22 ซึ่งเป็นงานของ iteration ถัดไป (payload จริงมี 32 บรรทัดต่อหน้า ชนิด record ไม่กี่แบบ)

## 4. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `12b09f364d008dfc177f648ec7d4ee28db6bc97d4a3a375f3641219514d1fa7f` |
| inspect-turbopack-emission.test.mjs | `8e5b9201cfd7d4f1626e99eccdf9ed809e591262c00abfcc54d7303e9166eb6f` |
| อีกสามไฟล์ | ไม่เปลี่ยนจาก SOURCE |

- Canonical5: **`1876688e621217463bd89abe27d98ecd82e39a8566a9ae992ef33eddf585b328`**
- Diff จาก SOURCE: 663 บรรทัด SHA-256 `bf2069e95ddd60d1…` (เต็มอยู่ในภาคผนวก)
- gate revision เปลี่ยนอีกครั้ง เพราะ adapter เปลี่ยน

## 5. เทสต์และ mutation

- `npm run test:scripts` ในพื้นที่ candidate **305/305** eslint ไม่มี error/warning
- เทสต์ที่**เปลี่ยนความคาดหวังโดยตั้งใจ** สามชุด และระบุเหตุผลไว้ในไฟล์เทสต์
  1. IIFE ธรรมดาใน factory เคยเป็น `UNPROVEN_FACTORY_INVOCATION` ตอนนี้เป็นโค้ดธรรมดาที่ไม่ถูกตั้งธง แต่ถ้าในนั้นมี path ของ chunk จะได้ `UNREVIEWED_CHUNK_REFERENCE`
  2. export tuple ที่รูปไม่ตรงเคยเป็น UNKNOWN เพราะรูป ตอนนี้ตัดสินจากปลายทาง: alias ต้องชี้ไปยังโมดูลที่มีจริง (ไม่มี = UNKNOWN, มี = SUPPORTED)
  3. deferred loader ที่ `Promise` ถูก shadow เคยตกเป็น `UNSUPPORTED_EXPORT_VALUE` ตอนนี้เป็น `UNRESOLVED_CHUNK_LOAD` ซึ่งตรงกับสิ่งที่เกิดขึ้นจริงมากกว่า และยังเป็น UNKNOWN เหมือนเดิม
- เทสต์ใหม่สามชุด: ทุก construct ที่ดึงไบต์ได้ถูกอ่านและ resolve, โมดูลที่อ้างผ่าน context ต้องมีอยู่จริงไม่ว่าจะลงทะเบียนใน chunk ไหน, และลายเซ็น factory ที่ผิดรูป (ไม่มีพารามิเตอร์, สี่ตัว, destructure, rest) เป็น UNKNOWN
- **Mutation 14 ตัว จับได้ทั้งหมด ไม่มีตัวรอด** ครอบคลุม: ตัดการตรวจ load ทั้งชุด, ตัดทีละ method (`L`, `b`, `w`), ยอมรับ load ที่ resolve ไม่ได้, ข้าม `import()`, ไม่สแกน chunk literal, ไม่ mark literal ที่ consume แล้ว, ไม่บันทึก requirement ของโมดูล, ยอมรับการอ้างโมดูลด้วยค่าที่ไม่ใช่ literal, ไม่ตรวจ requirement แบบ context, ผ่อนข้อบังคับ arity, alias ที่ไม่ต้องมีปลายทาง และการเดิน AST แบบตื้น (รอบแรกจับ 12 จาก 14 มีหนึ่ง anchor พลาดและหนึ่งตัวรอด จึงเพิ่มเทสต์ลายเซ็นและเทสต์ literal ที่ consume แล้ว จากนั้นยิงใหม่ได้ 14/14)

## 6. ข้อจำกัดที่ต้องอ่านคู่กัน

- gate ไม่ได้อ้างว่าเข้าใจโค้ดในโมดูล ถ้าโมดูลสร้าง URL ของ chunk ขึ้นมาแบบไดนามิกโดยไม่มี literal ปรากฏ static analysis ตามไม่ได้ ผลจะเป็น `UNRESOLVED_CHUNK_LOAD` เฉพาะเมื่อผ่าน construct ที่รู้จัก แต่ถ้าโหลดด้วยวิธีอื่นทั้งหมด (เช่น สร้าง `<script>` เอง) จะไม่ถูกจับที่ชั้นนี้ — ต้องอาศัยหลักฐานเบราว์เซอร์และการสแกน marker
- ตัวเลข "3 รายการ" เป็นของ artifact ชุดนี้เท่านั้น artifact ใหม่ต้องวัดใหม่
- ยังไม่ได้แตะ Flight wire grammar ซึ่งเป็นงานถัดไป

## 7. ภาคผนวก — diff จาก SOURCE

```diff
--- a/scripts/inspect-turbopack-emission.mjs
+++ b/scripts/inspect-turbopack-emission.mjs
@@ -399,7 +399,120 @@
   } catch {
     addDiagnostic(state, "INVALID_UTF8", "UNKNOWN", subject);
     return null;
+  }
+}
+
+// Turbopack's browser runtime, reviewed as bytes rather than as semantics.
+//
+// The runtime chunk is generated by the bundler, not by this application: it is one registration call followed by a
+// single IIFE holding the whole module loader. Reading that loader statement by statement is not something this
+// adapter can do honestly, so the IIFE body is pinned by digest instead, and only the registration call - the part
+// that names the chunks and modules the page starts with - is parsed.
+//
+// A new Next.js version, a different build configuration or any edit to the runtime changes the digest and returns
+// the chunk to UNKNOWN, which blocks. That is the intended cost: a new runtime must be read and admitted here.
+// Recorded model: docs/reports/PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md
+export const REVIEWED_RUNTIME_BODIES = Object.freeze({
+  ca691e834197bcf5bfa5f0a4d4ad8e38e7e9902200683c5196b13491e0a1fe8d:
+    "next 16.3.1 browser runtime, 9356 bytes, reviewed 2026-09-18",
+});
+
+function identifierNamed(node, name) {
+  return node?.type === "Identifier" && node.name === name;
+}
+
+function memberOf(node, objectName, propertyName) {
+  return node?.type === "MemberExpression" && !node.computed && !node.optional
+    && identifierNamed(node.object, objectName) && identifierNamed(node.property, propertyName);
+}
+
+/** `"object" == typeof document ? document.currentScript : void 0` and nothing else. */
+function currentScriptArgument(node) {
+  if (node?.type !== "ConditionalExpression") return false;
+  const { test, consequent, alternate } = node;
+  const typeofDocument = (value) => value?.type === "UnaryExpression" && value.operator === "typeof"
+    && identifierNamed(value.argument, "document");
+  const objectLiteral = (value) => value?.type === "Literal" && value.value === "object";
+  const testsDocument = test?.type === "BinaryExpression" && ["==", "==="].includes(test.operator)
+    && ((objectLiteral(test.left) && typeofDocument(test.right)) || (objectLiteral(test.right) && typeofDocument(test.left)));
+  return testsDocument && memberOf(consequent, "document", "currentScript")
+    && alternate?.type === "UnaryExpression" && alternate.operator === "void";
+}
+
+/** `(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push` and nothing else. */
+function turbopackPushCallee(node) {
+  if (node?.type !== "MemberExpression" || node.computed || node.optional) return false;
+  if (!identifierNamed(node.property, "push")) return false;
+  const target = node.object;
+  if (target?.type !== "LogicalExpression" || target.operator !== "||") return false;
+  if (!memberOf(target.left, "globalThis", "TURBOPACK")) return false;
+  const assignment = target.right;
+  return assignment?.type === "AssignmentExpression" && assignment.operator === "="
+    && memberOf(assignment.left, "globalThis", "TURBOPACK")
+    && assignment.right?.type === "ArrayExpression" && assignment.right.elements.length === 0;
+}
+
+function runtimeParameterList(node, predicate) {
+  if (node?.type !== "ArrayExpression") return null;
+  const values = [];
+  for (const element of node.elements) {
+    if (!element || element.type !== "Literal" || !predicate(element.value)) return null;
+    values.push(element.value);
+  }
+  return values;
+}
+
+/**
+ * Reads the startup manifest out of a Turbopack runtime chunk, or returns null so the caller keeps it UNKNOWN.
+ *
+ * `otherChunks` are the chunks the page starts with: the runtime does not fetch them (a Runtime-sourced load
+ * marks them as started and returns), it expects the server's HTML to have carried them. `runtimeModuleIds` are
+ * instantiated immediately once those chunks have registered.
+ */
+function inspectRuntimeChunk(source, subject, state) {
+  let program;
+  try {
+    program = acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
+  } catch {
+    addDiagnostic(state, "UNSUPPORTED_JAVASCRIPT_SYNTAX", "UNKNOWN", subject);
+    return null;
+  }
+  if (program.body.length !== 1 || program.body[0].type !== "ExpressionStatement") return null;
+  const sequence = program.body[0].expression;
+  if (sequence?.type !== "SequenceExpression" || sequence.expressions.length !== 2) return null;
+  const [registration, loader] = sequence.expressions;
+
+  if (registration?.type !== "CallExpression" || registration.optional) return null;
+  if (!turbopackPushCallee(registration.callee) || registration.arguments.length !== 1) return null;
+  const payload = registration.arguments[0];
+  if (payload?.type !== "ArrayExpression" || payload.elements.length !== 2) return null;
+  if (!currentScriptArgument(payload.elements[0])) return null;
+  const parameters = payload.elements[1];
+  if (parameters?.type !== "ObjectExpression" || parameters.properties.length !== 2) return null;
+  const named = new Map();
+  for (const property of parameters.properties) {
+    if (property.type !== "Property" || property.computed || property.kind !== "init" || property.method) return null;
+    const key = property.key.type === "Identifier" ? property.key.name
+      : property.key.type === "Literal" ? property.key.value : null;
+    // No duplicate check: the payload must carry exactly two properties, and both names must resolve below, so a
+    // repeated name always loses one of them and is rejected there. Mutation testing showed a duplicate guard here
+    // changes no outcome.
+    if (typeof key !== "string") return null;
+    named.set(key, property.value);
   }
+  const otherChunks = runtimeParameterList(named.get("otherChunks"), (value) => typeof value === "string");
+  const runtimeModuleIds = runtimeParameterList(named.get("runtimeModuleIds"),
+    (value) => Number.isSafeInteger(value) && value >= 0);
+  if (!otherChunks || !runtimeModuleIds) return null;
+
+  if (loader?.type !== "CallExpression" || loader.optional || loader.arguments.length !== 0) return null;
+  const body = loader.callee;
+  if (body?.type !== "ArrowFunctionExpression" || body.params.length !== 0 || body.async || body.generator) return null;
+  if (body.body?.type !== "BlockStatement") return null;
+  const digest = sha256(source.slice(body.body.start, body.body.end));
+  if (!Object.hasOwn(REVIEWED_RUNTIME_BODIES, digest)) return null;
+
+  return { otherChunks, runtimeModuleIds, bodySha256: digest };
 }
 
 function normalizeChunkReference(raw, subject, state) {
@@ -721,65 +834,152 @@
   return node?.type === "Literal" && (node.value === null || ["string", "number", "boolean"].includes(typeof node.value));
 }
 
-function reviewedExportBindings(node) {
-  if (node?.type !== "ArrayExpression" || node.elements.length === 0 || node.elements.length % 3 !== 0) return false;
-  for (let index = 0; index < node.elements.length; index += 3) {
-    if (!literalString(node.elements[index]) || node.elements[index + 1]?.type !== "Literal"
-      || node.elements[index + 1].value !== 0 || !primitiveAst(node.elements[index + 2])) return false;
-  }
-  return true;
-}
+
+// Turbopack calls a module factory as `factory(context, module, exports)` (see the reviewed runtime model in
+// docs/reports/PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md). Real chunks declare all three; the single-parameter
+// form appears where the module never touches module/exports directly. Only the first parameter is modelled: a
+// statement that uses the other two is not a context operation, so it stays an unmodelled effect and UNKNOWN.
 
+// What a module can do with its context, from the reviewed runtime model
+// (docs/reports/PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md). Only the first group moves bytes at runtime.
+const LOADING_CONTEXT_METHODS = Object.freeze({
+  l: "CHUNK", // loadChunk
+  L: "CHUNK_URL", // loadChunkByUrl
+  b: "WORKER", // createWorker
+  w: "WEBASSEMBLY", // loadWebAssembly
+  u: "WEBASSEMBLY_MODULE", // loadWebAssemblyModule
+});
+// These reach a module that is already registered: a graph edge, not a fetch.
+const MODULE_CONTEXT_METHODS = new Set(["r", "i", "A", "f"]);
+const CHUNK_LITERAL = /^(?:\/_next\/)?static\/chunks\/[^\s]*\.(?:js|css)$/;
+
+/**
+ * Reads a module factory for the things that can move bytes, and ignores the rest.
+ *
+ * The body of a factory is the module's own transpiled code - React, application code, a vendor library. An earlier
+ * version of this adapter required every statement in it to match a reviewed form; measured against a real build
+ * that produced 516 unknowns in the startup set alone, because the requirement amounts to reviewing JavaScript
+ * itself. The Product Owner withdrew that claim on 2026-09-18.
+ *
+ * What is claimed now, and is checkable: every construct that can fetch a chunk, an asset or a worker resolves to a
+ * chunk this artifact contains, and no chunk path appears anywhere else in the code. Anything that fails either
+ * test is UNKNOWN. When a module is loaded is not decided here; that is what the browser evidence in
+ * PHASE2A_RELEASE_GATE_SPEC_V2.md §3 is for.
+ */
 function inspectFactory(factory, ids, subject, state) {
-  if (factory.params.length !== 1 || factory.params[0].type !== "Identifier" || factory.async || factory.generator) {
+  const parameterNames = factory.params.map((parameter) => parameter?.type === "Identifier" ? parameter.name : null);
+  if (factory.params.length < 1 || factory.params.length > 3 || factory.async || factory.generator
+    || parameterNames.some((name) => name === null) || new Set(parameterNames).size !== parameterNames.length) {
     addDiagnostic(state, "UNSUPPORTED_FACTORY_SIGNATURE", "UNKNOWN", subject, factory);
     return;
   }
-  const contextName = factory.params[0].name;
-  if (factory.body.type !== "BlockStatement") {
-    addDiagnostic(state, "UNSUPPORTED_FACTORY_BODY", "UNKNOWN", subject, factory.body);
-    return;
-  }
-  for (const statement of factory.body.body) {
-    if (statement.type === "EmptyStatement") continue;
-    if (statement.type !== "ExpressionStatement" || statement.expression.type !== "CallExpression"
-      || statement.expression.callee.type !== "MemberExpression" || statement.expression.callee.computed
-      || statement.expression.callee.object?.type !== "Identifier"
-      || statement.expression.callee.object.name !== contextName) {
-      addDiagnostic(state, "UNSUPPORTED_FACTORY_EFFECT", "UNKNOWN", subject, statement);
-      addEdge(state, { kind: "unknown", from: subject, to: "unmodeled-factory-effect", span: { start: statement.start, end: statement.end } });
-      continue;
-    }
-    const call = statement.expression;
-    const method = call.callee.property.name;
-    if (method === "v" && call.arguments.length === 1) {
-      const value = call.arguments[0];
-      if (primitiveAst(value)) continue;
-      if (functionNode(value) && exactDeferredLoader(value, contextName, factory.id?.name, subject, state, ids)) continue;
-      if (value.type === "CallExpression") {
-        addDiagnostic(state, "UNPROVEN_FACTORY_INVOCATION", "UNKNOWN", subject, value);
-        addEdge(state, { kind: "unknown", from: subject, to: "factory-invocation-effect",
-          condition: "ON_MODULE_INSTANTIATION", span: { start: value.start, end: value.end } });
-        continue;
+  const contextName = parameterNames[0];
+  const consumed = new Set();
+
+  const contextCall = (node) => {
+    if (node?.type !== "CallExpression" || node.callee?.type !== "MemberExpression" || node.callee.computed
+      || node.callee.object?.type !== "Identifier" || node.callee.object.name !== contextName) return null;
+    return node.callee.property?.type === "Identifier" ? node.callee.property.name : null;
+  };
+
+  const recordChunkArgument = (node, argument, kind) => {
+    if (literalString(argument)) {
+      consumed.add(argument);
+      const path = normalizeChunkReference(argument.value, subject, state);
+      if (path) {
+        addEdge(state, { kind: "explicit-chunk-load", from: subject, to: path, moduleIds: ids,
+          condition: `CONTEXT_${kind}` });
       }
-      addDiagnostic(state, "UNSUPPORTED_EXPORT_VALUE", "UNKNOWN", subject, value);
-      continue;
+      return;
     }
-    if (method === "s" && call.arguments.length === 2 && reviewedExportBindings(call.arguments[0])
-      && literalInteger(call.arguments[1])) {
-      addEdge(state, { kind: "alias", from: subject, to: `module:${call.arguments[1].value}`, moduleIds: ids,
-        condition: "ON_SOURCE_MODULE_INSTANTIATION" });
-      continue;
-    }
-    if (["n", "j", "r", "i", "l", "A"].includes(method)) {
-      addDiagnostic(state, "UNSUPPORTED_CONTEXT_OPERATION", "UNKNOWN", subject, call);
-      addEdge(state, { kind: "unknown", from: subject, to: `context:${method}`, span: { start: call.start, end: call.end } });
-      continue;
-    }
-    addDiagnostic(state, "UNSUPPORTED_CONTEXT_OPERATION", "UNKNOWN", subject, call);
+    // A load whose target this adapter cannot read statically is exactly the case it must not wave through.
+    addDiagnostic(state, "UNRESOLVED_CHUNK_LOAD", "UNKNOWN", subject, node);
+    addEdge(state, { kind: "unknown", from: subject, to: `load:${kind}`,
+      span: { start: node.start, end: node.end } });
+  };
+
+  const visit = (node) => {
+    if (!node || typeof node.type !== "string") return;
+    const method = contextCall(node);
+    if (method) {
+      if (method === "v" && node.arguments.length === 1 && functionNode(node.arguments[0])
+        && exactDeferredLoader(node.arguments[0], contextName, factory.id?.name, subject, state, ids)) {
+        for (const inner of walkNodes(node.arguments[0])) if (literalString(inner)) consumed.add(inner);
+        return;
+      }
+      // esmExport re-exports from a module that is already registered. The shape of the binding list is the
+      // module own business; what this adapter records is the module it points at.
+      if (method === "s") {
+        const source = node.arguments[1];
+        if (literalInteger(source)) {
+          addEdge(state, { kind: "alias", from: subject, to: `module:${source.value}`, moduleIds: ids,
+            condition: "ON_SOURCE_MODULE_INSTANTIATION" });
+          state.moduleRequirements.push({ kind: "context", moduleId: source.value, subject, chunks: [subject] });
+        } else if (source) {
+          addDiagnostic(state, "UNRESOLVED_MODULE_REFERENCE", "UNKNOWN", subject, node);
+        }
+        return;
+      }
+      if (Object.hasOwn(LOADING_CONTEXT_METHODS, method)) {
+        const kind = LOADING_CONTEXT_METHODS[method];
+        if (node.arguments.length === 0) {
+          addDiagnostic(state, "UNRESOLVED_CHUNK_LOAD", "UNKNOWN", subject, node);
+        } else {
+          recordChunkArgument(node, node.arguments[0], kind);
+        }
+        for (const argument of node.arguments.slice(1)) visit(argument);
+        return;
+      }
+      if (MODULE_CONTEXT_METHODS.has(method)) {
+        const target = node.arguments[0];
+        if (literalInteger(target)) {
+          addEdge(state, { kind: "synchronous-instantiation", from: subject, to: `module:${target.value}`,
+            moduleIds: ids, condition: "ON_MODULE_INSTANTIATION" });
+          state.moduleRequirements.push({ kind: "context", moduleId: target.value, subject, chunks: [subject] });
+        } else if (target) {
+          addDiagnostic(state, "UNRESOLVED_MODULE_REFERENCE", "UNKNOWN", subject, node);
+        }
+        for (const argument of node.arguments) visit(argument);
+        return;
+      }
+    }
+    if (node.type === "ImportExpression") {
+      recordChunkArgument(node, node.source, "DYNAMIC_IMPORT");
+      return;
+    }
+    for (const child of childNodes(node)) visit(child);
+  };
+
+  visit(factory.body);
+
+  // A chunk path sitting in the code outside any construct this adapter understands is unreviewed reachability.
+  for (const node of walkNodes(factory.body)) {
+    if (literalString(node) && CHUNK_LITERAL.test(node.value) && !consumed.has(node)) {
+      addDiagnostic(state, "UNREVIEWED_CHUNK_REFERENCE", "UNKNOWN", subject, node);
+      addEdge(state, { kind: "unknown", from: subject, to: "unreviewed-chunk-reference",
+        span: { start: node.start, end: node.end } });
+    }
+  }
+}
+
+function* childNodes(node) {
+  for (const key of Object.keys(node)) {
+    if (key === "type" || key === "start" || key === "end" || key === "loc" || key === "range") continue;
+    const value = node[key];
+    if (Array.isArray(value)) {
+      for (const item of value) if (item && typeof item.type === "string") yield item;
+    } else if (value && typeof value.type === "string") {
+      yield value;
+    }
   }
 }
 
+function* walkNodes(node) {
+  if (!node || typeof node.type !== "string") return;
+  yield node;
+  for (const child of childNodes(node)) yield* walkNodes(child);
+}
+
 function inspectRegistration(expression, subject, source, state) {
   const payload = registrationPayload(expression);
   if (!payload) return false;
@@ -1023,8 +1223,27 @@
           continue;
         }
         if (row.path.startsWith("static/chunks/turbopack-")) {
-          inspectJavaScript(source, row.path, mode, state);
-          addDiagnostic(state, "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS", "UNKNOWN", row.path);
+          const runtime = inspectRuntimeChunk(source, row.path, state);
+          if (!runtime) {
+            addDiagnostic(state, "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS", "UNKNOWN", row.path);
+            continue;
+          }
+          addNode(state, { kind: "reviewed-runtime", subject: row.path, sha256: row.sha256 });
+          const startupChunks = [row.path];
+          for (const reference of runtime.otherChunks) {
+            const path = normalizeChunkReference(reference, row.path, state);
+            if (!path) continue;
+            startupChunks.push(path);
+            // The runtime does not fetch these: it waits for the chunks the HTML already carries. They are part of
+            // startup either way, so the graph records them as instantiated with the page.
+            addEdge(state, { kind: "synchronous-instantiation", from: row.path, to: path,
+              condition: "RUNTIME_INITIAL_CHUNK" });
+          }
+          for (const moduleId of runtime.runtimeModuleIds) {
+            addEdge(state, { kind: "synchronous-instantiation", from: row.path, to: `module:${moduleId}`,
+              condition: "RUNTIME_ENTRY_MODULE" });
+            state.moduleRequirements.push({ kind: "runtime", moduleId, subject: row.path, chunks: startupChunks });
+          }
           continue;
         }
         inspectJavaScript(source, row.path, mode, state);
@@ -1041,6 +1260,14 @@
       const registeredIn = state.registrationSubjects.get(requirement.moduleId) || new Set();
       const available = new Set(requirement.chunks);
       if (requirement.kind === "deferred") available.add(requirement.subject);
+      // A module reached through the context must exist in this artifact; which chunk carries it is a loading
+      // question answered by the graph, not by the reference itself.
+      if (requirement.kind === "context") {
+        if (registeredIn.size === 0) {
+          addDiagnostic(state, "UNRESOLVED_MODULE_DESTINATION", "UNKNOWN", `module:${requirement.moduleId}`);
+        }
+        continue;
+      }
       if (requirement.kind === "flight") {
         for (const rootChunk of state.routeRootChunks.get(requirement.route) || []) available.add(rootChunk);
       }
--- a/scripts/inspect-turbopack-emission.test.mjs
+++ b/scripts/inspect-turbopack-emission.test.mjs
@@ -129,28 +129,40 @@
   assert.equal(result.releaseDecision, "BLOCKED");
 });
 
-test("reviewed literal export tuple is distinct from context invocation", async (t) => {
+test("an export alias must point at a module this artifact actually contains", async (t) => {
   const chunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.s(["named",0,"value"],9)}]);`;
-  const item = await fixture({ chunk });
-  t.after(() => rm(item.root, { recursive: true, force: true }));
-  const result = await inspect(item);
-  assert.equal(result.staticStatus, STATIC_SUPPORTED);
-  assert.ok(result.graph.edges.some((edge) => edge.kind === "alias" && edge.to === "module:9"));
-  assert.ok(!result.graph.edges.some((edge) => edge.kind === "deferred-invocation"));
-});
+  const dangling = await fixture({ chunk });
+  t.after(() => rm(dangling.root, { recursive: true, force: true }));
+  const missing = await inspect(dangling);
+  assert.ok(missing.graph.edges.some((edge) => edge.kind === "alias" && edge.to === "module:9"));
+  assert.ok(missing.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));
+  assert.equal(missing.staticStatus, STATIC_UNKNOWN);
 
-test("benign IIFE in a factory is unproven until module instantiation", async (t) => {
-  const chunk = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,t=>{t.v((()=>0)())}]);`;
-  const item = await fixture({ chunk });
+  const present = await fixture({ chunk, extraFiles: { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") } });
+  t.after(() => rm(present.root, { recursive: true, force: true }));
+  const resolved = await inspect(present);
+  assert.equal(resolved.staticStatus, STATIC_SUPPORTED, JSON.stringify(resolved.diagnostics));
+  assert.ok(resolved.graph.edges.some((edge) => edge.kind === "alias" && edge.to === "module:9"));
+  assert.ok(!resolved.graph.edges.some((edge) => edge.kind === "deferred-invocation"));
+});
+test("ordinary module code inside a factory is not the gate's business; a chunk path in it is", async (t) => {
+  // A factory body is the module's own transpiled code. The Product Owner withdrew the claim that every statement
+  // in it is reviewed (2026-09-18), so these shapes must not produce findings on their own.
+  const ordinary = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,(t,e,o)=>{class A{}function b(){}for(const k in {a:1})b();Object.defineProperty(o,"__esModule",{value:!0});t.v((()=>0)())}]);`;
+  const item = await fixture({ chunk: ordinary });
   t.after(() => rm(item.root, { recursive: true, force: true }));
   const result = await inspect(item);
-  assert.equal(result.staticStatus, STATIC_UNKNOWN);
-  assert.ok(result.diagnostics.some((item) => item.code === "UNPROVEN_FACTORY_INVOCATION"));
-  assert.ok(result.graph.edges.some((edge) => edge.kind === "unknown"
-    && edge.condition === "ON_MODULE_INSTANTIATION"));
-  assert.equal(result.releaseDecision, "BLOCKED");
-});
+  assert.equal(result.staticStatus, STATIC_SUPPORTED, JSON.stringify(result.diagnostics));
 
+  // The same body carrying a chunk path outside any construct the adapter understands is unreviewed reachability.
+  const hidden = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,(t,e,o)=>{const path="static/chunks/lazy.js";o.path=path}]);`;
+  const other = await fixture({ chunk: hidden, extraFiles: { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") } });
+  t.after(() => rm(other.root, { recursive: true, force: true }));
+  const flagged = await inspect(other);
+  assert.ok(flagged.diagnostics.some((entry) => entry.code === "UNREVIEWED_CHUNK_REFERENCE"));
+  assert.equal(flagged.staticStatus, STATIC_UNKNOWN);
+  assert.equal(flagged.releaseDecision, "BLOCKED");
+});
 test("altered registration receiver remains unknown, never framework-whitelisted", async (t) => {
   const item = await fixture({ chunk: supportedChunk.replaceAll("TURBOPACK", "OTHERPACK") });
   t.after(() => rm(item.root, { recursive: true, force: true }));
@@ -532,10 +544,11 @@
     t.after(() => rm(item.root, { recursive: true, force: true }));
     const result = await inspect(item);
     assert.equal(result.staticStatus, STATIC_UNKNOWN);
-    assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_EXPORT_VALUE"));
+    // The shadowed shape is no longer a reviewed deferred loader, so the load inside it is read on its own terms:
+    // a chunk load whose target is a variable cannot be resolved statically, which is unknown, not supported.
+    assert.ok(result.diagnostics.some((entry) => entry.code === "UNRESOLVED_CHUNK_LOAD"), chunk);
   }
 });
-
 test("module destinations must be registered in their modeled load context", async (t) => {
   const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,`;
   const orphanFlight = await fixture({
@@ -768,4 +781,218 @@
     assert.ok(!output.includes(marker.message));
   }
   await assert.rejects(() => runCli([], () => { throw new Error("TRUSTED_WRITER_FAILURE"); }), /TRUSTED_WRITER_FAILURE/);
+});
+
+
+// The reviewed Turbopack browser runtime, as bytes.
+//
+// This is the exact IIFE body of `static/chunks/turbopack-*.js` from a real build of this application on Next
+// 16.3.1, carried here in base64 because the minified source contains backticks and ${. The adapter admits a
+// runtime chunk only when this body's digest is in REVIEWED_RUNTIME_BODIES, so these tests exercise the real
+// admission path rather than a stand-in, and they fail the day the runtime changes - which is the point.
+const REVIEWED_RUNTIME_BODY = Buffer.from(
+  "e2xldCBlO2lmKCFBcnJheS5pc0FycmF5KGdsb2JhbFRoaXMuVFVSQk9QQUNLKSlyZXR1cm47dmFyIHQscj0iL19uZXh0LyIsbj1mdW5jdGlvbigpe2lmKG51bGwhPXNlbGYuVFVSQk9QQUNLX0FTU0VUX1NVRkZJWClyZXR1cm4gc2VsZi5UVVJCT1BBQ0tfQVNTRVRfU1VGRklYO2xldCBlPWRvY3VtZW50Py5jdXJyZW50U2NyaXB0Py5nZXRBdHRyaWJ1dGU/Ligic3JjIik/PyIiLHQ9ZS5pbmRleE9mKCI/Iik7cmV0dXJuIHQ+PTA/ZS5zbGljZSh0KToiIn0oKSxvPSgodD1vfHx7fSlbdC5SdW50aW1lPTBdPSJSdW50aW1lIix0W3QuUGFyZW50PTFdPSJQYXJlbnQiLHRbdC5VcGRhdGU9Ml09IlVwZGF0ZSIsdCk7bGV0IGw9bmV3IFdlYWtNYXA7ZnVuY3Rpb24gaShlLHQpe3RoaXMubT1lLHRoaXMuZT10fWxldCB1PWkucHJvdG90eXBlLHM9T2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxjPSJ1Ij50eXBlb2YgU3ltYm9sJiZTeW1ib2wudG9TdHJpbmdUYWc7ZnVuY3Rpb24gYShlLHQscil7cy5jYWxsKGUsdCl8fE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlLHQscil9ZnVuY3Rpb24gZihlLHQpe2xldCByPWVbdF07cmV0dXJuIHJ8fChyPXAodCksZVt0XT1yKSxyfWZ1bmN0aW9uIHAoZSl7cmV0dXJue2V4cG9ydHM6e30sZXJyb3I6dm9pZCAwLGlkOmUsbmFtZXNwYWNlT2JqZWN0OnZvaWQgMH19ZnVuY3Rpb24gZChlLHQscil7YShlLCJfX2VzTW9kdWxlIix7dmFsdWU6ITB9KSxjJiZhKGUsYyx7dmFsdWU6Ik1vZHVsZSJ9KTtsZXQgbj0wO2Zvcig7bjx0Lmxlbmd0aDspe2xldCByPXRbbisrXSxvPXRbbisrXTtpZigibnVtYmVyIj09dHlwZW9mIG8paWYoMD09PW8pYShlLHIse3ZhbHVlOnRbbisrXSxlbnVtZXJhYmxlOiEwLHdyaXRhYmxlOiExfSk7ZWxzZSB0aHJvdyBFcnJvcihgdW5leHBlY3RlZCB0YWc6ICR7b31gKTtlbHNlImZ1bmN0aW9uIj09dHlwZW9mIHRbbl0/YShlLHIse2dldDpvLHNldDp0W24rK10sZW51bWVyYWJsZTohMH0pOmEoZSxyLHtnZXQ6byxlbnVtZXJhYmxlOiEwfSl9cnx8T2JqZWN0LnNlYWwoZSl9ZnVuY3Rpb24gaChlLHQpeyhudWxsIT10P2YodGhpcy5jLHQpOnRoaXMubSkuZXhwb3J0cz1lfXUucz1mdW5jdGlvbihlLHQscil7bGV0IG4sbztudWxsIT10P289KG49Zih0aGlzLmMsdCkpLmV4cG9ydHM6KG49dGhpcy5tLG89dGhpcy5lKSxuLm5hbWVzcGFjZU9iamVjdD1vLGQobyxlLHIpfSx1Lmo9ZnVuY3Rpb24oZSx0KXtsZXQgcixuO251bGwhPXQ/bj0ocj1mKHRoaXMuYyx0KSkuZXhwb3J0czoocj10aGlzLm0sbj10aGlzLmUpO2xldCBvPWZ1bmN0aW9uKGUsdCl7bGV0IHI9bC5nZXQoZSk7aWYoIXIpe2wuc2V0KGUscj1bXSk7bGV0IG49ZT0+e2lmKCJkZWZhdWx0IiE9PWUpe2ZvcihsZXQgdCBvZiByKWlmKHMuY2FsbCh0LGUpKXJldHVybiB0fX07ZS5leHBvcnRzPWUubmFtZXNwYWNlT2JqZWN0PW5ldyBQcm94eSh0LHtnZXQoZSx0KXtpZihzLmNhbGwoZSx0KXx8ImRlZmF1bHQiPT09dHx8Il9fZXNNb2R1bGUiPT09dClyZXR1cm4gUmVmbGVjdC5nZXQoZSx0KTtsZXQgcj1uKHQpO3JldHVybiByJiZSZWZsZWN0LmdldChyLHQpfSxzZXQ6KCk9PiExLGRlZmluZVByb3BlcnR5OigpPT4hMSxkZWxldGVQcm9wZXJ0eTooKT0+ITEsaGFzOihlLHQpPT4hIVJlZmxlY3QuaGFzKGUsdCl8fCJkZWZhdWx0IiE9PXQmJiJfX2VzTW9kdWxlIiE9PXQmJnZvaWQgMCE9PW4odCksb3duS2V5cyhlKXtsZXQgdD1SZWZsZWN0Lm93bktleXMoZSk7Zm9yKGxldCBlIG9mIHIpZm9yKGxldCByIG9mIFJlZmxlY3Qub3duS2V5cyhlKSkiZGVmYXVsdCI9PT1yfHx0LmluY2x1ZGVzKHIpfHx0LnB1c2gocik7cmV0dXJuIHR9LGdldE93blByb3BlcnR5RGVzY3JpcHRvcihlLHQpe2xldCByPVJlZmxlY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGUsdCk7aWYocnx8ImRlZmF1bHQiPT09dHx8Il9fZXNNb2R1bGUiPT09dClyZXR1cm4gcjtsZXQgbz1uKHQpO2lmKG8pcmV0dXJue2VudW1lcmFibGU6ITAsY29uZmlndXJhYmxlOiEwLGdldDooKT0+UmVmbGVjdC5nZXQobyx0KX19fSl9cmV0dXJuIHJ9KHIsbik7Im9iamVjdCI9PXR5cGVvZiBlJiZudWxsIT09ZSYmby5wdXNoKGUpfSx1LnY9aCx1Lm49ZnVuY3Rpb24oZSx0KXtsZXQgcjsocj1udWxsIT10P2YodGhpcy5jLHQpOnRoaXMubSkuZXhwb3J0cz1yLm5hbWVzcGFjZU9iamVjdD1lfTtsZXQgbT1PYmplY3QuZ2V0UHJvdG90eXBlT2Y/ZT0+T2JqZWN0LmdldFByb3RvdHlwZU9mKGUpOmU9PmUuX19wcm90b19fLHk9W251bGwsbSh7fSksbShbXSksbShtKV07ZnVuY3Rpb24gZyhlLHQscil7bGV0IG49W10sbz0tMTtmb3IobGV0IHQ9ZTsoIm9iamVjdCI9PXR5cGVvZiB0fHwiZnVuY3Rpb24iPT10eXBlb2YgdCkmJiF5LmluY2x1ZGVzKHQpO3Q9bSh0KSlmb3IobGV0IHIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModCkpbi5wdXNoKHIsZnVuY3Rpb24oZSx0KXtyZXR1cm4oKT0+ZVt0XX0oZSxyKSksLTE9PT1vJiYiZGVmYXVsdCI9PT1yJiYobz1uLmxlbmd0aC0xKTtyZXR1cm4gciYmbz49MHx8KG8+PTA/bi5zcGxpY2UobywxLDAsZSk6bi5wdXNoKCJkZWZhdWx0IiwwLGUpKSxkKHQsbiksdH1mdW5jdGlvbiBiKGUpe2xldCB0PUsoZSx0aGlzLm0pO2lmKHQubmFtZXNwYWNlT2JqZWN0KXJldHVybiB0Lm5hbWVzcGFjZU9iamVjdDtsZXQgcj10LmV4cG9ydHM7cmV0dXJuIHQubmFtZXNwYWNlT2JqZWN0PWcociwiZnVuY3Rpb24iPT10eXBlb2Ygcj9mdW5jdGlvbiguLi5lKXtyZXR1cm4gci5hcHBseSh0aGlzLGUpfTpPYmplY3QuY3JlYXRlKG51bGwpLHImJnIuX19lc01vZHVsZSl9ZnVuY3Rpb24gTyhlKXtsZXQgdD1lLmluZGV4T2YoIiMiKTstMSE9PXQmJihlPWUuc3Vic3RyaW5nKDAsdCkpO2xldCByPWUuaW5kZXhPZigiPyIpO3JldHVybiAtMSE9PXImJihlPWUuc3Vic3RyaW5nKDAscikpLGV9dS5pPWIsdS5BPWZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLnIoZSkoYi5iaW5kKHRoaXMpKX0sdS50PSJmdW5jdGlvbiI9PXR5cGVvZiByZXF1aXJlP3JlcXVpcmU6ZnVuY3Rpb24oKXt0aHJvdyBFcnJvcigiVW5leHBlY3RlZCB1c2Ugb2YgcnVudGltZSByZXF1aXJlIil9LHUucj1mdW5jdGlvbihlKXtyZXR1cm4gSyhlLHRoaXMubSkuZXhwb3J0c30sdS5mPWZ1bmN0aW9uKGUpe2Z1bmN0aW9uIHQodCl7aWYodD1PKHQpLHMuY2FsbChlLHQpKXJldHVybiBlW3RdLm1vZHVsZSgpO2xldCByPUVycm9yKGBDYW5ub3QgZmluZCBtb2R1bGUgJyR7dH0nYCk7dGhyb3cgci5jb2RlPSJNT0RVTEVfTk9UX0ZPVU5EIixyfXJldHVybiB0LmtleXM9KCk9Pk9iamVjdC5rZXlzKGUpLHQucmVzb2x2ZT10PT57aWYodD1PKHQpLHMuY2FsbChlLHQpKXJldHVybiBlW3RdLmlkKCk7bGV0IHI9RXJyb3IoYENhbm5vdCBmaW5kIG1vZHVsZSAnJHt0fSdgKTt0aHJvdyByLmNvZGU9Ik1PRFVMRV9OT1RfRk9VTkQiLHJ9LHQuaW1wb3J0PWFzeW5jIGU9PmF3YWl0IHQoZSksdH07bGV0IHc9ZnVuY3Rpb24oZSl7bGV0IHQ9bmV3IFVSTChlLCJ4Oi8iKSxyPXt9O2ZvcihsZXQgZSBpbiB0KXJbZV09dFtlXTtmb3IobGV0IHQgaW4gci5ocmVmPWUsci5wYXRobmFtZT1lLnJlcGxhY2UoL1s/I10uKi8sIiIpLHIub3JpZ2luPXIucHJvdG9jb2w9IiIsci50b1N0cmluZz1yLnRvSlNPTj0oLi4udCk9PmUscilPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcyx0LHtlbnVtZXJhYmxlOiEwLGNvbmZpZ3VyYWJsZTohMCx2YWx1ZTpyW3RdfSl9O2Z1bmN0aW9uIGsoZSx0KXt0aHJvdyBFcnJvcihgSW52YXJpYW50OiAke3QoZSl9YCl9dy5wcm90b3R5cGU9VVJMLnByb3RvdHlwZSx1LlU9dyx1Lno9ZnVuY3Rpb24oZSl7dGhyb3cgRXJyb3IoImR5bmFtaWMgdXNhZ2Ugb2YgcmVxdWlyZSBpcyBub3Qgc3VwcG9ydGVkIil9LHUuZz1nbG9iYWxUaGlzO2xldCB2PWkucHJvdG90eXBlLFI9bmV3IE1hcDt1Lk09UjtsZXQgVT1uZXcgTWFwLGo9bmV3IE1hcCwkPW5ldyBNYXA7YXN5bmMgZnVuY3Rpb24gUChlLHQscil7bGV0IG47aWYoInN0cmluZyI9PXR5cGVvZiByKXJldHVybiBmdW5jdGlvbihlLHQscil7cmV0dXJuIFQoZSx0LHIpfShlLHQsQShyKSk7bGV0IG89ci5pbmNsdWRlZHx8W10sbD1vLm1hcChlPT4hIVIuaGFzKGUpfHxVLmdldChlKSk7aWYobC5sZW5ndGg+MCYmbC5ldmVyeShlPT5lKSlyZXR1cm4gdm9pZCBhd2FpdCBQcm9taXNlLmFsbChsKTtmb3IobGV0IGwgb2Yobj1UKGUsdCxBKHIucGF0aCkpLG8pKVUuaGFzKGwpfHxVLnNldChsLG4pO2F3YWl0IG59di5sPWZ1bmN0aW9uKGUpe3JldHVybiBQKG8uUGFyZW50LHRoaXMubS5pZCxlKX07bGV0IF89UHJvbWlzZS5yZXNvbHZlKHZvaWQgMCksQz1uZXcgV2Vha01hcDtmdW5jdGlvbiBUKHQscixuKXtsZXQgbD1lLmxvYWRDaHVua0NhY2hlZCh0LG4pLGk9Qy5nZXQobCk7aWYodm9pZCAwPT09aSl7bGV0IGU9Qy5zZXQuYmluZChDLGwsXyk7aT1sLnRoZW4oZSkuY2F0Y2goZT0+e2xldCBsO3N3aXRjaCh0KXtjYXNlIG8uUnVudGltZTpsPWBhcyBhIHJ1bnRpbWUgZGVwZW5kZW5jeSBvZiBjaHVuayAke3J9YDticmVhaztjYXNlIG8uUGFyZW50Omw9YGZyb20gbW9kdWxlICR7cn1gO2JyZWFrO2Nhc2Ugby5VcGRhdGU6bD0iZnJvbSBhbiBITVIgdXBkYXRlIjticmVhaztkZWZhdWx0OmsodCxlPT5gVW5rbm93biBzb3VyY2UgdHlwZTogJHtlfWApfWxldCBpPUVycm9yKGBGYWlsZWQgdG8gbG9hZCBjaHVuayAke259ICR7bH0ke2U/YDogJHtlfWA6IiJ9YCxlP3tjYXVzZTplfTp2b2lkIDApO3Rocm93IGkubmFtZT0iQ2h1bmtMb2FkRXJyb3IiLGl9KSxDLnNldChsLGkpfXJldHVybiBpfXYuTD1mdW5jdGlvbihlKXt2YXIgdCxyO3JldHVybiB0PW8uUGFyZW50LHI9dGhpcy5tLmlkLFQodCxyLGUpfTt2LlI9ZnVuY3Rpb24oZSl7bGV0IHQ9dGhpcy5yKGUpO3JldHVybiB0Py5kZWZhdWx0Pz90fSx2LlA9ZnVuY3Rpb24oZSl7cmV0dXJuYC9ST09ULyR7ZT8/IiJ9YH0sdi5GPWZ1bmN0aW9uKGUpe3JldHVybiBlP2BmaWxlOi8vL1JPT1QvJHtlLnNwbGl0KCIvIikubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbigiLyIpfWA6ImZpbGU6Ly8vUk9PVC8ifSx2LnE9ZnVuY3Rpb24oZSx0KXtoLmNhbGwodGhpcyxgJHtlfSR7bn1gLHQpfTtsZXQgeD0vW15BLVphLXowLTlcLV8uIX4qJygpL10vO2Z1bmN0aW9uIEEoZSx0PXIpe2xldCBvPXgudGVzdChlKT9lLnNwbGl0KCIvIikubWFwKGVuY29kZVVSSUNvbXBvbmVudCkuam9pbigiLyIpOmU7cmV0dXJuYCR7dH0ke299JHtufWB9ZnVuY3Rpb24gRShlLHQpe2xldCByLG49ZS5pbmRleE9mKCI/Iik7aWYoLTEhPT1uKXI9bjtlbHNle2xldCB0PWUuaW5kZXhPZigiIyIpO3I9LTEhPT10P3Q6ZS5sZW5ndGh9cmV0dXJuIHI+PXQubGVuZ3RoJiZlLnN0YXJ0c1dpdGgodCxyLXQubGVuZ3RoKX12LmI9cix2Llg9bix2Lmg9QTtmdW5jdGlvbiBNKGUpe3JldHVybiBFKGUsIi5jc3MiKX1sZXQgUz17fTt1LmM9UztsZXQgSz0oZSx0KT0+e2xldCByPVNbZV07aWYocil7aWYoci5lcnJvcil0aHJvdyByLmVycm9yO3JldHVybiByfXJldHVybiBOKGUsby5QYXJlbnQsdC5pZCl9O2Z1bmN0aW9uIE4oZSx0LHIpe2xldCBuPVIuZ2V0KGUpO2lmKCJmdW5jdGlvbiIhPXR5cGVvZiBuKXRocm93IEVycm9yKGZ1bmN0aW9uKGUsdCxyKXtsZXQgbjtzd2l0Y2godCl7Y2FzZSAwOm49YGFzIGEgcnVudGltZSBlbnRyeSBvZiBjaHVuayAke3J9YDticmVhaztjYXNlIDE6bj1gYmVjYXVzZSBpdCB3YXMgcmVxdWlyZWQgZnJvbSBtb2R1bGUgJHtyfWA7YnJlYWs7Y2FzZSAyOm49ImJlY2F1c2Ugb2YgYW4gSE1SIHVwZGF0ZSI7YnJlYWs7ZGVmYXVsdDprKHQsZT0+YFVua25vd24gc291cmNlIHR5cGU6ICR7ZX1gKX1yZXR1cm5gTW9kdWxlICR7ZX0gd2FzIGluc3RhbnRpYXRlZCAke259LCBidXQgdGhlIG1vZHVsZSBmYWN0b3J5IGlzIG5vdCBhdmFpbGFibGUuYH0oZSx0LHIpKTtsZXQgbz1wKGUpLGw9by5leHBvcnRzO1NbZV09bztsZXQgdT1uZXcgaShvLGwpO3RyeXtuKHUsbyxsKX1jYXRjaChlKXt0aHJvdyBvLmVycm9yPWUsZX1yZXR1cm4gby5uYW1lc3BhY2VPYmplY3QmJm8uZXhwb3J0cyE9PW8ubmFtZXNwYWNlT2JqZWN0JiZnKG8uZXhwb3J0cyxvLm5hbWVzcGFjZU9iamVjdCksb31mdW5jdGlvbiBMKHQpe2xldCByO2lmKCFBcnJheS5pc0FycmF5KHQpKXJldHVybiBlLnJlZ2lzdGVyQ2h1bmsodm9pZCAwLHQpO2xldCBuPWZ1bmN0aW9uKGUpe2lmKCJzdHJpbmciPT10eXBlb2YgZSlyZXR1cm4gZTtpZihlKXJldHVybntzcmM6ZS5nZXRBdHRyaWJ1dGUoInNyYyIpfTtpZigidSI+dHlwZW9mIFRVUkJPUEFDS19ORVhUX0NIVU5LX1VSTFMpcmV0dXJue3NyYzpUVVJCT1BBQ0tfTkVYVF9DSFVOS19VUkxTLnBvcCgpfTt0aHJvdyBFcnJvcigiY2h1bmsgcGF0aCBlbXB0eSBidXQgbm90IGluIGEgd29ya2VyIil9KHRbMF0pO3JldHVybiAyPT09dC5sZW5ndGg/cj10WzFdOihyPXZvaWQgMCwhZnVuY3Rpb24oZSx0KXtsZXQgcj0xO2Zvcig7cjxlLmxlbmd0aDspe2xldCBuLG89cisxO2Zvcig7bzxlLmxlbmd0aCYmImZ1bmN0aW9uIiE9dHlwZW9mIGVbb107KW8rKztpZihvPT09ZS5sZW5ndGgpdGhyb3cgRXJyb3IoIm1hbGZvcm1lZCBjaHVuayBmb3JtYXQsIGV4cGVjdGVkIGEgZmFjdG9yeSBmdW5jdGlvbiIpO2xldCBsPWVbb107Zm9yKGxldCBsPXI7bDxvO2wrKyl7bGV0IHI9ZVtsXSxvPXQuZ2V0KHIpO2lmKG8pe249bzticmVha319bGV0IGk9bj8/bCx1PSExO2ZvcihsZXQgbj1yO248bztuKyspe2xldCByPWVbbl07dC5oYXMocil8fCh1fHwoaT09PWwmJk9iamVjdC5kZWZpbmVQcm9wZXJ0eShsLCJuYW1lIix7dmFsdWU6Im1vZHVsZSBldmFsdWF0aW9uIn0pLHU9ITApLHQuc2V0KHIsaSkpfXI9bysxfX0odCxSKSksZS5yZWdpc3RlckNodW5rKG4scil9bGV0IEI9bmV3IE1hcDtmdW5jdGlvbiBJKGUpe2xldCB0PUIuZ2V0KGUpO2lmKCF0KXtsZXQgcixuO3Q9e3Jlc29sdmVkOiExLGxvYWRpbmdTdGFydGVkOiExLHJldHJ5QXR0ZW1wdHM6MCxwcm9taXNlOm5ldyBQcm9taXNlKChlLHQpPT57cj1lLG49dH0pLHJlc29sdmU6KCk9Pnt0LnJlc29sdmVkPSEwLHIoKX0scmVqZWN0Om59LEIuc2V0KGUsdCl9cmV0dXJuIHR9ZnVuY3Rpb24gcShlLHQscixuLG8peyEobnVsbD09bnx8biBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiYmIk5ldHdvcmtFcnJvciI9PT1uLm5hbWUpfHxyLnJldHJ5QXR0ZW1wdHM+PTF8fEIuZ2V0KHQpIT09cj8oQi5nZXQodCk9PT1yJiZCLmRlbGV0ZSh0KSxyLnJlamVjdChuKSk6KHIucmV0cnlBdHRlbXB0cysrLHNldFRpbWVvdXQoKCk9PntyLnJlc29sdmVkfHxCLmdldCh0KSE9PXJ8fChvP28oKTooci5sb2FkaW5nU3RhcnRlZD0hMSxGKGUsdCkpKX0sMjAwK01hdGguZmxvb3IoNDAxKk1hdGgucmFuZG9tKCkpKSl9ZnVuY3Rpb24gRihlLHQpe2xldCByPUkodCk7aWYoci5sb2FkaW5nU3RhcnRlZClyZXR1cm4gci5wcm9taXNlO2lmKGU9PT1vLlJ1bnRpbWUpcmV0dXJuIHIubG9hZGluZ1N0YXJ0ZWQ9ITAsTSh0KSYmci5yZXNvbHZlKCksci5wcm9taXNlO2lmKCJmdW5jdGlvbiI9PXR5cGVvZiBpbXBvcnRTY3JpcHRzKWlmKE0odCkpO2Vsc2UgaWYoRSh0LCIuanMiKSl7c2VsZi5UVVJCT1BBQ0tfTkVYVF9DSFVOS19VUkxTLnB1c2godCk7dHJ5e2ltcG9ydFNjcmlwdHModCl9Y2F0Y2gobil7cShlLHQscixuKX19ZWxzZSB0aHJvdyBFcnJvcihgY2FuJ3QgaW5mZXIgdHlwZSBvZiBjaHVuayBmcm9tIFVSTCAke3R9IGluIHdvcmtlcmApO2Vsc2V7bGV0IG49ZGVjb2RlVVJJKHQpO2lmKE0odCkpaWYoZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgbGlua1tyZWw9c3R5bGVzaGVldF1baHJlZj0iJHt0fSJdLGxpbmtbcmVsPXN0eWxlc2hlZXRdW2hyZWZePSIke3R9PyJdLGxpbmtbcmVsPXN0eWxlc2hlZXRdW2hyZWY9IiR7bn0iXSxsaW5rW3JlbD1zdHlsZXNoZWV0XVtocmVmXj0iJHtufT8iXWApLmxlbmd0aD4wKXIucmVzb2x2ZSgpO2Vsc2V7bGV0IG49KCk9PntsZXQgbz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCJsaW5rIik7cmV0dXJuIG8ucmVsPSJzdHlsZXNoZWV0IixvLmNyb3NzT3JpZ2luPW51bGwsby5ocmVmPXQsby5vbmVycm9yPSgpPT57bGV0IGw9ZG9jdW1lbnQuY3JlYXRlQ29tbWVudCgiIik7by5yZXBsYWNlV2l0aChsKSxxKGUsdCxyLHZvaWQgMCwoKT0+bC5yZXBsYWNlV2l0aChuKCkpKX0sby5vbmxvYWQ9KCk9PntyLnJlc29sdmUoKX0sb307ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChuKCkpfWVsc2UgaWYoRSh0LCIuanMiKSl7bGV0IG89ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChgc2NyaXB0W3NyYz0iJHt0fSJdLHNjcmlwdFtzcmNePSIke3R9PyJdLHNjcmlwdFtzcmM9IiR7bn0iXSxzY3JpcHRbc3JjXj0iJHtufT8iXWApO2lmKG8ubGVuZ3RoPjApZm9yKGxldCBuIG9mIEFycmF5LmZyb20obykpbi5hZGRFdmVudExpc3RlbmVyKCJlcnJvciIsKCk9PntuLnJlbW92ZSgpLHEoZSx0LHIpfSx7b25jZTohMH0pO2Vsc2V7bGV0IG49ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgic2NyaXB0Iik7bi5jcm9zc09yaWdpbj1udWxsLG4uc3JjPXQsbi5vbmVycm9yPSgpPT57bi5yZW1vdmUoKSxxKGUsdCxyKX0sZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChuKX19ZWxzZSB0aHJvdyBFcnJvcihgY2FuJ3QgaW5mZXIgdHlwZSBvZiBjaHVuayBmcm9tIFVSTCAke3R9YCl9cmV0dXJuIHIubG9hZGluZ1N0YXJ0ZWQ9ITAsci5wcm9taXNlfWU9e2FzeW5jIHJlZ2lzdGVyQ2h1bmsoZSx0KXtsZXQgbjtpZihudWxsIT1lJiYobj1mdW5jdGlvbihlKXtpZigic3RyaW5nIj09dHlwZW9mIGUpcmV0dXJuIGU7bGV0IHQ9ZGVjb2RlVVJJQ29tcG9uZW50KGUuc3JjLnJlcGxhY2UoL1s/I10uKiQvLCIiKSk7cmV0dXJuIHQuc3RhcnRzV2l0aChyKT90LnNsaWNlKHIubGVuZ3RoKTp0fShlKSxJKCJzdHJpbmciPT10eXBlb2YgZT9BKGUpOmUuc3JjKS5yZXNvbHZlKCkpLG51bGwhPXQpe2ZvcihsZXQgZSBvZiB0Lm90aGVyQ2h1bmtzKUkoQSgic3RyaW5nIj09dHlwZW9mIGU/ZTplLnBhdGgpKTtpZihhd2FpdCBQcm9taXNlLmFsbCh0Lm90aGVyQ2h1bmtzLm1hcChlPT57dmFyIHQ7cmV0dXJuIHQ9bixQKG8uUnVudGltZSx0LGUpfSkpLHQucnVudGltZU1vZHVsZUlkcy5sZW5ndGg+MClmb3IobGV0IGUgb2YgdC5ydW50aW1lTW9kdWxlSWRzKSFmdW5jdGlvbihlLHQpe2xldCByPVNbdF07aWYocil7aWYoci5lcnJvcil0aHJvdyByLmVycm9yO3JldHVybn1OKHQsby5SdW50aW1lLGUpfShuLGUpfX0sbG9hZENodW5rQ2FjaGVkOihlLHQpPT5GKGUsdCl9O3ZhciBEPWdsb2JhbFRoaXMuVFVSQk9QQUNLO2dsb2JhbFRoaXMuVFVSQk9QQUNLPXtwdXNoOkx9LEQuZm9yRWFjaChMKX0=",
+  "base64",
+).toString("utf8");
+
+function runtimeChunk({
+  other = ["static/chunks/entry.js"],
+  ids = [7],
+  body = REVIEWED_RUNTIME_BODY,
+  script = '"object"==typeof document?document.currentScript:void 0',
+  target = "globalThis.TURBOPACK||(globalThis.TURBOPACK=[])",
+  params,
+} = {}) {
+  const payload = params ?? `{otherChunks:${JSON.stringify(other)},runtimeModuleIds:${JSON.stringify(ids)}}`;
+  return `(${target}).push([${script},${payload}]),(()=>${body})();`;
+}
+
+test("the reviewed runtime chunk is read for its startup manifest instead of being unknown", async (t) => {
+  const item = await fixture({ extraFiles: { "static/chunks/turbopack-runtime.js": runtimeChunk() } });
+  t.after(() => rm(item.root, { recursive: true, force: true }));
+  const result = await inspect(item);
+  assert.equal(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS"), false,
+    JSON.stringify(result.diagnostics.filter((entry) => /RUNTIME/.test(entry.code))));
+  assert.ok(result.graph.nodes.some((node) => node.kind === "reviewed-runtime"
+    && node.subject === "static/chunks/turbopack-runtime.js"));
+  // otherChunks are startup chunks the HTML carries; the runtime waits for them rather than fetching them.
+  assert.ok(result.graph.edges.some((edge) => edge.condition === "RUNTIME_INITIAL_CHUNK"
+    && edge.from === "static/chunks/turbopack-runtime.js" && edge.to === "static/chunks/entry.js"));
+  // runtimeModuleIds are executed at startup, which is stronger than being present.
+  assert.ok(result.graph.edges.some((edge) => edge.condition === "RUNTIME_ENTRY_MODULE" && edge.to === "module:7"));
+  assert.equal(result.releaseDecision, "BLOCKED");
 });
+
+test("a runtime chunk is admitted only in the exact reviewed shape", async () => {
+  const variants = {
+    editedBody: runtimeChunk({ body: `{ ${REVIEWED_RUNTIME_BODY.slice(1)}` }),
+    truncatedBody: runtimeChunk({ body: `${REVIEWED_RUNTIME_BODY.slice(0, -1)} }` }),
+    foreignBody: runtimeChunk({ body: "{}" }),
+    extraStatement: `${runtimeChunk()}void 0;`,
+    registrationOnly: runtimeChunk().replace(/,\(\(\)=>.*$/s, ";"),
+    otherGlobal: runtimeChunk({ target: "globalThis.OTHER||(globalThis.OTHER=[])" }),
+    presetArray: runtimeChunk({ target: "globalThis.TURBOPACK||(globalThis.TURBOPACK=[0])" }),
+    scriptFromWindow: runtimeChunk({ script: "window.currentScript" }),
+    scriptLiteral: runtimeChunk({ script: '"static/chunks/turbopack-runtime.js"' }),
+    extraParameter: runtimeChunk({ params: '{otherChunks:[],runtimeModuleIds:[],trusted:!0}' }),
+    missingParameter: runtimeChunk({ params: '{otherChunks:[]}' }),
+    duplicateParameter: runtimeChunk({ params: '{otherChunks:[],otherChunks:[]}' }),
+    computedParameter: runtimeChunk({ params: '{["otherChunks"]:[],runtimeModuleIds:[]}' }),
+    spreadParameter: runtimeChunk({ params: '{...{otherChunks:[],runtimeModuleIds:[]}}' }),
+    chunkExpression: runtimeChunk({ params: '{otherChunks:[name],runtimeModuleIds:[]}' }),
+    chunkNotString: runtimeChunk({ params: '{otherChunks:[7],runtimeModuleIds:[]}' }),
+    moduleIdNotInteger: runtimeChunk({ params: '{otherChunks:[],runtimeModuleIds:[7.5]}' }),
+    moduleIdNegative: runtimeChunk({ params: '{otherChunks:[],runtimeModuleIds:[-7]}' }),
+    moduleIdString: runtimeChunk({ params: '{otherChunks:[],runtimeModuleIds:["7"]}' }),
+    loaderWithArgument: runtimeChunk().replace("})();", "})(0);"),
+    loaderWithParameter: runtimeChunk().replace(",(()=>", ",((unused)=>"),
+    asyncLoader: runtimeChunk().replace(",(()=>", ",(async()=>"),
+  };
+  for (const [name, chunk] of Object.entries(variants)) {
+    const item = await fixture({ extraFiles: { "static/chunks/turbopack-runtime.js": chunk } });
+    try {
+      const result = await inspect(item);
+      assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS"), name);
+      assert.equal(result.staticStatus, STATIC_UNKNOWN, name);
+      assert.equal(result.graph.nodes.some((node) => node.kind === "reviewed-runtime"), false, name);
+    } finally {
+      await rm(item.root, { recursive: true, force: true });
+    }
+  }
+});
+
+test("startup chunks named by the runtime are held to the same path and destination rules", async (t) => {
+  const escaping = await fixture({
+    extraFiles: {
+      "static/chunks/turbopack-runtime.js": runtimeChunk({ other: ["static/chunks/../../etc/passwd.js"] }),
+    },
+  });
+  t.after(() => rm(escaping.root, { recursive: true, force: true }));
+  const escaped = await inspect(escaping);
+  assert.ok(escaped.diagnostics.some((entry) => entry.code === "CHUNK_PATH_ESCAPE" && entry.severity === "VIOLATION"));
+
+  const external = await fixture({
+    extraFiles: { "static/chunks/turbopack-runtime.js": runtimeChunk({ other: ["https://evil.example/chunk.js"] }) },
+  });
+  t.after(() => rm(external.root, { recursive: true, force: true }));
+  const remote = await inspect(external);
+  assert.ok(remote.diagnostics.some((entry) => entry.code === "EXTERNAL_EXECUTABLE_REFERENCE"
+    && entry.severity === "VIOLATION"));
+
+  const missing = await fixture({
+    extraFiles: { "static/chunks/turbopack-runtime.js": runtimeChunk({ other: ["static/chunks/absent.js"] }) },
+  });
+  t.after(() => rm(missing.root, { recursive: true, force: true }));
+  const absent = await inspect(missing);
+  assert.ok(absent.diagnostics.some((entry) => entry.code === "MISSING_GRAPH_DESTINATION"));
+
+  // A module the runtime says it will execute must be registered in one of the chunks the page starts with.
+  const unregistered = await fixture({
+    extraFiles: { "static/chunks/turbopack-runtime.js": runtimeChunk({ ids: [4242] }) },
+  });
+  t.after(() => rm(unregistered.root, { recursive: true, force: true }));
+  const unresolved = await inspect(unregistered);
+  // The adapter reports this one against the inspection rather than the module: fixedDiagnostic keeps only path,
+  // route: and inline: subjects, so a module id collapses. That is pre-existing and shared with the Flight path.
+  assert.ok(unresolved.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"));
+  assert.equal(unresolved.staticStatus, STATIC_UNKNOWN);
+});
+
+
+
+test("every construct that can fetch bytes is read, resolved and recorded", async (t) => {
+  const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,`;
+  const lazy = { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") };
+  const loads = [
+    ["l", `t=>{t.l("static/chunks/lazy.js")}`, "CONTEXT_CHUNK"],
+    ["L", `t=>{t.L("static/chunks/lazy.js")}`, "CONTEXT_CHUNK_URL"],
+    ["b", `t=>{t.b("static/chunks/lazy.js")}`, "CONTEXT_WORKER"],
+    ["w", `t=>{t.w("static/chunks/lazy.js")}`, "CONTEXT_WEBASSEMBLY"],
+    ["u", `t=>{t.u("static/chunks/lazy.js")}`, "CONTEXT_WEBASSEMBLY_MODULE"],
+    ["import()", `t=>{import("static/chunks/lazy.js")}`, "CONTEXT_DYNAMIC_IMPORT"],
+  ];
+  for (const [name, factory, condition] of loads) {
+    const item = await fixture({ chunk: `${head}${factory}]);`, extraFiles: lazy });
+    t.after(() => rm(item.root, { recursive: true, force: true }));
+    const result = await inspect(item);
+    assert.ok(result.graph.edges.some((edge) => edge.kind === "explicit-chunk-load"
+      && edge.to === "static/chunks/lazy.js" && edge.condition === condition), name);
+    assert.equal(result.diagnostics.some((entry) => entry.code === "UNRESOLVED_CHUNK_LOAD"), false, name);
+    // The path a recognised load consumes must not also be reported as a stray chunk reference.
+    assert.equal(result.diagnostics.some((entry) => entry.code === "UNREVIEWED_CHUNK_REFERENCE"), false, name);
+  }
+
+  // A load the adapter cannot resolve statically, and a load that points outside the artifact, both stay unknown.
+  for (const [name, factory, code] of [
+    ["variable target", `t=>{t.l(globalThis.x)}`, "UNRESOLVED_CHUNK_LOAD"],
+    ["no target", `t=>{t.l()}`, "UNRESOLVED_CHUNK_LOAD"],
+    ["variable import", `t=>{import(globalThis.x)}`, "UNRESOLVED_CHUNK_LOAD"],
+    ["module by variable", `t=>{t.r(globalThis.x)}`, "UNRESOLVED_MODULE_REFERENCE"],
+  ]) {
+    const item = await fixture({ chunk: `${head}${factory}]);`, extraFiles: lazy });
+    t.after(() => rm(item.root, { recursive: true, force: true }));
+    const result = await inspect(item);
+    assert.ok(result.diagnostics.some((entry) => entry.code === code), name);
+    assert.equal(result.staticStatus, STATIC_UNKNOWN, name);
+  }
+
+  // A load that resolves to a chunk this artifact does not carry is a violation of the graph, not a soft unknown.
+  const dangling = await fixture({ chunk: `${head}t=>{t.l("static/chunks/absent.js")}]);` });
+  t.after(() => rm(dangling.root, { recursive: true, force: true }));
+  const missing = await inspect(dangling);
+  assert.ok(missing.diagnostics.some((entry) => entry.code === "MISSING_GRAPH_DESTINATION"));
+
+  // Escaping the chunk directory stays a violation wherever it is written.
+  const escaping = await fixture({ chunk: `${head}t=>{t.l("static/chunks/../../secret.js")}]);` });
+  t.after(() => rm(escaping.root, { recursive: true, force: true }));
+  const escaped = await inspect(escaping);
+  assert.ok(escaped.diagnostics.some((entry) => entry.code === "CHUNK_PATH_ESCAPE" && entry.severity === "VIOLATION"));
+
+  const external = await fixture({ chunk: `${head}t=>{t.l("https://evil.example/x.js")}]);` });
+  t.after(() => rm(external.root, { recursive: true, force: true }));
+  const remote = await inspect(external);
+  assert.ok(remote.diagnostics.some((entry) => entry.code === "EXTERNAL_EXECUTABLE_REFERENCE"
+    && entry.severity === "VIOLATION"));
+});
+
+test("a module reached through the context must exist, wherever it is registered", async (t) => {
+  const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,`;
+  for (const method of ["r", "i", "A", "f"]) {
+    const absent = await fixture({ chunk: `${head}t=>{t.${method}(9)}]);` });
+    t.after(() => rm(absent.root, { recursive: true, force: true }));
+    const missing = await inspect(absent);
+    assert.ok(missing.diagnostics.some((entry) => entry.code === "UNRESOLVED_MODULE_DESTINATION"), method);
+    assert.equal(missing.staticStatus, STATIC_UNKNOWN, method);
+
+    // Registered in another chunk is enough: which chunk carries it is a loading question, not a registration one.
+    const elsewhere = await fixture({
+      chunk: `${head}t=>{t.${method}(9)}]);`,
+      extraFiles: { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") },
+    });
+    t.after(() => rm(elsewhere.root, { recursive: true, force: true }));
+    const resolved = await inspect(elsewhere);
+    assert.equal(resolved.staticStatus, STATIC_SUPPORTED, `${method}: ${JSON.stringify(resolved.diagnostics)}`);
+    assert.ok(resolved.graph.edges.some((edge) => edge.to === "module:9"
+      && edge.condition === "ON_MODULE_INSTANTIATION"), method);
+  }
+});
+
+
+test("a factory that does not take its context in the reviewed way is unknown", async (t) => {
+  const head = `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,7,`;
+  // A factory with no parameter can still reach its context through `arguments`, which this adapter cannot follow,
+  // so the shape itself has to be refused rather than read as a module that touches nothing.
+  for (const [name, factory] of [
+    ["no parameters", `function(){arguments[0].l("static/chunks/lazy.js")}`],
+    ["four parameters", `(t,e,o,x)=>{t.v(0)}`],
+    ["destructured context", `({l})=>{l("static/chunks/lazy.js")}`],
+    ["rest parameter", `(...t)=>{t[0].v(0)}`],
+  ]) {
+    const item = await fixture({ chunk: `${head}${factory}]);`,
+      extraFiles: { "static/chunks/lazy.js": supportedChunk.replace(",7,t", ",9,t") } });
+    t.after(() => rm(item.root, { recursive: true, force: true }));
+    const result = await inspect(item);
+    assert.ok(result.diagnostics.some((entry) => entry.code === "UNSUPPORTED_FACTORY_SIGNATURE"), name);
+    assert.equal(result.staticStatus, STATIC_UNKNOWN, name);
+  }
+});
```
