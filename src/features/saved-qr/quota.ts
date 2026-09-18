export const FREE_SAVED_STATIC_QR_LIMIT = 25;
export const SAVED_STATIC_QR_QUOTA_ERROR = "saved_static_qr_quota_exceeded";

export function canSaveStaticQr(savedStaticCount: number): boolean {
  return (
    Number.isSafeInteger(savedStaticCount) &&
    savedStaticCount >= 0 &&
    savedStaticCount < FREE_SAVED_STATIC_QR_LIMIT
  );
}
