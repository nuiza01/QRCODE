# NQR-130 i3 — Stage A independent review (TL + SECURITY รวมโดย Claude)

วันที่ 2026-09-16 (Asia/Bangkok) | Claude | review iteration-1 ของ i3

**Verdict: REQUEST_CHANGES / REVIEW_FAILED. Stage A ยังไม่ผ่าน, Stage B ยังเริ่มไม่ได้**

i3 ปิดได้จริงในกลุ่ม Promise shadowing (กลุ่ม 2) และ `runCli` (กลุ่ม 6) ส่วนการบังคับ 64MiB (กลุ่ม 5) ทำงานถูกที่ขอบเขตจริง แต่ยังพบ admitted input ที่ได้ `STATIC_SUPPORTED` ทั้งที่ execution context ยังไม่ถูกพิสูจน์ในกลุ่ม 1, 3 และ 4 และพบ grammar ของ Flight import ที่ไม่ตรงกับ client ที่ติดตั้งอยู่ ทุก result ที่ได้จาก probe ยังเป็น `releaseDecision=BLOCKED` ไม่พบ release bypass

## 1. ขอบเขต ความเป็นอิสระ และสิทธิ์

- ผู้ใช้เลือกให้ session นี้ตรวจ i3 เอง (2026-09-16) ผู้ตรวจไม่ได้เขียน i1–i3 แต่ **รวมบทบาท TL และ SECURITY ไว้ในผู้ตรวจคนเดียว** ความเป็นอิสระจึงน้อยกว่ารูปแบบเดิมที่มีผู้ตรวจสองคน
- Candidate คือ bytes ที่กู้ใน [PM_PHASE2A_STAGE_A_I3_EVIDENCE_RECOVERY.md](PM_PHASE2A_STAGE_A_I3_EVIDENCE_RECOVERY.md): adapter `63fc94534e072ad72ab805c94a5aba4864628d7222a985f23b56c4405f6dc51c`, test `6103a6f4ef56d3001b30b2111fce21452076cb07317fe4eefb6ee599568f2454`, canonical2 `da69c4667784b1f73895b00665791ea1b6c915235e886ff6dd3d8a6be36c559e` hash ก่อนและหลังทุก probe ไม่เปลี่ยน
- อ่าน adapter ครบ 1,124 บรรทัด, helper/test ที่เกี่ยวข้อง, NQR129 spec, TL/SEC i2 reviews และรายงาน DEVOPS i3 ตรวจโค้ด React Flight client ที่ติดตั้งจริง (`next/dist/compiled/react-server-dom-turbopack`) แบบอ่านอย่างเดียว
- เขียนเฉพาะรายงานนี้กับ fixture/probe ใน scratchpad ของ session ไม่แก้ candidate, SOURCE application, package หรือ artifact ไม่มี install/build/typegen/server/browser/network/DB/deploy/commit/push และไม่สร้าง task/agent/automation
- Fixture ทั้งหมดเป็น HTML/JS แบบ inert ที่ adapter parse เท่านั้น ไม่มีการ execute emitted code URL ทุกตัวเป็น `.invalid`

## 2. สิ่งที่รันจริง

| Check | ผล |
| --- | --- |
| Test suite ของ i3 บน root แยก 98 ไฟล์ | 35/35 ผ่าน (ดูรายงาน recovery) |
| Probe อิสระ `probes.mjs` 34 กรณี | ผลตามตาราง §3 |
| Probe ขอบเขตจริง `budget.mjs` ใช้ fixture 64MiB พอดี และ 64MiB+1 byte | i3: SUPPORTED / UNKNOWN `RESOURCE_LIMIT` |
| Mutation 9 แบบ บนสำเนา adapter แยก แล้วรันเทสต์ของ i3 ใหม่ | ตาม §4 |
| Positive control `controls.mjs` | ตาม §5 |

