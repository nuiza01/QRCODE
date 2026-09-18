import type { QrTypeSeo } from "@/seo/types";

export const vcardSeo: QrTypeSeo = {
  type: "vcard",
  slug: "vcard",
  content: {
    th: {
      title: "สร้าง QR Code นามบัตร บันทึกเบอร์ในคลิกเดียว",
      description:
        "ทำ QR Code นามบัตร vCard ให้คนสแกนแล้วกดบันทึกชื่อ เบอร์ อีเมล และตำแหน่งลงสมุดโทรศัพท์ได้ทันที รองรับภาษาไทย ดาวน์โหลดฟรีทั้ง PNG SVG และ PDF",
      h1: "สร้าง QR Code นามบัตร",
      lead: "แทนที่จะให้อีกฝ่ายนั่งพิมพ์เบอร์จากนามบัตรกระดาษ ให้เขาส่องมือถือครั้งเดียวแล้วกดบันทึก ข้อมูลติดต่อจะเข้าสมุดโทรศัพท์ครบทั้งชื่อ ตำแหน่ง เบอร์ อีเมล และเว็บไซต์",
      shortLabel: "นามบัตร",
      steps: [
        {
          title: "กรอกเฉพาะข้อมูลที่จำเป็นก่อน",
          body: "ชื่อ นามสกุล เบอร์มือถือ และอีเมล คือชุดที่คนใช้จริง ยิ่งกรอกน้อย QR ยิ่งโปร่งและพิมพ์เล็กบนนามบัตรได้",
        },
        {
          title: "ใส่ตำแหน่งและองค์กรถ้าจำเป็น",
          body: "ช่วยให้อีกฝ่ายค้นเจอในสมุดโทรศัพท์ทีหลัง แต่ทุกตัวอักษรที่เพิ่มเข้าไปทำให้ตารางจุดถี่ขึ้น",
        },
        {
          title: "ทดสอบบันทึกจริงหนึ่งครั้ง",
          body: "สแกนแล้วกดบันทึกลงเครื่องดูจริง ๆ เพื่อตรวจว่าชื่อภาษาไทยแสดงถูกและเบอร์ไม่ตกหล่น",
        },
        {
          title: "ดาวน์โหลดเป็นเวกเตอร์สำหรับงานพิมพ์",
          body: "นามบัตรเป็นงานพิมพ์ความละเอียดสูง ควรใช้ SVG หรือ PDF เพื่อให้ขอบจุดคมและสแกนติดแม้พิมพ์ขนาดเล็ก",
        },
      ],
      sections: [
        {
          heading: "ทำไมนามบัตรถึงเป็นงานที่ QR แน่นเกินง่ายที่สุด",
          body: "นามบัตรมีพื้นที่ให้ QR ราว 1.5 ถึง 2 เซนติเมตรเท่านั้น ขณะที่ vCard ที่กรอกครบทุกช่องรวมที่อยู่และโน้ตยาว ๆ อาจมีข้อมูลหลายร้อยไบต์ ผลคือจุดถี่มากจนกล้องมือถือโฟกัสไม่ทันในระยะปกติ ถ้าจำเป็นต้องใส่ข้อมูลเยอะ ให้ทำ QR แบบลิงก์ชี้ไปหน้าโปรไฟล์แทน แล้วเก็บ vCard ไว้ในหน้านั้น",
        },
      ],
      faqs: [
        {
          question: "สแกนแล้วบันทึกลงสมุดโทรศัพท์ได้เลยไหม",
          answer:
            "ได้ เราสร้างเป็นรูปแบบ vCard เวอร์ชัน 3.0 ซึ่งทั้งไอโฟนและแอนดรอยด์อ่านได้ กล้องจะขึ้นให้กดเพิ่มรายชื่อ ผู้สแกนยังตรวจดูข้อมูลก่อนกดบันทึกได้",
        },
        {
          question: "ใส่ชื่อภาษาไทยได้ไหม",
          answer:
            "ได้ ระบบเข้ารหัสเป็น UTF-8 ชื่อภาษาไทยจึงเข้าสมุดโทรศัพท์ถูกต้อง แต่ตัวอักษรไทยกินพื้นที่ราวสามเท่าของตัวอักษรอังกฤษ ถ้าใส่ทั้งชื่อไทยและชื่ออังกฤษ QR จะถี่ขึ้นพอสมควร",
        },
        {
          question: "แก้เบอร์ทีหลังแล้ว QR บนนามบัตรที่พิมพ์ไปแล้วจะอัปเดตไหม",
          answer:
            "ไม่ ข้อมูลทั้งหมดฝังอยู่ในตัว QR ที่พิมพ์ไปแล้ว ถ้าเบอร์เปลี่ยนบ่อยหรือเปลี่ยนงาน ให้ทำ QR ชี้ไปหน้าโปรไฟล์ที่คุณแก้ไขเองได้แทน",
        },
      ],
      privacyNote:
        "ข้อมูลติดต่อถูกประกอบเป็น vCard ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR ข้อมูล vCard และรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free vCard QR Code Generator",
      description:
        "Create a business-card QR code that saves your name, phone, email and job title straight into someone's contacts. Free PNG, SVG and PDF download.",
      h1: "vCard QR code generator",
      lead: "Instead of watching someone retype your number off a paper card, let them scan once and tap save. Name, title, phone, email and website land in their address book complete.",
      shortLabel: "vCard",
      steps: [
        {
          title: "Fill in the essentials first",
          body: "Name, mobile number and email are the fields people actually use. The fewer you fill, the sparser the symbol and the smaller it can be printed.",
        },
        {
          title: "Add title and organisation if they help",
          body: "They make you findable in someone's contacts later — at the cost of a denser grid for every character added.",
        },
        {
          title: "Do one real save test",
          body: "Scan it and actually save the contact, to confirm the name renders correctly and no digits are missing.",
        },
        {
          title: "Download vector for print",
          body: "Business cards are high-resolution print. Use SVG or PDF so module edges stay crisp and the code still scans at small sizes.",
        },
      ],
      sections: [
        {
          heading: "Business cards are where QR codes get overloaded",
          body: "A card leaves room for a code about 1.5–2 cm across, while a fully populated vCard with a postal address and a long note can run to several hundred bytes. The result is a grid so fine a phone camera cannot focus on it at normal distance. If you need to carry a lot of detail, use a URL code pointing at a profile page and host the vCard there.",
        },
      ],
      faqs: [
        {
          question: "Does scanning add the contact directly?",
          answer:
            "Yes. We emit vCard 3.0, which both iOS and Android read natively — the camera offers an 'add contact' action, and the person scanning can review the details before saving.",
        },
        {
          question: "Are non-Latin names supported?",
          answer:
            "Yes, everything is encoded as UTF-8, so Thai and other scripts save correctly. Note that Thai characters cost roughly three times as many bytes as Latin ones, so including both a Thai and an English name noticeably densifies the code.",
        },
        {
          question: "If my number changes, does the printed code update?",
          answer:
            "No — the details are frozen into the printed symbol. If your contact details move often, point a URL code at a profile page you can edit instead.",
        },
      ],
      privacyNote:
        "Your contact details are assembled into a vCard in your browser and are not sent to our server while you generate or download it. If you choose Save QR, the vCard data and style are stored in your account.",
    },
  },
};
