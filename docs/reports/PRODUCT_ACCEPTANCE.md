# NQR-002 — Phase 1 Product Acceptance & UAT

วันที่: 2026-08-28 (Asia/Bangkok)

ผู้จัดทำ: PRODUCT — Product Manager

สถานะเอกสาร: READY FOR PM / QA REVIEW

สถานะการรับมอบผลิตภัณฑ์: NOT YET VERIFIED / NOT ACCEPTED

## 1. อำนาจ ขอบเขต และหลักฐาน

ผู้ใช้อนุญาต START แล้ว งานนี้จัดทำเกณฑ์รับงานได้โดยไม่ต้องรอ baseline แต่การทดสอบเพื่อรับมอบต้องผูกกับ integrated candidate ที่ TL/PM ระบุ เอกสารนี้ไม่ใช่ผลทดสอบ ไม่อนุมัติความเสี่ยง และไม่อนุมัติเปิดบริการ ผู้ใช้เป็น Product Owner และผู้รับมอบขั้นสุดท้าย; Project Manager เป็นผู้ประสานงานและเจ้าของ ledger

อ่านจาก source checkout `/Users/sarawutjuntasang/Nexora/QRCODE` แบบ read-only เท่านั้น เขียนรายงานนี้ใน PRODUCT worktree โดยไม่แก้ source ไม่ติดตั้ง ไม่รันแอปหรือชุดทดสอบ ไม่ commit/push/deploy และไม่สร้าง task/agent/automation

แหล่งอ้างอิงที่อ่าน:

- [ENGINEERING_LOOP.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/ENGINEERING_LOOP.md): control state ACTIVE, verification, ownership และ user gates
- [HANDOFF.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/HANDOFF.md): §2–6 ความสามารถที่รายงานไว้ งานค้าง regression และ deferred items
- [ENGINEERING_BRIEF.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/ENGINEERING_BRIEF.md), [TEAM.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/TEAM.md), [AGENTS.md](/Users/sarawutjuntasang/Nexora/QRCODE/AGENTS.md): ขอบเขตและสัญญาทางวิศวกรรม
- [ROUTES_AND_SEO.md](/Users/sarawutjuntasang/Nexora/QRCODE/docs/ROUTES_AND_SEO.md), [PLAN.md](/Users/sarawutjuntasang/Nexora/QRCODE/PLAN.md): routes และเป้าหมาย Phase 1
- [schemas.ts](/Users/sarawutjuntasang/Nexora/QRCODE/src/qr/schemas.ts), [quality.ts](/Users/sarawutjuntasang/Nexora/QRCODE/src/qr/quality.ts): ขอบเขต input และ quality thresholds ที่ใช้ตั้งเคส
- ตรวจค้น [types.ts](/Users/sarawutjuntasang/Nexora/QRCODE/src/qr/types.ts), [render/options.ts](/Users/sarawutjuntasang/Nexora/QRCODE/src/qr/render/options.ts), [Generator.tsx](/Users/sarawutjuntasang/Nexora/QRCODE/src/components/generator/Generator.tsx) และ [TestScanDialog.tsx](/Users/sarawutjuntasang/Nexora/QRCODE/src/components/generator/TestScanDialog.tsx) เพื่อยืนยันความหมาย logo ratio และการมี TestScanDialog; เป็นหลักฐานจาก source ไม่ใช่ runtime verification

ผล 337 tests, 11 test files และ build 27 pages ใน HANDOFF เป็นผลเดิม ห้ามนำมาเติม PASS รอบนี้ เอกสารเก่ายังระบุ Next 15 / next-intl แต่ ENGINEERING_BRIEF ระบุ Next 16.3.1 และ i18n แบบ Bundle โดยไม่มี dependency: ไม่ย้อน implementation กลับตาม roadmap เก่า คำแนะนำ commit ใน HANDOFF ไม่ใช่สิทธิ์ commit ในรอบนี้

### ขอบเขตรับมอบ

Phase 1 static QR generator แบบไม่ต้อง login: URL, text, WiFi, vCard, email, SMS, tel, geo, event และ PromptPay; generator ทำงานใน browser, style/live preview/logo, quality safeguards, PNG 512/1024/2048, SVG/PDF, ไทย/อังกฤษ และ SEO routes เดิม พร้อม release hardening และหลักฐาน QA

ไม่รวม auth, account/dashboard, dynamic QR, `/r/[code]`, analytics, billing, bulk/API, short-domain registration, schema/migration changes หรือการ deploy จริง ไม่เปิดงานหน้า `/pricing`, `/docs`, `/privacy`, `/terms` และไม่เพิ่มข้อกำหนดทางกฎหมายจากการคาดเดา

## 2. วิธีบันทึกผลและระดับการส่งมอบ

