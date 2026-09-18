# PM — ช่องว่างระหว่างไวยากรณ์ที่ adapter review ไว้ กับสิ่งที่แอปจริง emit

วันที่ 2026-09-18 (Asia/Bangkok) | Claude (PM) | วัดจาก artifact ที่ build จริงวันนี้ (Next 16.3.1, Turbopack)

## 1. ทำไมต้องมีเอกสารนี้

ตลอดสิบ iteration ที่ผ่านมา ทั้ง Stage A และ Stage B ถูกทดสอบกับ artifact **สังเคราะห์**ที่เทสต์สร้างขึ้น ไม่เคยมีใครรัน adapter กับ artifact จริงของแอปนี้ เพราะไม่มีสิทธิ์ build มาก่อน วันนี้มีแล้ว และตัวเลขเปลี่ยนภาพของงานที่เหลือ

## 2. ตัวเลข

รัน `inspectTurbopackEmission` กับ artifact จริง (หลังใส่ runtime model ของ Stage A iteration 5 แล้ว)

| diagnostic | จำนวน | ความหมาย |
| --- | --- | --- |
| UNSUPPORTED_FLIGHT_WIRE_RECORD | 478 | record ใน RSC payload ที่ inline อยู่ในหน้า ซึ่ง adapter ยังไม่รู้จักรูปแบบ |
| UNSUPPORTED_FACTORY_EFFECT | 383 | statement ในตัว factory ของโมดูลที่อยู่นอกไวยากรณ์ที่ review ไว้ |
| UNSUPPORTED_FACTORY_SIGNATURE | 118 | ลายเซ็นของ factory ที่ไม่ตรงรูปแบบที่รองรับ |
| UNSUPPORTED_FLIGHT_IMPORT_RECORD | 22 | record `I[...]` ที่รูปไม่ตรง |
| UNSUPPORTED_CONTEXT_OPERATION | 16 | การเรียกเมธอดบน context ของโมดูลที่ยังไม่ได้ review |
| UNSUPPORTED_EXPORT_VALUE | 6 | รูปแบบการ export ที่ยังไม่รองรับ |
| DIAGNOSTIC_RESOURCE_LIMIT | 1 | จำนวน diagnostic ชนเพดาน |
| UNSUPPORTED_RUNTIME_BACKEND_SEMANTICS | **0** | ปิดแล้วด้วย runtime model ของ iteration นี้ |

ทั้งหมดเป็นระดับ UNKNOWN ไม่ใช่ VIOLATION แปลว่า adapter ไม่ได้บอกว่าแอปทำผิดนโยบาย แต่บอกว่า **มันอ่านสิ่งที่แอปส่งออกมาไม่ออก** ซึ่งตาม fail-closed คือ BLOCKED เหมือนกัน

## 3. สิ่งที่ตัวเลขนี้แปลว่า

แนวทาง "พิสูจน์ขอบเขต bundle ด้วย static analysis ที่ review ทุกไวยากรณ์" ต้องไล่ review รูปแบบโค้ดที่ bundler สร้างอีกหลายร้อยรูปแบบ แต่ละรูปแบบต้องมีคนอ่าน เขียนตัวจำ และผ่าน review อิสระ นี่ไม่ใช่งานที่จบในหนึ่งหรือสอง iteration และทุกครั้งที่ Next อัปเดต ชุดนี้ต้องถูกทบทวนใหม่

ทางเลือกที่ควรชั่งน้ำหนักก่อนลงทุนต่อ

1. **เดินหน้าตามเดิม** ไล่ปิดทีละกลุ่ม เริ่มจาก Flight wire (478 รายการ แต่น่าจะมาจากไม่กี่รูปแบบ) ข้อดีคือได้สิ่งที่ตั้งใจไว้แต่แรก ข้อเสียคือเวลาและภาระ review ที่ผูกกับเวอร์ชันของ Next
2. **เปลี่ยนวิธีพิสูจน์** ใช้หลักฐานเชิงพฤติกรรมจากเบราว์เซอร์เป็นหลัก (ซึ่ง NQR129 §7 มีอยู่แล้ว) แล้วให้ static analysis ทำเฉพาะสิ่งที่มันเก่ง: สแกน marker ต้องห้ามในชุด chunk เริ่มต้น และตรวจ identity ของ artifact ข้อดีคือปิดได้จริงในเวลาที่คุมได้ ข้อเสียคือความมั่นใจมาจากการสังเกต ไม่ใช่การพิสูจน์
3. **ลดขอบเขตให้ตรงกับความเสี่ยงจริง** หลังบังคับล็อกอิน หน้า public ไม่มี generator แล้ว ความเสี่ยงเรื่อง PDF/renderer อยู่ที่ `/[locale]/create` เท่านั้น จึงอาจบังคับ static ที่เข้มเฉพาะชุด chunk ของ route นั้น และใช้การสแกน marker กับส่วนที่เหลือ

