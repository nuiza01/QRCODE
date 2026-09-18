import type { QrTypeSeo } from "@/seo/types";

export const wifiSeo: QrTypeSeo = {
  type: "wifi",
  slug: "wifi",
  content: {
    th: {
      title: "สร้าง QR Code WiFi ให้ลูกค้าสแกนต่อเน็ต",
      description:
        "ทำ QR Code WiFi ติดหน้าร้าน ลูกค้าสแกนแล้วต่อเน็ตได้เลย รองรับ WPA WPA2 และเครือข่ายซ่อน รหัสผ่านอยู่ในเครื่องจนกว่าจะเลือกบันทึก QR",
      h1: "สร้าง QR Code WiFi",
      lead: "เลิกสะกดรหัสผ่านทีละตัวให้ลูกค้าฟัง พิมพ์ชื่อเครือข่ายกับรหัสผ่านครั้งเดียว แล้วพิมพ์ QR ติดไว้บนโต๊ะหรือหน้าเคาน์เตอร์ ลูกค้ายกมือถือส่องแล้วกดยืนยัน ก็ต่อเน็ตได้ทันที",
      shortLabel: "WiFi",
      steps: [
        {
          title: "กรอกชื่อเครือข่าย (SSID) ให้ตรงเป๊ะ",
          body: "ตัวพิมพ์ใหญ่พิมพ์เล็กและช่องว่างมีผลทั้งหมด ถ้าชื่อมีอักขระอย่าง ; หรือ , หรือ : ไม่ต้องกังวล ระบบใส่ตัวหลีกให้เองแล้ว",
        },
        {
          title: "เลือกวิธีเข้ารหัสให้ถูก",
          body: "เราเตอร์ตามบ้านและร้านค้าเกือบทั้งหมดเป็น WPA/WPA2 เลือก WEP เฉพาะอุปกรณ์เก่าจริง ๆ ส่วนเครือข่ายเปิดที่ไม่มีรหัสผ่านให้เลือกแบบไม่มีการเข้ารหัส",
        },
        {
          title: "ติ๊กช่องเครือข่ายซ่อน ถ้าคุณซ่อน SSID ไว้",
          body: "ถ้าเราเตอร์ตั้งค่าไม่ให้กระจายชื่อเครือข่าย ต้องติ๊กช่องนี้ ไม่อย่างนั้นมือถือจะหาเครือข่ายไม่เจอทั้งที่สแกน QR ถูกแล้ว",
        },
        {
          title: "ทดสอบด้วยมือถือที่ยังไม่เคยต่อเครือข่ายนี้",
          body: "นี่คือขั้นตอนที่คนข้ามบ่อยที่สุด มือถือของคุณเองต่อเครือข่ายนี้อยู่แล้ว จึงทดสอบไม่ได้จริง ให้ยืมเครื่องคนอื่นลองสักครั้งก่อนพิมพ์",
        },
      ],
      sections: [
        {
          heading: "ควรใช้เครือข่ายสำหรับผู้มาเยือน ไม่ใช่เครือข่ายหลักของร้าน",
          body: "ใครก็ตามที่สแกน QR นี้ได้ ก็อ่านรหัสผ่านออกได้เช่นกัน เพราะรหัสผ่านถูกเขียนเป็นข้อความธรรมดาอยู่ในตัว QR ไม่ได้เข้ารหัสซ้อนไว้ นั่นเป็นเรื่องปกติของมาตรฐานนี้ ไม่ใช่ข้อบกพร่องของเรา ดังนั้นถ้าเป็นร้านค้าหรือออฟฟิศ ควรสร้าง QR จากเครือข่ายผู้มาเยือนที่แยกจากเครือข่ายที่มีเครื่องพิมพ์ กล้องวงจรปิด และคอมพิวเตอร์ทำงานอยู่",
        },
      ],
      faqs: [
        {
          question: "ไอโฟนกับแอนดรอยด์สแกนแล้วต่อเน็ตได้เลยไหม",
          answer:
            "ได้ ไอโฟนตั้งแต่ iOS 11 และแอนดรอยด์ตั้งแต่เวอร์ชัน 10 รองรับผ่านแอปกล้องในตัว เครื่องจะขึ้นแถบให้กดยืนยันก่อนเชื่อมต่อ ส่วนเครื่องที่เก่ากว่านั้นต้องใช้แอปสแกน QR ที่รองรับ WiFi",
        },
        {
          question: "รหัสผ่าน WiFi ของฉันถูกส่งไปที่ไหนหรือเปล่า",
          answer:
            "ระหว่างสร้าง ทดสอบ และดาวน์โหลด QR รหัสผ่านจะอยู่ในเบราว์เซอร์ของคุณ หากเข้าสู่ระบบแล้วกดบันทึก QR รหัสผ่านจะถูกเก็บเป็นส่วนหนึ่งของ payload ในบัญชี คนที่ถือ QR ใบนั้นก็อ่านรหัสผ่านออกได้ จึงควรบันทึกหรือติดไว้เฉพาะที่ที่คุณตั้งใจให้คนเข้าถึง",
        },
        {
          question: "เปลี่ยนรหัสผ่าน WiFi แล้ว QR เดิมยังใช้ได้ไหม",
          answer:
            "ใช้ไม่ได้แล้ว รหัสผ่านฝังอยู่ในตัว QR เมื่อเปลี่ยนรหัสผ่านที่เราเตอร์ ต้องสร้าง QR ใหม่และเปลี่ยนป้ายที่ติดไว้ด้วย",
        },
        {
          question: "ทำไมสแกนแล้วขึ้นว่าเชื่อมต่อไม่สำเร็จ",
          answer:
            "สาเหตุที่พบบ่อยที่สุดสามข้อคือ พิมพ์ชื่อเครือข่ายผิดตัวพิมพ์เล็กพิมพ์ใหญ่ เลือกวิธีเข้ารหัสผิดระหว่าง WPA กับ WEP และลืมติ๊กช่องเครือข่ายซ่อนทั้งที่ซ่อน SSID ไว้ ลองไล่ทีละข้อตามลำดับนี้",
        },
      ],
      privacyNote:
        "ชื่อเครือข่ายและรหัสผ่านถูกประกอบเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR ข้อมูลทั้งสองรวมถึงรหัสผ่านจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free WiFi QR Code Generator",
      description:
        "Make a WiFi QR code guests scan to join your network. Supports WPA/WPA2, WEP and hidden networks. The password stays local until you choose Save QR.",
      h1: "WiFi QR code generator",
      lead: "Stop reading passwords out one character at a time. Enter the network name and password once, print the code, and put it on the table or the counter. Guests point a phone at it, confirm, and they are online.",
      shortLabel: "WiFi",
      steps: [
        {
          title: "Enter the network name (SSID) exactly",
          body: "Capitalisation and spaces both matter. If the name contains characters like ; , : or a backslash, they are escaped for you automatically.",
        },
        {
          title: "Pick the right security type",
          body: "Almost every home and shop router is WPA/WPA2. Choose WEP only for genuinely old equipment, and the open option for networks with no password at all.",
        },
        {
          title: "Tick 'hidden network' if you hide your SSID",
          body: "If the router does not broadcast its name, this box has to be ticked. Without it the phone reads the code correctly and then fails to find the network.",
        },
        {
          title: "Test with a phone that has never joined the network",
          body: "The most commonly skipped step. Your own phone already knows this network, so it cannot really test the code. Borrow a colleague's device before you print.",
        },
      ],
      sections: [
        {
          heading: "Use a guest network, not your main one",
          body: "Anyone who can scan the code can also read the password: it is stored as plain text inside the symbol, not encrypted. That is how the format works, not a shortcoming of this tool. For a shop or an office, generate the code from a guest network kept separate from the one your printers, cameras and work machines sit on.",
        },
      ],
      faqs: [
        {
          question: "Do iPhones and Android phones join automatically?",
          answer:
            "Both handle it in the built-in camera app — iOS 11 and later, Android 10 and later. The phone shows a prompt and connects once you confirm. Older devices need a QR scanner app with WiFi support.",
        },
        {
          question: "Is my WiFi password sent anywhere?",
          answer:
            "The password stays in your browser while you generate, test, and download the QR code. If you sign in and choose Save QR, it is stored as part of the payload in your account. Anyone holding the printed code can also read the password, so save or display it only where you intend people to have access.",
        },
        {
          question: "Does the code still work after I change the password?",
          answer:
            "No. The password is embedded in the symbol, so changing it on the router means generating a new code and replacing the printed one.",
        },
        {
          question: "Why does the scan fail to connect?",
          answer:
            "Three causes cover almost every case: the SSID was typed with the wrong capitalisation, the security type is set to WEP instead of WPA (or vice versa), or the network is hidden and the 'hidden network' box was not ticked. Check them in that order.",
        },
      ],
      privacyNote:
        "The network name and password are assembled into a QR code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, both—including the password—are stored in your account.",
    },
  },
};