ทุกเคสเริ่มเป็น **NOT RUN** ใช้ผล `PASS`, `FAIL`, `BLOCKED` หรือ `NOT RUN` พร้อมหลักฐาน ห้ามแปลงการอ่าน source, mocked component test หรือความคาดหมายให้เป็นผลทดสอบ browser

QA ต้องระบุ candidate id/checksum หรือ manifest, worktree, วันเวลา, ผู้ทดสอบ, OS/browser/version, viewport, locale, route, fixture และวิธี decode/scan ที่ใช้ ผลหลังแก้ไขต้องอ้าง candidate ใหม่และ retest ที่เกี่ยวข้อง ใช้ fixtures สังเคราะห์ ไม่บันทึก credentials, เลขบัญชีจริง, national ID จริง หรือข้อมูลส่วนบุคคลที่ไม่จำเป็นใน repo

| ระดับ | เงื่อนไข |
|---|---|
| พร้อมให้ทีมใช้ checklist | เอกสารนี้มีเกณฑ์และเคส; ไม่หมายความว่าแอปผ่าน |
| Conditional engineering handoff | ยังมี engineering criterion ที่ไม่ตรวจ/ถูกบล็อก ต้องแสดงรายการและผลกระทบ ห้ามเรียก complete |
| Engineering handoff ready | Must-pass ทุกข้อมีหลักฐานบน integrated candidate เดียวกัน ไม่มี release-blocking defect; known issues อื่นมี severity/impact และคำตัดสินรับหรือเลื่อนอย่างชัดเจน |
| Launch pending / blocked | engineering อาจพร้อม แต่ user-owned launch gates ยังไม่ครบ; ไม่มีสิทธิ์ deploy อัตโนมัติ |
| Accepted | Product Owner ยืนยันรับมอบผ่าน PM ไม่ใช่ PRODUCT หรือ implementer ลงนามแทน |

QA ประเมิน severity จากผลกระทบและทำซ้ำได้; PM ประสาน owner/TL review และ QA retest ผู้แก้ไม่เป็นผู้รับรอง QA ขั้นสุดท้าย ข้อผิดพลาดด้าน payload, privacy, export ที่ใช้ไม่ได้, quality blocking ที่ข้ามได้ หรือ origin ผิด เป็นตัวอย่างเหตุให้หยุดรับมอบส่วนที่เกี่ยวข้อง ไม่ใช่รายการ severity ที่ตัดสินล่วงหน้าโดยไม่มีหลักฐาน

## 3. Must-pass สำหรับ engineering handoff

ช่องว่างทั้งหมดหมายถึงยังไม่ได้ตรวจในรายงานนี้

