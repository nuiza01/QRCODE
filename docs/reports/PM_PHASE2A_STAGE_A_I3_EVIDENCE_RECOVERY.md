# PM — กู้หลักฐาน Stage A iteration-3 หลัง handoff

วันที่ 2026-09-16 (Asia/Bangkok) | Claude (รับช่วง PM ตาม [CLAUDE_HANDOFF.md](../CLAUDE_HANDOFF.md)) | งานอ่าน/กู้/ทดสอบในพื้นที่แยกเท่านั้น

**ผล: กู้ exact bytes ของ i3 candidate, SOURCE185 manifest, integration backup และ reviewer fixture ของ i2 ได้ ทุกไฟล์ตรง SHA-256 ที่ pin ไว้ สภาพ SOURCE ปัจจุบันตรง SOURCE185 ครบ 185 path และเทสต์ i3 รันใหม่วันนี้ผ่าน 35/35. ยังไม่มี independent TL/SECURITY review ของ i3 และกู้ build artifact สำหรับวินิจฉัยไม่ได้ Release ยัง BLOCKED**

ไม่ได้แก้ SOURCE application/package/schema, ไม่ได้ install/build/typegen, ไม่มี server/browser/network/DB, ไม่ deploy, ไม่ commit/push, ไม่สร้าง task/agent/automation และไม่ส่ง callback ที่เคยถูกปฏิเสธซ้ำ

## 1. ตรวจซ้ำวันนี้ (fresh)

| รายการ | ผล |
| --- | --- |
| รายงาน 4 ฉบับใน `docs/handoff-evidence/2026-09-16/` | SHA ตรงตาราง §5 ของ handoff ทุกฉบับ |
| `package.json` / `package-lock.json` / `AGENTS.md` | ตรง `237ae720…b9b0` / `16328953…2f1a` / `63f2c503…e3bb` |
| `/private/tmp/nqr*` ทุก path ใน handoff §6 | ไม่พบจริง ไม่ทราบสาเหตุ |
| `git status` | ยังล้มเหลว exit69 (Xcode license); `python3` ก็ใช้ไม่ได้ด้วยเหตุเดียวกัน |
| SOURCE `scripts/build.mjs` / verifier / verifier test | ตรง `584dce0c…1ecf` / `a48002f4…3650` / `c7c26601…e240` ตามรายงาน i3 §6 |

## 2. วิธีกู้

แหล่งข้อมูลคือ Codex rollout logs ในเครื่อง (`~/.codex/sessions`) ของ role tasks เดิม อ่านอย่างเดียว ไม่แก้ log

- **i1/i2/i3 adapter+test:** เล่น `apply_patch` ทุกครั้งที่แตะสองไฟล์นี้จาก DEVOPS log `rollout-2026-08-28T16-26-52-01a047b1-87c6-7b01-b738-4b85197d8913.jsonl` (SHA-256 ณ เวลาอ่าน `25c65995374c5a2698ac6be67779833bb5dd66a12a5a055af04ad7639409da39`) ตามลำดับเวลา พร้อมจำลองการ copy i1→i2 (บรรทัด 4118) และ i2 frozen→i3 (หลังบรรทัด 4698). Patch ที่เครื่องมือเดิมรายงานว่า failed (บรรทัด 3842) ก็ล้มเหลวในการเล่นซ้ำเช่นกัน สคริปต์อยู่ในภาคผนวก
- **SOURCE185 manifest และ BACKUP:** ดึง content จาก event `FileChange` ของ PM log `rollout-2026-08-28T16-14-42-01a047a6-65b5-7cd3-8897-67dd87dbaa07.jsonl` บรรทัด 24333 และ 24280
- **Reviewer fixtures i2:** ดึง content จาก `FileChange` (type add) ใน TL log `…01a047af-0fbd-7432-9bec-53f4022e57ec.jsonl` และ SECURITY log `…01a047b1-d455-7293-96d6-d774d955a334.jsonl`

