# PM — QA ล็อกอินกับ MariaDB ของจริง (2026-09-18)

Claude (PM) | สิทธิ์ที่ได้รับ: "DB ทดสอบแยก + build จริง" | ไม่ deploy ไม่แตะ DB อื่นของเครื่อง

## 1. สภาพแวดล้อมที่ตั้งขึ้น (แยกสมบูรณ์)

| รายการ | ค่า |
| --- | --- |
| เซิร์ฟเวอร์ | MariaDB **10.11.19** ตรงกับเวอร์ชันเป้าหมายบน HostAtom |
| datadir | `scratchpad/mariadb-qa/data` (ของตัวเอง ไม่ใช้ของเครื่อง) |
| พอร์ต | 3307 ผูก 127.0.0.1 |
| socket | `/tmp/nqr-login-qa.sock` (ต้องสั้นกว่า 103 ตัวอักษร จึงวางไว้นอก scratchpad) |
| database | `nqr_login_qa` utf8mb4_unicode_ci |
| user | `nqr_qa@127.0.0.1` รหัสสุ่มเก็บที่ `scratchpad/mariadb-qa/qa-password.txt` (0600) |

MySQL 9.7.1 ของเครื่องที่รันอยู่ (datadir `/opt/homebrew/var/mysql`, ฐาน `artwell_*`) **ไม่ถูกแตะเลย** ไม่มีการเขียน ไม่มีการ restart และไม่ได้แก้ `my.cnf` ของเครื่อง — อินสแตนซ์นี้ใช้ไฟล์ตั้งค่าของตัวเองเพราะ `my.cnf` ของเครื่องมีตัวแปรเฉพาะของ MySQL ที่ MariaDB ไม่รู้จัก

## 2. ผลข้อแรก: migration ใช้กับ MariaDB ได้จริง

`drizzle-mariadb/0000_phase2a_mariadb.sql` apply สำเร็จ ได้ครบ 10 ตาราง: `account`, `folders`, `qr_codes`, `qr_target_history`, `scan_daily`, `scans`, `session`, `subscriptions`, `user`, `verification`

หมายเหตุที่พบระหว่างตรวจ: โฟลเดอร์ `drizzle/` ยังมี `0000_shallow_vision.sql` ซึ่งเป็น SQL สำเนียง PostgreSQL จากยุคก่อน ไม่ใช่ migration ที่ใช้จริง (`drizzle.config.ts` ชี้ไปที่ `drizzle-mariadb/` และ `scripts/check-migration-drift.mjs` ก็ตรวจโฟลเดอร์นั้น) ควรลบหรือทำเครื่องหมายว่าเลิกใช้ เพราะเป็นกับดักสำหรับคนที่มาทำ deploy

## 3. ผลข้อสอง: เส้นทางอ่าน session ที่ production เคยล้ม

เทสต์ `src/lib/auth-session-lifecycle.mariadb.test.ts` (ใหม่) ยิงผ่าน `getRequestUser` ซึ่งเป็นฟังก์ชันเดียวกับที่ทุกหน้าและทุก API ที่ต้องล็อกอินเรียกใช้ **ผ่าน 5/5**

1. เขียน session แบบเดียวกับที่ callback ของ Google เขียน แล้วอ่านกลับมาได้ — ตรงกับขั้นที่ deploy 2026-09-01 ล้ม
2. ลบแถว session แล้วสิทธิ์หมดทันทีในคำขอถัดไป พิสูจน์ว่า `cookieCache: { enabled: false }` ทำงานจริง ไม่มี snapshot ฝั่ง client มาบังการเพิกถอน
3. session หมดอายุ → ปฏิเสธ
4. cookie ที่เซ็นด้วย secret อื่น → ปฏิเสธ
5. token ที่ไม่มีแถวรองรับ → ปฏิเสธ

**พิสูจน์ว่าไม่ได้ข้ามเงียบ ๆ:** ชี้ `NQR_QA_DATABASE_URL` ไปพอร์ตที่ไม่มีเซิร์ฟเวอร์ แล้วไฟล์นี้ fail ทันทีด้วย query error ส่วนเมื่อไม่ตั้งตัวแปรนี้เลย เทสต์จะ skip ทั้งชุด ชุดเทสต์ปกติจึงยัง 1142 ผ่าน 5 skipped

## 4. สิ่งที่ยังพิสูจน์ไม่ได้ในขั้นนี้