| ID | เกณฑ์รับงาน | หลักฐานขั้นต่ำ / ผู้ให้หลักฐาน |
|---|---|---|
| AC-01 | สร้างและ decode QR ได้ตรงข้อมูลครบ 10 ชนิด โดย generator ใช้ได้โดยไม่ login; invalid input ไม่สร้าง/download payload ที่ผิดหรือค้างจากค่าก่อนหน้า | UAT-T01–T10 ทั้ง th/en, preview และไฟล์จริง; QA |
| AC-02 | validation ใช้สัญญา schema เดิม; required/invalid/boundary errors อ่านได้ใน locale ปัจจุบัน ไม่แสดง raw message codes หรือข้อความอีกภาษา | เคสลบและแก้กลับเป็น valid ของแต่ละชนิด; QA + FORMS/TL review |
| AC-03 | live preview ตามค่าล่าสุดหลัง debounce; เปลี่ยน type/style และแก้ valid → invalid → valid แล้วไม่ export ข้อมูลเก่า ไม่ crash | UAT-C01; QA |
| AC-04 | สีพื้น/จุด, gradient, dot/eye style, margin และ ECC ทำงาน; preview และ export ใช้ quality normalization เดียวกัน; โลโก้บังคับ H, ratio ไม่เกิน 0.25 ของความกว้าง symbol, quiet zone อย่างน้อย 4 modules | UAT-C02–C04; QA + RENDER review/measurement |
| AC-05 | แสดง quality warnings ตามภาษา; error จาก quality บล็อก download ทุก format; warnings ไม่ถูกเหมารวมเป็น errors; มีคำแนะนำขนาดพิมพ์และ Test scan ที่ใช้งานได้ | UAT-C03–C05; UI + export regression evidence; QA |
| AC-06 | PNG 512/1024/2048 มีขนาดจริงตามเลือก; SVG/PDF เปิดได้ ไม่มี QR/quiet zone ถูกตัด, decode ตรงข้อมูลและ style ที่ยอมรับได้; PDF ขนาดพิมพ์สัมพันธ์กับคำแนะนำ | UAT-E01–E03 พร้อมไฟล์ที่ดาวน์โหลดจริงและผล decode; QA |
| AC-07 | `/` redirect 307 ไป `/th`; homes th/en และ 20 type routes ใช้ได้ โดยแต่ละ landing preset ถูกชนิด; locale/type ที่ไม่รองรับเป็น 404 | UAT-R01–R02; QA |
| AC-08 | title/description/H1 และ copy ตาม locale; canonical/hreflang, sitemap 22 URLs และ robots ใช้ origin ตาม policy ที่ SEO/DEVOPS ตกลง; FAQ JSON-LD ตรงกับคำถาม/คำตอบที่มีใน HTML | UAT-R03–R04; QA/SEO/DEVOPS; tel/sms content depth ใช้ข้อยกเว้น D-02 |
| AC-09 | ระหว่างกรอก สร้าง ปรับ style ใส่โลโก้ และ export ไม่มี QR payload หรือไฟล์โลโก้ที่อัปโหลดถูกส่งไป server; ไม่มี generation server round-trip | UAT-P01 network evidence กับข้อมูลสังเคราะห์ พร้อม SECURITY review; ไม่ใช้คำว่า zero network requests เพราะ page/assets อาจโหลดตามปกติ |
| AC-10 | core flow ใช้ได้บน desktop/mobile viewport ที่บันทึก; keyboard เข้าถึง form/style/download/dialog ได้ มี focus และ label/error ที่ใช้ได้; screen-reader check ต้องทดสอบจริงและแยกจากการตรวจโครงสร้าง | UAT-A01–A03; QA ระบุ browser/assistive technology จริง; ส่วนที่ไม่มีอุปกรณ์ยังเป็น BLOCKED/NOT RUN |
| AC-11 | typecheck, lint, tests และ build ผ่านบน integrated candidate เดียวกัน; fixes ผ่าน independent review และ QA retest | logs ของ `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` พร้อม exit code, วันเวลา, candidate; QA/TL |
| AC-12 | origin gate จับ production misconfiguration ได้; offline migration drift check ทำงานโดยไม่ต่อ live DB; CI/runtime, env example และ README สอดคล้อง; มี bundle audit และ release/rollback checklist โดยไม่ deploy | UAT-O01–O03; DEVOPS + QA/TL; ไม่เปิด `.env` จริงและไม่ใช้ real DATABASE_URL |
| AC-13 | ไม่มี release-blocking defect ค้าง; known issues ทุกข้อมี impact/severity/owner/evidence และคำตัดสินที่ตรวจสอบได้; handoff ระบุ user gates ที่ค้าง | defect register + PM handoff package; PRODUCT ช่วยรวบรวม ไม่อนุมัติแทนผู้ใช้ |

หมายเหตุ AC-04: PLAN/บาง comment ใช้คำว่า “พื้นที่” แต่ `QrStyle.logoSizeRatio`, renderer conversion และ UI ใช้สัดส่วนความกว้าง symbol เอกสารนี้ตาม contract ที่ใช้งานอยู่ ไม่แก้สูตรและไม่ส่งค่า 0.25 เข้า `imageOptions.imageSize` ตรง ๆ QA/RENDER ต้องตรวจ geometry จริงและรายงานหาก candidate เปลี่ยน contract

## 4. UAT matrix สำหรับ QA

### 4.1 วิธีใช้และ coverage ขั้นต่ำ

1. หลัง TL/PM ส่ง candidate ให้กรอก metadata ก่อนเริ่ม ทุก T-row ให้รัน valid + invalid + recovery ใน `/th` และ `/en` บน browser จริง; ตรวจ type preset ทั้ง 20 landing pages แยกตาม R01
2. ทุก T-row ตรวจ decoded payload ของ preview/PNG ตัวอย่าง อย่าใช้ encoder เดียวกับแอปสร้าง expected ทั้งหมด; ตรวจ field/escaping/วันที่ด้วยวิธีอิสระและใช้ existing tests ประกอบ
3. Export coverage อย่างน้อย 10 ชนิด × 5 outputs (PNG 512/1024/2048, SVG, PDF) ใน locale อย่างน้อยหนึ่งภาษา พร้อม smoke ครบ 5 outputs ในอีกภาษา ไม่ต้องทำ Cartesian product ของทุก style กับทุก type แต่ต้องครอบคลุม logo, gradient, quiet zone และ dense payload ใน E02
4. ห้ามเรียก decode อัตโนมัติว่า mobile scan จริง: ระบุเครื่องมือ/อุปกรณ์ที่ใช้ ทดสอบสแกนด้วยอุปกรณ์ที่มีและบันทึกข้อจำกัด ไม่อ้างรองรับทุกธนาคาร/ทุกกล้อง หากหลักฐานที่จำเป็นไม่มี ให้ส่ง conditional handoff
5. fixtures ที่เป็น URL/email/phone/PromptPay ใช้ข้อมูลสังเคราะห์เพื่อทดสอบ encode/decode เท่านั้น ไม่เปิดปลายทาง โทร ส่งข้อความ เชื่อมเครือข่าย หรือจ่ายเงินจริง การตรวจบัญชี PromptPay จริงอยู่ใน U-01 เท่านั้น

