# PM — บังคับล็อกอินก่อนใช้ตัวสร้าง QR (2026-09-18)

Claude (PM) | คำสั่งผู้ใช้: "ปรับระบบล็อคอินให้เสร็จ และ user ต้องล็อคอินเข้าใช้งานเท่านั้น"

## 1. การตัดสินใจของ Product Owner ที่บันทึกไว้

ถามทีละข้อและได้คำตอบดังนี้

1. ขอบเขตการบังคับ: **กั้นตัวสร้าง QR และ API** หน้าแรกและหน้า landing ของแต่ละชนิดยังเปิดสาธารณะเพื่อ SEO
2. วิธีกั้น: **ย้าย generator ไป route ใหม่ที่ต้องล็อกอิน** ตรวจ session ฝั่งเซิร์ฟเวอร์ ไม่ใช่ซ่อนด้วย UI

การตัดสินใจนี้กลับด้านกับเหตุผลที่เขียนไว้ในโค้ดเดิม (หน้าแรกเคยระบุว่าห้ามมีประตูกั้นเพราะทุกคลิกคือคนที่หลุดไปหาคู่แข่ง) จึงแก้คอมเมนต์ในไฟล์ที่เกี่ยวข้องให้ตรงกับความจริงใหม่แทนที่จะปล่อยให้ขัดกัน

## 2. สิ่งที่เปลี่ยนในโค้ด

| ไฟล์ | การเปลี่ยน |
| --- | --- |
| `src/app/[locale]/create/page.tsx` | **ใหม่** route ที่บังคับล็อกอิน `force-dynamic` + `runtime nodejs` อ่าน session ก่อน render ถ้าไม่มี session จะไม่ส่งฟอร์มออกไปเลย ถ้าระบบบัญชียังไม่ได้ตั้งค่าหรืออ่าน session ไม่ได้ จะปฏิเสธ (fail closed) ไม่เปิด generator แบบไม่ล็อกอิน |
| `src/app/[locale]/create/page.test.tsx` | **ใหม่** 6 เทสต์: signed-in เห็น generator, anonymous ไม่เห็น, ไม่ได้ตั้งค่าบัญชีก็ไม่เปิดและไม่เรียก session, session พังแล้วไม่ตรวจสอบ error object, `?type=` ที่รู้จักถูกใช้และค่าอื่นถูกทิ้ง, locale แปลกปลอม 404 ก่อนแตะ session |
| `src/components/layout/create-cta.tsx` | **ใหม่** การ์ด CTA แทนที่ generator บนหน้าสาธารณะ เป็น server component ล้วน หน้าจึงยัง prerender ได้ |
| `src/components/layout/create-cta.test.tsx` | **ใหม่** 4 เทสต์ รวมการ encode slug ลง query |
| `src/app/[locale]/page.tsx` | เอา `<Generator>` ออก ใส่ CTA แทน |
| `src/app/[locale]/qr/[type]/page.tsx` | เอา `<Generator>` ออก ใส่ CTA ที่ส่ง slug ต่อ |
| `src/app/[locale]/strings.ts` | เพิ่มชุดข้อความ `createStrings` ทั้ง th/en |
| `src/components/layout/auth-menu.tsx` | แยก `safeReturnPath(locale, path, search)` ออกมาและอ่าน location ตอนกดปุ่ม ทำให้ `?type=promptpay` ไม่หายหลังล็อกอิน และปฏิเสธ path ที่ไม่ใช่ของ locale นี้ (`//evil.example`, `/thailand`, ต่าง locale) |
| `src/components/layout/auth-menu.test.tsx` | เพิ่ม 3 เทสต์ของ `safeReturnPath` |
| `src/app/robots.ts` | แก้คอมเมนต์ที่ล้าสมัย และอธิบายว่าทำไมใช้ `noindex` ไม่ใช่ `Disallow` |
| `docs/ROUTES_AND_SEO.md` | เพิ่ม route `/[locale]/create` และบันทึกการแก้ spec |
| `.env.example` | แก้ข้อความที่บอกว่า generator ใช้ได้โดยไม่ต้องมีบัญชี |

## 3. สิ่งที่บังคับได้จริงตอนนี้

- **API**: `/api/qr-codes*` ตรวจ session ฝั่งเซิร์ฟเวอร์อยู่แล้ว ไม่มี session ได้ 401 (มีอยู่ก่อนแล้ว ไม่ได้แก้)
- **ตัวสร้าง QR**: คำขอที่ไม่มี session จะไม่ได้รับ HTML ของฟอร์ม เพราะตรวจบนเซิร์ฟเวอร์ก่อน render
- **หน้าเปิดสาธารณะ**: หน้าแรกและ 20 หน้า landing ยัง prerender เหมือนเดิม จึงไม่กระทบ 22 URL ใน sitemap และไม่กระทบ release gate ที่ตรวจ artifact แบบ static

## 4. ผลการตรวจ (ไม่ได้ build ไม่ได้ deploy ไม่ได้แตะ DB)

- `vitest run`: **1142/1142 ผ่าน** (48 ไฟล์) เพิ่มจากเดิม 1139
- `eslint src/`: ไม่มี error/warning
- `tsc --noEmit`: ผ่าน
- ไม่ได้รัน `next build`, ไม่ได้เปิดเซิร์ฟเวอร์, ไม่ได้ต่อ DB, ไม่ได้ deploy, ไม่ได้ commit

## 5. ที่ยัง "ไม่เสร็จ" และเสร็จเองไม่ได้

โค้ดล็อกอินและ schema ครบแล้ว (`user`, `session`, `account`, `verification` อยู่ใน `drizzle-mariadb/0000_phase2a_mariadb.sql`) สิ่งที่ยังพิสูจน์ไม่ได้คือ**ของจริง**

1. deploy รอบ 2026-09-01 ล้มที่ขั้นอ่าน session หลัง callback ของ Google และถูก rollback โค้ดที่ซ่อมหลังจากนั้นผ่านเฉพาะเทสต์แบบ offline
2. ต้องรัน migration กับ MariaDB ในเครื่องแล้วทดสอบ lifecycle ของ session จริง
3. ต้อง build จริงแล้วทดสอบด้วยเบราว์เซอร์ (ตอนนี้ MCP `browseros-neo` เชื่อมต่อได้แล้ว)
4. ต้อง deploy พร้อม backup/rollback
5. ผู้ใช้ต้องล็อกอินด้วยบัญชี Google จริงเอง เพราะรับรองแทนไม่ได้

**ข้อควรระวังที่เกิดจากการเปลี่ยนนี้:** เมื่อ generator อยู่หลังประตู ถ้าล็อกอินพังบนของจริง ผลไม่ใช่แค่ dashboard ใช้ไม่ได้ แต่คือ**ไม่มีใครสร้าง QR ได้เลย** ดังนั้นห้าม deploy การเปลี่ยนนี้ก่อนที่ข้อ 2–4 จะผ่าน

## 6. หมายเหตุต่อ release gate

ฉาก `COLD_VALID_INITIAL_PREVIEW` ของ NQR129 §7 อ้างถึงตัว generator ซึ่งตอนนี้ไม่ได้อยู่บนหน้า static อีกต่อไป เมื่อ iteration ปัจจุบันของ gate จบ ต้องทบทวน spec ฉากนี้ใหม่ทั้งฉบับ ไม่ใช่แค่ต่อยอดนโยบาย NOT_APPLICABLE เดิม
