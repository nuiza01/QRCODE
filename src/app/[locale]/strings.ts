import type { Bundle } from "@/i18n/config";

export const localeLayoutStrings: Bundle<{
  siteName: string;
  siteTitle: string;
  siteDescription: string;
}> = {
  th: {
    siteName: "Nexora QR",
    siteTitle: "Nexora QR — สร้าง QR Code ฟรี รองรับพร้อมเพย์",
    siteDescription:
      "สร้าง QR Code ได้ทุกแบบ ทั้งลิงก์ ไวไฟ นามบัตร และพร้อมเพย์ ปรับสี ใส่โลโก้ และดาวน์โหลด PNG SVG หรือ PDF ข้อมูลอยู่ในเครื่องจนกว่าคุณจะเลือกบันทึก QR",
  },
  en: {
    siteName: "Nexora QR",
    siteTitle: "Nexora QR — free QR code generator with PromptPay support",
    siteDescription:
      "Generate QR codes for links, Wi-Fi, contact cards and Thai PromptPay. Style them and download PNG, SVG or PDF. Data stays local until you choose Save QR.",
  },
};

/**
 * On-page copy for the home page (`/[locale]`). Owned by FORMS alongside
 * `page.tsx`.
 *
 * Title and description deliberately live in `src/seo/content` instead, so the
 * `<title>` and the canonical/hreflang set are produced by one builder for
 * every page on the site rather than being restated here.
 */
export const homeStrings: Bundle<{
  heading: string;
  subheading: string;
}> = {
  th: {
    heading: "สร้าง QR Code ฟรี ใช้ได้ทันที",
    subheading:
      "เลือกชนิดข้อมูล กรอกรายละเอียด แล้วดาวน์โหลดเป็น PNG SVG หรือ PDF ได้เลย รองรับพร้อมเพย์ ไวไฟ นามบัตร และอีก 7 แบบ ข้อมูลอยู่ในเครื่องจนกว่าคุณจะเลือกบันทึก QR",
  },
  en: {
    heading: "Free QR code generator",
    subheading:
      "Pick a type, fill in the details, and download PNG, SVG or PDF. Ten content types including Thai PromptPay, Wi-Fi and contact cards. Data stays local until you choose Save QR.",
  },
};

/**
 * Copy for the account-gated generator at `/[locale]/create` and for the call
 * to action that replaced the generator on the public pages.
 *
 * The product decision (Product Owner, 2026-09-18) is that the generator is for
 * signed-in people only. The public pages keep their marketing depth so search
 * still has something to index, and every path into the product now goes
 * through `/[locale]/create`, which reads the session on the server.
 */
export const createStrings: Bundle<{
  title: string;
  ctaHeading: string;
  ctaBody: string;
  ctaAction: string;
  signInHeading: string;
  signInBody: string;
  unavailableHeading: string;
  unavailableBody: string;
  back: string;
}> = {
  th: {
    title: "สร้าง QR Code",
    ctaHeading: "เข้าสู่ระบบเพื่อสร้าง QR",
    ctaBody:
      "กรุณาสมัครหรือเข้าสู่ระบบด้วยบัญชี Google ก่อนใช้งาน ตัวสร้าง QR จะเปิดให้ใช้หลังยืนยันตัวตน เราใช้ Google เพื่อยืนยันบัญชีเท่านั้นและไม่อ่านอีเมล Gmail ของคุณ",
    ctaAction: "ไปที่ตัวสร้าง QR",
    signInHeading: "ต้องเข้าสู่ระบบก่อนใช้งาน",
    signInBody:
      "กดปุ่มเข้าสู่ระบบด้วย Google ที่มุมขวาบน แล้วระบบจะพากลับมาที่หน้านี้",
    unavailableHeading: "ระบบบัญชียังไม่พร้อมใช้งาน",
    unavailableBody:
      "ขณะนี้ตรวจสอบการเข้าสู่ระบบไม่ได้ จึงยังเปิดตัวสร้าง QR ให้ไม่ได้ กรุณาลองอีกครั้งภายหลัง",
    back: "กลับหน้าแรก",
  },
  en: {
    title: "Create a QR code",
    ctaHeading: "Sign in to create a QR code",
    ctaBody:
      "Please register or sign in with your Google account before using the generator. Google is used only to verify your identity; we do not read your Gmail. What you type stays in your browser until you choose Save QR.",
    ctaAction: "Open the QR generator",
    signInHeading: "Sign in to continue",
    signInBody:
      "Use the Sign in with Google button in the top right, and you will be returned to this page.",
    unavailableHeading: "Accounts are unavailable",
    unavailableBody:
      "Sign-in cannot be verified right now, so the generator stays closed. Please try again later.",
    back: "Back to home",
  },
};

/**
 * Copy for `/[locale]/signin-error`, where Better Auth sends a sign-in that
 * failed before it ever reached our callback (a stale or missing state cookie,
 * a provider error, a cancelled consent screen).
 *
 * The library's own error page is unbranded, English-only and a dead end. A
 * person who cannot sign in cannot use the generator at all since 2026-09-18,
 * so this page has to say what happened and offer the way back.
 *
 * `reason` is keyed by a fixed set of codes. Anything else shows the generic
 * line: the code arrives in a query string, so it is attacker-controlled text
 * and is never rendered.
 */
export const signInErrorStrings: Bundle<{
  title: string;
  lead: string;
  nextStep: string;
  retry: string;
  home: string;
  reason: Record<"state_mismatch" | "access_denied" | "unknown", string>;
}> = {
  th: {
    title: "เข้าสู่ระบบไม่สำเร็จ",
    lead: "ยังไม่ได้เข้าสู่ระบบ จึงยังใช้ตัวสร้าง QR ไม่ได้ ลองอีกครั้งได้เลย",
    nextStep: "หากหน้าต่าง Google ค้างหรือหมดอายุ ให้ปิดหน้าต่างเดิมแล้วเริ่มใหม่จากปุ่มด้านล่าง",
    retry: "ลองเข้าสู่ระบบอีกครั้ง",
    home: "กลับหน้าแรก",
    reason: {
      state_mismatch:
        "คำขอเข้าสู่ระบบหมดอายุหรือถูกเปิดค้างไว้นานเกินไป กดลองใหม่แล้วทำให้เสร็จภายในห้านาที",
      access_denied: "คุณยกเลิกการอนุญาตที่หน้าจอของ Google จึงยังไม่ได้เข้าสู่ระบบ",
      unknown: "เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ",
    },
  },
  en: {
    title: "Sign-in did not complete",
    lead: "You are not signed in, so the generator stays closed. You can try again.",
    nextStep: "If the Google window was left open or expired, close it and start a fresh sign-in below.",
    retry: "Try signing in again",
    home: "Back to home",
    reason: {
      state_mismatch:
        "The sign-in request expired or was left open too long. Start again and finish within five minutes.",
      access_denied: "Consent was cancelled on Google's screen, so no session was created.",
      unknown: "Something went wrong during sign-in.",
    },
  },
};
