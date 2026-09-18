"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SAVED_STATIC_QR_QUOTA_ERROR } from "@/features/saved-qr/quota";
import type { Locale } from "@/i18n/config";

const copy = {
  th: { rename: "เปลี่ยนชื่อ", duplicate: "ทำสำเนา", remove: "ลบ", confirm: "ยืนยันลบ QR นี้?", failed: "ดำเนินการไม่สำเร็จ", quota: "บัญชีฟรีบันทึก Static QR ได้สูงสุด 25 รายการ ลบรายการเดิมก่อนทำสำเนา" },
  en: { rename: "Rename", duplicate: "Duplicate", remove: "Delete", confirm: "Delete this saved QR?", failed: "The action failed", quota: "A free account can save up to 25 static QR codes. Delete one before duplicating." },
} as const;

export function DashboardActions({ id, locale, name }: { id: string; locale: Locale; name: string }) {
  const router = useRouter();
  const s = copy[locale];
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<"generic" | "quota" | null>(null);

  async function request(path: string, init: RequestInit) {
    setBusy(true);
    setFailure(null);
    try {
      const response = await fetch(path, { ...init, credentials: "same-origin" });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const quotaExceeded =
          response.status === 409 &&
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          body.error === SAVED_STATIC_QR_QUOTA_ERROR;
        setFailure(quotaExceeded ? "quota" : "generic");
        return;
      }
      router.refresh();
    } catch {
      setFailure("generic");
    } finally {
      setBusy(false);
    }
  }

  function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("name");
    if (typeof value !== "string" || !value.trim()) return;
    void request(`/api/qr-codes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={rename}>
        <Input name="name" defaultValue={name} maxLength={160} aria-label={s.rename} />
        <Button type="submit" size="sm" variant="outline" disabled={busy}>{s.rename}</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void request(`/api/qr-codes/${id}/duplicate`, { method: "POST" })}
        >
          {s.duplicate}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            if (window.confirm(s.confirm)) void request(`/api/qr-codes/${id}`, { method: "DELETE" });
          }}
        >
          {s.remove}
        </Button>
      </div>
      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {failure === "quota" ? s.quota : s.failed}
        </p>
      ) : null}
    </div>
  );
}
