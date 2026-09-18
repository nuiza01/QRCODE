# แผนพัฒนา QR Code Web Service

> **หมายเหตุ (Phase 2):** เอกสารนี้เป็น roadmap เดิม รายละเอียด implementation
> ปัจจุบันให้ยึด [`docs/PHASE2_IMPLEMENTATION_PLAN.md`](docs/PHASE2_IMPLEMENTATION_PLAN.md)
> เป็นหลัก: MariaDB บน HostAtom, Google-only, Free Dynamic QR 5 รายการ และ
> retention 30 วัน

> Stack: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
> โมเดล: Free / Pro tier ตั้งแต่วันแรก
> เส้นทาง: Static QR ก่อน → ต่อยอด Dynamic QR + Analytics

---

## 0. ข้อสรุปเชิงกลยุทธ์ (อ่านก่อน)

**Static QR ขายไม่ได้** — คู่แข่งฟรีเต็มตลาด และมันเจนฝั่ง browser ได้ทั้งหมด
ทำให้กั้นค่าเงินไม่ได้จริง ให้มองว่ามันคือ **ช่องทางดึง traffic + SEO**

**สิ่งที่ขายได้จริงคือ:**
1. **Dynamic QR** — แก้ปลายทางได้หลังพิมพ์ไปแล้ว (นี่คือ pain point ตัวจริง: ป้ายพิมพ์ไปแล้ว 5,000 ใบ แล้วลิงก์เปลี่ยน)
2. **Analytics** — สแกนกี่ครั้ง ที่ไหน เวลาไหน อุปกรณ์อะไร
3. **การจัดการเป็นชุด** — โฟลเดอร์, bulk CSV, ทีม, custom domain

ดังนั้นสถาปัตยกรรมต้องเผื่อ Dynamic ตั้งแต่ Phase 1 แม้จะยังไม่เปิดใช้

**จุดต่างสำหรับตลาดไทย** (คู่แข่งต่างชาติทำไม่ดี):
- PromptPay QR (EMVCo + CRC16) พร้อมระบุจำนวนเงิน — ทำให้ครบและถูกต้อง
- UI/เอกสาร/SEO ภาษาไทยเต็มรูปแบบ
- จ่ายเงินด้วย PromptPay / บัตรไทย ไม่ใช่แค่บัตร international
- ราคาระดับ ~199–299 บาท/เดือน (คู่แข่งนอกอยู่ที่ $15–30)

---

## 1. Tech Stack

| ส่วน | เลือกใช้ | เหตุผล |
|---|---|---|
| Framework | Next.js 15 App Router + TS | SSR ดีต่อ SEO, API route ใช้เป็น backend ได้เลย |
| UI | Tailwind v4 + shadcn/ui | สร้าง dashboard เร็ว, คุม design token ได้ |
| QR (client) | `qr-code-styling` | รองรับ logo, dot style, gradient, export PNG/SVG |
| QR (server) | `qrcode` (SVG) + `sharp` | ใช้กับ bulk / API / PDF ใน Phase 3–4 |
| PromptPay | `promptpay-qr` | สร้าง EMVCo payload + CRC16 ให้ถูกต้อง |
| DB | MariaDB 10.11 บน HostAtom | ใช้ทรัพยากรเดิมก่อน และแยก DAL เพื่อย้าย PostgreSQL ภายหลัง |
| ORM | Prisma หรือ Drizzle | Drizzle เบากว่าและเข้ากับ edge runtime ดีกว่า |
| Auth | Supabase Auth หรือ Auth.js v5 | ถ้าใช้ Supabase DB อยู่แล้ว ใช้ Auth ของมันลดชิ้นส่วน |
| Cache/Redirect | ยังไม่เพิ่มในรุ่นแรก | วัด traffic ก่อนเพิ่ม Redis เพื่อลดค่าใช้จ่าย |
| Storage | Supabase Storage / R2 | เก็บโลโก้ที่ผู้ใช้อัปโหลด |
| Payment | Stripe (รองรับ PromptPay) หรือ Omise | Omise ถ้าเน้นไทยล้วน, Stripe ถ้าเผื่อต่างประเทศ |
| Deploy | Vercel | เข้ากับ Next.js ที่สุด, edge function สำหรับ redirect |

**Monorepo ไม่จำเป็น** — repo เดียวพอ จนกว่าจะมี mobile app

---

## 2. Data Model (ออกแบบเผื่อ Dynamic ตั้งแต่แรก)