| ไฟล์หลักฐาน (scratchpad `review-i3/`) | SHA-256 |
| --- | --- |
| probes.mjs | `de7d6ee82f06dd56b67c185e6561ef4897ad5b94a3cbca6a579c0320f1cc48a0` |
| probe-results.json | `a25c9d16df79a231a53123b3c8d7293ac14fa1a3b786f5cd32f4b3ef0071ece6` |
| budget.mjs | `5d434681d52418cb95675dad8007d8885845eeeebf4f84d148c78306072939da` |
| controls.mjs | `ecb7fbab02a1dbcb9679c74413eae6e16b9dddf1b55ecc8b815ca53668a48d28` |
| controls-results.json | `f9181c7bfc900b7d32559761c42e5afc4a09504efeb76fe74a229cb54421ce0d` |
| mutants.cjs | `8b8afbaf49ff5ce9181b5336450b8bbd860c191bc9c33cb5167e17a3632c71ce` |

ไฟล์ใน scratchpad อาจถูกลบภายหลัง ส่วน fixture ที่เป็นหัวใจของแต่ละ finding ถูกคัดลงใน §6 แล้ว เพื่อให้สร้างซ้ำได้

## 3. ผลตามหกกลุ่มใน handoff

| กลุ่ม | ผล i3 | Disposition |
| --- | --- | --- |
| 1 HTML execution roots | SVG `<script href>` / `xlink:href`, MathML script, iframe `src`/`srcdoc` → UNKNOWN; comment, textarea rawtext, plain SVG → SUPPORTED | **ปิดบางส่วน**: `<object data>`, `<embed src>`, `<frameset><frame src>` ยังได้ SUPPORTED (C1) |
| 2 Promise binding | shadow ผ่าน callback, context, named factory, `var` ใน factory, top-level `var Promise` ในอีก chunk → UNKNOWN; ordinary loader → SUPPORTED | **ปิด** (ถ้า mapper param ชื่อ `Promise` จะได้ SUPPORTED ซึ่งถูกต้องตาม lexical scope เพราะ `Promise.all` ถูก evaluate นอก mapper) |
| 3 Module reachability / Flight IDs | registration ในไฟล์ที่ไม่มีใครโหลด → UNKNOWN; ID string ซ้ำหรือขัดกัน → UNKNOWN; module ที่ขาด → UNKNOWN; root script แบบ classic → SUPPORTED | **ปิดบางส่วน**: ID alias `01`/`100000001` (C2), root แบบ `nomodule` (C3) และ grammar ของ chunk list (C6) |
| 4 Directory substitution | Probe เดิมที่สลับตอน `opendir` → UNKNOWN (เทสต์ของ i3 จับ mutation ได้) | **ปิดบางส่วน**: สลับหลัง anchor ตรวจครั้งสุดท้ายแต่ก่อนเปิด leaf ยังอ่านไฟล์นอก root ได้ (C4) |
| 5 Cumulative 64MiB | ขอบเขตจริง: 67,108,864 B → SUPPORTED, 67,108,865 B → UNKNOWN `RESOURCE_LIMIT` | **ปิดด้านพฤติกรรม**: เทสต์ไม่จับ mutation ที่ลบ call site (C5) |
| 6 `runCli` containment | null, Proxy ที่ throw, revoked Proxy, ค่าที่ไม่ใช่ string, getter ที่เปลี่ยนค่า → exit2 fixed output ไม่มี marker ไม่มี rejection | **ปิด** |

## 4. Mutation sensitivity ของเทสต์ i3

รันกับสำเนา adapter ที่ถูกลด guard ทีละจุด โดย SOURCE และ candidate ไม่ถูกแก้

| Mutation | เทสต์ i3 |
| --- | --- |
| ลบ namespace check ของ script | fail 1 ✔ |
| ลบ iframe check | fail 1 ✔ |
| ลบ Promise shadow check | fail 1 ✔ |
| ลบ same-string Flight duplicate check | fail 1 ✔ |
| ใช้ global module availability แบบ i2 | fail 1 ✔ |
| ย้าย `runCli` validation ออกนอก try | fail 1 ✔ |
| ลบ post-opendir validation อย่างเดียว | pass 35 (ยังมี post-iteration validation ซ้อนอยู่ จึงไม่ใช่ช่องโหว่) |
| ลบ post-opendir และ post-iteration validation | fail 1 ✔ |
| **ลบ `chargeExecutableBytes` call site** | **pass 35/35 ✘** แต่ `budget.mjs` จับได้ (limit+1 กลายเป็น SUPPORTED) |

