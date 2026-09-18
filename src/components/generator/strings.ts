/**
 * Every word the generator shows, in Thai and English.
 *
 * Thai is written as Thai, not as a translation of the English line above it:
 * "single-use" becomes "ใช้ได้ครั้งเดียว" rather than a literal calque, and the
 * PromptPay copy uses the words a Thai shop owner uses (ร้านค้า, สแกนจ่าย,
 * เลขบัตรประชาชน) instead of banking-manual vocabulary.
 */
import type { Bundle } from "@/i18n/config";
import type {
  CornerDotStyle,
  CornerSquareStyle,
  DotStyle,
  EccLevel,
  PromptPayTargetType,
  QrContentType,
  WifiEncryption,
} from "@/qr/types";

export interface FieldCopy {
  label: string;
  placeholder?: string;
  help?: string;
}

export interface GeneratorStrings {
  /** Tabs. */
  typeSwitcherLabel: string;
  typeLabel: Record<QrContentType, string>;

  contentTitle: string;
  contentDescription: string;
  styleTitle: string;
  styleDescription: string;
  previewTitle: string;
  previewEmpty: string;
  optional: string;
  privacyNote: string;

  errors: {
    notANumber: string;
    invalidDateTime: string;
  };

  fields: {
    url: { url: FieldCopy };
    text: { text: FieldCopy };
    wifi: {
      ssid: FieldCopy;
      password: FieldCopy;
      encryption: FieldCopy;
      hidden: FieldCopy;
    };
    vcard: Record<
      | "firstName"
      | "lastName"
      | "organization"
      | "title"
      | "phone"
      | "mobile"
      | "email"
      | "website"
      | "street"
      | "city"
      | "state"
      | "postalCode"
      | "country"
      | "note",
      FieldCopy
    >;
    email: { to: FieldCopy; subject: FieldCopy; body: FieldCopy };
    sms: { phone: FieldCopy; message: FieldCopy };
    tel: { phone: FieldCopy };
    geo: { latitude: FieldCopy; longitude: FieldCopy; help: string };
    event: {
      title: FieldCopy;
      start: FieldCopy;
      end: FieldCopy;
      allDay: FieldCopy;
      location: FieldCopy;
      description: FieldCopy;
    };
    promptpay: {
      targetType: FieldCopy;
      target: Record<PromptPayTargetType, FieldCopy>;
      withAmount: FieldCopy;
      amount: FieldCopy;
      /**
       * Shown when the target is a national ID. A payload-privacy warning, not
       * a scannability one — it deliberately does not go through
       * `inspectStyle()` and it never blocks anything.
       */
      nationalIdPrivacy: { title: string; body: string };
      reusable: { title: string; body: string };
      singleUse: { title: string; body: string };
    };
  };

  wifiEncryption: Record<WifiEncryption, string>;
  promptPayTarget: Record<PromptPayTargetType, string>;

  style: {
    colorsGroup: string;
    fgColor: string;
    bgColor: string;
    hexLabel: (name: string) => string;
    gradientToggle: string;
    gradientType: string;
    gradientTypeOption: Record<"linear" | "radial", string>;
    gradientFrom: string;
    gradientTo: string;
    rotation: string;
    rotationValue: (degrees: number) => string;
    shapesGroup: string;
    dotStyle: string;
    dotStyleOption: Record<DotStyle, string>;
    cornerSquareStyle: string;
    cornerSquareOption: Record<CornerSquareStyle, string>;
    cornerDotStyle: string;
    cornerDotOption: Record<CornerDotStyle, string>;
    reliabilityGroup: string;
    margin: string;
    marginValue: (modules: number) => string;
    marginHelp: string;
    ecc: string;
    eccOption: Record<EccLevel, string>;
    eccHelp: string;
    eccLockedByLogo: string;
    logoGroup: string;
    logoFile: string;
    logoHelp: string;
    logoPrivacy: string;
    logoRemove: string;
    logoAlt: string;
    logoSize: string;
    logoSizeValue: (percent: number) => string;
    logoTooLarge: (maxKb: number) => string;
    logoNotAnImage: string;
    logoReadFailed: string;
    reset: string;
  };

