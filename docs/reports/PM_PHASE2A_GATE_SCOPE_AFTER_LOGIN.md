# PM — release gate หลังบังคับล็อกอิน: สิ่งที่ gate ตรวจอยู่ไม่ใช่สิ่งที่ต้องป้องกันอีกต่อไป

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (PM) | อ้างอิงจาก artifact ที่ build จริงวันนี้

## 1. ข้อสรุป

NQR129 สร้าง gate ขึ้นมาเพื่อพิสูจน์เรื่องเดียว: **หน้า generator ต้องไม่โหลดโค้ด QR renderer หรือ PDF ตั้งแต่เปิดหน้า** เมื่อ generator ถูกย้ายไปหลังประตูล็อกอินที่ `/[locale]/create` ซึ่งเป็น route แบบ dynamic ทรัพย์สินที่ต้องเฝ้าก็ย้ายตามไปด้วย ส่วนที่ gate ตรวจอยู่ (HTML ที่ prerender ของ 22 route) กลายเป็นผ่านแบบไม่มีอะไรให้ตรวจ

หลักฐานจาก artifact จริง (build วันนี้ ผ่าน `scripts/build.mjs`)

- chunk ที่มี marker ต้องห้าม (`qr-code-styling`, `jsPDF`, `svg2pdf`, `updateVendorMatrix`, `getModuleCount`) มีอยู่ 5 ไฟล์ใน `static/chunks`
- HTML ที่ prerender ของหน้าแรก (`th.html`) และหน้า PromptPay (`promptpay.html`) **ไม่อ้างถึงไฟล์เหล่านั้นเลยแม้แต่ไฟล์เดียว**
- แปลว่าเกณฑ์ที่ gate บังคับ ผ่านโดยอัตโนมัติ ไม่ใช่เพราะการโหลดถูกควบคุม แต่เพราะ generator ไม่ได้อยู่บนหน้าเหล่านั้นแล้ว

## 2. ผลต่อ NQR129 §7 ทั้งหกฉาก

ฉากทั้งหมดถูกนิยามบน route ของ generator ที่เป็น static ซึ่งตอนนี้ไม่มี generator

| ฉาก | สถานะหลังเปลี่ยน |
| --- | --- |
| COLD_EMPTY_INVALID_STARTUP | ยังเก็บได้ แต่วัดหน้าเปล่าที่ไม่มีฟอร์ม จึงไม่ได้พิสูจน์อะไรเกี่ยวกับ generator |
| COLD_VALID_INITIAL_PREVIEW | ไม่มีความหมายบน route เดิมอีกต่อไป |
| EMPTY_TO_VALID_PREVIEW | ต้องย้ายไปวัดที่ `/[locale]/create` ซึ่งต้องมี session |
| NON_PDF_ACTIONS | เช่นเดียวกัน |
| FIRST_ELIGIBLE_PDF_REQUEST | เช่นเดียวกัน |
| WARM_REPETITION | เช่นเดียวกัน |

QA ยังต้องล็อกอินก่อนถึงจะเก็บหลักฐานสี่ฉากหลังได้ ซึ่งเป็นเงื่อนไขใหม่ที่ spec เดิมไม่ได้เขียนไว้

## 3. ผลต่องาน Stage B ที่ค้างอยู่

iteration 9 และ 10 ถูกปฏิเสธโดย TL และ SECURITY ทั้งคู่ เพราะกลไก "พิสูจน์ว่าแอปไม่มี cold valid initial preview" ผูกกับชุดไฟล์ที่ไล่ให้ครบไม่ได้ (รอบแรกพลาด barrel กับ validator รอบสองพลาดไฟล์นอก `src/` เช่น `tsconfig.json`, `next.config.ts`, root `app/`)

ตอนนี้เหตุผลของกลไกนั้นหายไปทั้งก้อน: ฉากนี้ไม่ต้องขอยกเว้นแล้ว เพราะมันต้องถูกนิยามใหม่อยู่ดี **ข้อเสนอคือทิ้งสาย iteration 9/10 ทั้งหมด** แล้วให้ SOURCE คงอยู่ที่ iteration 8 ซึ่ง reviewer ยอมรับแล้ว (canonical5 `1c4bdab3…edb7`, integrate ไปแล้ว ไม่ต้องแก้อะไร) การทำเช่นนี้ปิด REQUEST_CHANGES ของทั้งสองฝ่ายด้วยการถอนกลไกที่ถูกคัดค้าน ไม่ใช่ด้วยการแก้ให้ผ่าน

## 4. สิ่งที่ต้องเขียนใหม่ใน spec (เสนอ)

1. ขอบเขตของ gate: แยกให้ชัดระหว่าง "หน้า public ที่ prerender" กับ "หน้า generator ที่เป็น dynamic และต้องล็อกอิน"
2. วิธีตรวจ `/[locale]/create` โดยไม่ต้องเปิดเซิร์ฟเวอร์: build เขียน `page_client-reference-manifest.js` และ `build-manifest.json` ไว้ ซึ่งบอกชุด chunk ฝั่ง client ของ route นั้นได้ adapter จึงยังตรวจแบบ static ได้ ไม่ต้อง render
3. เกณฑ์ใหม่ที่ควรบังคับ: chunk เริ่มต้นของ `/[locale]/create` ต้องไม่มี PDF และ renderer ต้องโหลดเมื่อมี preview ที่ valid เท่านั้น — เกณฑ์เดิม แต่ย้ายที่วัด
4. เกณฑ์ของหน้า public: ต้องไม่มี marker ใด ๆ เลย ซึ่งตอนนี้จริงอยู่แล้วและควรตรึงไว้กันการถอยกลับ
5. หลักฐาน timing ต้องระบุว่า QA ล็อกอินด้วยบัญชีทดสอบใด และ session มาจากไหน

## 5. ของแถมที่ได้จาก artifact จริง

runtime chunk ของแอปเราเอง (`static/chunks/turbopack-31n9jue5s48pd.js`, 9,652 ไบต์) มีโครงเดียวกับที่ผมถอด model ไว้จาก chunk ที่ next แถมมาในแพ็กเกจ: `push([currentScript,{otherChunks:[…],runtimeModuleIds:[…]}])` แล้วสลับ `globalThis.TURBOPACK` เป็น `{push: registerChunk}` ตอนท้าย แปลว่า [runtime model ที่บันทึกไว้](PM_PHASE2A_TURBOPACK_RUNTIME_MODEL_SOURCE.md) ใช้กับ build ของเราได้จริง และตอนนี้เรามี artifact ของเราเองเป็น fixture แล้ว

## 6. สิ่งที่ยังไม่ได้ทำและตั้งใจไม่ทำ

ยังไม่แก้ spec, ไม่แก้ adapter, ไม่เปิด iteration 11 เพราะทั้งหมดนี้ต้องให้ Product Owner ตัดสินทิศทางก่อน และการเดินหน้าด้วยการเดาจะทำให้ reviewer ต้องตรวจงานที่ทิศทางผิดอีกรอบ