## 5. Positive controls ที่ต้องคงไว้

- Capped severity: unknown 1,100 รายการก่อนหรือหลัง external loader → `STATIC_VIOLATION`, `violationCount=1`, `truncated=true`, diagnostics 1,024 รายการ และยังเก็บ VIOLATION ไว้ ✔
- Benign IIFE → UNKNOWN `UNPROVEN_FACTORY_INVOCATION`; runtime metadata → UNKNOWN ✔
- Inspect API ที่รับ null, getter ที่ throw, Proxy ที่ throw หรือ string → UNKNOWN `INVALID_API_INPUT` ไม่ echo marker ✔
- Ordinary loader, literal export, comment/rawtext/plain SVG → SUPPORTED ✔
- Admitted-buffer/final-byte race: **ไม่ได้ probe ใหม่** อ้างจากเทสต์เดิมที่ผ่าน (`semantic parsing stays bound to identity-admitted buffers`)

## 6. Findings ที่ต้องแก้

บรรทัดอ้างอิงถึง adapter i3 SHA `63fc9453…c51c` Owner คือ DEVOPS ผ่าน PM ให้ทำเป็น iteration ใหม่ และคง i3 เดิมไว้ ถ้าจะแก้ให้เป็น UNKNOWN แบบ conservative ก็ยอมรับได้ ไม่ต้องพยายามทำให้ grammar ที่ยังไม่รองรับกลายเป็น PASS

### C1 — MEDIUM (SECURITY), P2 (TL): embedded document ที่ไม่ใช่ iframe ยังผ่าน

บรรทัด 456–459 ตรวจเฉพาะ `iframe` fixture ต่อท้าย body ของ route ที่ปกติได้ SUPPORTED:

```html
<object type="text/html" data="https://example.invalid/doc.html"></object>
<object type="image/svg+xml" data="https://example.invalid/active.svg"></object>
<embed type="image/svg+xml" src="https://example.invalid/active.svg">
<!-- และเอกสารที่ใช้ <frameset><frame src="https://example.invalid/doc.html"></frameset> แทน body -->
```

ทั้งสี่กรณีได้ **STATIC_SUPPORTED โดยไม่มี diagnostic** ทั้งที่ `object`/`embed`/`frame` สร้าง nested browsing context หรือ active document ได้ เป็นช่องโหว่คลาสเดียวกับ TL R1 / SEC2 ที่ขอให้ fail closed กับ "embedded active documents" ข้อนี้เป็นหลักฐานระดับ parse tree ไม่ได้อ้างพฤติกรรมของ browser จริง

แนวทางแก้: ให้ `object`, `embed`, `frame`, `frameset` เป็น UNKNOWN หรือเปลี่ยนเป็น allowlist ของ element ที่ inert และเพิ่ม negative control ของทั้งสี่แบบ

### C2 — MEDIUM (SECURITY), P2 (TL): Flight row ID เทียบแบบ string แต่ runtime อ่านเป็นตัวเลข

บรรทัด 572–586 ใช้ string ของ ID เป็น key แต่ client ที่ติดตั้งอยู่ (`react-server-dom-turbopack-client.browser.production.js` ราว 1868–1872) สะสมค่าด้วย `_ref2 = (_ref2 << 4) | nibble` ผลคือ `01` มีค่าเท่ากับ `1` และ `100000001` ล้น 32-bit แล้วกลับมาเป็น `1` เมื่อ ID ซ้ำ `resolveModule` (ราว 1358–1382) จะ resolve chunk ของ ID เดิมใหม่

```text
1:I[7,[1,"/_next/static/chunks/entry.js"],"default"]
01:I[9,[1,"/_next/static/chunks/lazy.js"],"default"]
```