ความน่าเชื่อถือมาจากการที่ผลลัพธ์ตรง hash ซึ่งบันทึกไว้แยกกันในขณะนั้น (shasum output ใน log และในรายงานที่ hash ตรง) ไม่ได้มาจากการเชื่อ log อย่างเดียว

## 3. ผลการเทียบ identity

| สิ่งที่กู้ | ผลวันนี้ | Pin เดิม |
| --- | --- | --- |
| i1 adapter / test | `18b87204…5296` / `2ccc0337…618f` | ตรง shasum ตอน freeze i1 (log 4032) |
| i2 adapter / test | `645cc72b…ca61` / `191f65f9…2a0b` | ตรง |
| **i3 adapter / test** | `63fc9453…c51c` / `6103a6f4…2454`; 52,061 B/1,124 บรรทัด และ 34,341 B/639 บรรทัด | ตรง |
| i3 canonical2 `{sha256,path}` | `da69c4667784b1f73895b00665791ea1b6c915235e886ff6dd3d8a6be36c559e` | ตรง |
| i2→i3 delta `{after,before,path}` | `d695959fdba2a6713448795ef48297c69f709cd7e77ac811ae504637a3ef305e` | ตรง |
| POST185 manifest (serialized) | `ee1b04c22c0b46a95e3f2e6a00fdb6a586127d7868cb56d8f1f199bb322adc40` | ตรง; มี 185 แถว canonical `3b0c6a72…00df` |
| Integration BACKUP | `a6ed5abf1b987ef2e7305976cc5ee4a07070c7a5a2035388e4cdbd0c12d27139` | ตรง |
| TL i2 fixtures `guard.py` / `probe.mjs` / `boundaries.mjs` | `c03bff1a…7197` / `91ff6ecf…b540` / `59880b65…0e44` | อ้างในรายงาน TL i2 |
| SECURITY i2 fixtures `guard.py` / `probes.mjs` / `boundaries.mjs` / `tests.json` / `guard-pre.json`=`guard-post.json` | `090a0092…f02f` / `b697fdc3…4aa3` / `efe59c47…38af` / `8f77e0c4…06a5` / `0ae5cede…7485` | อ้างในรายงาน SECURITY i2 |

**SOURCE ปัจจุบัน:** hash ไฟล์จริงใน `/Users/sarawutjuntasang/Nexora/QRCODE` ครบทั้ง 185 path ของ manifest ได้ canonical `3b0c6a72c34acdf89f4526ffecc0c3083f08befd1916c86f1f670cb2519b00df` ไม่มีไฟล์เปลี่ยนหรือหาย ข้อนี้ไม่ได้พิสูจน์ไฟล์นอก manifest และไม่ได้แทน git cleanliness

**Prep inputs:** Next package `dc243091…a7b9`, Acorn `758cead0…fa19` และ tree canonical ของ parse5 (33 files) `bdfc17d3…7409` กับ entities (58 files) `c94cc262…4459` คำนวณด้วยสคริปต์ `inventory.mjs` เดิมที่กู้จาก DEVOPS log (บรรทัด 2977) ตรงกับรายงาน i3 ทั้งหมด

## 4. รันซ้ำบน bytes ที่กู้ได้

ประกอบ root แยก 98 ไฟล์ (authored 2 ไฟล์ mode 0444 + base5 + parse5/entities 91 ไฟล์ แบบ physical copy ไม่มี symlink) ใน scratchpad ของ session นี้ ตั้ง `TMPDIR` ภายใน root นั้น, Node v24.14.1

- `node --check` adapter และ test: exit0 ทั้งคู่
- `node --test scripts/inspect-turbopack-emission.test.mjs`: exit0, **35 tests / 35 pass / 0 fail / 0 skipped / 0 todo**, 1459 ms; log SHA `af3e2588395c45c1d859bc19357174647314526532fe5133e62242363ca4d297`
- หลังรัน hash ของสอง authored files ยังเท่าเดิม

ผลนี้ยืนยันว่ารายงานของ worker ที่ว่าได้ 35/35 ทำซ้ำได้ แต่ **ไม่ใช่ independent review** และไม่ได้พิสูจน์ครบหกกลุ่มใน handoff §5

