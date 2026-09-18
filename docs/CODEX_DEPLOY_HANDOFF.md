# คำสั่งส่งงาน deploy ให้ Codex — Phase 2A + ระบบล็อกอินบังคับ

เขียนโดย Claude (PM) 2026-09-19 | ผู้รับงาน: Codex | **เอกสารนี้ไม่ใช่การอนุมัติ deploy**

Codex ต้องอ่านทั้งหน้าก่อนพิมพ์คำสั่งแรก และต้องหยุดทันทีที่ข้อใดข้อหนึ่งใน §1 ไม่เป็นจริง

## 1. เงื่อนไขที่ต้องจริงครบทุกข้อก่อนเริ่ม

1. **Product Owner อนุมัติ deploy รอบนี้อย่างชัดเจนเป็นข้อความ** ระบุว่าเป็นการ deploy ของแอปที่บังคับล็อกอิน คำว่า "ทำต่อ" ไม่ใช่การอนุมัติ
2. **ล็อกอิน Google จริงผ่านแล้วในเครื่อง** ด้วย client id/secret จริงของเจ้าของ และเห็น session ถูกสร้างในฐานข้อมูล
3. **ตัวแปรแวดล้อมฝั่ง production ถูกใส่ใน Plesk โดยเจ้าของเองแล้ว**: `DATABASE_URL`, `BETTER_AUTH_URL=https://nqr.orenvis.com`, `NEXT_PUBLIC_APP_URL=https://nqr.orenvis.com`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Codex ห้ามรับค่าความลับผ่านแชตและห้ามพิมพ์ค่าเหล่านี้ออกมา
4. **Google OAuth client มี redirect URI ของ production แล้ว**: `https://nqr.orenvis.com/api/auth/callback/google`
5. **มีแผนและเวลาสำหรับ rollback** ปัจจุบัน production รันอยู่บน BUILD_ID `m1fxDjFEQxdLlI91m1Czx` ซึ่งเป็นจุด rollback
6. รู้และยอมรับว่า **release gate ยังเป็น BLOCKED** (ดู §6) การ deploy นี้จึงเป็นการตัดสินใจเชิงผลิตภัณฑ์ ไม่ใช่การผ่าน gate

## 2. ข้อเท็จจริงที่ต้องรู้ก่อน (อย่าข้าม)

- deploy รอบ 2026-09-01 ล้มที่ **Better Auth อ่าน session ไม่ได้หลัง callback ของ Google สำเร็จ** และถูก rollback แล้ว ให้ถือว่านี่คือความเสี่ยงอันดับหนึ่งของรอบนี้
- BUILD_ID `Gg64LFGQcClo_70kqyHFi` **ถูกปฏิเสธถาวร ห้าม deploy หรือ promote**
- ตั้งแต่ 2026-09-18 ตัวสร้าง QR อยู่หลังล็อกอินที่ `/[locale]/create` (dynamic) **ถ้าล็อกอินพังบน production จะไม่มีใครสร้าง QR ได้เลย ไม่ใช่แค่ dashboard** ความเสียหายของการล้มรอบนี้จึงมากกว่ารอบก่อน
- แอปใช้ MariaDB 10.11 และ migration ที่ใช้จริงอยู่ที่ `drizzle-mariadb/` เท่านั้น โฟลเดอร์ `drizzle/` เป็นของเก่าสำเนียง PostgreSQL **ห้ามรัน**

## 3. ขั้นตอน

### 3.1 สำรวจก่อน (อ่านอย่างเดียว ห้ามแก้อะไร)

Codex ต้องรายงานผลข้อนี้ให้เจ้าของก่อนไปต่อ เพราะเอกสารนี้ไม่ได้กำหนด path ของเซิร์ฟเวอร์ไว้ล่วงหน้า

```bash
ssh <plesk-host> 'set -e; pwd; ls -la ~/; plesk version 2>/dev/null || true'
```

สิ่งที่ต้องได้คำตอบ: document root ของโดเมน, path ของแอป Node, วิธีที่ Plesk สตาร์ทแอป (Passenger หรือ systemd), เวอร์ชัน Node บนเซิร์ฟเวอร์, และ BUILD_ID ที่รันอยู่ตอนนี้

