import type { QrTypeSeo } from "@/seo/types";

export const telSeo: QrTypeSeo = {
  type: "tel",
  slug: "tel",
  content: {
    th: {
      title: "สร้าง QR Code เบอร์โทร สแกนแล้วโทรได้เลย",
      description:
        "ทำ QR Code เบอร์โทรศัพท์ติดหน้าร้าน ป้าย หรือรถ ลูกค้าสแกนแล้วขึ้นหน้าโทรออกพร้อมเบอร์ ไม่ต้องจดไม่ต้องพิมพ์ ใช้ฟรี ดาวน์โหลด PNG SVG PDF",
      h1: "สร้าง QR Code เบอร์โทร",
      lead: "เบอร์ที่พิมพ์ตัวเล็ก ๆ บนป้ายมักถูกพิมพ์ผิดหนึ่งหลักแล้วโทรไม่ติด QR เบอร์โทรตัดปัญหานั้นออก ผู้สแกนได้หน้าโทรออกพร้อมเบอร์ที่ถูกต้องอยู่แล้ว เหลือแค่กดโทร",
      shortLabel: "เบอร์โทร",
      steps: [
        {
          title: "ใส่เบอร์โทรศัพท์",
          body: "ใส่เป็นตัวเลขล้วน หรือใส่รูปแบบสากล +66 ถ้าคาดว่าจะมีคนโทรจากต่างประเทศ",
        },
        {
          title: "พิมพ์ให้ใหญ่พอกับระยะที่คนจะยืนสแกน",
          body: "ป้ายหน้าร้านที่คนยืนสแกนห่างหนึ่งเมตร ควรมี QR กว้างอย่างน้อยสิบเซนติเมตร ป้ายบนรถหรือป้ายริมถนนต้องใหญ่กว่านั้นมาก",
        },
        {
          title: "ทดสอบสแกนจากระยะใช้งานจริง",
          body: "อย่าทดสอบจากหน้าจอในระยะสิบเซนติเมตร ให้ลองยืนห่างเท่าที่ลูกค้าจะยืนจริง",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "สแกนแล้วโทรออกทันทีเลยไหม",
          answer:
            "ไม่ เครื่องจะขึ้นหน้าโทรออกพร้อมเบอร์ให้เห็นก่อน ผู้สแกนต้องกดโทรเอง ซึ่งเป็นพฤติกรรมมาตรฐานของทั้งไอโฟนและแอนดรอยด์ เพื่อไม่ให้ QR ปลอมพาไปโทรเบอร์เสียเงินโดยไม่รู้ตัว",
        },
        {
          question: "ใส่เบอร์ต่อภายในได้ไหม",
          answer:
            "ใส่ได้ แต่ไม่แนะนำ เพราะการรองรับตัวคั่นสำหรับหมายเลขต่อภายในต่างกันไปในแต่ละเครื่องและแต่ละแอปโทรศัพท์ บางเครื่องกดต่อให้ บางเครื่องหยุดที่เบอร์หลัก ถ้าต้องการให้ถึงคนที่ต้องการแน่นอน ให้ใช้เบอร์ตรง",
        },
      ],
      privacyNote:
        "เบอร์โทรถูกแปลงเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR เบอร์โทรและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free Phone Number QR Code Generator",
      description:
        "Turn a phone number into a QR code for shopfronts, signage and vehicles. Scanning opens the dialler with the number ready. Free, no sign-up, PNG/SVG/PDF.",
      h1: "Phone QR code generator",
      lead: "A number set in small type on a sign gets one digit mistyped and the call never lands. A phone QR code removes that: the scanner gets the dialler already populated with the correct number and just presses call.",
      shortLabel: "Phone",
      steps: [
        {
          title: "Enter the number",
          body: "Digits alone are fine, or use the international form with a country code if callers may be dialling from abroad.",
        },
        {
          title: "Print it big enough for the viewing distance",
          body: "A shopfront sign scanned from a metre away wants a code at least 10 cm wide. Vehicle liveries and roadside signs need considerably more.",
        },
        {
          title: "Test-scan from the real distance",
          body: "Do not test from 10 cm off a monitor. Stand where your customer will actually stand.",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "Does it dial immediately?",
          answer:
            "No. The phone shows the dialler with the number visible and the person presses call. Both iOS and Android behave this way deliberately, so a malicious code cannot silently dial a premium-rate line.",
        },
        {
          question: "Can I include an extension?",
          answer:
            "You can, but it is not recommended. Support for pause and wait separators varies between handsets and dialler apps — some dial the extension, some stop at the main number. If reaching a specific person matters, use a direct line.",
        },
      ],
      privacyNote:
        "The number is encoded into the QR code in your browser and is not sent to our server while you generate or download it. If you choose Save QR, the number and style are stored in your account.",
    },
  },
};