## 5. สิ่งที่ยังกู้หรือยืนยันไม่ได้

- **Diagnostic artifact** `/private/tmp/nqr125-build-i2-pUZsutO2/project/.next` (BUILD_ID `7OgVcQLdytdDmtYEw_V6N`, full610/scope342): เป็น build output ไม่มีใน log จึงกู้ไม่ได้ ทำให้รันผล real-artifact `STATIC_UNKNOWN` ซ้ำไม่ได้ และ reviewer probe ที่อ้าง path นี้ (TL/SEC probes อ้าง `nqr125-build-i2` 3 จุด) รันได้ไม่ครบ การ build ใหม่ยังไม่อยู่ในสิทธิ์
- **Reviewer guards** เป็น `guard.py` รันไม่ได้ตอนนี้เพราะ `python3` ติด Xcode license
- **Evidence directory ของ i3** (probe copies ที่ worker แก้, result JSON, green log เดิม) ยังไม่ได้กู้ ถ้า reviewer ต้องการ อาจเล่นซ้ำจาก DEVOPS log ได้ แต่ reviewer ควรใช้ fixture ของตัวเองมากกว่าของ worker
- **NQR124 cleanup:** `ps` วันนี้ไม่พบ process ที่เกี่ยวกับ NQR/MariaDB runtime (พบเพียง Homebrew `mysqld` ของเครื่องที่ datadir `/opt/homebrew/var/mysql` ซึ่งไม่ได้แตะ) ยังไม่ได้ตรวจ DB user/data/secret remnants เพราะต้องเข้า DB ด้วย credential **cleanup gate ยังเปิดอยู่**
- **Bytes ที่กู้ได้อยู่ใน `/private/tmp/claude-501/…/scratchpad`** ซึ่งอาจหายแบบเดียวกับ `/private/tmp/nqr*` แหล่งที่ทนกว่าคือ Codex logs + สคริปต์ในภาคผนวก ซึ่งสร้าง bytes เดิมซ้ำและตรวจ hash ได้

## 6. ขั้นถัดไปที่ต้องตัดสิน

1. **Independent TL และ SECURITY review ของ i3** บน canonical2 `da69c466…c559e` ให้ครบหกกลุ่มและ positive controls ใน handoff §5 เอกสารห้ามสร้าง task/agent ใหม่ ผู้ใช้จึงต้องเลือกช่องทาง reviewer: ส่งให้ Codex TL/SECURITY task เดิม หรือให้ session นี้ทำ (ไม่ใช่ผู้เขียน i3 แต่รวมสองบทบาทไว้ในผู้ตรวจคนเดียว)
2. Probe ที่ต้องใช้ real artifact ต้องรอสิทธิ์ build แยกต่างหาก หรือ reviewer ต้องบันทึกชัดว่าขอบเขตนี้ UNVERIFIED
3. Stage B, SOURCE integration, build และ deploy ยังห้ามจนกว่า TL และ SECURITY จะยอมรับ i3 ทั้งคู่

## ภาคผนวก — replay script

รันด้วย `node replay.mjs` (ต้องมี `acorn` ใน `node_modules` ของ repo) ผลลัพธ์เขียนลง `./out/{i1,i2,i3}/` และจบด้วย `ALL_PINS_MATCH` เมื่อ hash ตรงทุกไฟล์ SHA-256 ของสคริปต์: `17ffa66ef68f300857b6c17d18413332ce39a02e1d8883beccde1041ed597b9d`