```
users
  id, email, name, image, created_at

subscriptions
  user_id, plan (free|pro|business), status,
  provider, provider_customer_id, provider_sub_id, current_period_end

folders
  id, user_id, name, created_at

qr_codes
  id, user_id, folder_id
  name                -- ชื่อที่ผู้ใช้ตั้ง
  mode                -- 'static' | 'dynamic'
  content_type        -- url | text | wifi | vcard | email | sms | tel | geo | event | promptpay
  payload   jsonb     -- ข้อมูลดิบตามชนิด
  style     jsonb     -- สี, dot style, logo url, margin, ecc level
  short_code          -- unique, ใช้เฉพาะ dynamic
  target_url          -- ปลายทางปัจจุบัน (dynamic)
  is_active  bool     -- ปิดการใช้งานได้ทันที (สำคัญมากเรื่อง abuse)
  created_at, updated_at

qr_target_history     -- log ทุกครั้งที่แก้ปลายทาง (audit + rollback)
  qr_code_id, old_url, new_url, changed_by, changed_at

scans                 -- ตารางโตเร็วมาก
  id, qr_code_id, scanned_at
  ip_hash             -- แฮชเท่านั้น ห้ามเก็บ IP ดิบ (PDPA)
  country, city, device_type, os, browser, referrer

scan_daily            -- aggregate ไว้ตอบ dashboard เร็ว ๆ
  qr_code_id, date, country, device_type, count
```

**หมายเหตุสำคัญ:** `scans` จะมีข้อมูลเป็นล้านแถวได้เร็วมาก
วางแผน partition รายเดือน + cron รวมยอดลง `scan_daily` แล้วลบ raw ตาม retention ของแต่ละ plan

---

## 3. โครงหน้าเว็บ

```
/                        Landing + generator ใช้ได้เลยไม่ต้อง login
/qr/url  /qr/wifi  /qr/promptpay  /qr/vcard  ...   ← หน้า SEO แยกต่อชนิด
/dashboard               รายการ QR ทั้งหมด (ต้อง login)
/dashboard/[id]          แก้ไข / ดู analytics / เปลี่ยนปลายทาง
/dashboard/bulk          อัปโหลด CSV สร้างทีเดียวหลายอัน (Pro)
/dashboard/billing       จัดการแพ็กเกจ
/pricing  /docs  /privacy  /terms
/r/[code]                ← redirect endpoint (edge runtime, ห้ามช้า)
```

---

## 4. Roadmap แบ่งเป็น Phase

### Phase 0 — วางฐาน ✅ เสร็จแล้ว
- `create-next-app` + TS + Tailwind + shadcn/ui + ESLint/Prettier
- ต่อ DB + ORM, เขียน schema ข้างบนทั้งหมดเลย (แม้ยังไม่ใช้ dynamic)
- ตั้ง repo, CI (typecheck + lint + build), deploy preview บน Vercel
- **จองโดเมนสั้น** สำหรับ dynamic QR — URL ยิ่งสั้น โมดูล QR ยิ่งน้อย ยิ่งสแกนง่าย
  (เช่นโดเมนหลัก `nexoraqr.com` + โดเมนสั้น `nxq.to` สำหรับ `/r/[code]`)
  → **ยังไม่ได้ทำ ต้องทำเอง** ใส่ค่าใน `NEXT_PUBLIC_SHORT_URL` เมื่อได้โดเมนแล้ว

**เพิ่มเติมที่ทำไปแล้วใน Phase 0:**
- Domain layer ของ QR ครบ (encoder ทั้ง 10 ชนิด + PromptPay EMVCo + zod + quality rules)
- ชุดเทสต์ 27 เคส ครอบคลุม CRC16, การ escape ของ WiFi/vCard/ICS และกฎคุณภาพ QR

### Phase 1 — Static Generator (2–3 สัปดาห์) ← ปล่อยจริงได้
เจนฝั่ง browser ทั้งหมด ไม่ส่งข้อมูลขึ้น server เลย → **ใช้เป็นจุดขายด้านความเป็นส่วนตัวได้**

- ชนิดที่รองรับ: URL, ข้อความ, WiFi, vCard, อีเมล, SMS, โทรศัพท์, พิกัด, นัดหมาย, **PromptPay**
- แต่งสไตล์: สีพื้น/สีจุด, gradient, รูปทรงจุด, รูปทรง eye, margin, ระดับ ECC
- อัปโหลดโลโก้วางกลาง
- ดาวน์โหลด PNG (512/1024/2048), SVG, PDF
- พรีวิวสดขณะพิมพ์ (debounce)
- ภาษาไทย/อังกฤษ (next-intl)
- หน้า SEO แยกต่อชนิด + schema.org markup

**กติกาคุณภาพ QR ที่ต้องบังคับในโค้ด** (พลาดตรงนี้แล้วสแกนไม่ติดจริง):
- ใส่โลโก้เมื่อไหร่ → บังคับ ECC ระดับ H และจำกัดโลโก้ไม่เกิน ~25% ของพื้นที่
- quiet zone ขั้นต่ำ 4 โมดูล ห้ามให้ผู้ใช้ตั้งเป็น 0
- เช็ค contrast ระหว่างสีจุดกับพื้น ถ้าต่ำเกินให้เตือน
- เตือนเมื่อผู้ใช้ทำ QR กลับสี (พื้นเข้ม จุดสว่าง) — เครื่องสแกนหลายรุ่นอ่านไม่ออก
- แสดงคำแนะนำขนาดพิมพ์ขั้นต่ำ (rule of thumb: ระยะสแกน ÷ 10 = ด้านกว้างขั้นต่ำ)
- **ปุ่ม "ทดสอบสแกน"** ให้ผู้ใช้เช็คด้วยมือถือก่อนโหลด

