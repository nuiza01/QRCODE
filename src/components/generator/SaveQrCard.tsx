"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SAVED_STATIC_QR_QUOTA_ERROR } from "@/features/saved-qr/quota";
import type { Locale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import type { QrPayload, QrStyle } from "@/qr/types";

type Props = {
  blocked: boolean;
  locale: Locale;
  payload: QrPayload | null;
  style: QrStyle;
};

const copy = {
  th: {
    title: "บันทึกไว้ในบัญชี",
    detail: "เมื่อกดบันทึก ข้อมูล QR และรูปแบบจะถูกเก็บในบัญชี Free ของคุณได้สูงสุด 25 Static QR",
    name: "ชื่อ QR",
    save: "บันทึก QR",
    saving: "กำลังบันทึก",
    signIn: "เข้าสู่ระบบด้วย Google จากเมนูด้านบนเพื่อบันทึก QR",
    success: "บันทึกแล้ว",
    dashboard: "เปิดแดชบอร์ด",
    failed: "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง",
    quota: "บัญชีฟรีบันทึก Static QR ได้สูงสุด 25 รายการ ลบรายการเดิมก่อนบันทึกใหม่",
    defaultName: "QR ของฉัน",
  },
  en: {
    title: "Save to your account",
    detail: "Saving stores this QR payload and style in your Free account, up to 25 Static QR codes.",
    name: "QR name",
    save: "Save QR",
    saving: "Saving",
    signIn: "Sign in with Google from the header to save this QR.",
    success: "Saved",
    dashboard: "Open dashboard",
    failed: "Could not save. Please try again.",
    quota: "A free account can save up to 25 static QR codes. Delete one before saving another.",
    defaultName: "My QR",
  },
} as const;

export function SaveQrCard({ blocked, locale, payload, style }: Props) {
  const s = copy[locale];
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState<string>(s.defaultName);
  const currentKey = JSON.stringify([payload, style]);
  const [result, setResult] = useState<{
    key: string;
    state: "saving" | "saved" | "failed" | "quota";
  } | null>(null);
  const state = result?.key === currentKey ? result.state : "idle";

  async function save() {
    if (!payload || blocked || !session?.user) return;
    const requestKey = currentKey;
    setResult({ key: requestKey, state: "saving" });
    try {
      const response = await fetch("/api/qr-codes", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode: "static", payload, style }),
      });
      if (response.ok) {
        setResult({ key: requestKey, state: "saved" });
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      const quotaExceeded =
        response.status === 409 &&
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        body.error === SAVED_STATIC_QR_QUOTA_ERROR;
      setResult({ key: requestKey, state: quotaExceeded ? "quota" : "failed" });
    } catch {
      setResult({ key: requestKey, state: "failed" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">{s.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
      </div>
      {isPending ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">…</p>
      ) : session?.user ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span>{s.name}</span>
            <Input
              value={name}
              maxLength={160}
              onChange={(event) => {
                setName(event.target.value);
                setResult(null);
              }}
            />
          </label>
          <Button
            onClick={save}
            disabled={!payload || blocked || !name.trim() || state === "saving"}
          >
            {state === "saving" ? s.saving : s.save}
          </Button>
          <div aria-live="polite" className="text-sm">
            {state === "saved" ? (
              <p className="text-emerald-700 dark:text-emerald-300">
                {s.success} · <Link className="underline" href={`/${locale}/dashboard`}>{s.dashboard}</Link>
              </p>
            ) : state === "failed" || state === "quota" ? (
              <p role="alert" className="text-destructive">
                {state === "quota" ? s.quota : s.failed}
              </p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{s.signIn}</p>
      )}
    </div>
  );
}
