import type { QrTypeSeo } from "@/seo/types";

export const smsSeo: QrTypeSeo = {
  type: "sms",
  slug: "sms",
  content: {
    th: {
      title: "สร้าง QR Code SMS พร้อมข้อความตั้งต้น",
      description:
        "ทำ QR Code ที่สแกนแล้วเปิดหน้าเขียน SMS พร้อมเบอร์ปลายทางและข้อความตั้งต้น เหมาะกับลงทะเบียนหรือแจ้งเรื่องด้วยข้อความสั้น ใช้ฟรี ไม่ต้องสมัคร",
      h1: "สร้าง QR Code SMS",
      lead: "ให้ลูกค้าสแกนแล้วส่งข้อความหาคุณได้ในสองการกด โดยไม่ต้องจดเบอร์และไม่ต้องพิมพ์ข้อความเอง เหมาะกับการลงทะเบียนหน้างาน แจ้งซ่อม หรือรับคำสั่งซื้อผ่านข้อความ",
      shortLabel: "SMS",
      steps: [
        {
          title: "ใส่เบอร์ปลายทาง",
          body: "ถ้ามีผู้สแกนจากต่างประเทศ ให้ใส่รูปแบบสากลขึ้นต้นด้วย +66 แล้วตัดเลขศูนย์ตัวหน้าออก เช่น +66812345678",
        },
        {
          title: "เขียนข้อความตั้งต้น",
          body: "ข้อความที่เตรียมไว้ควรมีคำสำคัญที่คุณใช้คัดแยก เช่น รหัสสาขาหรือรหัสสินค้า เพื่อให้รู้ทันทีว่าข้อความมาจากป้ายไหน",
        },
        {
          title: "ทดสอบสแกนก่อนพิมพ์",
          body: "ตรวจว่าหน้าเขียนข้อความเปิดขึ้นพร้อมเบอร์และข้อความครบถ้วน แล้วจึงดาวน์โหลด",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "สแกนแล้วส่งข้อความออกไปเลยไหม",
          answer:
            "ไม่ เครื่องจะเปิดหน้าเขียนข้อความพร้อมเบอร์และข้อความที่เตรียมไว้ ผู้สแกนต้องกดส่งเอง และแก้ข้อความก่อนส่งได้",
        },
        {
          question: "ใครเป็นคนจ่ายค่าส่ง SMS",
          answer:
            "ผู้ที่สแกนและกดส่งเป็นคนจ่ายตามแพ็กเกจของเขาเอง เราไม่ได้ส่งข้อความให้และไม่ได้เกี่ยวข้องกับการส่งเลย QR ทำหน้าที่แค่เปิดหน้าเขียนข้อความในเครื่องของเขา",
        },
        {
          question: "ข้อความตั้งต้นภาษาไทยจะแสดงผลถูกไหม",
          answer:
            "แสดงได้ถูกต้องบนเครื่องปัจจุบันทั่วไป แต่ข้อความภาษาไทยทำให้ SMS หนึ่งฉบับนับจำนวนตัวอักษรได้น้อยลงกว่าภาษาอังกฤษมาก และข้อความตั้งต้นยาว ๆ ยังทำให้ QR ถี่ขึ้นด้วย จึงควรเขียนสั้นที่สุดเท่าที่ยังสื่อความได้",
        },
      ],
      privacyNote:
        "เบอร์ปลายทางและข้อความถูกประกอบเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR ข้อมูลและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free SMS QR Code Generator",
      description:
        "Create a QR code that opens a text message with the number and a starter message already filled in. Ideal for on-site sign-ups and quick reports. Free, no account.",
      h1: "SMS QR code generator",
      lead: "Let people message you in two taps — no number to copy down, no message to compose. Useful for event sign-ups, maintenance reports and text-based orders.",
      shortLabel: "SMS",
      steps: [
        {
          title: "Enter the destination number",
          body: "If anyone might scan from abroad, use the international form: country code first, leading zero dropped — for example +66812345678.",
        },
        {
          title: "Write the starter message",
          body: "Include a keyword you can sort on, like a branch or product code, so you know which printed sign each message came from.",
        },
        {
          title: "Test-scan before printing",
          body: "Confirm the compose screen opens with both the number and the message intact, then download.",
        },
      ],
      sections: [],
      faqs: [
        {
          question: "Does scanning send the message automatically?",
          answer:
            "No. The phone opens its compose screen pre-filled. The person scanning presses send, and can edit the text first.",
        },
        {
          question: "Who pays for the SMS?",
          answer:
            "Whoever scans and sends it, on their own plan. We do not send anything and are not involved in delivery — the code only opens the compose screen on their device.",
        },
        {
          question: "Are non-Latin starter messages supported?",
          answer:
            "They display correctly on current devices, but non-Latin text drastically reduces how much fits in a single SMS segment, and a long starter message also densifies the QR code. Keep it as short as it can be while still making sense.",
        },
      ],
      privacyNote:
        "The number and message are assembled into a QR code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, the data and style are stored in your account.",
    },
  },
};
