import type { Bundle, Locale } from "@/i18n/config";

/**
 * Copy for the app shell.
 *
 * Thai is the primary language here, not a translation of the English —
 * the English is the one that reads slightly stiff, and that is the correct
 * trade-off for this market.
 */
export const layoutStrings: Bundle<{
  brandName: string;
  tagline: string;
  skipToContent: string;
  languageLabel: string;
  primaryNavLabel: string;
  footerNavLabel: string;
  privacyNote: string;
  auth: {
    accountControls: string;
    failed: string;
    loading: string;
    signInWithGoogle: string;
    signedInAs: string;
    dashboard: string;
    signOut: string;
  };
  nav: {
    pricing: string;
    docs: string;
    privacy: string;
    terms: string;
  };
  /** Rendered as `{year} {rightsReserved}`. */
  rightsReserved: string;
}> = {
  th: {
    brandName: "Nexora QR",
    tagline: "สร้าง QR Code ฟรี หลังเข้าสู่ระบบด้วย Google",
    skipToContent: "ข้ามไปยังเนื้อหาหลัก",
    languageLabel: "เปลี่ยนภาษา",
    primaryNavLabel: "เมนูหลัก",
    footerNavLabel: "ลิงก์ท้ายเว็บ",
    privacyNote:
      "QR สร้างขึ้นในเครื่องของคุณ ข้อมูลจะถูกส่งขึ้นเซิร์ฟเวอร์เฉพาะเมื่อคุณเลือกบันทึกไว้ในบัญชี",
    auth: {
      accountControls: "บัญชีผู้ใช้",
      failed: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง",
      loading: "กำลังตรวจสอบบัญชี",
      signInWithGoogle: "เข้าสู่ระบบด้วย Google",
      signedInAs: "เข้าสู่ระบบเป็น {name}",
      dashboard: "แดชบอร์ด",
      signOut: "ออกจากระบบ",
    },
    nav: {
      pricing: "แพ็กเกจและราคา",
      docs: "คู่มือการใช้งาน",
      privacy: "นโยบายความเป็นส่วนตัว",
      terms: "ข้อกำหนดการใช้งาน",
    },
    rightsReserved: "Nexora QR สงวนลิขสิทธิ์",
  },
  en: {
    brandName: "Nexora QR",
    tagline: "Free QR codes, ready to use after Google sign-in.",
    skipToContent: "Skip to main content",
    languageLabel: "Change language",
    primaryNavLabel: "Main navigation",
    footerNavLabel: "Footer links",
    privacyNote:
      "Codes are generated on your device. Data is sent to the server only when you choose to save it to your account.",
    auth: {
      accountControls: "Account controls",
      failed: "Sign-in failed. Please try again.",
      loading: "Checking your account",
      signInWithGoogle: "Sign in with Google",
      signedInAs: "Signed in as {name}",
      dashboard: "Dashboard",
      signOut: "Sign out",
    },
    nav: {
      pricing: "Pricing",
      docs: "Docs",
      privacy: "Privacy",
      terms: "Terms",
    },
    rightsReserved: "Nexora QR. All rights reserved.",
  },
};

/**
 * Language names are written in their own language in every UI — a Thai
 * speaker looking for Thai looks for "ไทย", not "Thai". So this is a plain map,
 * not a `Bundle`: it is identical in every locale by design.
 */
export const languageNames: Record<Locale, string> = {
  th: "ไทย",
  en: "English",
};