```js
// Read-only recovery: replay apply_patch hunks for the two Stage A files from the
// DEVOPS Codex rollout log into this scratch directory, then compare SHA-256 to pins.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/sarawutjuntasang/Nexora/QRCODE/package.json");
const acorn = require("acorn");

const LOG = process.env.HOME + "/.codex/sessions/2026/08/28/rollout-2026-08-28T16-26-52-01a047b1-87c6-7b01-b738-4b85197d8913.jsonl";
const OUT = new URL("./out/", import.meta.url).pathname;
const ROOTS = {
  "/private/tmp/nqr130-gate-stage-a-7PEiLUZ0/project/scripts/": "i1",
  "/private/tmp/nqr130-gate-stage-a-i2-1QCNP1uD/project/scripts/": "i2",
  "/private/tmp/nqr130-gate-stage-a-i3-fBy3Aj4N/project/scripts/": "i3",
};
const NAMES = ["inspect-turbopack-emission.mjs", "inspect-turbopack-emission.test.mjs"];
const PINS = {
  i1: ["18b87204f41805dbc92dd77f4d6fcefcc4d186736b52a924107ecce16f9e5296", "2ccc0337a284fd3218e1e5c14faf46009b21afa5263a0f0469eda75b1e75618f"],
  i2: ["645cc72b75a45cf077fa5cf33d4780de9b48b0a9ae978aacec09b0c0e747ca61", "191f65f9619bf1f874e351dd9599873b847ccc97209c3c32ea4462d7c5da2a0b"],
  i3: ["63fc94534e072ad72ab805c94a5aba4864628d7222a985f23b56c4405f6dc51c", "6103a6f4ef56d3001b30b2111fce21452076cb07317fe4eefb6ee599568f2454"],
};
const sha = (s) => createHash("sha256").update(s).digest("hex");

function patchStrings(code) {
  const found = [];
  let ast;
  try { ast = acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowAwaitOutsideFunction: true }); }
  catch (e) { return { error: e.message, found }; }
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "Literal" && typeof n.value === "string" && n.value.includes("*** Begin Patch")) found.push(n.value);
    if (n.type === "TemplateLiteral" && n.quasis.some((q) => q.value.cooked?.includes("*** Begin Patch"))) {
      if (n.expressions.length) found.push({ unsupported: "template-with-expressions" });
      else found.push(n.quasis[0].value.cooked);
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c === "object" && walk(c));
      else if (v && typeof v === "object" && k !== "loc") walk(v);
    }
  })(ast);
  return { found };
}

function parsePatch(text) {
  const lines = text.split("\n");
  if (lines[0] !== "*** Begin Patch") throw new Error("no begin");
  const ops = [];
  let i = 1, cur = null;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l === "*** End Patch") break;
    let m;
    if ((m = l.match(/^\*\*\* (Add|Update|Delete) File: (.*)$/))) { cur = { kind: m[1], path: m[2], lines: [] }; ops.push(cur); continue; }
    if (l.startsWith("*** Move to: ")) { cur.moveTo = l.slice(13); continue; }
    cur.lines.push(l);
  }
  return ops;
}

// Codex seek_sequence: exact, then trimEnd, then trim.
function seek(hay, needle, start, eof) {
  if (!needle.length) return start;
  const tries = [(s) => s, (s) => s.trimEnd(), (s) => s.trim()];
  for (const f of tries) {
    const from = eof ? hay.length - needle.length : start;
    for (let i = Math.max(from, start); i <= hay.length - needle.length; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) if (f(hay[i + j]) !== f(needle[j])) { ok = false; break; }
      if (ok) return i;
    }
  }
  return -1;
}

function applyUpdate(content, bodyLines) {
  let file = content.split("\n");
  if (file.at(-1) === "") file.pop();
  // group chunks
  const chunks = [];
  let c = null;
  for (const l of bodyLines) {
    if (l.startsWith("@@")) { c = { ctx: l === "@@" ? null : l.slice(3), old: [], neu: [], eof: false }; chunks.push(c); continue; }
    if (l === "*** End of File") { c.eof = true; continue; }
    if (!c) { c = { ctx: null, old: [], neu: [], eof: false }; chunks.push(c); }
    const t = l[0], s = l.slice(1);
    if (t === " " || l === "") { c.old.push(s); c.neu.push(s); }
    else if (t === "-") c.old.push(s);
    else if (t === "+") c.neu.push(s);
    else throw new Error("bad line: " + JSON.stringify(l));
  }
  const repl = [];
  let pos = 0;
  for (const ch of chunks) {
    if (ch.ctx !== null) {
      const k = seek(file, [ch.ctx], pos, false);
      if (k < 0) throw new Error("ctx not found: " + ch.ctx);
      pos = k + 1;
    }
    if (!ch.old.length) { repl.push([file.length, 0, ch.neu]); continue; }
    let old = ch.old, neu = ch.neu;
    let k = seek(file, old, pos, ch.eof);
    if (k < 0 && old.at(-1) === "") { old = old.slice(0, -1); neu = neu.at(-1) === "" ? neu.slice(0, -1) : neu; k = seek(file, old, pos, ch.eof); }
    if (k < 0) throw new Error("hunk not found near: " + JSON.stringify(old.slice(0, 3)));
    repl.push([k, old.length, neu]);
    pos = k + old.length;
  }
  repl.sort((a, b) => b[0] - a[0]);
  for (const [k, n, neu] of repl) file.splice(k, n, ...neu);
  return file.join("\n") + "\n";
}

const rows = readFileSync(LOG, "utf8").split("\n");
const outputs = new Map();
for (const l of rows) { if (!l) continue; const o = JSON.parse(l); if (o.payload?.type === "custom_tool_call_output") outputs.set(o.payload.call_id, o.payload.output); }

const state = { i1: {}, i2: {}, i3: {} };
const log = [];
rows.forEach((l, ix) => {
  if (!l) return;
  const o = JSON.parse(l);
  const p = o.payload;
  if (o.type !== "response_item" || p?.type !== "custom_tool_call") return;
  const input = String(p.input);
  // stage copies
  if (ix + 1 === 4118) { state.i2 = { ...state.i1 }; log.push([ix + 1, "copy i1->i2"]); }
  // i3 starts as copy of frozen i2 (report: exact physical copy verified before edits)
  if (ix + 1 === 4698) { state.i3 = { ...state.i2 }; log.push([ix + 1, "snapshot i2 -> i3 base"]); }
  if (!input.includes("*** Begin Patch")) return;
  const { error, found } = patchStrings(input);
  if (error) { log.push([ix + 1, "PARSE_ERROR " + error]); return; }
  const outText = JSON.stringify(outputs.get(p.call_id) ?? null);
  for (const text of found) {
    if (typeof text !== "string") { log.push([ix + 1, "UNSUPPORTED " + JSON.stringify(text)]); continue; }
    for (const op of parsePatch(text)) {
      const root = Object.keys(ROOTS).find((r) => op.path.startsWith(r));
      if (!root) continue;
      const name = op.path.slice(root.length);
      if (!NAMES.includes(name)) continue;
      const st = state[ROOTS[root]];
      if (op.kind === "Add") st[name] = op.lines.map((x) => { if (x[0] !== "+") throw new Error("add line"); return x.slice(1); }).join("\n") + "\n";
      else if (op.kind === "Update") {
        try { st[name] = applyUpdate(st[name], op.lines); }
        catch (e) { log.push([ix + 1, `APPLY_FAIL ${ROOTS[root]}/${name} ${e.message} | tool-output: ${outText.slice(0, 300)}`]); continue; }
      } else log.push([ix + 1, "OTHER " + op.kind]);
      log.push([ix + 1, `${op.kind} ${ROOTS[root]}/${name} sha=${sha(st[name]).slice(0, 12)} out=${outText.slice(0, 120)}`]);
    }
  }
});
for (const r of log) console.log(r.join("  "));
mkdirSync(OUT, { recursive: true });
let allOk = true;
for (const stage of ["i1", "i2", "i3"]) {
  NAMES.forEach((name, k) => {
    const s = state[stage][name];
    const got = s === undefined ? "MISSING" : sha(s);
    const ok = got === PINS[stage][k];
    allOk &&= ok;
    console.log(stage, name, got, ok ? "MATCH" : "MISMATCH(pin " + PINS[stage][k] + ")");
    if (s !== undefined) { mkdirSync(OUT + stage, { recursive: true }); writeFileSync(OUT + stage + "/" + name, s); }
  });
}
console.log(allOk ? "ALL_PINS_MATCH" : "NOT_ALL_MATCH");
```