- **OAuth กับ Google ตัวจริง** ต้องใช้ client id/secret จริงและต้องมีคนกดยินยอม การทดสอบนี้ใช้ค่า placeholder และไม่ได้ติดต่อ Google เลย จึงยังไม่ครอบ redirect, state, PKCE, การแลก code และการสร้าง user/account จากโปรไฟล์จริง
- พฤติกรรมภายใต้ latency และการตัดการเชื่อมต่อของ MariaDB ที่ HostAtom
- ผลของ `validateGoogleIdentity` กับโปรไฟล์จริงที่ Google ส่งมา

## 5. ผลข้อสาม: ทดสอบกับ artifact ที่ build จริง

build จริงในพื้นที่แยก (`scratchpad/build-qa/project`) ผ่าน `scripts/build.mjs` ซึ่งจบด้วย `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` ตามที่ gate ออกแบบไว้ (ยังไม่มีหลักฐานที่ admit) ตาราง route ยืนยันการออกแบบ: `/[locale]/create` และ `/[locale]/dashboard` เป็น ƒ (dynamic) ส่วนหน้าแรก, 20 หน้า type, privacy และ terms ยังเป็น ● (prerender) ครบ

รันเซิร์ฟเวอร์จาก artifact นั้นจริงในโหมด production ต่อกับ MariaDB QA และตรวจผ่าน HTTPS (terminator ในเครื่องพร้อมใบรับรอง self-signed เพราะโหมด production บังคับ https)

| การตรวจ | ผล |
| --- | --- |
| `/th/create` ไม่มี session | ไม่มีฟอร์มเลย ขึ้น "ต้องเข้าสู่ระบบก่อนใช้งาน" |
| `/th/create` มี session | generator render ออกมา |
| `/th/dashboard` มี session | 200 |
| `/th/dashboard` ไม่มี session | 307 |
| `POST /api/qr-codes` origin ถูก ไม่มี session | 401 |
| `POST /api/qr-codes` มี session | 400 (validation ของ body ว่าง แปลว่าผ่านด่าน auth แล้ว) |
| HTML ที่ prerender ของหน้าสาธารณะ | ไม่มี markup ของ generator เหลือ มีแต่ CTA และลิงก์ `/th/create?type=promptpay` |

### บทเรียนจากความผิดพลาดของผมเองระหว่างทาง

ตอนแรกผมสรุปว่า "เซิร์ฟเวอร์ไม่รับคุกกี้ เหมือนอาการที่ deploy ล้ม" **ข้อสรุปนั้นผิด** สาเหตุจริงคือผมเดาชื่อคุกกี้จากค่าเริ่มต้นของ Better Auth (`better-auth.session_token`) ขณะที่แอปตั้ง `advanced.cookiePrefix: "nqr"` ชื่อจริงจึงเป็น `__Secure-nqr.session_token` พอใช้ชื่อถูก ทุกอย่างทำงาน หลักฐานที่ผมยกมาตอนนั้น (ไม่มี connection ไป MariaDB) อธิบายได้ด้วยเหตุเดียวกัน เพราะ Better Auth ตัดจบก่อนแตะฐานเมื่อไม่พบคุกกี้

ผลที่ตามมาเป็นงานจริง: เพิ่ม `src/lib/auth-cookie-contract.test.ts` ที่ตรึงชื่อคุกกี้ทั้งสองรูป (`nqr.session_token` และ `__Secure-nqr.session_token`) ถ้ามีใครแก้ prefix ในอนาคต ทุกคนที่ล็อกอินอยู่จะหลุดเงียบ ๆ ตอน deploy โดยไม่มีเทสต์ไหน fail — ตอนนี้มีเทสต์แล้ว

## 6. Browser QA ยังทำไม่ได้

MCP `browseros-neo` ปรากฏใน session นี้แต่เรียกใช้จริงแล้วตอบ "Unable to connect" ทั้งการเปิดแท็บและการ list ผมจึงยังไม่ได้ตรวจด้วยสายตาบนเบราว์เซอร์ และ **ไม่ได้สลับไปใช้เครื่องมือเบราว์เซอร์ตัวอื่นแทนเอง** ตามข้อตกลงเดิม การตรวจทั้งหมดข้างบนทำผ่าน HTTP client กับ artifact จริง

## 7. หน้าที่ทำความสะอาดที่ค้างไว้

อินสแตนซ์ QA ยังรันอยู่เพื่อใช้ทดสอบต่อ เมื่อจบงานต้อง: หยุด `mariadbd` ที่ใช้ `scratchpad/mariadb-qa/my.cnf`, ลบ datadir, ลบ `/tmp/nqr-login-qa.sock` และลบไฟล์รหัสผ่าน รายการนี้แยกจากงานค้าง NQR124 และต้องไม่ถูกใช้เป็นข้ออ้างปิดงานนั้น