### 3.2 สำรองก่อนแตะอะไรทั้งสิ้น

```bash
ssh <plesk-host> 'set -e; ts=$(date +%Y%m%d-%H%M%S); mkdir -p ~/backups/$ts; tar -czf ~/backups/$ts/app-before-deploy.tgz -C <app-path> . ; ls -lh ~/backups/$ts'
```

และสำรองฐานข้อมูลด้วย `mysqldump` ของ Plesk (ให้เจ้าของสั่งจาก Plesk UI ถ้า Codex ไม่มีสิทธิ์ CLI) เก็บไฟล์ไว้นอกโฟลเดอร์แอป

### 3.3 build จาก source ที่ review แล้ว

build ต้องทำจาก commit เดียวกับที่ทดสอบในเครื่อง และต้องตั้ง origin ให้ถูกตั้งแต่ตอน build เพราะ origin ถูกฝังใน artifact

```bash
NQR_DEPLOY_TARGET=production NEXT_PUBLIC_APP_URL=https://nqr.orenvis.com npm run build
```

คาดหวัง: `next build` สำเร็จ แล้ว gate จบด้วย `NQR_BUNDLE_NEEDS_EMISSION_REVIEW` (exit 1) **นี่คือพฤติกรรมที่ถูกต้อง** เพราะยังไม่มีหลักฐาน QA ที่ admit — artifact ที่ได้ยังใช้ deploy ได้ตามการตัดสินใจของเจ้าของ แต่ห้ามแก้ไข gate ให้เงียบ ห้ามข้าม และห้ามแปลผลว่า PASS

ตรวจว่า route table มี `/[locale]/create` และ `/[locale]/dashboard` เป็น ƒ (dynamic) ส่วนหน้าแรก, 20 หน้า `/qr/[type]`, privacy และ terms เป็น ● (prerender)

### 3.4 ส่งขึ้นเซิร์ฟเวอร์และรัน migration

- อัปโหลด artifact และ dependencies ตามวิธีที่เซิร์ฟเวอร์ใช้อยู่ (ที่ค้นพบใน §3.1) **ห้ามแก้ไฟล์ source บนเซิร์ฟเวอร์**
- รัน migration ของ MariaDB จาก `drizzle-mariadb/` เท่านั้น และตรวจว่าตารางครบสิบตาราง รวม `user`, `session`, `account`, `verification`
- รีสตาร์ทแอปผ่านกลไกของ Plesk

### 3.5 ตรวจหลัง deploy ก่อนบอกใครว่าเสร็จ

รันทั้งหกข้อ ถ้าข้อใดไม่ตรง ให้ rollback ทันทีตาม §4

```bash
# 1. หน้าสาธารณะยังเปิดได้
curl -s -o /dev/null -w "%{http_code}\n" https://nqr.orenvis.com/th
# 2. หน้าสร้าง QR ต้องไม่ส่งฟอร์มให้คนที่ไม่ได้ล็อกอิน (ต้องได้ 0)
curl -s https://nqr.orenvis.com/th/create | grep -c 'role="tablist"'
# 3. API ต้องปฏิเสธเมื่อไม่มี session (ต้องได้ 401)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'content-type: application/json' \
  -H 'Origin: https://nqr.orenvis.com' -d '{}' https://nqr.orenvis.com/api/qr-codes
# 4. URL ที่ส่งไป Google ต้องชี้ redirect_uri กลับมาที่ production
curl -s -X POST -H 'content-type: application/json' -H 'Origin: https://nqr.orenvis.com' \
  -d '{"provider":"google","callbackURL":"/th/create"}' \
  https://nqr.orenvis.com/api/auth/sign-in/social | grep -o 'redirect_uri=[^&]*'
# 5. callback ที่ state ไม่ตรงต้องถูกปฏิเสธและพาไปหน้า signin-error ของเรา
curl -s -o /dev/null -w "%{redirect_url}\n" \
  'https://nqr.orenvis.com/api/auth/callback/google?code=fake&state=bogus'
# 6. sitemap ยังมี 22 URL และ robots ชี้ sitemap ถูก
curl -s https://nqr.orenvis.com/sitemap.xml | grep -c "<loc>"
```