### Phase 2 — Account + Dynamic QR (3–4 สัปดาห์)
- Auth: Google เท่านั้นใน Phase 2A
- บันทึก QR เข้าบัญชี, โฟลเดอร์, ค้นหา, ทำซ้ำ
- Dynamic QR: `/r/[code]` บน **edge runtime**
  - lookup `code → url` จาก MariaDB ก่อน และเพิ่ม cache เมื่อ traffic พิสูจน์ว่าจำเป็น
  - บันทึก scan event แบบ fire-and-forget (`waitUntil`) — **ห้ามให้การเขียน log หน่วง redirect**
  - 302 ไม่ใช่ 301 (301 ถูก browser cache ถาวร แก้ปลายทางแล้วจะไม่มีผล)
- แก้ปลายทางได้ + เก็บประวัติการแก้
- ปิด/เปิด QR ได้ทันที
- Analytics dashboard: ยอดรวม, กราฟตามเวลา, ประเทศ, อุปกรณ์, OS, referrer
- Export CSV

**ความปลอดภัยของ redirect — ทำตั้งแต่วันแรก ไม่ใช่ทีหลัง:**
บริการ short link ทุกเจ้าโดนใช้ทำฟิชชิ่ง (quishing) ถ้าไม่กันไว้ โดเมนจะโดน blacklist
- ตรวจ URL ปลายทางกับ Google Safe Browsing API ตอนสร้างและตอนแก้
- Rate limit การสร้างต่อ IP / ต่อบัญชี
- ปุ่มรายงานลิงก์ + ระบบระงับทันที
- บัญชีใหม่ให้แสดงหน้าเตือนคั่นก่อน redirect สักช่วง
- Log ทุกการเปลี่ยนปลายทาง

### Phase 3 — Billing (1–2 สัปดาห์)

| | Free | Pro (~249 ฿/ด) | Business |
|---|---|---|---|
| Static QR | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด |
| Dynamic QR | 5 | ไม่จำกัด | ไม่จำกัด |
| เก็บสถิติย้อนหลัง | 30 วัน | 2 ปี | ไม่จำกัด |
| โลโก้ + สไตล์เต็ม | จำกัด | ✓ | ✓ |
| ดาวน์โหลด SVG/PDF | — | ✓ | ✓ |
| Bulk CSV | — | ✓ | ✓ |
| Custom domain | — | — | ✓ |
| สมาชิกทีม | — | — | ✓ |
| API | — | — | ✓ |

- ใช้ Stripe Checkout + Customer Portal (ประหยัดแรง ไม่ต้องทำหน้า billing เอง)
- Webhook อัปเดต `subscriptions` — ต้องทำ idempotent
- เช็ค quota ที่ server ทุกครั้ง อย่าเช็คแค่ฝั่ง client

### Phase 4 — ต่อยอด
- REST API + API key + rate limit ต่อ key
- Bulk CSV → ZIP
- Custom domain (`qr.ลูกค้า.com` → CNAME)
- ทีม + สิทธิ์ผู้ใช้
- QR แบบ landing page (สแกนแล้วเจอหน้า mini-site แทนที่จะเด้งออก)
- A/B test ปลายทาง, redirect ตาม OS (iOS → App Store, Android → Play Store)

---

## 5. เรื่องที่มักลืมแล้วเจ็บทีหลัง

- **PDPA** — scan data คือข้อมูลส่วนบุคคล: แฮช IP, มี privacy policy, ให้ผู้ใช้ลบข้อมูลได้, ประกาศ retention ให้ชัด
- **QR ต้องอยู่ตลอดกาล** — ป้ายพิมพ์แล้วอยู่เป็นปี ถ้าเว็บล่มหรือปิดบริการ QR ลูกค้าตายหมด ต้องมีแผน uptime และแผน exit
- **โดเมนสั้นห้ามหลุดมือ** — ต่ออายุยาว ๆ ล่วงหน้า ตั้ง auto-renew
- **PromptPay ต้องทดสอบกับแอปธนาคารจริง** อย่างน้อย 3 ธนาคาร ก่อนปล่อย
- **`qr-code-styling` พังตอน SSR** — ต้อง `dynamic(() => ..., { ssr: false })`
- **ปุ่ม "ทดสอบสแกน" ลด support ticket ได้มาก**

---

## 6. เริ่มยังไงต่อ

ลำดับที่แนะนำ: Phase 0 → Phase 1 ให้จบและปล่อยจริงก่อน
เก็บ feedback + ดู traffic แล้วค่อยลง Phase 2

งานชิ้นแรก: scaffold โปรเจกต์ + วาง schema + ทำ generator ชนิด URL ให้เจนได้จริงหนึ่งชนิด