## 4. ข้อเสนอของผม

ข้อ 3 ก่อน แล้วค่อยพิจารณาข้อ 1 เฉพาะกลุ่มที่คุ้ม เหตุผล: ความเสี่ยงที่ gate ถูกสร้างมาเพื่อกันคือ "โค้ด PDF/renderer ถูกโหลดตั้งแต่เปิดหน้า" ซึ่งตอนนี้จำกัดวงอยู่ที่ route เดียว การไล่ review ไวยากรณ์ของทุก chunk ในแอปเพื่อปิดความเสี่ยงที่จำกัดวงแล้ว เป็นการจ่ายแพงกว่าที่ได้

ไม่ว่าจะเลือกทางไหน ผลที่ต้องไม่เปลี่ยนคือ: artifact ที่พิสูจน์ไม่ได้ต้อง BLOCKED เสมอ และห้ามผ่อนเกณฑ์เพื่อให้ผ่าน

## 5. สถานะของ Stage A iteration 5

ทำแล้วและกำลังอยู่ในกระบวนการปกติ: runtime model + เทสต์ + mutation อยู่ในพื้นที่แยก ยังไม่ integrate เข้า SOURCE และยังไม่ผ่าน review อิสระ ตัวเลขในเอกสารนี้วัดด้วย adapter ที่มี runtime model แล้ว

## 6. อัปเดตหลังเลือก "ลดขอบเขต" — ข้อสรุปที่แรงกว่าเดิม

ทดลองแก้ตามที่คาดไว้: ยอมรับ factory ที่มีพารามิเตอร์ตามที่ runtime เรียกจริง (`factory(context, module, exports)`) แทนที่จะรับแค่พารามิเตอร์เดียว ผลคือ `UNSUPPORTED_FACTORY_SIGNATURE` หายไปทั้ง 110 รายการ **แต่** เมื่อ adapter เดินเข้าไปอ่านเนื้อ factory ได้จริง กลับพบ `UNSUPPORTED_FACTORY_EFFECT` **516 รายการในชุด startup**

เหตุผลชัดเจนเมื่อดูว่าข้างในคืออะไร ตัวอย่างจาก chunk เริ่มต้นหนึ่งไฟล์ (15 factory)

| รูปแบบ statement | จำนวน |
| --- | --- |
| ExpressionStatement ทั่วไป | 42 |
| VariableDeclaration | 21 |
| FunctionDeclaration | 14 |
| ForInStatement | 4 |
| `Object.defineProperty(...)` | 3 |
| `context.r(...)` | 2 |
| ClassDeclaration | 1 |

เนื้อของ factory **คือโค้ดของโมดูลนั้นเอง** ที่ผ่าน transpile แล้ว — React, โค้ดแอป, ไลบรารี ฯลฯ การ "review ทุกไวยากรณ์ที่อนุญาต" ในเนื้อ factory จึงเท่ากับการ review ภาษา JavaScript ทั้งภาษา ไม่ใช่งานที่มีจุดจบ และไม่ใช่สิ่งที่ artifact สังเคราะห์ในเทสต์เคยเปิดเผย เพราะ factory ในเทสต์เป็นฟังก์ชันว่าง

### สิ่งที่พิสูจน์ได้จริงด้วย static analysis

1. **identity ของ artifact** — ทำได้แล้วและเชื่อถือได้
2. **กราฟการโหลด** — ใครโหลดอะไรตอนไหน ประกอบจาก script/preload ใน HTML, record `I[...]` ของ Flight, `otherChunks`/`runtimeModuleIds` ของ runtime และ construct การโหลดที่ระบุได้ในโค้ด สิ่งเหล่านี้เป็น **construct จำนวนจำกัด** จึง enumerate ได้
3. **การสแกนเนื้อหา** — chunk ในชุด startup มี marker ของ PDF/QR renderer หรือไม่

### สิ่งที่พิสูจน์ไม่ได้และไม่ควรอ้างว่าทำได้

"ทุก statement ในทุกโมดูลอยู่ในรูปแบบที่ review แล้ว" — ข้อนี้ต้องถูกถอนออกจากคำกล่าวอ้างของ gate ถ้าเก็บไว้ ผลลัพธ์เดียวที่เป็นไปได้คือ UNKNOWN ตลอดกาล ซึ่งไม่ต่างจากไม่มี gate เลย แต่แพงกว่า

ข้อเสนอ: ให้ gate อ้างเฉพาะ "ในชุด chunk เริ่มต้นไม่มีโค้ด PDF/renderer และ construct การโหลดทุกตัวในชุดนั้นชี้ไปยัง chunk ที่รู้จัก" ส่วนเรื่อง "โหลดตอนไหน" ให้มาจากหลักฐานเบราว์เซอร์ตาม spec v2 §3
