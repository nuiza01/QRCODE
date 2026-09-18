import type { QrTypeSeo } from "@/seo/types";

/**
 * The priority page (`docs/ROUTES_AND_SEO.md`).
 *
 * This is the one query where a Thai product beats the international
 * generators outright, so it carries more depth than the other nine: the three
 * target kinds, what a fixed amount actually changes in the payload, how to
 * verify the code with a banking app, and the national-ID exposure warning that
 * no competitor bothers to give.
 *
 * Every factual claim here is checked against `src/qr/payload/promptpay.ts`:
 *  - tag 01 is "11" (reusable) with no amount, "12" (single use) with one
 *  - mobile normalizes to 0066 + last nine digits
 *  - national ID is 13 digits, e-wallet 15
 *  - currency 764 / country TH are constants
 * If that encoder changes, this copy is part of the change.
 */
export const promptpaySeo: QrTypeSeo = {
  type: "promptpay",
  slug: "promptpay",
  content: {
    th: {
      title: "สร้าง QR Code พร้อมเพย์ รับเงิน ระบุจำนวนได้",
      description:
        "สร้าง QR พร้อมเพย์รับเงินฟรี ใส่เบอร์มือถือ เลขบัตรประชาชน หรือ e-Wallet ระบุจำนวนเงินหรือไม่ก็ได้ ข้อมูลอยู่ในเครื่องจนกว่าจะเลือกบันทึก QR",
      h1: "สร้าง QR Code พร้อมเพย์ รับเงิน",
      lead: "ใส่เบอร์พร้อมเพย์ที่ผูกกับบัญชีไว้ แล้วได้ QR สำหรับรับเงินทันที จะใส่จำนวนเงินไว้ล่วงหน้าหรือปล่อยให้ผู้โอนกรอกเองก็ได้ ทั้งหมดคำนวณในเบราว์เซอร์ ข้อมูลจะถูกส่งมาที่เซิร์ฟเวอร์เฉพาะเมื่อคุณเข้าสู่ระบบแล้วกดบันทึก QR",
      shortLabel: "พร้อมเพย์",
      steps: [
        {
          title: "เลือกชนิดของหมายเลขปลายทาง",
          body: "เบอร์มือถือคือแบบที่คนใช้มากที่สุดและปลอดภัยที่สุดสำหรับ QR ที่ติดหน้าร้าน เลือกเลขประจำตัวประชาชน 13 หลักเมื่อรับเงินในนามบุคคลหรือร้านค้าที่ผูกด้วยเลขผู้เสียภาษี ส่วน e-Wallet 15 หลักใช้กับกระเป๋าเงินอิเล็กทรอนิกส์ที่ลงทะเบียนพร้อมเพย์ไว้",
        },
        {
          title: "กรอกหมายเลขให้ตรงกับที่ผูกไว้กับธนาคาร",
          body: "เบอร์มือถือใส่ได้ทั้ง 0812345678 หรือ +66812345678 ระบบจะแปลงเป็นรูปแบบมาตรฐานให้เอง สิ่งที่ต้องตรงคือหมายเลขนั้นต้องถูกผูกพร้อมเพย์ไว้แล้วจริง ๆ ถ้ายังไม่ได้ผูก QR จะสร้างได้แต่แอปธนาคารจะแจ้งว่าไม่พบผู้รับ",
        },
        {
          title: "ตัดสินใจว่าจะใส่จำนวนเงินหรือไม่",
          body: "ปล่อยว่างไว้ถ้าต้องการ QR ใบเดียวที่ใช้ซ้ำได้ตลอด เช่น ป้ายตั้งหน้าเคาน์เตอร์ ใส่จำนวนเงินเมื่อเป็นการเรียกเก็บครั้งเดียว เช่น ใบแจ้งหนี้หรือบิลของลูกค้ารายนั้น เพราะการใส่จำนวนเงินเปลี่ยนสถานะของ QR เป็นแบบใช้ครั้งเดียว",
        },
        {
          title: "ทดสอบด้วยแอปธนาคารจริงก่อนนำไปใช้",
          body: "เปิดแอปธนาคาร เลือกเมนูสแกน แล้วส่องดูว่าขึ้นชื่อผู้รับถูกต้องและจำนวนเงินตรงตามที่ตั้งใจ ดูให้ถึงหน้ายืนยันแล้วค่อยกดยกเลิก ไม่ต้องโอนจริงก็ตรวจได้ครบ",
        },
        {
          title: "ดาวน์โหลดให้เหมาะกับงาน",
          body: "ป้ายตั้งโต๊ะหรือสติกเกอร์หน้าร้านใช้ SVG หรือ PDF เพราะขยายแล้วขอบจุดยังคม ส่วนการส่งบิลให้ลูกค้าทางแชทใช้ PNG 1024 พิกเซลก็เพียงพอ",
        },
      ],
      sections: [
        {
          heading: "เบอร์มือถือ เลขบัตรประชาชน หรือ e-Wallet เลือกอันไหนดี",
          body: "ทั้งสามแบบส่งเงินเข้าบัญชีเดียวกันได้ ต่างกันที่หมายเลขที่ปรากฏอยู่ในตัว QR เบอร์มือถือเหมาะที่สุดกับ QR ที่ต้องเปิดเผยต่อสาธารณะ เพราะถ้าวันหนึ่งอยากเลิกใช้ก็แค่ถอดการผูกออกจากบัญชี เลขประจำตัวประชาชนเหมาะกับการรับเงินที่ต้องอ้างอิงตัวบุคคลหรือเลขผู้เสียภาษี เช่น งานรับเหมาหรือร้านที่จดทะเบียน ส่วน e-Wallet 15 หลักใช้เมื่อคุณรับเงินเข้ากระเป๋าเงินอิเล็กทรอนิกส์แทนบัญชีธนาคาร ถ้าไม่แน่ใจว่าหมายเลขไหนผูกอยู่ ให้เปิดแอปธนาคารดูที่เมนูจัดการพร้อมเพย์ก่อน",
        },
        {
          heading: "ใส่จำนวนเงินแล้วเกิดอะไรขึ้น และทำไมถึงมองไม่เห็น",
          body: "ข้างในพร้อมเพย์ QR มีช่องเล็ก ๆ ช่องหนึ่งที่บอกว่ารหัสนี้ใช้ซ้ำได้หรือใช้ได้ครั้งเดียว เมื่อไม่ใส่จำนวนเงิน ช่องนั้นมีค่าเป็นใช้ซ้ำได้ พอใส่จำนวนเงินลงไป มาตรฐานกำหนดให้เปลี่ยนเป็นใช้ครั้งเดียวโดยอัตโนมัติ ปัญหาคือความต่างนี้ไม่มีทางดูออกจากภาพ QR เลย ลายจุดสองแบบหน้าตาเหมือนกันทุกประการ ร้านค้าจำนวนมากจึงพิมพ์ QR ที่ระบุจำนวนเงินไว้แล้วเอาไปตั้งเป็นป้ายถาวร แล้วมางงทีหลังว่าทำไมลูกค้าบางคนโอนไม่ผ่านหรือทำไมทุกคนโอนมาเท่ากันหมด กฎง่าย ๆ คือ ป้ายที่ตั้งทิ้งไว้ห้ามใส่จำนวนเงิน ส่วนบิลที่ออกให้ลูกค้ารายคนค่อยใส่",
        },
        {
          heading: "วิธีอ่าน QR ด้วยแอปธนาคารไทย",
          body: "แอปธนาคารไทยทุกแอปมีปุ่มสแกนอยู่หน้าแรก มักใช้ชื่อว่าสแกนหรือสแกนจ่าย เมื่อส่องแล้วแอปจะแสดงชื่อผู้รับแบบปิดบังบางส่วนตามข้อกำหนดของธนาคาร ให้ตรวจสองอย่างคือชื่อผู้รับตรงกับที่ควรเป็นหรือไม่ และช่องจำนวนเงินถูกกรอกมาให้แล้วหรือเปิดให้พิมพ์เอง ถ้าคุณตั้งใจทำ QR แบบใช้ซ้ำแต่แอปกลับกรอกจำนวนเงินมาให้ แปลว่าคุณเผลอใส่จำนวนเงินไว้ กลับไปล้างช่องนั้นแล้วสร้างใหม่",
        },
        {
          heading: "หมายเลขของคุณไม่ได้ถูกส่งมาที่เรา",
          body: "การคำนวณพร้อมเพย์ QR ทั้งหมด ตั้งแต่การประกอบข้อมูลตามมาตรฐาน EMVCo ไปจนถึงการคิดเลขตรวจสอบท้ายรหัส เกิดขึ้นในเบราว์เซอร์บนเครื่องของคุณ ไม่มีการเรียกไปยังเซิร์ฟเวอร์ระหว่างสร้าง ทดสอบ หรือดาวน์โหลด QR หากคุณเข้าสู่ระบบแล้วกดบันทึก QR เบอร์มือถือ เลขประจำตัวประชาชน จำนวนเงิน และรูปแบบจะถูกเก็บไว้ในบัญชีเพื่อให้เปิดจัดการภายหลังได้",
        },
      ],
      faqs: [
        {
          question: "ต้องผูกพร้อมเพย์กับธนาคารก่อนไหม",
          answer:
            "ต้องผูกก่อน เราสร้างได้แค่ตัว QR ที่ชี้ไปยังหมายเลขที่คุณกรอก แต่การจับคู่หมายเลขนั้นกับบัญชีเงินฝากเป็นเรื่องที่ธนาคารทำ ถ้ายังไม่เคยผูก ให้ไปที่เมนูพร้อมเพย์ในแอปธนาคารแล้วผูกเบอร์มือถือหรือเลขบัตรประชาชนก่อน จากนั้น QR ที่สร้างจากหน้านี้จะใช้ได้ทันที",
        },
        {
          question: "ใส่จำนวนเงินแล้วนำ QR ไปใช้ซ้ำได้ไหม",
          answer:
            "ไม่ได้ตามมาตรฐาน เมื่อมีจำนวนเงินอยู่ในรหัส ตัวรหัสจะถูกทำเครื่องหมายว่าใช้ได้ครั้งเดียว แอปธนาคารบางแห่งบังคับตามนั้นอย่างเคร่งครัดและปฏิเสธการโอนครั้งที่สอง บางแห่งยอมให้ผ่าน ผลลัพธ์จึงไม่แน่นอนขึ้นกับธนาคารของผู้โอน ถ้าต้องการ QR สำหรับตั้งหน้าร้าน ให้เว้นช่องจำนวนเงินไว้แล้วให้ลูกค้าพิมพ์ยอดเอง",
        },
        {
          question: "ใช้เลขบัตรประชาชนทำ QR ติดหน้าร้านปลอดภัยไหม",
          answer:
            "ไม่แนะนำ เพราะหมายเลขที่ใส่ลงไปถูกเก็บเป็นข้อความอยู่ในตัว QR ใครก็ตามที่ถ่ายรูป QR ใบนั้นไปแล้วเปิดด้วยแอปอ่านรหัสทั่วไป จะเห็นเลขประจำตัวประชาชน 13 หลักของคุณครบทุกหลัก สำหรับ QR ที่ต้องเปิดเผยต่อสาธารณะควรใช้เบอร์มือถือ ซึ่งความเสียหายหากรั่วไหลน้อยกว่ามากและถอดการผูกออกได้ทุกเมื่อ ส่วนเลขบัตรประชาชนเหมาะกับการส่ง QR ให้คู่ค้าเป็นรายกรณีมากกว่า",
        },
        {
          question: "มีค่าธรรมเนียมไหม",
          answer:
            "เราไม่คิดค่าบริการสร้าง QR และไม่ได้เกี่ยวข้องกับการโอนเงินเลย เงินวิ่งจากบัญชีผู้โอนไปยังบัญชีของคุณผ่านระบบพร้อมเพย์โดยตรง ค่าธรรมเนียมถ้ามีเป็นไปตามเงื่อนไขที่ธนาคารของผู้โอนกำหนด ให้ตรวจกับธนาคารของคุณเองถ้าเป็นการรับเงินยอดสูงหรือรับในนามนิติบุคคล",
        },
        {
          question: "ต่างจาก QR ร้านค้าที่ธนาคารออกให้อย่างไร",
          answer:
            "QR จากหน้านี้เป็นแบบพร้อมเพย์บุคคล คือชี้ไปยังเบอร์ เลขบัตรประชาชน หรือ e-Wallet ที่ผูกไว้ ส่วน QR ร้านค้าที่ธนาคารออกให้จะมีรหัสร้านค้าที่ธนาคารกำหนดและมักผูกกับระบบแจ้งเตือนยอดเงินเข้าของธนาคาร ถ้าคุณต้องการใบเสร็จอัตโนมัติ ระบบกระทบยอดขาย หรือแจ้งเตือนแบบร้านค้า ต้องขอ QR ร้านค้ากับธนาคารโดยตรง หน้านี้ทำให้ไม่ได้",
        },
        {
          question: "ตรวจได้อย่างไรว่า QR ที่ได้ถูกต้องจริง",
          answer:
            "ส่องด้วยแอปธนาคารแล้วดูให้ถึงหน้ายืนยันการโอน แอปจะแสดงชื่อบัญชีผู้รับและจำนวนเงิน ถ้าชื่อผู้รับตรงและจำนวนเงินตรงตามที่ตั้งใจ ก็กดยกเลิกได้เลยโดยไม่ต้องโอนจริง การเห็นชื่อผู้รับที่ถูกต้องคือหลักฐานว่าหมายเลขปลายทางในรหัสถูกต้องแล้ว",
        },
        {
          question: "QR พร้อมเพย์มีวันหมดอายุไหม",
          answer:
            "ตัวรหัสไม่มีวันหมดอายุในตัวเอง มันจะใช้ได้ตราบใดที่หมายเลขปลายทางยังผูกอยู่กับบัญชีของคุณ ถ้าคุณเปลี่ยนเบอร์มือถือหรือถอดการผูกพร้อมเพย์ QR ที่พิมพ์ไปแล้วจะใช้ไม่ได้ทันที ร้านที่พิมพ์ป้ายไว้จำนวนมากควรจำข้อนี้ไว้ก่อนเปลี่ยนเบอร์",
        },
      ],
      privacyNote:
        "เบอร์มือถือ เลขประจำตัวประชาชน และจำนวนเงินถูกใช้คำนวณ QR ในเบราว์เซอร์และไม่ถูกส่งขึ้นเซิร์ฟเวอร์ระหว่างสร้างหรือดาวน์โหลด หากกดบันทึก QR ข้อมูลเหล่านี้และรูปแบบจะถูกเก็บไว้ในบัญชีของคุณ",
    },
    en: {
      title: "PromptPay QR Code Generator (Free, With Amount)",
      description:
        "Generate a PromptPay QR code for a mobile, national ID or e-wallet, with or without an amount. Data stays local until you choose Save QR.",
      h1: "PromptPay QR code generator",
      lead: "Enter the PromptPay number registered to your bank account and get a payment QR code straight away, with a fixed amount or left open for the sender to fill in. Everything is computed in your browser; data is sent to our server only if you sign in and choose Save QR.",
      shortLabel: "PromptPay",
      steps: [
        {
          title: "Choose the target type",
          body: "A mobile number is the most common choice and the safest one for a code on public display. Use the 13-digit national ID (or tax ID) when payment has to be tied to a person or a registered business, and the 15-digit e-wallet number when you collect into an e-money account rather than a bank account.",
        },
        {
          title: "Enter the number exactly as registered",
          body: "Mobile numbers can be typed as 0812345678 or +66812345678 — both normalise to the same standard form. What matters is that the number is actually registered with PromptPay: an unregistered one still produces a valid code, but banking apps will report that no recipient was found.",
        },
        {
          title: "Decide whether to set an amount",
          body: "Leave it blank for a code you display permanently and reuse, such as a counter sign. Set an amount only for a one-off charge like an invoice, because adding an amount marks the code as single-use.",
        },
        {
          title: "Verify it with a real banking app",
          body: "Open your bank's app, use its scan option, and check that the recipient name is right and the amount matches your intent. Go as far as the confirmation screen and then cancel — no actual transfer is needed to verify the code.",
        },
        {
          title: "Download the right format",
          body: "SVG or PDF for counter signs and stickers, where crisp module edges survive enlargement. PNG at 1024 px is plenty for sending an invoice over chat.",
        },
      ],
      sections: [
        {
          heading: "Mobile number, national ID or e-wallet?",
          body: "All three deliver to the same account; the difference is which identifier is visible inside the code. A mobile number is best for anything on public display — if it is ever misused you can simply unregister it. A national or tax ID suits payments that must reference a specific person or registered business. The 15-digit e-wallet number applies when you collect into an e-money account. If you are unsure which identifiers are registered, check the PromptPay section of your banking app first.",
        },
        {
          heading: "What setting an amount changes — and why you cannot see it",
          body: "A PromptPay code contains a small field stating whether it is reusable or single-use. With no amount, that field says reusable. Add an amount and the standard requires it to flip to single-use. The catch is that the two are visually identical: nothing in the printed pattern reveals which one you are holding. Shops routinely print a code that carries a fixed amount, mount it as a permanent sign, and are then baffled that some transfers are refused or that every customer pays the same figure. The rule is simple — permanent signage carries no amount; per-customer invoices do.",
        },
        {
          heading: "Reading the code with a Thai banking app",
          body: "Every Thai banking app has a scan button on its home screen. Once scanned, the app shows the recipient name, partly masked as banks require. Check two things: that the recipient is who it should be, and whether the amount field arrives pre-filled or open for input. If you intended a reusable code and the app pre-fills an amount, you left a figure in the amount field — clear it and regenerate.",
        },
        {
          heading: "Local generation, optional account storage",
          body: "The entire PromptPay calculation — assembling the EMVCo data objects and computing the checksum that closes the payload — happens in your browser. No request is made to our server while you generate, test, or download the code. If you sign in and choose Save QR, your mobile number, national ID, amount, and style are stored in your account so you can manage the saved QR later.",
        },
      ],
      faqs: [
        {
          question: "Do I need to register with PromptPay first?",
          answer:
            "Yes. We can only build a code pointing at the number you type; linking that number to a deposit account is something your bank does. If you have never registered, do it in the PromptPay section of your banking app first — codes generated here then work immediately.",
        },
        {
          question: "Can a code with an amount be reused?",
          answer:
            "Not per the standard. Once an amount is present the code is marked single-use. Some banking apps enforce that strictly and refuse a second payment while others let it through, so the behaviour depends on the sender's bank. For a code you display at a counter, leave the amount blank and let the customer type it.",
        },
        {
          question: "Is it safe to put a national ID code on public display?",
          answer:
            "We would not recommend it. The identifier is stored as text inside the symbol, so anyone who photographs the code and opens it with an ordinary QR reader sees all 13 digits of your national ID. For anything publicly visible, use a mobile number instead — far less damaging if it leaks, and you can unregister it at any time. Keep national-ID codes for one-to-one exchanges with counterparties.",
        },
        {
          question: "Are there any fees?",
          answer:
            "We charge nothing to generate a code and are not part of the payment at all — funds move from the sender's account to yours through PromptPay directly. Any fees are set by the sender's bank. Check with your own bank for high-value or business collections.",
        },
        {
          question: "How is this different from a merchant QR from my bank?",
          answer:
            "This page produces a personal PromptPay code, pointing at a registered mobile number, national ID or e-wallet. A merchant code issued by a bank carries a bank-assigned merchant identifier and is normally wired into the bank's payment-notification service. If you need automatic receipts, sales reconciliation or merchant alerts, request a merchant code from your bank — this page cannot produce one.",
        },
        {
          question: "How do I confirm the code is correct?",
          answer:
            "Scan it with a banking app and go through to the confirmation screen, which displays the recipient account name and the amount. If both are right, cancel without transferring. Seeing the correct recipient name is proof that the identifier inside the code is correct.",
        },
        {
          question: "Does a PromptPay QR code expire?",
          answer:
            "The code itself has no expiry. It works for as long as the target identifier stays registered to your account. Change your mobile number or unregister it from PromptPay and every printed code stops working immediately — worth remembering before you reprint signage in volume.",
        },
      ],
      privacyNote:
        "Your mobile number, national ID, and amount are used to compute the code in your browser and are not sent to our server while you generate or download it. If you choose Save QR, this data and the style are stored in your account.",
    },
  },
};