ทั้งแบบ `01` และ `100000001` ได้ **STATIC_SUPPORTED** ส่วนแบบ `1`/`1` (string เดียวกัน) ได้ UNKNOWN ถูกต้อง แปลว่าการแก้ของ i3 ถูกเลี่ยงได้ด้วยการเขียน ID เดียวกันในรูปแบบอื่น

แนวทางแก้: canonicalize ID ด้วยวิธีเดียวกับ runtime หรือปฏิเสธ leading zero และความยาวที่ล้น 32-bit ให้เป็น UNKNOWN แล้วเพิ่ม control ทั้งสองแบบ

### C3 — MEDIUM (SECURITY), P2 (TL): root script แบบ `nomodule` ถูกนับเป็นที่ที่ module พร้อมใช้

บรรทัด 1003–1006 เพิ่ม `<script src>` ทุก mode เข้า `routeRootChunks` และบรรทัด 1051–1053 นำไปเป็นที่ที่ module พร้อมใช้ fixture: Flight อ้าง module 999 จาก `entry.js` (ซึ่งไม่มี 999) แต่ 999 register อยู่ใน `<script nomodule src="/_next/static/chunks/legacy.js">` ผลคือ **STATIC_SUPPORTED** ขณะที่ browser สมัยใหม่ไม่รัน `nomodule` NQR129 ระบุว่า "Nomodule inclusion is not evidence of modern-browser execution" ถ้าเป็น root แบบ classic ปกติ (control) ได้ SUPPORTED ซึ่งถูกต้อง

แนวทางแก้: นับเฉพาะ mode ที่ execute ใน browser profile ที่รองรับ หรือให้ UNKNOWN เมื่อ destination พึ่ง root ที่เป็น `nomodule`

### C4 — LOW (SECURITY), P2 (TL): สลับ ancestor directory หลัง anchor ครั้งสุดท้ายยังหลุดได้

anchor ของ directory ถูกตรวจครั้งสุดท้ายที่บรรทัด 272 ก่อนเริ่มอ่านไฟล์ในโฟลเดอร์ ต่อมา `lstat` ที่บรรทัด 281 และการ `open`/`lstat` ใน `readStableFile` (189–207) ใช้ path ปัจจุบัน ถ้า identity ของ handle กับ path ตรงกันก็ไม่ได้ผูกกลับไปที่ anchor ของโฟลเดอร์แม่

Probe: hook `fs.lstat` ให้สลับ `static/chunks` เป็น symlink ไปยังโฟลเดอร์พี่น้องที่มี `entry.js` byte เดียวกัน ตอน `lstat` ครั้งแรกของ leaf แล้วสลับกลับหลัง bigint `lstat` ใน `readStableFile` ผลที่สังเกตได้: `swapped=true`, `restored=true`, **handle ที่เปิดเป็นไฟล์พี่น้องนอก artifact root** และผลรวมเป็น **STATIC_SUPPORTED** ข้อนี้ไม่ใช่การปลอม byte เพราะ byte ตรง manifest แต่คำอ้างใน i3 §3 ข้อ 4 ที่ว่า "ancestor substitution now stops UNKNOWN before opening the sibling file" กว้างเกินจริง Node ไม่มี `openat` จึงปิด TOCTOU นี้ได้ไม่สมบูรณ์

แนวทางแก้: แคบ window ลงด้วยการตรวจ `realpath` ของ leaf และ anchor ของ directory แม่หลังเปิด/อ่านไฟล์ และทำให้สมมติฐานเรื่อง artifact directory ที่ไม่เปลี่ยนเป็น prerequisite ที่ประกาศชัดตอน admission (ตามที่ TL R4 ระบุไว้) พร้อมแก้ถ้อยคำคำอ้าง

### C5 — LOW (TL): เทสต์ของ budget 64MiB ไม่จับการลบ call site

