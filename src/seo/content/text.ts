import type { QrTypeSeo } from "@/seo/types";

export const textSeo: QrTypeSeo = {
  type: "text",
  slug: "text",
  content: {
    th: {
      title: "สร้าง QR Code จากข้อความ ภาษาไทยได้",
      description:
        "พิมพ์ข้อความอะไรก็ได้แล้วแปลงเป็น QR Code สแกนแล้วอ่านได้เลยโดยไม่ต้องต่อเน็ต รองรับภาษาไทยเต็มรูปแบบ ดาวน์โหลดฟรีเป็น PNG SVG หรือ PDF",
      h1: "สร้าง QR Code จากข้อความ",
      lead: "เหมาะกับข้อความที่อยากให้สแกนแล้วอ่านได้ทันที เช่น รหัสเครื่อง เลขที่พัสดุ วิธีใช้งานสั้น ๆ หรือข้อความบนป้าย ตัวอักษรทั้งหมดอยู่ในตัว QR เอง สแกนได้แม้ไม่มีสัญญาณอินเทอร์เน็ต",
      shortLabel: "ข้อความ",
      steps: [
        {
          title: "พิมพ์ข้อความที่ต้องการ",
          body: "ใส่ได้สูงสุด 1,200 ตัวอักษร ขึ้นบรรทัดใหม่ได้ ยิ่งข้อความสั้น ตารางจุดยิ่งโปร่งและสแกนง่ายขึ้นชัดเจน",
        },
        {
          title: "ดูตัวอย่างสด ๆ ขณะพิมพ์",
          body: "สังเกตความถี่ของจุดขณะพิมพ์ ถ้าจุดเริ่มถี่จนดูเป็นเนื้อเดียวกัน แปลว่าข้อความยาวเกินกว่าที่จะพิมพ์ขนาดเล็กแล้วยังสแกนติด",
        },
        {
          title: "ทดสอบสแกนแล้วดาวน์โหลด",
          body: "ส่องด้วยมือถือหนึ่งครั้งเพื่อดูว่าข้อความไทยแสดงผลครบถ้วน แล้วจึงเลือกไฟล์ PNG SVG หรือ PDF",
        },
      ],
      sections: [
        {
          heading: "ภาษาไทยกินพื้นที่มากกว่าภาษาอังกฤษราวสามเท่า",
          body: "QR เก็บข้อมูลเป็นไบต์ ไม่ใช่ตัวอักษร ตัวอักษรอังกฤษหนึ่งตัวใช้หนึ่งไบต์ แต่ตัวอักษรไทยหนึ่งตัวใช้สามไบต์ในการเข้ารหัสแบบ UTF-8 ข้อความไทย 300 ตัวอักษรจึงหนักเท่ากับข้อความอังกฤษเกือบ 900 ตัวอักษร นี่คือเหตุผลที่ QR ภาษาไทยดูถี่กว่าเสมอทั้งที่ข้อความสั้นกว่า",
        },
      ],
      faqs: [
        {
          question: "สแกนแล้วต้องต่ออินเทอร์เน็ตไหม",
          answer:
            "ไม่ต้อง ข้อความทั้งหมดอยู่ในตัว QR ไม่ได้ชี้ไปที่เว็บไหน แอปกล้องจะแสดงข้อความออกมาให้อ่านทันที เหมาะกับป้ายในโรงงาน ในลิฟต์ หรือที่ที่สัญญาณไม่ดี",
        },
        {
          question: "ใส่ภาษาไทยแล้วสแกนออกเป็นตัวประหลาดไหม",
          answer:
            "แอปกล้องบนไอโฟนและแอนดรอยด์รุ่นปัจจุบันอ่าน UTF-8 ได้ถูกต้อง แต่เครื่องยิงบาร์โค้ดในคลังสินค้าบางรุ่นตั้งค่ามาให้อ่านเฉพาะภาษาอังกฤษ ถ้างานของคุณต้องใช้กับเครื่องยิงบาร์โค้ด ให้ทดสอบกับเครื่องรุ่นนั้นก่อนพิมพ์จริง",
        },
        {
          question: "ใส่ข้อความยาวได้แค่ไหน",
          answer:
            "เราจำกัดไว้ที่ 1,200 ตัวอักษร ไม่ใช่เพราะมาตรฐาน QR ทำได้แค่นั้น แต่เพราะเกินจากนี้ตารางจุดจะถี่จนมือถือทั่วไปสแกนจากขนาดพิมพ์ปกติไม่ติด ถ้าข้อความยาวกว่านั้นควรใช้ QR แบบลิงก์ชี้ไปหน้าเว็บแทน",
        },
      ],
      privacyNote:
        "ข้อความถูกแปลงเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากเข้าสู่ระบบแล้วกดบันทึก QR ข้อความและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free Text QR Code Generator",
      description:
        "Turn any text into a QR code that reads offline — no link, no internet needed to scan. Full Thai and Unicode support. Download PNG, SVG or PDF free.",
      h1: "Text QR code generator",
      lead: "For text you want readable the moment it is scanned: a serial number, a tracking reference, short instructions, a note on a sign. The characters live inside the symbol itself, so it works with no network connection at all.",
      shortLabel: "Text",
      steps: [
        {
          title: "Type your text",
          body: "Up to 1,200 characters, line breaks allowed. Shorter text produces a visibly sparser grid that scans from further away and at smaller print sizes.",
        },
        {
          title: "Watch the preview as you type",
          body: "If the modules start blurring into a solid texture, the text is too long to print small and still scan.",
        },
        {
          title: "Test-scan, then download",
          body: "Point a phone at it once to confirm the whole string comes back intact, then pick PNG, SVG or PDF.",
        },
      ],
      sections: [
        {
          heading: "Thai text costs about three times as much space",
          body: "A QR code stores bytes, not characters. A Latin letter is one byte; a Thai character is three under UTF-8. So 300 Thai characters weigh about the same as 900 English ones. That is why a Thai QR code always looks denser than an English one of the same apparent length.",
        },
      ],
      faqs: [
        {
          question: "Does scanning need an internet connection?",
          answer:
            "No. The text is in the code itself and points nowhere, so the camera app displays it immediately. That makes it a good fit for factory floors, lifts, and anywhere signal is unreliable.",
        },
        {
          question: "Will non-Latin characters come back garbled?",
          answer:
            "Current iPhone and Android camera apps decode UTF-8 correctly. Some warehouse barcode scanners are configured for ASCII only and will mangle non-Latin text — if handheld scanners are part of your workflow, test on that exact model before printing.",
        },
        {
          question: "How much text can I fit?",
          answer:
            "We cap it at 1,200 characters. That is not the format's limit, it is the practical one: beyond it the grid gets too fine for a phone to read at ordinary print sizes. For longer content, use a URL code pointing at a page instead.",
        },
      ],
      privacyNote:
        "Your text is encoded into the QR code in your browser and is not sent to our server while you generate or download it. If you sign in and choose Save QR, the text and style are stored in your account.",
    },
  },
};
