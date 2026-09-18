# NQR-129 Stage A iteration 5 — runtime model ของ Turbopack (ปิด `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS`)

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (ผู้เขียน) | implementation Stage A iteration-5

**Outcome: DONE / AUTHOR-VERIFIED — รอ TL และ SECURITY review ยังไม่ integrate และ release ยัง BLOCKED**

## 1. ปัญหาที่ปิด

adapter เคยจัด chunk `static/chunks/turbopack-*.js` ทุกตัวเป็น UNKNOWN เสมอ ทำให้ artifact จริงไม่มีทางถึง STATIC_SUPPORTED ไม่ว่าจะทำอะไรก็ตาม ([รายละเอียด runtime model](PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md))

## 2. วิธีที่เลือก

runtime chunk คือ "หนึ่งการลงทะเบียน + IIFE ที่ห่อ module loader ทั้งก้อน" โค้ดใน IIFE เป็นของ bundler ไม่ใช่ของแอป การอ่านทีละ statement แล้วอ้างว่าเข้าใจความหมายจึงเป็นการอ้างเกินจริง iteration นี้จึงแยกสองส่วน

1. **ส่วนลงทะเบียน** parse ด้วย AST แบบเข้มงวด: ต้องเป็น `(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push([<currentScript ที่รูปตรงเป๊ะ>,{otherChunks:[…string],runtimeModuleIds:[…integer≥0]}])` เท่านั้น ห้ามมี property เกิน ห้าม computed key ห้าม spread ห้ามค่าที่ไม่ใช่ literal
2. **ส่วน loader** ไม่อ่านความหมาย แต่ตรึงด้วย SHA-256 ของ bytes ของ body: `ca691e834197bcf5bfa5f0a4d4ad8e38e7e9902200683c5196b13491e0a1fe8d` (9,356 ไบต์ จาก build จริงของแอปนี้บน Next 16.3.1)

ถ้าอย่างใดอย่างหนึ่งไม่ตรง → `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` เหมือนเดิม การอัปเกรด Next จะทำให้ digest เปลี่ยนและกลับไป UNKNOWN ทันที ซึ่งตั้งใจให้เป็นแบบนั้น

## 3. ความหมายที่บันทึกลงกราฟ

- `otherChunks` = chunk ที่หน้าเริ่มต้นด้วย runtime **ไม่ได้ดาวน์โหลดเอง** (source type Runtime ไม่ inject script) แต่ถือว่า HTML ฝั่งเซิร์ฟเวอร์ใส่มาให้แล้ว บันทึกเป็น edge `RUNTIME_INITIAL_CHUNK`
- `runtimeModuleIds` = โมดูลที่ถูก instantiate ทันทีตอน startup บันทึกเป็น edge `RUNTIME_ENTRY_MODULE` และเป็น requirement ที่ต้องหาแหล่งลงทะเบียนเจอในชุด chunk เริ่มต้น มิฉะนั้น `UNRESOLVED_MODULE_DESTINATION`
- path ใน `otherChunks` ผ่าน `normalizeChunkReference` ตัวเดิม จึงถูกกฎ path escape และ external reference เหมือนทางอื่นทุกประการ

## 4. Identity (frozen 0444)

| ไฟล์ (`project/scripts/`) | SHA-256 |
| --- | --- |
| inspect-turbopack-emission.mjs | `f00afbe67df78c6046f1312831b76f6c0245e5ea4f733073194614a8e24cff9e` |
| inspect-turbopack-emission.test.mjs | `8572c91f91505f439cfc59c7c0b47f6e7938983af961bcc1c4e4dc95fbc4bc7c` |
| verify-initial-bundle-boundary.mjs | ไม่เปลี่ยนจาก SOURCE |
| verify-initial-bundle-boundary.test.mjs | ไม่เปลี่ยนจาก SOURCE |
| build.mjs | ไม่เปลี่ยนจาก SOURCE |

- Canonical5: **`add3eb52e5be93ee18d1db59d04b9b9b8f277fb84327ad97ce573de937845ce9`**
- Diff จาก SOURCE อยู่ในภาคผนวก SHA-256 `ee47e30d83f81a28036183f7be1ac4e3dc28c0409fb51df8ad3bf91ffbbf749a` (277 บรรทัด)
- **หมายเหตุสำคัญ:** การแก้ adapter ทำให้ `gateRevision.adapterSha256` เปลี่ยน record ที่ผูกกับ revision เดิมใช้ไม่ได้ (ตอนนี้ยังไม่มี record ใด admit จึงไม่กระทบ)

