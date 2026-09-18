import type { Bundle } from "@/i18n/config";

/**
 * Chrome for the per-type landing pages.
 *
 * Only the furniture lives here — headings, labels, breadcrumb text. The page
 * copy itself is in `src/seo/content/*`, because it is shared with the metadata
 * and the JSON-LD, and duplicating it here is how those three drift apart.
 */
export const qrLandingStrings: Bundle<{
  breadcrumbLabel: string;
  home: string;
  howToHeading: string;
  faqHeading: string;
  privacyHeading: string;
  moreTypesHeading: string;
  moreTypesLabel: string;
}> = {
  th: {
    breadcrumbLabel: "เส้นทางหน้าเว็บ",
    home: "หน้าแรก",
    howToHeading: "วิธีใช้งาน",
    faqHeading: "คำถามที่พบบ่อย",
    privacyHeading: "ข้อมูลอยู่ในเครื่องจนกว่าคุณจะเลือกบันทึก",
    moreTypesHeading: "สร้าง QR Code ชนิดอื่น",
    moreTypesLabel: "QR Code ชนิดอื่น",
  },
  en: {
    breadcrumbLabel: "Breadcrumb",
    home: "Home",
    howToHeading: "How to use it",
    faqHeading: "Frequently asked questions",
    privacyHeading: "Your data stays local until you choose Save",
    moreTypesHeading: "Other QR code types",
    moreTypesLabel: "Other QR code types",
  },
};