### 4.2 Content types — ทุกแถวเริ่ม NOT RUN

| Case / AC | ขั้นตอนและ fixture | เคสผิด/ขอบเขต | Expected result |
|---|---|---|---|
| UAT-T01 / AC-01–02 — URL | กรอก `https://example.com/nqr?case=uat&lang=th` แล้วแก้ path; ทดสอบ http และ https | ว่าง, URL ไม่สมบูรณ์, protocol `javascript:` / `data:` | เฉพาะ http(s) ผ่าน; decoded URL ตรงค่าล่าสุดรวม query; error เป็นภาษาหน้า ไม่ export URL เก่าเมื่อค่าปัจจุบันผิด |
| UAT-T02 / AC-01–02 — text | ข้อความ `ทดสอบ Nexora QR` มี newline และเครื่องหมายพิเศษ; ทดสอบ 1 และ 1,200 ตัวอักษร | ว่าง และ 1,201 ตัวอักษร | valid decode รักษาอักขระ/บรรทัด; เกิน schema limit ถูกปฏิเสธ ไม่มี crash; บันทึก rendering limitation หาก dense case สร้างไม่ได้ |
| UAT-T03 / AC-01–02 — WiFi | SSID `Cafe\Guest;Test`, password สังเคราะห์ที่มี backslash/semicolon; WPA, WEP, nopass และ hidden | SSID ว่าง/เกิน 32; WPA/WEP ไม่มี password; password เกิน 63 | decode ค่าเดิม ไม่กลายเป็น `CafeGuest`; encryption/hidden ถูกต้อง; nopass ไม่บังคับ password; ไม่ต้อง join WiFi จริง |
| UAT-T04 / AC-01–02 — vCard | ชื่อไทย/อังกฤษ, organization, note ที่มี comma/semicolon/newline; email `qa@example.com`, website http(s); ทดสอบ optional fields ว่าง | firstName ว่าง, email ผิด, website protocol ไม่รองรับ | decoded vCard แยก field และ escape ถูกต้อง; optional ที่เว้นว่างไม่ทำให้ข้อมูลที่ถูกต้องใช้ไม่ได้; ไม่บันทึก contact จริง |
| UAT-T05 / AC-01–02 — email | `qa@example.com`, subject/body ไทยและอักขระ `&`, `?`, newline | email ผิด; subject 201/body 801 ตัวอักษร | decoded mailto มีผู้รับ/subject/body ตรงข้อมูล ไม่แตกเป็น parameter อื่น; เปิดดูข้อมูลโดยไม่ส่งอีเมล |
| UAT-T06 / AC-01–02 — SMS | เบอร์สังเคราะห์ `+1 (202) 555-0100`, message ไทยและ colon/semicolon | ตัวอักษรในเบอร์, เบอร์น้อยกว่า 3 ตัวอักษร, message เกิน 500 | decoded SMS เก็บผู้รับและข้อความตาม contract; invalid มี error; ไม่มีการส่งข้อความจริง |
| UAT-T07 / AC-01–02 — tel | เบอร์สังเคราะห์แบบมี `+`, ช่องว่าง, วงเล็บ และขีด | ตัวอักษรที่ไม่รองรับ, ว่าง, เบอร์เกิน 20 ตัวอักษร | decoded tel ตรงเบอร์ตาม normalization ที่มีอยู่; ไม่โทรจริง; ไม่เพิ่มกฎความถูกต้องของหมายเลขนอก schema |
| UAT-T08 / AC-01–02 — geo | `13.7563, 100.5018`; ตรวจ 0, ค่าติดลบ และขอบเขต ±90/±180 | latitude 90.1, longitude 180.1, ว่าง/ไม่ใช่ตัวเลข | decode latitude/longitude ไม่สลับ; 0 ไม่หาย; ปฏิเสธค่านอกช่วง |
| UAT-T09 / AC-01–02 — event | ตั้ง timezone ทดสอบ Asia/Bangkok; all-day วันที่ 2026-08-28 วันเดียวและหลายวัน; timed event มี offset +07:00; location/description มี punctuation | title ว่าง, วันที่ผิด, end ก่อน start | all-day DTSTART ไม่เลื่อนไปวันก่อน; DTEND เป็นวันถัดจากวันสิ้นสุดที่ผู้ใช้เลือกแบบ exclusive; timed event คง instant ที่ถูกต้อง; ไม่สร้างนัดจริงในบัญชีผู้ใช้ |
| UAT-T10 / AC-01–02 — PromptPay | ใช้ synthetic fixtures จาก tests สำหรับ mobile ทั้ง local/+66, nationalId 13 หลัก, ewallet 15 หลัก; ทั้งไม่ระบุ amount และ 123.45 | nationalId 10 หลัก, ewallet ไม่ครบ, mobile หลักไม่พอ; amount 0/ติดลบ/>999999.99 | schema จับก่อน encode; TLV target/currency/amount และ CRC ตรวจอย่างอิสระ; ไม่มี amount tag 01 เป็น 11, มี amount เป็น 12; ห้ามสรุปว่า bank app รับหรือป้องกันการจ่ายซ้ำได้จาก tag นี้ |