เทสต์ `semantic byte accounting has a bounded test seam…` ทดสอบแค่ arithmetic ของ `testExecutableByteBudget` เมื่อลบ `chargeExecutableBytes` ออกจาก `walkFiles` (บรรทัด 306) เทสต์ยังผ่าน 35/35 NQR129 §6 กำหนดว่า negative control ต้อง fail เมื่อ guard ถูกลบ พฤติกรรมจริงถูกต้องตาม §3 จึงเป็น finding เรื่อง coverage

แนวทางแก้: เพิ่ม regression ที่ผ่าน call site จริง เช่น fixture exact/+1 แบบ `budget.mjs` (ใช้ดิสก์ประมาณ 64MiB ใน TMPDIR และรันเสร็จในไม่กี่วินาที) หรือ seam ที่ `walkFiles` ใช้จริง ข้อสังเกตคือ `testExecutableByteBudget` เป็น export ใหม่ในโมดูล ถ้าไม่ต้องการให้เป็น public API ควรพิจารณาเอาออก

### C6 — MEDIUM (TL/SECURITY, ต้องพิสูจน์ต่อ): รูปของ chunk list ใน Flight `I` record ไม่ตรงกับ client ที่ติดตั้งอยู่

`literalWireModule` (609–616) และ `inspectFlightWire` (596–603) รับ `[moduleId, [chunkId, path, …], name]` เป็นคู่ แต่ใน browser `createResponseFromOptions` ส่ง bundlerConfig เป็น `null` (ราว 1836–1840) ดังนั้น `resolveClientReference` คืน metadata เดิม และ `preloadModule` (ราว 80–85) เรียก `__turbopack_load_by_url__` กับ **ทุก element** ของ `metadata[1]` ในรูป flat URL list fixture ที่ adapter ถือว่า SUPPORTED เช่น `[7,[1,"/_next/static/chunks/entry.js"],"default"]` จึงมีการโหลด "URL" `1` ที่ไม่มีใน graph และ metadata 4 ตัว (async module) ถูกทำเป็น UNKNOWN ซึ่ง conservative ถูกต้อง

ยังไม่ได้ตรวจว่า server ของ Turbopack emit รูปใดจริง เพราะ artifact สำหรับวินิจฉัยหายไป ผล real artifact เดิมเป็น UNKNOWN จึงไม่ถือว่ามี false PASS บน artifact จริง แต่ grammar เดียวที่ adapter ถือว่า SUPPORTED สำหรับ Flight import ยังไม่ถูกผูกกับ semantics ของ client ที่ติดตั้งอยู่

แนวทางแก้: ผูก grammar กับ installed client/server emission ที่พิสูจน์ได้ ระหว่างนี้ให้ element ที่ไม่ใช่ path string ใน chunk list เป็น UNKNOWN

## 7. ข้อจำกัดของ review นี้

- ผู้ตรวจคนเดียวรับทั้งสองบทบาทตามที่ผู้ใช้เลือก ถ้าต้องการความเป็นอิสระสองทางตาม WORKING_AGREEMENT ควรให้ reviewer อีกคนตรวจซ้ำก่อนยอมรับ iteration ถัดไป
- ไม่มี real artifact จึงไม่ได้รันผล real-artifact diagnostic และไม่ได้รัน probe i2 ของ TL/SEC ที่ต้องใช้ artifact หรือ `python3` (ติด Xcode license)
- ไม่ได้ทดสอบ memory/CPU แบบ adversarial, browser timing/evaluation, network หรือ runtime จริง
- C2 และ C6 อ้างจากการอ่านโค้ด React Flight client ที่ติดตั้งอยู่ ไม่ได้รัน client
- ไม่มีข้อใดใน review นี้อนุญาต Stage B, SOURCE integration, build หรือ deploy

## 8. ขั้นถัดไป

PM ส่ง C1–C6 ให้ DEVOPS แก้เป็น i4 ใน root แยกใหม่ภายในสิทธิ์ห้าไฟล์เดิม (แตะเฉพาะ adapter/test) คง i3 ไว้ แล้วให้ reviewer ตรวจ i4 บน bytes ที่ freeze ใหม่ Stage A ต้องคง `releaseDecision=BLOCKED` ทุก result

**Terminal: REVIEW_FAILED สำหรับ i3**
