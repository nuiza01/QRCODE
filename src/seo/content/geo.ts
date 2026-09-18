import type { QrTypeSeo } from "@/seo/types";

export const geoSeo: QrTypeSeo = {
  type: "geo",
  slug: "geo",
  content: {
    th: {
      title: "สร้าง QR Code พิกัดแผนที่ นำทางมาที่ร้าน",
      description:
        "แปลงพิกัดละติจูดลองจิจูดเป็น QR Code ให้ลูกค้าสแกนแล้วเปิดแผนที่นำทางมาหาคุณ เหมาะกับร้านในซอยที่ค้นชื่อไม่เจอ สร้างฟรีในเบราว์เซอร์",
      h1: "สร้าง QR Code พิกัดแผนที่",
      lead: "ร้านที่อยู่ในซอยลึกหรือหมู่บ้านที่แผนที่ยังไม่มีชื่อ มักอธิบายทางด้วยข้อความไม่รู้เรื่อง QR พิกัดตัดปัญหานั้นด้วยการส่งตำแหน่งจริงเป็นตัวเลขให้แอปแผนที่โดยตรง",
      shortLabel: "พิกัด",
      steps: [
        {
          title: "หาพิกัดของสถานที่ให้ได้ก่อน",
          body: "เปิดแอปแผนที่ กดค้างที่จุดหมายจนขึ้นหมุด แล้วคัดลอกตัวเลขสองชุดที่ขึ้นมา ชุดแรกคือละติจูด ชุดที่สองคือลองจิจูด กรุงเทพฯ อยู่ราวละติจูด 13.7 และลองจิจูด 100.5",
        },
        {
          title: "ปักหมุดที่ประตูทางเข้า ไม่ใช่กลางอาคาร",
          body: "แอปนำทางจะพาไปยังจุดที่คุณให้ไว้เป๊ะ ๆ ถ้าปักกลางตึกใหญ่หรือกลางหมู่บ้าน ลูกค้าอาจถูกพาไปจอดฝั่งที่ไม่มีทางเข้า ให้ปักที่หน้าประตูหรือปากซอยที่รถเลี้ยวเข้าได้จริง",
        },
        {
          title: "ทดสอบด้วยมือถือทั้งสองระบบ",
          body: "ทดสอบทั้งบนไอโฟนและแอนดรอยด์ก่อนพิมพ์ เพราะการรองรับพิกัดแบบนี้ต่างกันตามเครื่องและตามแอปกล้อง",
        },
      ],
      sections: [
        {
          heading: "ถ้าอยากให้เปิดเป็นแผนที่ได้ทุกเครื่องแน่นอน ให้ใช้ QR แบบลิงก์แทน",
          body: "QR ชนิดนี้ฝังพิกัดในรูปแบบมาตรฐานสำหรับตำแหน่งที่ตั้ง แอนดรอยด์ส่วนใหญ่จะเปิดแอปแผนที่ให้ทันที แต่แอปกล้องของไอโฟนบางรุ่นบางเวอร์ชันอาจแสดงเป็นข้อความเฉย ๆ แทนที่จะเปิดแผนที่ ถ้ากลุ่มลูกค้าของคุณใช้ไอโฟนเป็นหลัก หรือคุณต้องการความแน่นอนสูงสุดกับป้ายที่พิมพ์จำนวนมาก ให้คัดลอกลิงก์แผนที่จากแอปแผนที่แล้วสร้างเป็น QR ชนิดลิงก์แทน จะเปิดได้ทุกเครื่องแน่นอนกว่า",
        },
      ],
      faqs: [
        {
          question: "สแกนแล้วเปิดแอปแผนที่อะไร",
          answer:
            "แล้วแต่เครื่องของผู้สแกนว่าตั้งแอปแผนที่ตัวไหนเป็นค่าเริ่มต้น เราไม่ได้บังคับให้เปิดแอปใดแอปหนึ่ง QR ส่งแค่ตัวเลขพิกัดไปให้ระบบปฏิบัติการจัดการต่อ",
        },
        {
          question: "ต้องใส่พิกัดละเอียดกี่ตำแหน่งทศนิยม",
          answer:
            "ห้าตำแหน่งทศนิยมละเอียดราวหนึ่งเมตร ซึ่งเกินพอสำหรับการนำทางมาหน้าร้าน ใส่ละเอียดกว่านั้นไม่ได้ช่วยอะไรและทำให้ QR ถี่ขึ้นโดยเปล่าประโยชน์",
        },
        {
          question: "ใส่ชื่อสถานที่ลงไปด้วยได้ไหม",
          answer:
            "รูปแบบพิกัดมาตรฐานที่ใช้กันได้กว้างที่สุดรับเฉพาะตัวเลขละติจูดและลองจิจูด ไม่มีช่องสำหรับชื่อ ถ้าต้องการให้ขึ้นชื่อร้านด้วย ให้ใช้ลิงก์แผนที่ที่มีชื่อสถานที่อยู่แล้วมาสร้างเป็น QR ชนิดลิงก์แทน",
        },
      ],
      privacyNote:
        "พิกัดถูกแปลงเป็น QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR พิกัดและรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "Free Location QR Code Generator",
      description:
        "Turn latitude and longitude into a QR code that opens a map and navigates people to you. Ideal for addresses that search engines cannot find. Free, browser-based.",
      h1: "Location QR code generator",
      lead: "Places down a lane, or in a development the map does not name yet, are almost impossible to describe in words. A location QR code sidesteps the problem by handing the map app the actual coordinates.",
      shortLabel: "Location",
      steps: [
        {
          title: "Find the coordinates first",
          body: "In a map app, press and hold the destination until a pin drops and copy the two numbers shown. The first is latitude, the second longitude.",
        },
        {
          title: "Pin the entrance, not the middle of the building",
          body: "Navigation takes people to exactly the point you give. Pinned in the centre of a large building or estate, drivers get routed to whichever side has no entrance. Pin the door, or the turning where a car can actually enter.",
        },
        {
          title: "Test on both platforms",
          body: "Try it on an iPhone and an Android phone before printing — support for this format varies by device and camera app.",
        },
      ],
      sections: [
        {
          heading: "For guaranteed behaviour on every phone, use a link code",
          body: "This type embeds the coordinates in the standard geographic URI format. Most Android devices open a map app immediately, but some versions of the iPhone camera app display it as plain text instead of launching a map. If your audience is mostly on iPhone, or you are committing to a large print run, copy the map link from your map app and build a URL QR code instead — that opens reliably everywhere.",
        },
      ],
      faqs: [
        {
          question: "Which map app opens?",
          answer:
            "Whichever the person scanning has set as their default. We do not force a particular app; the code simply hands the coordinates to the operating system.",
        },
        {
          question: "How many decimal places should I use?",
          answer:
            "Five decimal places resolve to roughly one metre, which is more than enough to get someone to your door. More precision adds nothing useful and densifies the code for no benefit.",
        },
        {
          question: "Can I include a place name?",
          answer:
            "The widely supported geographic URI format carries latitude and longitude only — there is no field for a label. If you want a name to appear, generate a URL code from a map link that already includes it.",
        },
      ],
      privacyNote:
        "The coordinates are encoded into the QR code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, the coordinates and style are stored in your account.",
    },
  },
};