### 4.3 Interaction, quality และ export

| Case / AC | ขั้นตอน | Expected result / หลักฐาน |
|---|---|---|
| UAT-C01 / AC-03 | พิมพ์ต่อเนื่อง เปลี่ยน type/style; valid → invalid → valid; กด download หลังแก้ค่า | preview/export ตรงค่าล่าสุดที่ valid; ช่วงค่าผิดหรือยังไม่พร้อมไม่ปล่อย artifact เก่า; ไม่ crash; บันทึก video/steps และ decoded result |
| UAT-C02 / AC-04 | เปลี่ยนสีพื้น/จุด, linear/radial gradient, dot/eye styles, ECC และ margin ที่ UI มี | preview และ exports สอดคล้อง; ใช้ contrast ที่อ่านได้ทดสอบ happy path; gradient ที่ปลายใดกลืนกับพื้นต้องตรวจ scan และส่ง finding หากกฎเดิมตรวจไม่ครอบคลุม ไม่ถือว่าผ่านเพียงเพราะ UI ไม่เตือน |
| UAT-C03 / AC-04–05 | ใส่โลโก้ท้องถิ่นจาก fixture แล้วเลือก ECC ต่ำกว่า H; ใช้ขนาดสูงสุด; ทดสอบ margin 4 และค่าต่ำกว่า 4 ผ่าน regression harness หาก UI กันไว้ | output ใช้ H และ logo width ratio ≤0.25; quiet zone จริง ≥4 modules ทุกขนาด ไม่ใช่ 4px; UI อธิบายการบังคับ ECC; regression ตรวจ raw style ที่มี error ไม่ bypass download |
| UAT-C04 / AC-05 | สีจุด #FFFFFF บนพื้น #FFFFFF, #777777 บน #FFFFFF, #000000 บน #FFFFFF และกลับสีขาวบนดำ; ทดสอบ hex ผิด/oversized logo ผ่านชั้นที่รับ input นั้นได้ | contrast <3 เป็น error และบล็อกทุก download; 3 ถึง <7 เป็น warning; กลับสีมี warning; invalid color/quiet-zone/oversized-logo errors บล็อกตาม inspectStyle; แก้กลับแล้วใช้งานได้; ภาษาถูกต้อง |
| UAT-C05 / AC-05 | เปิด Test scan จาก generator; เปลี่ยนระยะสแกน ดูคำแนะนำและ QR ใน dialog; ปิดด้วยปุ่มและ Escape | เป็น QR ล่าสุด, คำแนะนำสัมพันธ์กับระยะ/ขนาด symbol และ quiet zone; ขั้นต่ำตาม contract `max(20, round(distanceMm/10))` mm; ไม่อ้างว่าปุ่มนี้ทดสอบธนาคารให้อัตโนมัติ |
| UAT-E01 / AC-06 | ดาวน์โหลดทั้ง 5 outputs ของทั้ง 10 ชนิดตาม coverage §4.1 | ไฟล์ไม่ว่าง เปิดได้ PNG ขนาดจริง 512²/1024²/2048²; SVG/PDF แสดงครบ; decode ตรง fixture; เก็บ artifact path + decoder/result; ไม่ใช้แค่ toast ว่าดาวน์โหลดแล้ว |
| UAT-E02 / AC-04/06 | export ตัวแทนที่มีโลโก้, gradient, payload หนาแน่น, margin ขั้นต่ำ; ตรวจ PNG ทุกขนาดและ SVG/PDF | ECC/logo/quiet zone ไม่ต่างระหว่าง preview และ export; ไม่มี clipping; QR decode ได้; วัด logo/symbol/quiet zone จาก output ไม่ใช้ภาพหน้าจออย่างเดียว |
| UAT-E03 / AC-06 | PDF ที่ระยะสแกนต่างกัน; ระหว่าง export เปลี่ยนค่าหรือทำให้ validation ผิด; ทดสอบ error path ที่ทำซ้ำได้ | PDF ขนาด symbol ตรง guidance และยังเหลือ quiet zone; ไม่มีการปะปนข้อมูล/ไฟล์เสีย; ถ้า export ล้มเหลว UI รายงานอย่างเข้าใจได้และลองใหม่ได้ ไม่กล่าวว่า download สำเร็จโดยไม่มีไฟล์ |

