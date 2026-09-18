import type { Bundle } from "@/i18n/config";

type LegalPage = {
  title: string;
  description: string;
  updated: string;
  sections: Array<{
    heading: string;
    paragraphs: string[];
  }>;
};

export const privacyStrings: Bundle<LegalPage> = {
  th: {
    title: "นโยบายความเป็นส่วนตัว",
    description: "วิธีที่ Nexora QR ดูแลข้อมูลบัญชี ข้อมูล QR ที่คุณเลือกบันทึก และข้อมูลจาก Google",
    updated: "ปรับปรุงล่าสุด 31 สิงหาคม 2569",
    sections: [
      {
        heading: "การสร้าง QR และการเลือกบันทึก",
        paragraphs: [
          "คุณสามารถสร้างและดาวน์โหลด Static QR ได้ฟรีโดยไม่ต้องสร้างบัญชี ข้อมูลที่กรอกถูกประมวลผลในเบราว์เซอร์ของคุณ และจะไม่ถูกส่งมาเก็บบนเซิร์ฟเวอร์เพียงเพราะคุณสร้าง ดูตัวอย่าง ทดสอบ หรือดาวน์โหลด QR",
          "หากคุณเข้าสู่ระบบแล้วกด “บันทึก QR” เราจะเก็บชื่อ QR, payload ที่ใช้สร้าง QR และรูปแบบการแสดงผลไว้ในบัญชีของคุณ การบันทึกนี้เป็นการกระทำที่คุณเลือกอย่างชัดเจน payload อาจมีข้อมูลละเอียดอ่อนที่คุณกรอกเอง เช่น รหัสผ่าน WiFi, เบอร์โทร, ข้อมูลติดต่อ, พิกัด, รายละเอียดนัดหมาย หรือหมายเลขที่ใช้สร้าง PromptPay QR โปรดบันทึกเฉพาะข้อมูลที่คุณต้องการเก็บบนบริการนี้",
          "ใน Phase 2A บัญชี Free บันทึก Static QR ได้สูงสุด 25 รายการพร้อมกัน ส่วนโควตา Dynamic QR 5 รายการเป็นแผนสำหรับระยะถัดไปและยังไม่เปิดใช้งาน ขณะนี้ยังไม่มี Dynamic redirect หรือการเก็บเหตุการณ์สแกนจากฟีเจอร์ดังกล่าว",
        ],
      },
      {
        heading: "การเข้าสู่ระบบด้วย Google",
        paragraphs: [
          "การเข้าสู่ระบบด้วย Google จำเป็นก่อนใช้งานตัวสร้าง QR เราขอเฉพาะสิทธิ์พื้นฐานสำหรับชื่อ อีเมลที่ยืนยันแล้ว และข้อมูลโปรไฟล์มาตรฐาน เพื่อสร้างและแสดงบัญชีของคุณ เราไม่ขอสิทธิ์อ่านอีเมล Gmail, Google Drive, รายชื่อติดต่อ หรือปฏิทิน",
          "เมื่อเข้าสู่ระบบ เราเก็บข้อมูลผู้ใช้ session และบัญชี Google ที่จำเป็นต่อการยืนยันตัวตนไว้ในฐานข้อมูล รวมถึง identifier และ token ที่ผู้ให้บริการส่งให้ตามขอบเขตที่อนุญาต คุกกี้ session ใช้ token แบบ opaque จำกัดการเข้าถึงจากสคริปต์บนหน้าเว็บ และมีอายุไม่เกิน 7 วัน การออกจากระบบยุติ session ปัจจุบัน แต่ไม่ได้ลบบัญชีหรือ QR ที่คุณเคยบันทึก",
          "ระบบถูกกำหนดไม่ให้บันทึก IP address ดิบไว้ใน session และ Phase 2A ยังไม่เก็บเหตุการณ์สแกนหรือข้อมูล analytics หากเปิด analytics ในระยะถัดไป เราจะไม่เก็บ IP address ดิบ และข้อมูลเหตุการณ์สแกนดิบของแผน Free จะมีนโยบายเก็บไม่เกิน 30 วัน",
        ],
      },
      {
        heading: "ระยะเวลาการเก็บ การลบ และข้อมูลสำรอง",
        paragraphs: [
          "QR ที่บันทึกจะอยู่ในบัญชีจนกว่าคุณจะลบผ่านแดชบอร์ด การลบจะนำรายการนั้นออกจากฐานข้อมูลหลักตามการทำงานปัจจุบัน ส่วนการลบบัญชีทั้งบัญชียังไม่มีเมนูให้ทำเอง โปรดติดต่อเจ้าของบริการหากต้องการขอให้ลบบัญชีและข้อมูลที่เกี่ยวข้อง",
          "การสำรองและกู้คืนฐานข้อมูลนอกเครื่องโฮสต์เป็นประตูที่ต้องผ่านก่อนเปิดใช้ฐานข้อมูลจริง เรายังไม่ประกาศระยะเวลาการเก็บข้อมูลสำรองแบบตายตัว จึงไม่อ้างว่าการลบจากฐานข้อมูลหลักจะลบสำเนาสำรองทั้งหมดทันที หากเปิดใช้ข้อมูลสำรอง เราจะเผยแพร่ระยะเวลาและขั้นตอนการลบที่ใช้จริงก่อนให้บริการ",
        ],
      },
      {
        heading: "การเปิดเผยและการขายข้อมูล",
        paragraphs: [
          "เราไม่ขายข้อมูลส่วนบุคคล Google ประมวลผลข้อมูลที่เกี่ยวข้องกับการเข้าสู่ระบบ ส่วน HostAtom เป็นผู้ให้บริการเว็บโฮสติ้งและฐานข้อมูล MariaDB ปัจจุบัน จึงประมวลผลข้อมูลบัญชี session และ QR ที่คุณเลือกบันทึกบนระบบที่ใช้ให้บริการ Nexora QR ผู้ให้บริการแต่ละรายดำเนินการตามนโยบายของตนเอง",
        ],
      },
      {
        heading: "สิทธิ์และการติดต่อ",
        paragraphs: [
          "คุณสามารถลบ QR ที่บันทึกไว้จากแดชบอร์ด ออกจากระบบ ล้างคุกกี้ และเพิกถอนสิทธิ์ Nexora QR จากหน้าความปลอดภัยของบัญชี Google ได้ การเพิกถอนสิทธิ์ Google ไม่ได้ลบข้อมูลที่บันทึกไว้ใน Nexora QR โดยอัตโนมัติ หากต้องการสอบถาม ขอสำเนา แก้ไข หรือลบบัญชีและข้อมูล โปรดติดต่อเจ้าของบริการผ่านเว็บไซต์ Orenvis ที่ orenvis.com",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    description: "How Nexora QR handles account data, QR data you choose to save, and Google sign-in data",
    updated: "Last updated August 31, 2026",
    sections: [
      {
        heading: "Creating and choosing to save QR codes",
        paragraphs: [
          "Google sign-in is required before using the QR generator. Static QR codes remain free and unlimited. Your inputs are processed in your browser and are not sent to our server until you choose to save a QR code.",
          "If you sign in and press “Save QR”, we store the QR name, generation payload, and visual style in your account. This is an explicit action you choose. A payload can contain sensitive information you entered, such as a WiFi password, phone number, contact details, coordinates, event details, or an identifier used to generate a PromptPay QR code. Save only information that you intend to store with this service.",
          "In Phase 2A, a Free account can hold up to 25 saved Static QR codes at one time. The five-code Dynamic QR allowance is planned for a later phase and is not active. There is currently no Dynamic redirect or scan-event collection from that feature.",
        ],
      },
      {
        heading: "Google sign-in",
        paragraphs: [
          "Sign-in is optional. We request only basic identity access for your name, verified email address, and standard profile information so we can create and display your account. We do not request access to Gmail messages, Google Drive, contacts, or calendars.",
          "When you sign in, we persist the user, session, and Google provider-account records needed for authentication, including provider identifiers and tokens supplied within the granted scope. The session cookie carries an opaque token, is unavailable to page scripts, and expires within 7 days. Signing out ends the current session; it does not delete your account or QR codes you previously saved.",
          "The service is configured not to persist raw IP addresses in session records. Phase 2A does not collect scan events or analytics. If analytics is enabled in a later phase, raw IP addresses will not be stored and Free-plan raw scan events will have a maximum 30-day retention policy.",
        ],
      },
      {
        heading: "Retention, deletion, and backups",
        paragraphs: [
          "A saved QR code remains in your account until you delete it from the dashboard. Deleting it removes that record from the primary database under the current implementation. Self-service deletion of the entire account is not yet available; contact the service owner to request deletion of your account and associated data.",
          "An off-host database backup and restore check is a release gate before database-backed operation. We have not yet published a fixed backup-retention period, so we do not claim that deleting a primary record immediately removes every backup copy. If backups are activated, the actual retention period and deletion process will be published before service use.",
        ],
      },
      {
        heading: "Disclosure and sale",
        paragraphs: [
          "We do not sell personal information. Google processes data involved in sign-in. HostAtom is the current web-hosting and MariaDB provider, so it processes account, session, and QR data you choose to save on the infrastructure used to deliver Nexora QR. Each provider operates under its own policies.",
        ],
      },
      {
        heading: "Your choices and contact",
        paragraphs: [
          "You can delete saved QR codes from the dashboard, sign out, clear cookies, and revoke Nexora QR from your Google Account security settings. Revoking Google access does not automatically delete data stored by Nexora QR. For questions or requests to access, correct, or delete your account and data, contact the service owner through the Orenvis website at orenvis.com.",
        ],
      },
    ],
  },
};

export const termsStrings: Bundle<LegalPage> = {
  th: {
    title: "ข้อกำหนดการใช้งาน",
    description: "ข้อกำหนดสำหรับการใช้บริการสร้าง QR ของ Nexora QR",
    updated: "ปรับปรุงล่าสุด 31 สิงหาคม 2569",
    sections: [
      {
        heading: "บริการฟรีและบัญชีทางเลือก",
        paragraphs: [
          "ตัวสร้าง QR ใช้งานได้ฟรีและไม่จำกัดจำนวนหลังเข้าสู่ระบบด้วย Google การเข้าสู่ระบบจำเป็นเพื่อใช้งานตัวสร้างและบันทึก QR บัญชี Free บันทึก Static QR ได้สูงสุด 25 รายการพร้อมกัน ส่วน Dynamic QR สูงสุด 5 รายการเป็นแผนระยะถัดไปและยังไม่เปิดใช้งาน",
        ],
      },
      {
        heading: "ความรับผิดชอบของผู้ใช้",
        paragraphs: [
          "คุณต้องมีสิทธิ์ใช้ข้อความ โลโก้ URL และข้อมูลที่นำมาสร้าง QR และต้องไม่ใช้บริการเพื่อการฉ้อโกง ฟิชชิง มัลแวร์ การละเมิดสิทธิ์ หรือกิจกรรมที่ผิดกฎหมาย",
          "ตรวจสอบปลายทาง ผู้รับเงิน จำนวนเงิน และความถูกต้องของ QR ก่อนเผยแพร่หรือใช้งานจริง โดยเฉพาะ QR ที่เกี่ยวข้องกับการชำระเงิน",
        ],
      },
      {
        heading: "ขอบเขตของบริการ",
        paragraphs: [
          "Nexora QR ช่วยสร้างและส่งออกภาพ QR แต่ไม่ได้เป็นธนาคาร ผู้ให้บริการชำระเงิน หรือผู้รับรองว่าแอปสแกนทุกชนิดจะตีความ QR เหมือนกัน บริการอาจเปลี่ยนแปลงหรือหยุดชั่วคราวเพื่อความปลอดภัยและการบำรุงรักษา",
        ],
      },
      {
        heading: "การรับประกันและความเสียหาย",
        paragraphs: [
          "บริการให้ตามสภาพที่เป็นอยู่ภายใต้ขอบเขตที่กฎหมายอนุญาต คุณเป็นผู้รับผิดชอบการทดสอบ QR และสำรองไฟล์ของตนเอง เราไม่รับผิดชอบต่อธุรกรรมที่ผู้ใช้ยืนยันเองหรือความเสียหายจากเนื้อหาและปลายทางที่ผู้ใช้กำหนด",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Use",
    description: "Terms for using the Nexora QR generation service",
    updated: "Last updated August 31, 2026",
    sections: [
      {
        heading: "Free service and optional account",
        paragraphs: [
          "The core QR generator is free and does not require sign-in. Google sign-in is optional and does not change access to basic QR creation or downloads. A Free account can hold up to 25 saved Static QR codes at one time; the five-code Dynamic QR allowance is planned for a later phase and is not yet active.",
        ],
      },
      {
        heading: "Your responsibilities",
        paragraphs: [
          "You must have the right to use any text, logo, URL, or other content placed in a QR code. Do not use the service for fraud, phishing, malware, rights infringement, or unlawful activity.",
          "Check the destination, payee, amount, and decoded content before publishing or using a QR code, especially for payment-related codes.",
        ],
      },
      {
        heading: "Service boundaries",
        paragraphs: [
          "Nexora QR generates and exports QR artwork. It is not a bank or payment provider and does not guarantee identical interpretation by every scanner application. The service may change or pause for security and maintenance.",
        ],
      },
      {
        heading: "Warranty and liability",
        paragraphs: [
          "The service is provided as-is to the extent permitted by law. You are responsible for testing your codes and keeping your own copies. We are not responsible for transactions you authorize or harm caused by user-supplied content and destinations.",
        ],
      },
    ],
  },
};