## 5. เทสต์และ mutation

- เทสต์ใหม่สามชุด ใช้ **bytes จริง** ของ runtime body (ฝังแบบ base64 ในไฟล์เทสต์ เพราะโค้ด minified มี backtick และ `${`) จึงทดสอบเส้นทางการรับจริง ไม่ใช่ของปลอม
  1. รับ runtime ที่ review แล้ว และบันทึก startup chunk กับ entry module ลงกราฟถูกต้อง
  2. ปฏิเสธ 21 รูปแบบที่เพี้ยนจากของจริง (body ถูกแก้ทีละอักขระ, body อื่น, มี statement เกิน, ไม่มี loader, receiver อื่น, array เริ่มต้นไม่ว่าง, currentScript รูปอื่น, property เกิน/ขาด/ซ้ำ/computed/spread, chunk ที่ไม่ใช่ string, module id ที่เป็นทศนิยม/ติดลบ/string, loader ที่มี argument/parameter/async)
  3. path ของ startup chunk ถูกกฎเดียวกับทางอื่น: escape เป็น VIOLATION, URL ภายนอกเป็น VIOLATION, chunk ที่ไม่มีอยู่จริงเป็น MISSING_GRAPH_DESTINATION และ entry module ที่ไม่มีใครลงทะเบียนเป็น UNRESOLVED_MODULE_DESTINATION
- ผล: `npm run test:scripts` ในพื้นที่ candidate **302/302** eslint ไม่มี error/warning
- **Mutation 14 ตัว จับได้ 13** ตัวที่รอดคือการตัดการตรวจ key ซ้ำ ซึ่งพิสูจน์แล้วว่าเข้าไม่ถึง (payload ต้องมีสองคีย์พอดี ถ้าซ้ำกันคีย์ที่จำเป็นจะหายไปหนึ่งตัวและถูกปฏิเสธที่ขั้นถัดไปอยู่แล้ว) จึง **ลบ guard นั้นออกพร้อมคอมเมนต์** แล้วยิงชุดใหม่ 13 ตัว **จับได้ทั้งหมด ไม่มีตัวรอด**

## 6. ผลกับ artifact จริง และสิ่งที่ยังไม่ปิด

รัน adapter ตัวนี้กับ artifact จริง: `UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS` เหลือ **0** แต่ยังมี UNKNOWN อีกกว่าพันรายการจากไวยากรณ์อื่นที่ยังไม่รองรับ (Flight wire 478, factory effect 383, factory signature 118, flight import 22, context operation 16, export value 6) ดู [PM_PHASE2A_ADAPTER_GRAMMAR_GAP.md](PM_PHASE2A_ADAPTER_GRAMMAR_GAP.md) ซึ่งเป็นการตัดสินใจเชิงทิศทางที่ต้องให้ Product Owner ชี้ก่อน

ข้อสังเกตที่ฝากผู้ตรวจ: `fixedDiagnostic` เก็บ subject เฉพาะที่เป็น path, `route:` หรือ `inline:` ดังนั้น `module:<id>` จะถูกยุบเป็น `inspection` ทำให้ไม่รู้ว่าโมดูลไหนหาไม่เจอ พฤติกรรมนี้มีมาก่อนและใช้ร่วมกับเส้นทาง Flight จึงไม่แก้ใน iteration นี้

## 7. ภาคผนวก — diff จาก SOURCE (`patch -p1` บนสำเนา SOURCE)

```diff
--- a/scripts/inspect-turbopack-emission.mjs
+++ b/scripts/inspect-turbopack-emission.mjs
@@ -398,8 +398,121 @@
     return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
   } catch {
     addDiagnostic(state, "INVALID_UTF8", "UNKNOWN", subject);
+    return null;
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
     return null;
   }
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
+  }
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
@@ -1023,8 +1136,27 @@
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
--- a/scripts/inspect-turbopack-emission.test.mjs
+++ b/scripts/inspect-turbopack-emission.test.mjs
@@ -768,4 +768,120 @@
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
+});
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
 });
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
```