### 4.4 Routes, privacy, accessibility และ release evidence

| Case / AC | ขั้นตอน | Expected result / หลักฐาน |
|---|---|---|
| UAT-R01 / AC-07 | เปิด `/`, `/th`, `/en` และ `/{th,en}/qr/{url,text,wifi,vcard,email,sms,tel,geo,event,promptpay}` | redirect/status ถูกต้อง; landing preset ตรง type; generator ใช้ได้; เก็บ route inventory ครบ 22 content URLs |
| UAT-R02 / AC-07 | เปิด `/xx`, `/th/qr/unknown`, `/en/qr/unknown` | 404; ไม่ fallback ไป type/locale ที่ทำให้ผู้ใช้เข้าใจผิด |
| UAT-R03 / AC-08 | ตรวจ rendered HTML/metadata ของ home และ type routes ทั้งสองภาษา รวม FAQ เมื่อยังปิดอยู่ | localized title/description/H1; canonical และคู่ hreflang ถูก route; FAQ คำตอบมีใน HTML และ JSON-LD ตรงเนื้อหา ไม่เติมคำตอบขึ้นเอง; tel/sms ใช้ D-02 |
| UAT-R04 / AC-08 | ตรวจ sitemap/robots และ absolute URLs ภายใต้ origin ทดสอบตาม policy NQR-011 | sitemap 22 URLs + alternates; robots อ้าง sitemap ถูก origin; metadata ไม่หลุด localhost/preview domain ไป production-like output; ยังไม่ยืนยันโดเมน production จริงแทนผู้ใช้ |
| UAT-P01 / AC-09 | เปิด network capture ก่อนกรอก synthetic marker; สร้างทุก type, เปลี่ยน style, ใส่โลโก้ fixture, export PNG/SVG/PDF | ตรวจ URL/query/body และช่องทางส่งข้อมูลที่มี เช่น fetch/XHR/beacon/WebSocket ว่าไม่มี payload/โลโก้อัปโหลดออกจาก browser รวมค่าที่ encode แล้ว; แยก asset requests ปกติ; เก็บหลักฐานที่ไม่มีข้อมูลจริงและ SECURITY review; source inspection อย่างเดียวไม่พอ |
| UAT-A01 / AC-10 | ใช้ keyboard เท่านั้นผ่านเลือก type, form, style, file input, download, locale, Test scan และ FAQ | focus มองเห็น/ลำดับใช้ได้; controls มีชื่อ; dialog focus เข้า/คงใน dialog เมื่อเปิด/กลับ trigger เมื่อปิด; ไม่มี keyboard trap; errors และ disabled reason เข้าถึงได้ |
| UAT-A02 / AC-10 | ใช้ screen reader จริงอ่าน form/errors, quality messages และ dialog ใน th/en | บันทึก OS + screen reader + browser/version และสิ่งที่ได้ยิน; labels, dialog name และ feedback เข้าใจได้; ไม่มีการรับรองมาตรฐาน accessibility ทั้งระบบจากการตรวจบางส่วน |
| UAT-A03 / AC-10 | core flow ที่ desktop และ mobile viewport พร้อมขนาดที่บันทึก; ตรวจ light/dark และ dialog overlay | ไม่มี form/action ที่ถูกตัดหรือบังจนใช้งานไม่ได้; overlay ทำให้พื้นหลังมืดลงทั้งสอง theme; ระบุ responsive emulation แยกจากมือถือจริง |
| UAT-K01 / AC-13 | ตรวจ footer ทั้งสองภาษา ทั้ง mouse/keyboard/screen reader; บันทึก text/link semantics และผลเมื่อพยายามใช้ | QA ออก finding เรื่อง inert footer พร้อม severity/impact และข้อเสนอ; ห้ามใส่ PASS ว่าใช้งานได้หรือถือว่ายอมรับความเสี่ยงแล้ว ดู K-01 |
| UAT-O01 / AC-12 | DEVOPS/QA ทดสอบ production-like gate โดยไม่ตั้ง origin, ตั้งค่าที่ policy ไม่ยอมรับ, ตั้ง origin ทดสอบที่ policy ยอมรับ และกรณี explicit override/fallback ตาม NQR-011 | gate ปฏิเสธ misconfiguration และ output ถูก origin ที่คาด; การที่ URL ไม่ใช่ localhost อย่างเดียวไม่พอ; ทดสอบใน local/CI ที่อนุญาต ไม่เปลี่ยน production |
| UAT-O02 / AC-11–12 | ตรวจ logs สี่คำสั่งบน candidate เดียวกัน, CI/runtime และ offline drift check ทั้ง match/drift | exit codes จริง; drift test ไม่ต่อ DB และจับ mismatch ได้; runtime/env docs ตรง implementation; ไม่มี migration จริงหรือ secret ใน logs |
| UAT-O03 / AC-12 | audit bundle/request stages: initial page → preview → export; ตรวจ README/env example และ release/rollback checklist | ระบุเวลาโหลด/ขนาดของ qr-code-styling, jspdf, svg2pdf.js และหลักฐาน lazy boundaries; landing มี generator จึงไม่สมมติว่าเป็น marketing-only route; ไม่ตั้ง performance budget ใหม่เอง; มีวิธี run/verify/rollback และ approval gates โดยไม่ deploy |

