import type { QrTypeSeo } from "@/seo/types";

export const emailSeo: QrTypeSeo = {
  type: "email",
  slug: "email",
  content: {
    th: {
      title: "สร้าง QR Code อีเมล พร้อมหัวข้อและข้อความ",
      description:
        "ทำ QR Code ที่สแกนแล้วเปิดแอปอีเมลพร้อมกรอกผู้รับ หัวข้อ และเนื้อความไว้ให้เรียบร้อย เหลือแค่กดส่ง ใช้ฟรี ไม่ต้องสมัคร ดาวน์โหลด PNG SVG PDF",
      h1: "สร้าง QR Code อีเมล",
      lead: "เหมาะกับป้ายรับเรื่องร้องเรียน ใบเสนอราคา หรือแบบฟอร์มติดต่อกลับ ผู้สแกนจะได้หน้าต่างเขียนอีเมลที่กรอกผู้รับ หัวข้อ และข้อความตั้งต้นไว้แล้ว ลดโอกาสพิมพ์อีเมลผิดจนเรื่องหาย",
      shortLabel: "อีเมล",
      steps: [
        {
          title: "ใส่อีเมลผู้รับ",
          body: "ตรวจให้ดีสักครั้ง เพราะเมื่อพิมพ์ป้ายไปแล้ว อีเมลที่พิมพ์ผิดหนึ่งตัวหมายถึงข้อความที่ไม่มีวันถึงคุณ",
        },
        {
          title: "ตั้งหัวข้อที่ช่วยคุณคัดแยกทีหลัง",
          body: "เช่น ใส่รหัสสาขาหรือชื่อแคมเปญไว้ในหัวข้อ ทำให้ตั้งตัวกรองในกล่องจดหมายได้ง่ายและรู้ว่าเรื่องมาจากป้ายใบไหน",
        },
        {
          title: "ใส่ข้อความตั้งต้นสั้น ๆ",
          body: "เขียนโครงคำถามที่คุณอยากได้คำตอบ เช่น ชื่อ เบอร์ติดต่อกลับ และรายละเอียดปัญหา ผู้ส่งจะกรอกต่อได้เลย",
        },
        {
          title: "ทดสอบสแกนแล้วดาวน์โหลด",
          body: "ส่องดูว่าแอปอีเมลเปิดขึ้นมาพร้อมข้อมูลครบ แล้วจึงเลือกไฟล์ที่เหมาะกับสื่อของคุณ",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "สแกนแล้วส่งอีเมลออกไปเลยหรือเปล่า",
          answer:
            "ไม่ QR นี้แค่เปิดหน้าต่างเขียนอีเมลพร้อมข้อมูลที่กรอกไว้ให้ ผู้สแกนต้องกดส่งเองเสมอ และแก้ไขข้อความก่อนส่งได้",
        },
        {
          question: "ใส่หัวข้อและเนื้อความภาษาไทยได้ไหม",
          answer:
            "ได้ ข้อความไทยจะถูกเข้ารหัสในรูปแบบที่ปลอดภัยสำหรับลิงก์ก่อนใส่ลงใน QR แอปอีเมลบนไอโฟนและแอนดรอยด์แสดงผลได้ถูกต้อง แต่เนื้อความยาวมาก ๆ อาจถูกแอปบางตัวตัดท้าย จึงควรเขียนสั้นและทดสอบก่อน",
        },
        {
          question: "ถ้าเครื่องผู้สแกนไม่มีแอปอีเมลจะเป็นอย่างไร",
          answer:
            "เครื่องจะไม่รู้ว่าจะเปิดอะไร แล้วมักแสดงเป็นข้อความธรรมดาแทน เครื่องส่วนใหญ่มีแอปอีเมลติดมาอยู่แล้ว แต่ถ้ากลุ่มเป้าหมายของคุณใช้แอปแชทเป็นหลัก การใช้ QR แบบลิงก์ชี้ไปฟอร์มออนไลน์มักได้ผลตอบกลับมากกว่า",
        },
      ],
      privacyNote:
        "อีเมลผู้รับ หัวข้อ และเนื้อความถูกประกอบเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR ข้อมูลและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free Email QR Code Generator",
      description:
        "Make a QR code that opens a new email with the recipient, subject and body already filled in — the sender just taps send. Free, no sign-up, PNG/SVG/PDF download.",
      h1: "Email QR code generator",
      lead: "Good for feedback signs, quote requests and contact-back forms. Scanning opens a pre-addressed draft with your subject line and a starter message, which removes the mistyped-address failure mode entirely.",
      shortLabel: "Email",
      steps: [
        {
          title: "Enter the recipient address",
          body: "Check it once carefully. Once the sign is printed, a single wrong character means messages that never arrive.",
        },
        {
          title: "Write a subject line you can filter on",
          body: "Include a branch code or campaign name so your inbox rules can sort it and you can tell which printed sign it came from.",
        },
        {
          title: "Add a short starter message",
          body: "Sketch the questions you want answered — name, callback number, description of the issue. The sender fills in the blanks.",
        },
        {
          title: "Test-scan, then download",
          body: "Confirm the mail app opens with everything populated, then pick the format that suits your medium.",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "Does scanning send the email automatically?",
          answer:
            "No. It opens a pre-filled draft. The person scanning always has to press send, and can edit anything first.",
        },
        {
          question: "Can the subject and body contain non-Latin text?",
          answer:
            "Yes — it is percent-encoded before going into the code, and iOS and Android mail apps render it correctly. Very long bodies get truncated by some clients, so keep it short and test before printing.",
        },
        {
          question: "What if the scanner has no mail app installed?",
          answer:
            "The device will not know what to open and usually shows the raw text instead. Most phones ship with a mail app, but if your audience lives in chat apps, a URL code pointing at a web form generally gets more responses.",
        },
      ],
      privacyNote:
        "The address, subject, and body are turned into a QR code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, the data and style are stored in your account.",
    },
  },
};