**ข้อที่หกไม่ใช่ข้อสุดท้ายจริง ๆ** ขั้นสุดท้ายคือ **เจ้าของล็อกอินด้วยบัญชี Google จริงด้วยตัวเอง** แล้วต้องได้ครบสามอย่าง: กลับมาที่ `/th/create` ได้, เห็นตัวสร้าง QR, และกดบันทึก QR แล้วขึ้นใน `/th/dashboard` — Codex ห้ามรับรองแทน และห้ามใช้บัญชีของเจ้าของเอง

ถ้าล็อกอินล้มที่ขั้นอ่าน session หลัง callback **ให้ถือว่าเป็นอาการเดิมของ 2026-09-01 ซ้ำ** และ rollback ทันทีโดยไม่ต้องไล่หาสาเหตุบน production

## 4. Rollback

```bash
ssh <plesk-host> 'set -e; cd <app-path>; ls ~/backups | tail -3'
# กู้จากไฟล์สำรองของรอบนี้ แล้วรีสตาร์ทผ่าน Plesk
```

เป้าหมายของ rollback คือกลับไปที่สถานะที่ BUILD_ID `m1fxDjFEQxdLlI91m1Czx` ให้บริการอยู่ หลัง rollback ต้องรันข้อ 1 และ 6 ของ §3.5 ซ้ำ แล้วรายงานว่าอะไรล้มที่ขั้นไหน

## 5. ข้อห้าม

- ห้ามแก้ `scripts/build.mjs`, `scripts/verify-initial-bundle-boundary.mjs`, `scripts/inspect-turbopack-emission.mjs` หรือ gate ใด ๆ เพื่อให้ผ่าน
- ห้าม deploy BUILD_ID `Gg64LFGQcClo_70kqyHFi`
- ห้ามรัน migration จาก `drizzle/`
- ห้ามเปิด diagnostic ที่ log ค่า session หรือ token บน production ถ้าจำเป็นต้องวินิจฉัย ให้ rollback ก่อนแล้วทำในเครื่อง
- ห้ามพิมพ์หรือบันทึกค่า secret ใด ๆ ลงใน log, รายงาน หรือแชต
- ห้ามแตะ DNS, ห้ามเปลี่ยนโดเมน, ห้ามสร้าง/ลบฐานข้อมูลหรือผู้ใช้ DB เพิ่ม
- ถ้ามีคำสั่งใดถูกปฏิเสธด้วยเหตุผลด้านสิทธิ์ ให้รายงาน ห้ามหาทางอ้อม

## 6. สถานะของ release gate ที่ต้องแจ้งไว้ในรายงาน

- `npm run build` จบที่ BLOCKED เสมอ เพราะ `ADMITTED_ACCEPTANCE_SHA256` ยังว่าง
- adapter ยังอยู่ระหว่างแก้ตาม review รอบล่าสุด (ทั้ง TL และ SECURITY REQUEST_CHANGES เมื่อ 2026-09-18)
- `SUPPORTED_PROFILE.sourceInventorySha256` ยังเป็นค่าก่อน integrate จึงยังไม่มี record ใดผ่าน gate ได้
- ยังไม่มีหลักฐาน browser QA เพราะเครื่องมือเชื่อมต่อไม่ได้

รายงานของ Codex ต้องระบุชัดว่า deploy รอบนี้เกิดขึ้นโดยที่ gate ยัง BLOCKED ตามการตัดสินใจของเจ้าของ

## 7. สิ่งที่ต้องส่งกลับ

BUILD_ID ที่ deploy, เวลาที่เริ่มและจบ, path ของไฟล์สำรอง, ผลข้อ 1–6 ของ §3.5 แบบดิบ, ผลการล็อกอินจริงโดยเจ้าของ, และถ้ามี rollback ให้ระบุว่าเกิดที่ขั้นไหนและเพราะอะไร