### 4.5 แบบฟอร์มผลที่ QA ใช้ซ้ำ

| Run ID / Case | Candidate / manifest | Locale / route | Browser / OS / viewport / AT | Fixture / steps | Expected | Actual | Result | Evidence path | Defect / severity / owner | Tester / date / retest |
|---|---|---|---|---|---|---|---|---|---|---|
| ยังไม่รัน | รอ TL/PM ระบุ | — | — | — | อ้าง case ข้างต้น | ยังไม่มีหลักฐาน | NOT RUN | — | — | — |

## 5. User-owned launch gates

ทั้งหมดเป็น **PENDING — ต้องมีคำยืนยันจากผู้ใช้** ไม่ขัดขวางการจัดทำ checklist หรือ engineering work ที่ได้รับอนุญาต แต่ห้ามเปลี่ยนเป็น launch-ready โดยอาศัยผล repo tests

| ID | Gate / เจ้าของ | สิ่งที่ต้องยืนยันผ่าน Project Manager |
|---|---|---|
| U-01 | Product Owner — PromptPay กับธนาคารจริง | ใช้บัญชีที่ผูก PromptPay จริง สแกนอย่างน้อย 3 แอปจากคนละธนาคารไทย; ตรวจชื่อผู้รับและจำนวนเงิน แล้ว cancel ก่อนโอน บันทึกธนาคาร/แอป/version ถ้ามี, วันเวลา, candidate/fixture reference, ผลชื่อ/จำนวนเงินถูกต้อง และยกเลิกแล้ว โดยไม่ส่งเลขบัญชีหรือข้อมูลส่วนตัวลง repo |
| U-02 | Product Owner — production domain/configuration | ระบุโดเมนหลักจริงและให้ผู้มีอำนาจตั้ง NEXT_PUBLIC_APP_URL ใน environment ที่ได้รับอนุญาต; DEVOPS จัดหลักฐาน output ตรงโดเมน ไม่ขอ secret ในแชต |
| U-03 | Product Owner — สิทธิ์ดำเนินการภายนอก | อนุมัติ deploy, paid service, real credentials/access, production changes หรือ scope ใหม่แยกเมื่อจำเป็น START รอบนี้ไม่ครอบคลุมสิ่งเหล่านี้; ไม่ขออนุมัติล่วงหน้าที่ไม่จำเป็นต่อ Phase 1 handoff |
| U-04 | Product Owner — รับมอบและข้อคงค้าง | ตรวจ acceptance package และ known issues แล้วรับมอบหรือให้แก้ไข; การรับ engineering handoff ไม่ใช่คำสั่ง deploy โดยปริยาย |

U-01 ควรมีกรณีไม่กำหนด amount และมี fixed amount เพื่อครอบคลุมสอง flow ที่รองรับ; ผล TLV/CRC หรือ tag 11/12 ไม่ยืนยันชื่อบัญชีจริงหรือพฤติกรรมจ่ายซ้ำ ผู้ใช้ทำการตรวจจริงและรายงานผลเอง ทีมไม่โอนเงินและไม่รับรองแทน

Short domain และ NEXT_PUBLIC_SHORT_URL เป็น Phase 2 gate เท่านั้น ไม่เป็น blocker ของ Phase 1 และไม่มีงานซื้อโดเมนเพิ่มในเอกสารนี้

## 6. Deferred items และ known issue

### 6.1 Nonblocking deferred items ที่มีฐานจาก HANDOFF §4.3

