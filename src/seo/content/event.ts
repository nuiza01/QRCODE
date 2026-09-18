import type { QrTypeSeo } from "@/seo/types";

export const eventSeo: QrTypeSeo = {
  type: "event",
  slug: "event",
  content: {
    th: {
      title: "สร้าง QR Code นัดหมาย เพิ่มลงปฏิทินในคลิกเดียว",
      description:
        "ทำ QR Code สำหรับงานอบรม สัมมนา หรืองานแต่ง สแกนแล้วเพิ่มลงปฏิทินได้ทันทีพร้อมวันเวลา สถานที่ และรายละเอียด ใช้ฟรีหลังเข้าสู่ระบบด้วย Google",
      h1: "สร้าง QR Code นัดหมาย",
      lead: "คนที่เห็นโปสเตอร์งานแล้วตั้งใจว่าจะมา มักลืมเพราะไม่ได้จดลงปฏิทินตอนนั้น QR นัดหมายปิดช่องว่างนั้น สแกนครั้งเดียวได้ทั้งวันเวลาและสถานที่เข้าปฏิทินพร้อมเตือนล่วงหน้า",
      shortLabel: "นัดหมาย",
      steps: [
        {
          title: "ตั้งชื่องานให้อ่านรู้เรื่องในปฏิทิน",
          body: "ชื่อที่จะไปโผล่ในปฏิทินของคนอื่นควรบอกได้ในตัวว่าคืองานอะไรของใคร เพราะเขาจะเห็นมันอีกทีในอีกสามสัปดาห์โดยไม่มีโปสเตอร์อยู่ตรงหน้า",
        },
        {
          title: "ใส่วันและเวลาเริ่ม และเวลาสิ้นสุดถ้ามี",
          body: "งานที่กินทั้งวันให้เลือกแบบทั้งวัน ปฏิทินจะแสดงเป็นแถบด้านบนแทนที่จะเป็นช่องเวลา",
        },
        {
          title: "ใส่สถานที่แบบที่ก๊อปไปค้นต่อได้",
          body: "เขียนชื่อสถานที่ให้ค้นในแอปแผนที่เจอ ปฏิทินหลายตัวจะทำช่องสถานที่ให้กดแล้วเปิดแผนที่นำทางได้ทันที",
        },
        {
          title: "ทดสอบเพิ่มลงปฏิทินจริงหนึ่งครั้ง",
          body: "สแกนแล้วกดเพิ่มลงปฏิทินดูจริง ๆ ตรวจว่าวันเวลาไม่เลื่อนและชื่อภาษาไทยแสดงครบ ก่อนส่งไฟล์ไปโรงพิมพ์",
        },
      ],
      sections: [
        {
          heading: "เรื่องเขตเวลาที่ทำให้เวลานัดเลื่อนไปหนึ่งชั่วโมงขึ้นไป",
          body: "งานที่ระบุเวลาจะถูกบันทึกเป็นเวลามาตรฐานสากลไว้ในตัว QR แล้วปฏิทินของผู้สแกนจะแปลงกลับเป็นเวลาท้องถิ่นของเขาเอง สำหรับผู้เข้าร่วมที่อยู่ในไทยทั้งหมด เวลาที่เห็นจะตรงกับที่คุณตั้งไว้เสมอ แต่ถ้ามีผู้เข้าร่วมอยู่ต่างประเทศ เขาจะเห็นเป็นเวลาท้องถิ่นของประเทศเขา ซึ่งเป็นพฤติกรรมที่ถูกต้อง ไม่ใช่ความผิดพลาด ส่วนงานแบบทั้งวันไม่มีเขตเวลาเข้ามาเกี่ยวข้อง วันที่ที่เห็นคือวันที่ที่คุณกรอกเสมอ",
        },
      ],
      faqs: [
        {
          question: "สแกนแล้วเข้าปฏิทินเลยไหม",
          answer:
            "ไม่ทันที เครื่องจะแสดงรายละเอียดงานให้ดูก่อนแล้วให้กดเพิ่มเอง ผู้สแกนแก้ไขหรือย้ายไปปฏิทินอื่นได้ก่อนบันทึก",
        },
        {
          question: "แก้เวลางานทีหลังแล้ว QR ที่แจกไปแล้วจะอัปเดตไหม",
          answer:
            "ไม่ รายละเอียดทั้งหมดฝังอยู่ในตัว QR และคนที่เพิ่มลงปฏิทินไปแล้วจะเก็บเวลาเดิมไว้ ถ้ามีโอกาสที่กำหนดการจะเปลี่ยน ควรใช้ QR ชนิดลิงก์ชี้ไปหน้ารายละเอียดงานที่คุณแก้ไขเองได้แทน",
        },
        {
          question: "รองรับทั้งไอโฟนและแอนดรอยด์ไหม",
          answer:
            "ไอโฟนรองรับผ่านแอปกล้องในตัวได้ดี ส่วนแอนดรอยด์ขึ้นกับแอปกล้องของแต่ละยี่ห้อ บางรุ่นเสนอให้เพิ่มลงปฏิทินให้เลย บางรุ่นแสดงเป็นข้อความ ถ้าผู้ร่วมงานส่วนใหญ่ใช้แอนดรอยด์ ควรทดสอบกับเครื่องยี่ห้อที่พบบ่อยในกลุ่มของคุณก่อนพิมพ์จำนวนมาก",
        },
      ],
      privacyNote:
        "รายละเอียดงานถูกประกอบเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR รายละเอียดงานและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free Event QR Code Generator",
      description:
        "Create a QR code for a training day, conference or wedding that adds the date, time, location and details straight to someone's calendar. Free, no sign-up needed.",
      h1: "Event QR code generator",
      lead: "People who see a poster and mean to come mostly forget, because nothing went into their calendar at that moment. An event QR code closes that gap: one scan puts the date, time and venue in their calendar with a reminder attached.",
      shortLabel: "Event",
      steps: [
        {
          title: "Write a title that stands alone",
          body: "The title will surface in someone else's calendar three weeks later, with no poster in front of them. Make it say what the event is and who is running it.",
        },
        {
          title: "Set the start, and the end if you have one",
          body: "For something running the whole day, use the all-day option — calendars then show it as a banner rather than a timed block.",
        },
        {
          title: "Give a location people can act on",
          body: "Write a venue name that resolves in a map app. Most calendars turn the location field into a tap-to-navigate link.",
        },
        {
          title: "Do one real add-to-calendar test",
          body: "Scan it and actually save the event, checking that the time has not shifted and the title renders in full before the file goes to print.",
        },
      ],
      sections: [
        {
          heading: "The time-zone detail that shifts events by an hour or more",
          body: "Timed events are stored in the code as universal time, and the scanner's calendar converts back to their own local time. For an audience entirely in one country, everyone sees exactly the time you set. Attendees abroad see their own local equivalent — which is correct behaviour, not a bug. All-day events carry no time zone at all: the date shown is always the date you entered.",
        },
      ],
      faqs: [
        {
          question: "Does scanning add the event straight away?",
          answer:
            "Not immediately. The phone shows the details first and the person taps to add. They can edit it or choose a different calendar before saving.",
        },
        {
          question: "If I move the event, does the distributed code update?",
          answer:
            "No. The details are frozen into the symbol, and anyone who already saved it keeps the original time. If the schedule might change, use a URL code pointing at an event page you can edit.",
        },
        {
          question: "Does it work on both iPhone and Android?",
          answer:
            "iPhone handles it well through the built-in camera app. On Android it depends on the manufacturer's camera app — some offer to add the event directly, others show it as text. If your attendees are mainly on Android, test on the handset brands common in that group before a large print run.",
        },
      ],
      privacyNote:
        "The event details are assembled into a QR code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, the event details and style are stored in your account.",
    },
  },
};