  quality: {
    title: string;
    allClear: string;
    blockedTitle: string;
    blockedBody: string;
    printTitle: string;
    scanDistance: string;
    scanDistanceOption: (metres: number) => string;
  };

  capacity: {
    title: string;
    reduceContent: string;
    lowerEcc: string;
    withLogo: string;
  };

  download: {
    title: string;
    pngSize: string;
    png: string;
    svg: string;
    pdf: string;
    working: string;
    needsPayload: string;
    /** Fixed localized failure copy; never accepts raw vendor error details. */
    failed: () => string;
    pdfNote: (widthMm: number) => string;
  };

  testScan: {
    open: string;
    close: string;
    dialogTitle: string;
  };
}

export const generatorStrings: Bundle<GeneratorStrings> = {
  th: {
    typeSwitcherLabel: "เลือกชนิดข้อมูลของ QR",
    typeLabel: {
      url: "ลิงก์",
      text: "ข้อความ",
      wifi: "ไวไฟ",
      vcard: "นามบัตร",
      email: "อีเมล",
      sms: "SMS",
      tel: "เบอร์โทร",
      geo: "พิกัด",
      event: "นัดหมาย",
      promptpay: "พร้อมเพย์",
    },

    contentTitle: "ข้อมูลใน QR",
    contentDescription: "กรอกข้อมูล แล้วดูตัวอย่างอัปเดตทันทีทางขวา",
    styleTitle: "ปรับหน้าตา",
    styleDescription: "สี รูปทรง ขอบขาว และโลโก้ตรงกลาง",
    previewTitle: "ตัวอย่าง",
    previewEmpty: "กรอกข้อมูลด้านซ้ายเพื่อดูตัวอย่าง QR",
    optional: "(ไม่บังคับ)",
    privacyNote:
      "ข้อมูลและโลโก้ใช้สร้าง QR ในเครื่องคุณ และจะถูกส่งขึ้นเซิร์ฟเวอร์เมื่อคุณเข้าสู่ระบบแล้วกดบันทึก QR เท่านั้น",

    errors: {
      notANumber: "กรุณากรอกเป็นตัวเลข",
      invalidDateTime: "รูปแบบวันเวลาไม่ถูกต้อง",
    },

    fields: {
      url: {
        url: {
          label: "ลิงก์ปลายทาง",
          placeholder: "https://example.com",
          help: "รองรับเฉพาะ http:// และ https:// — ลิงก์ยิ่งสั้น QR ยิ่งอ่านง่าย",
        },
      },
      text: {
        text: {
          label: "ข้อความ",
          placeholder: "พิมพ์ข้อความที่ต้องการให้แสดงเมื่อสแกน",
          help: "ข้อความยิ่งยาว จุดใน QR ยิ่งถี่และสแกนยากขึ้น",
        },
      },
      wifi: {
        ssid: { label: "ชื่อเครือข่าย (SSID)", placeholder: "Cafe-Guest" },
        password: { label: "รหัสผ่าน", placeholder: "รหัสผ่าน WiFi" },
        encryption: { label: "ระบบเข้ารหัส" },
        hidden: {
          label: "เป็นเครือข่ายที่ซ่อนชื่อไว้",
          help: "เปิดเมื่อ SSID ไม่ขึ้นในรายการเครือข่ายของมือถือ",
        },
      },
      vcard: {
        firstName: { label: "ชื่อ", placeholder: "สมชาย" },
        lastName: { label: "นามสกุล", placeholder: "ใจดี" },
        organization: { label: "บริษัท / หน่วยงาน", placeholder: "บริษัท เน็กซอรา จำกัด" },
        title: { label: "ตำแหน่ง", placeholder: "ผู้จัดการฝ่ายขาย" },
        phone: { label: "เบอร์ที่ทำงาน", placeholder: "02-123-4567" },
        mobile: { label: "เบอร์มือถือ", placeholder: "081-234-5678" },
        email: { label: "อีเมล", placeholder: "somchai@example.com" },
        website: { label: "เว็บไซต์", placeholder: "https://example.com" },
        street: { label: "ที่อยู่", placeholder: "123 ถนนสุขุมวิท" },
        city: { label: "เขต / อำเภอ / จังหวัด", placeholder: "กรุงเทพมหานคร" },
        state: { label: "ภูมิภาค", placeholder: "" },
        postalCode: { label: "รหัสไปรษณีย์", placeholder: "10110" },
        country: { label: "ประเทศ", placeholder: "ประเทศไทย" },
        note: { label: "หมายเหตุ", placeholder: "" },
      },
      email: {
        to: { label: "ส่งถึงอีเมล", placeholder: "hello@example.com" },
        subject: { label: "หัวข้อ", placeholder: "สอบถามสินค้า" },
        body: { label: "เนื้อหา", placeholder: "ข้อความตั้งต้นในอีเมล" },
      },
      sms: {
        phone: { label: "เบอร์ปลายทาง", placeholder: "081-234-5678" },
        message: { label: "ข้อความตั้งต้น", placeholder: "สนใจสินค้าครับ" },
      },
      tel: {
        phone: {
          label: "เบอร์โทร",
          placeholder: "081-234-5678",
          help: "สแกนแล้วมือถือจะขึ้นหน้าโทรออกให้เลย",
        },
      },
      geo: {
        latitude: { label: "ละติจูด", placeholder: "13.7563" },
        longitude: { label: "ลองจิจูด", placeholder: "100.5018" },
        help: "คัดลอกจาก Google Maps ได้เลย กดค้างที่หมุดแล้วเลือกตัวเลขคู่ที่ขึ้นมา",
      },
      event: {
        title: { label: "ชื่อกิจกรรม", placeholder: "งานเปิดร้าน" },
        start: { label: "เริ่ม" },
        end: { label: "สิ้นสุด" },
        allDay: { label: "ตลอดทั้งวัน" },
        location: { label: "สถานที่", placeholder: "สยามพารากอน ชั้น 3" },
        description: { label: "รายละเอียด", placeholder: "" },
      },
      promptpay: {
        targetType: { label: "รับเงินเข้าอะไร" },
        target: {
          mobile: {
            label: "เบอร์มือถือที่ผูกพร้อมเพย์",
            placeholder: "081-234-5678",
            help: "ต้องเป็นเบอร์ที่ลงทะเบียนพร้อมเพย์กับธนาคารไว้แล้ว",
          },
          nationalId: {
            label: "เลขบัตรประชาชน / เลขผู้เสียภาษี",
            placeholder: "1234567890123",
            help: "13 หลัก ใช้กับบัญชีบุคคลธรรมดาหรือร้านค้าที่ผูกด้วยเลขผู้เสียภาษี",
          },
          ewallet: {
            label: "หมายเลข e-Wallet",
            placeholder: "123456789012345",
            help: "15 หลัก ตามที่ผู้ให้บริการ e-Wallet ออกให้",
          },
        },
        withAmount: { label: "ระบุจำนวนเงินไว้ล่วงหน้า" },
        amount: { label: "จำนวนเงิน (บาท)", placeholder: "0.00" },
        nationalIdPrivacy: {
          title: "เลขบัตรประชาชนอ่านออกได้จากตัว QR",
          body:
            "หมายเลขที่ใส่ลงไปถูกเก็บเป็นข้อความอยู่ในตัว QR ใครก็ตามที่ถ่ายรูปหรือสแกน QR ใบนี้แล้วเปิดด้วยแอปอ่านรหัสทั่วไป จะเห็นเลขประจำตัวประชาชน 13 หลักของคุณครบทุกหลัก ถ้าจะติดหน้าร้านหรือเปิดเผยต่อสาธารณะ แนะนำให้ใช้เบอร์มือถือแทน เพราะถอดการผูกออกจากบัญชีได้ทุกเมื่อ และความเสียหายหากรั่วไหลน้อยกว่ามาก ส่วนเลขบัตรประชาชนเหมาะกับการส่ง QR ให้คู่ค้าเป็นรายกรณีมากกว่า",
        },
        reusable: {
          title: "โค้ดนี้ใช้ซ้ำได้ไม่จำกัด",
          body:
            "ไม่ได้ระบุจำนวนเงิน ผู้จ่ายจะกรอกยอดเองตอนสแกน เหมาะกับป้ายหน้าร้าน สติกเกอร์ที่แคชเชียร์ หรือกล่องรับบริจาค พิมพ์ครั้งเดียวใช้ได้ตลอด",
        },
        singleUse: {
          title: "โค้ดนี้ใช้ได้ครั้งเดียว",
          body:
            "เมื่อระบุจำนวนเงิน ระบบจะทำเป็นโค้ดแบบใช้ครั้งเดียวตามมาตรฐานพร้อมเพย์ แอปธนาคารบางแห่งจะไม่ยอมให้สแกนซ้ำ เหมาะกับใบแจ้งหนี้หรือบิลรายครั้ง ไม่เหมาะกับป้ายหน้าร้าน",
        },
      },
    },

    wifiEncryption: {
      WPA: "WPA / WPA2 / WPA3",
      WEP: "WEP (แบบเก่า)",
      nopass: "ไม่มีรหัสผ่าน",
    },
    promptPayTarget: {
      mobile: "เบอร์มือถือ",
      nationalId: "เลขบัตรประชาชน",
      ewallet: "e-Wallet",
    },

    style: {
      colorsGroup: "สี",
      fgColor: "สีจุด",
      bgColor: "สีพื้นหลัง",
      hexLabel: (name) => `ค่าสีแบบ hex ของ${name}`,
      gradientToggle: "ไล่เฉดสีที่จุด",
      gradientType: "รูปแบบการไล่สี",
      gradientTypeOption: { linear: "ไล่เป็นเส้นตรง", radial: "ไล่จากกึ่งกลาง" },
      gradientFrom: "สีเริ่ม",
      gradientTo: "สีปลาย",
      rotation: "องศาการไล่สี",
      rotationValue: (degrees) => `${degrees}°`,
      shapesGroup: "รูปทรง",
      dotStyle: "ทรงของจุด",
      dotStyleOption: {
        square: "สี่เหลี่ยม",
        rounded: "มนเล็กน้อย",
        dots: "จุดกลม",
        classy: "คลาสสิก",
        "classy-rounded": "คลาสสิกมน",
        "extra-rounded": "มนมาก",
      },
      cornerSquareStyle: "กรอบมุมสามจุด",
      cornerSquareOption: {
        square: "สี่เหลี่ยม",
        dot: "วงกลม",
        "extra-rounded": "มนมาก",
      },
      cornerDotStyle: "จุดกลางมุม",
      cornerDotOption: { square: "สี่เหลี่ยม", dot: "วงกลม" },
      reliabilityGroup: "ความแม่นยำในการสแกน",
      margin: "ขอบขาวรอบ QR",
      marginValue: (modules) => `${modules} โมดูล`,
      marginHelp: "มาตรฐานกำหนดขั้นต่ำ 4 โมดูล ต่ำกว่านี้เครื่องสแกนจะหาตำแหน่ง QR ไม่เจอ",
      ecc: "ระดับการกู้คืนข้อมูล",
      eccOption: {
        L: "L — กู้คืนได้ราว 7%",
        M: "M — ราว 15% (ทั่วไป)",
        Q: "Q — ราว 25%",
        H: "H — ราว 30% (ทนที่สุด)",
      },
      eccHelp: "ยิ่งสูงยิ่งทนรอยเปื้อนและรอยพับ แลกกับจุดที่ถี่ขึ้น",
      eccLockedByLogo: "ใส่โลโก้อยู่ ระบบล็อกไว้ที่ H และจะกลับไปใช้ค่าที่คุณเลือกเมื่อลบโลโก้",
      logoGroup: "โลโก้ตรงกลาง",
      logoFile: "เลือกไฟล์โลโก้",
      logoHelp: "ไฟล์ภาพ ไม่เกิน 512 KB แนะนำ PNG พื้นหลังโปร่งใส",
      logoPrivacy: "โลโก้ถูกอ่านในเบราว์เซอร์ และจะถูกเก็บกับรูปแบบ QR เฉพาะเมื่อคุณกดบันทึก QR",
      logoRemove: "ลบโลโก้",
      logoAlt: "ตัวอย่างโลโก้ที่เลือก",
      logoSize: "ขนาดโลโก้",
      logoSizeValue: (percent) => `${percent}% ของความกว้าง QR`,
      logoTooLarge: (maxKb) => `ไฟล์ใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน ${maxKb} KB`,
      logoNotAnImage: "รองรับเฉพาะไฟล์ภาพเท่านั้น",
      logoReadFailed: "อ่านไฟล์ไม่สำเร็จ กรุณาลองใหม่",
      reset: "คืนค่าเริ่มต้น",
    },

    quality: {
      title: "ตรวจคุณภาพ QR",
      allClear: "ผ่านกฎคุณภาพทั้งหมด พร้อมดาวน์โหลด",
      blockedTitle: "ยังดาวน์โหลดไม่ได้",
      blockedBody: "แก้ข้อผิดพลาดด้านบนก่อน เราไม่ปล่อยให้ดาวน์โหลด QR ที่สแกนไม่ติด",
      printTitle: "ขนาดพิมพ์ที่แนะนำ",
      scanDistance: "ระยะที่คนจะยืนสแกน",
      scanDistanceOption: (metres) => `${metres} เมตร`,
    },

    capacity: {
      title: "ข้อมูลมากเกินความจุของ QR",
      reduceContent: "ลดปริมาณข้อมูลแล้วลองอีกครั้ง",
      lowerEcc: "ลองลดระดับการกู้คืนข้อผิดพลาด (ECC)",
      withLogo: "ลดปริมาณข้อมูลหรือลบโลโก้แล้วลองอีกครั้ง",
    },

    download: {
      title: "ดาวน์โหลด",
      pngSize: "ขนาด PNG",
      png: "ดาวน์โหลด PNG",
      svg: "ดาวน์โหลด SVG",
      pdf: "ดาวน์โหลด PDF",
      working: "กำลังสร้างไฟล์…",
      needsPayload: "กรอกข้อมูลให้ครบก่อนจึงจะดาวน์โหลดได้",
      failed: () => "สร้างไฟล์ไม่สำเร็จ กรุณาลองดาวน์โหลดอีกครั้ง หรือลองรูปแบบไฟล์อื่น",
      pdfNote: (widthMm) => `PDF จะวาง QR กลางหน้า A4 กว้าง ${widthMm} มม.`,
    },

    testScan: {
      open: "ทดสอบสแกน",
      close: "ปิด",
      dialogTitle: "ทดสอบสแกนก่อนดาวน์โหลด",
    },
  },

  en: {
    typeSwitcherLabel: "Choose what the QR code contains",
    typeLabel: {
      url: "Link",
      text: "Text",
      wifi: "Wi-Fi",
      vcard: "Contact",
      email: "Email",
      sms: "SMS",
      tel: "Phone",
      geo: "Location",
      event: "Event",
      promptpay: "PromptPay",
    },

    contentTitle: "QR content",
    contentDescription: "Fill this in and the preview updates as you type.",
    styleTitle: "Appearance",
    styleDescription: "Colours, shapes, quiet zone and a centre logo.",
    previewTitle: "Preview",
    previewEmpty: "Fill in the form to see your QR code.",
    optional: "(optional)",
    privacyNote:
      "Your content and logo are used to generate the QR code in your browser and are sent to our server only if you sign in and choose Save QR.",

    errors: {
      notANumber: "Please enter a number.",
      invalidDateTime: "That date and time could not be read.",
    },

    fields: {
      url: {
        url: {
          label: "Destination link",
          placeholder: "https://example.com",
          help: "http:// and https:// only — a shorter link makes an easier code to scan.",
        },
      },
      text: {
        text: {
          label: "Text",
          placeholder: "The text people will see when they scan",
          help: "Longer text means a denser symbol, which is harder to scan.",
        },
      },
      wifi: {
        ssid: { label: "Network name (SSID)", placeholder: "Cafe-Guest" },
        password: { label: "Password", placeholder: "Wi-Fi password" },
        encryption: { label: "Security" },
        hidden: {
          label: "This is a hidden network",
          help: "Turn on when the SSID does not appear in the phone's network list.",
        },
      },
      vcard: {
        firstName: { label: "First name", placeholder: "Somchai" },
        lastName: { label: "Last name", placeholder: "Jaidee" },
        organization: { label: "Company", placeholder: "Nexora Co., Ltd." },
        title: { label: "Job title", placeholder: "Sales Manager" },
        phone: { label: "Work phone", placeholder: "+66 2 123 4567" },
        mobile: { label: "Mobile", placeholder: "+66 81 234 5678" },
        email: { label: "Email", placeholder: "somchai@example.com" },
        website: { label: "Website", placeholder: "https://example.com" },
        street: { label: "Street", placeholder: "123 Sukhumvit Road" },
        city: { label: "City", placeholder: "Bangkok" },
        state: { label: "Region", placeholder: "" },
        postalCode: { label: "Postcode", placeholder: "10110" },
        country: { label: "Country", placeholder: "Thailand" },
        note: { label: "Note", placeholder: "" },
      },
      email: {
        to: { label: "Send to", placeholder: "hello@example.com" },
        subject: { label: "Subject", placeholder: "Product enquiry" },
        body: { label: "Message", placeholder: "Pre-filled body of the email" },
      },
      sms: {
        phone: { label: "Send to", placeholder: "+66 81 234 5678" },
        message: { label: "Pre-filled message", placeholder: "I'd like to order" },
      },
      tel: {
        phone: {
          label: "Phone number",
          placeholder: "+66 81 234 5678",
          help: "Scanning opens the phone's dialler with the number ready.",
        },
      },
      geo: {
        latitude: { label: "Latitude", placeholder: "13.7563" },
        longitude: { label: "Longitude", placeholder: "100.5018" },
        help: "Copy these from Google Maps: press and hold the pin, then copy the pair of numbers.",
      },
      event: {
        title: { label: "Event name", placeholder: "Shop opening" },
        start: { label: "Starts" },
        end: { label: "Ends" },
        allDay: { label: "All day" },
        location: { label: "Location", placeholder: "Siam Paragon, 3rd floor" },
        description: { label: "Details", placeholder: "" },
      },
      promptpay: {
        targetType: { label: "Where the money goes" },
        target: {
          mobile: {
            label: "PromptPay mobile number",
            placeholder: "081-234-5678",
            help: "Must already be registered for PromptPay with your bank.",
          },
          nationalId: {
            label: "National ID / tax ID",
            placeholder: "1234567890123",
            help: "13 digits, for a personal account or a business registered by tax ID.",
          },
          ewallet: {
            label: "e-Wallet number",
            placeholder: "123456789012345",
            help: "15 digits, as issued by your e-wallet provider.",
          },
        },
        withAmount: { label: "Set a fixed amount" },
        amount: { label: "Amount (THB)", placeholder: "0.00" },
        nationalIdPrivacy: {
          title: "Your national ID is readable from this code",
          body:
            "The identifier is stored as text inside the symbol, so anyone who scans or photographs this code and opens it with an ordinary QR reader sees all 13 digits of your national ID. For anything on public display, use a mobile number instead — far less damaging if it leaks, and you can unregister it at any time. Keep national-ID codes for one-to-one exchanges with counterparties.",
        },
        reusable: {
          title: "This code can be reused forever",
          body:
            "With no amount set, the payer types the amount when they scan. That is what you want for a shop sign, a sticker at the till or a donation box — print it once and keep it.",
        },
        singleUse: {
          title: "This code is single-use",
          body:
            "Setting an amount marks the code single-use in the PromptPay standard, and some banking apps refuse a second scan. Good for an invoice or a one-off bill; wrong for a sign on the counter.",
        },
      },
    },

    wifiEncryption: {
      WPA: "WPA / WPA2 / WPA3",
      WEP: "WEP (legacy)",
      nopass: "No password",
    },
    promptPayTarget: {
      mobile: "Mobile number",
      nationalId: "National ID",
      ewallet: "e-Wallet",
    },

    style: {
      colorsGroup: "Colours",
      fgColor: "Module colour",
      bgColor: "Background",
      hexLabel: (name) => `${name} as a hex value`,
      gradientToggle: "Gradient on the modules",
      gradientType: "Gradient shape",
      gradientTypeOption: { linear: "Linear", radial: "Radial" },
      gradientFrom: "From",
      gradientTo: "To",
      rotation: "Gradient angle",
      rotationValue: (degrees) => `${degrees}°`,
      shapesGroup: "Shapes",
      dotStyle: "Module shape",
      dotStyleOption: {
        square: "Square",
        rounded: "Rounded",
        dots: "Dots",
        classy: "Classy",
        "classy-rounded": "Classy rounded",
        "extra-rounded": "Extra rounded",
      },
      cornerSquareStyle: "Corner frames",
      cornerSquareOption: {
        square: "Square",
        dot: "Circle",
        "extra-rounded": "Extra rounded",
      },
      cornerDotStyle: "Corner centres",
      cornerDotOption: { square: "Square", dot: "Circle" },
      reliabilityGroup: "Scan reliability",
      margin: "Quiet zone",
      marginValue: (modules) => `${modules} modules`,
      marginHelp:
        "The standard requires at least 4 modules. Below that, scanners cannot find the code at all.",
      ecc: "Error correction",
      eccOption: {
        L: "L — recovers about 7%",
        M: "M — about 15% (typical)",
        Q: "Q — about 25%",
        H: "H — about 30% (toughest)",
      },
      eccHelp: "Higher survives more smudging and creasing, at the cost of a denser symbol.",
      eccLockedByLogo:
        "A logo is set, so this is locked to H. Your own choice comes back when you remove the logo.",
      logoGroup: "Centre logo",
      logoFile: "Choose a logo file",
      logoHelp: "An image up to 512 KB. A transparent PNG works best.",
      logoPrivacy: "The logo is read in your browser and is stored with the QR style only if you choose Save QR.",
      logoRemove: "Remove logo",
      logoAlt: "Preview of the chosen logo",
      logoSize: "Logo size",
      logoSizeValue: (percent) => `${percent}% of the QR width`,
      logoTooLarge: (maxKb) => `That file is too large. Please keep it under ${maxKb} KB.`,
      logoNotAnImage: "Only image files are supported.",
      logoReadFailed: "The file could not be read. Please try again.",
      reset: "Reset to defaults",
    },

    quality: {
      title: "Scan quality check",
      allClear: "All quality rules pass — ready to download.",
      blockedTitle: "Download is blocked",
      blockedBody:
        "Fix the errors above first. We do not let you export a code that will not scan.",
      printTitle: "Recommended print size",
      scanDistance: "How far away people will scan from",
      scanDistanceOption: (metres) => `${metres} m`,
    },

    capacity: {
      title: "The content exceeds QR capacity",
      reduceContent: "Shorten the content and try again.",
      lowerEcc: "You can also lower the error correction level (ECC).",
      withLogo: "Shorten the content or remove the logo, then try again.",
    },

    download: {
      title: "Download",
      pngSize: "PNG size",
      png: "Download PNG",
      svg: "Download SVG",
      pdf: "Download PDF",
      working: "Building the file…",
      needsPayload: "Fill in the form before downloading.",
      failed: () => "Could not build the file. Try downloading again or choose another file format.",
      pdfNote: (widthMm) => `The PDF centres the code on A4 at ${widthMm} mm wide.`,
    },

    testScan: {
      open: "Test scan",
      close: "Close",
      dialogTitle: "Test the scan before you download",
    },
  },
};