| ID | รายการที่คงไว้ตาม handoff | ขอบเขต/เงื่อนไข |
|---|---|---|
| D-01 | ไม่เพิ่มงาน UI เพื่อบังคับเข้าถึง PromptPayError path ที่ schema จับก่อนแล้ว | ต้องยังทดสอบ invalid input ที่ schema/form และไม่ crash; ถ้า candidate ทำให้เส้นทางนี้ reachable ให้เปิด finding ไม่ยกเว้นโดยอัตโนมัติ |
| D-02 | ไม่ขยายความยาวเนื้อหา tel/sms landing ซึ่งมี FAQ 2–3 ข้อและไม่มี sections | เป็นข้อยกเว้นด้าน content depth ตาม handoff; generator, localization, metadata และ FAQ accuracy ยังต้องผ่าน ไม่เปิด SEO content expansion หรือ monitoring ใหม่ |
| D-03 | คง SoftwareApplication ราคา 0 THB ขณะ Phase 1 ยังใช้ฟรี | ไม่เปิด billing/pricing หรือแก้ราคาตาม Phase 3; หากมีคำกล่าวราคาขัดกับพฤติกรรม candidate ให้ QA รายงาน |
| D-04 | ไม่สร้าง `/pricing`, `/docs`, `/privacy`, `/terms` ในรอบนี้ | เป็นขอบเขตหน้าที่เลื่อนไว้ตาม HANDOFF/ROUTES_AND_SEO ไม่ใช่คำรับรองกฎหมายหรือการอนุมัติผลกระทบของ footer |

### 6.2 K-01 — Inert footer: known issue ที่ยังไม่ยอมรับความเสี่ยง

HANDOFF ระบุ footer links ใช้งานไม่ได้ และ ROUTES_AND_SEO ระบุเป็น inert text สถานะปัจจุบันใน acceptance นี้คือ **OPEN — QA assessment pending** ไม่จัดเป็น nonblocking โดยอัตโนมัติ

QA ใช้ UAT-K01 ตรวจ behavior/semantics จริงทั้งสองภาษา ประเมินว่าทำให้ผู้ใช้เข้าใจผิด ขัดขวาง keyboard/assistive technology หรือขัดต่อ core flow อย่างไร พร้อม evidence และ severity จากนั้น PM เสนอทางเลือกแก้เฉพาะจุดใน scope หรือขอผู้ใช้ตัดสินรับ/เลื่อนความเสี่ยงที่เหลือ การอนุมัติของ PRODUCT แทนผู้ใช้ไม่มีผล และไม่มีสิทธิ์สร้างหน้าใหม่โดยอ้าง issue นี้

## 7. ประเด็นตัดสินใจที่จำเป็นและจังหวะถาม

| ประเด็น | เมื่อใดจึงต้องถาม | ผู้เตรียมข้อมูล / ผู้ตัดสิน |
|---|---|---|
| จัดการ residual risk ของ footer หรือ known issues อื่น | หลัง QA มี severity/impact/evidence และก่อนเรียก handoff ready หากยังเหลือ issue; ไม่ถามกว้าง ๆ เพื่อขยายหน้า/phase | QA + PRODUCT ส่ง decision brief ผ่าน PM / Product Owner ตัดสิน |
| บัญชี/อุปกรณ์และผลทดสอบ PromptPay จริง | เมื่อ candidate พร้อมให้ UAT และก่อนเปิดบริการ; ไม่ขอข้อมูลบัญชีใน repo | PM ประสานผู้ใช้ / ผู้ใช้ตรวจและยืนยัน U-01 |
| โดเมน production และสิทธิ์ deploy | เมื่อเตรียม production launch; engineering origin gate ใช้ test origin ตาม policy ไปก่อนได้ | SEO/DEVOPS ระบุการตั้งค่าที่ต้องทำผ่าน PM / Product Owner ตัดสิน U-02–03 |
| รับมอบ deliverable | เมื่อ PM มี package ของ candidate พร้อมหลักฐานและรายการค้างครบ | PM / Product Owner ยืนยัน U-04 |

ไม่ต้องขอ START ซ้ำ และไม่มีคำตัดสินจากผู้ใช้ที่จำเป็นเพื่อเริ่มใช้ checklist นี้ NQR-011 origin policy และ baseline/candidate เป็น dependencies ของการตรวจทางวิศวกรรม ให้ทีม resolve ตาม ownership ก่อนส่งคำถามถึงผู้ใช้

## 8. Checklist สำหรับ PM ก่อนส่งมอบ

- [ ] ระบุ integrated candidate, changed-file summary และวิธีทำซ้ำจาก TL
- [ ] AC-01–13 มีผลและ evidence ครบ หรือระบุ conditional handoff พร้อมรายการที่ยังตรวจไม่ได้
- [ ] test/build logs, browser/UAT evidence, network/privacy review และ accessibility checks แยก actual จาก inferred
- [ ] fixes มี independent review + QA retest; ไม่มี release-blocking defect ค้าง
- [ ] known issues รวม K-01 มี severity/impact/owner และคำตัดสินที่มีผู้อนุมัติชัดเจน
- [ ] มี operational/release/rollback instructions โดยยังไม่ deploy
- [ ] แยก engineering readiness, launch gates U-01–04 และ final user acceptance ชัดเจน

รายงานนี้เสร็จเฉพาะการจัดทำ acceptance checklist; ผล UAT/engineering/ธนาคารทุกข้อยังไม่ได้รับรองในงาน NQR-002
