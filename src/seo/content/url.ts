import type { QrTypeSeo } from "@/seo/types";

export const urlSeo: QrTypeSeo = {
  type: "url",
  slug: "url",
  content: {
    th: {
      title: "สร้าง QR Code จากลิงก์ ฟรี ไม่ต้องสมัคร",
      description:
        "วางลิงก์แล้วได้ QR Code ในหน้าเดียวหลังเข้าสู่ระบบด้วย Google ปรับสี ใส่โลโก้ ดาวน์โหลดเป็น PNG SVG หรือ PDF ใช้ฟรีไม่จำกัดจำนวน",
      h1: "สร้าง QR Code จากลิงก์",
      lead: "วางลิงก์เว็บไซต์ เพจ ไลน์ออฟฟิเชียล หรือฟอร์มลงไป แล้ว QR Code จะขึ้นให้เห็นทันทีขณะพิมพ์ ปรับสีและใส่โลโก้ได้ก่อนดาวน์โหลด โค้ดที่ได้เป็นแบบถาวร ไม่มีวันหมดอายุ และไม่ต้องเข้าสู่ระบบ",
      shortLabel: "ลิงก์",
      steps: [
        {
          title: "วางลิงก์ปลายทาง",
          body: "คัดลอก URL มาวางในช่อง ต้องมี https:// หรือ http:// นำหน้าด้วย ระบบรับเฉพาะสองแบบนี้เพื่อกันลิงก์อันตรายที่ซ่อนมาในรูปแบบอื่น",
        },
        {
          title: "ปรับหน้าตาให้เข้ากับงาน",
          body: "เลือกสีจุดและสีพื้น รูปทรงจุด หรือใส่โลโก้ตรงกลาง ถ้าสีตัดกันน้อยเกินไปจนสแกนยาก ระบบจะเตือนให้ก่อน",
        },
        {
          title: "ทดสอบสแกนด้วยมือถือจริง",
          body: "ยกมือถือขึ้นส่องหน้าจอก่อนดาวน์โหลดทุกครั้ง โดยเฉพาะถ้าใส่โลโก้หรือใช้สีเข้ม ๆ ใกล้กัน วิธีนี้ตัดปัญหาป้ายพิมพ์เสร็จแล้วสแกนไม่ติดไปได้เกือบทั้งหมด",
        },
        {
          title: "ดาวน์โหลดให้ตรงกับสื่อ",
          body: "งานพิมพ์เลือก SVG หรือ PDF เพราะขยายเท่าไรก็ไม่แตก งานบนจอเลือก PNG 512 หรือ 1024 พิกเซลก็พอ",
        },
      ],
      sections: [
        {
          heading: "ลิงก์ยิ่งสั้น QR ยิ่งสแกนง่าย",
          body: "ทุกตัวอักษรในลิงก์กลายเป็นจุดเพิ่มในตัว QR ลิงก์ที่มีพารามิเตอร์ติดตามยาว ๆ ต่อท้ายจะทำให้ตารางจุดถี่ขึ้นมาก และต้องพิมพ์ใหญ่กว่าเดิมถึงจะสแกนติด ถ้าลิงก์ยาวเกินไปให้ย่อลิงก์ก่อนแล้วค่อยนำมาสร้าง QR",
        },
        {
          heading: "ขนาดพิมพ์ขั้นต่ำที่ควรใช้",
          body: "หลักคร่าว ๆ คือ ระยะที่คนจะยืนสแกน หารด้วย 10 เท่ากับความกว้างขั้นต่ำของ QR เช่น สแกนจากระยะ 50 เซนติเมตร ควรพิมพ์อย่างน้อย 5 เซนติเมตร ถ้าเป็นป้ายที่ต้องสแกนจากระยะ 3 เมตร ต้องใหญ่ราว 30 เซนติเมตร",
        },
      ],
      faqs: [
        {
          question: "QR Code ที่สร้างมีวันหมดอายุไหม",
          answer:
            "ไม่มี ลิงก์ถูกฝังอยู่ในตัวรหัสโดยตรง ไม่ได้วิ่งผ่านเซิร์ฟเวอร์ของเรา ตราบใดที่หน้าเว็บปลายทางยังอยู่ QR ก็ใช้ได้ตลอด แม้เว็บนี้จะปิดไปแล้วก็ตาม",
        },
        {
          question: "สร้างเสร็จแล้วเปลี่ยนลิงก์ปลายทางทีหลังได้ไหม",
          answer:
            "ไม่ได้ เพราะลิงก์ฝังอยู่ในตัวรหัส ถ้าเปลี่ยนปลายทางต้องสร้าง QR ใหม่และเปลี่ยนสื่อที่พิมพ์ไปแล้วด้วย ถ้ารู้ล่วงหน้าว่าปลายทางจะเปลี่ยน ควรชี้ QR ไปที่ลิงก์กลางที่คุณควบคุมเองได้",
        },
        {
          question: "ดูได้ไหมว่ามีคนสแกนไปกี่ครั้ง",
          answer:
            "QR แบบฝังลิงก์ตรงนับไม่ได้ เพราะการสแกนเกิดขึ้นระหว่างมือถือกับเว็บปลายทางโดยไม่ผ่านเราเลย ถ้าต้องการตัวเลข ให้ใส่พารามิเตอร์ติดตามของระบบวิเคราะห์ที่คุณใช้อยู่ไว้ในลิงก์ก่อนสร้าง QR",
        },
        {
          question: "ใส่โลโก้ตรงกลางแล้วยังสแกนได้อยู่ไหม",
          answer:
            "ได้ ถ้าโลโก้ไม่ใหญ่เกินไป ระบบจะบังคับระดับการกู้คืนข้อมูลเป็นระดับสูงสุดให้อัตโนมัติเมื่อมีโลโก้ และจำกัดขนาดโลโก้ไม่ให้บังจุดมากเกินไป แต่ก็ควรทดสอบสแกนจริงทุกครั้ง",
        },
      ],
      privacyNote:
        "ลิงก์ถูกแปลงเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากเข้าสู่ระบบแล้วกดบันทึก QR ลิงก์และรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free URL QR Code Generator",
      description:
        "Paste a link and get a QR code instantly. Recolour it, add a logo, download PNG, SVG or PDF. Free, unlimited, no account, and the code never expires.",
      h1: "URL QR code generator",
      lead: "Paste any web address — a site, a landing page, a form — and the QR code appears as you type. Style it, add a logo, then download. The link is embedded in the symbol itself, so the code keeps working for as long as the page does.",
      shortLabel: "URL",
      steps: [
        {
          title: "Paste the destination link",
          body: "The address needs an https:// or http:// prefix. Those are the only two schemes accepted, because other schemes in a QR code are a phishing primitive rather than a feature.",
        },
        {
          title: "Style it for where it will live",
          body: "Pick module and background colours, a dot shape, or drop a logo in the middle. If the contrast drops too low to scan reliably, you get a warning before you download.",
        },
        {
          title: "Test-scan it with a real phone",
          body: "Point a phone at the screen before downloading, especially with a logo or a tight colour pairing. This one habit prevents almost every 'we printed 5,000 flyers and it doesn't scan' incident.",
        },
        {
          title: "Download the right format",
          body: "SVG or PDF for print — vector scales to any size without softening. PNG at 512 or 1024 px is plenty for screens.",
        },
      ],
      sections: [
        {
          heading: "Shorter links scan better",
          body: "Every character in the URL becomes more modules in the symbol. A link trailing a long string of tracking parameters produces a visibly denser grid that needs to be printed larger to stay readable. Shorten the link first, then generate the code.",
        },
        {
          heading: "Minimum print size",
          body: "Rule of thumb: scanning distance divided by ten is the minimum width. Scanned from 50 cm, print at least 5 cm wide. On a sign read from 3 m, you need roughly 30 cm.",
        },
      ],
      faqs: [
        {
          question: "Does the QR code expire?",
          answer:
            "No. The link is encoded directly into the symbol and never routes through our servers, so the code works for as long as the destination page does — even if this site disappears.",
        },
        {
          question: "Can I change the destination after printing?",
          answer:
            "Not with a code like this: the URL lives inside the symbol. Changing the destination means generating a new code and replacing the printed material. If you expect the target to move, point the QR code at a redirect you control.",
        },
        {
          question: "Can I see how many people scanned it?",
          answer:
            "Not from a code with the link embedded — the scan happens between the phone and the destination site without touching us at all. To count scans, add your own analytics tracking parameters to the link before generating the code.",
        },
        {
          question: "Will it still scan with a logo in the middle?",
          answer:
            "Yes, within limits. Adding a logo forces the highest error-correction level automatically and caps how much of the symbol the logo may cover. Test-scan anyway before committing to print.",
        },
      ],
      privacyNote:
        "Your link is turned into a QR code in your browser and is not sent to our server while you generate or download it. If you sign in and choose Save QR, the link and style are stored in your account.",
    },
  },
};
