"use client";

import { LayoutDashboard, LogIn, LogOut, LoaderCircle, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { focusRing } from "@/components/ui/focus-ring";
import { type Locale, t } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

import { layoutStrings } from "./strings";

type AuthMenuViewProps = {
  busy?: boolean;
  error?: boolean;
  locale: Locale;
  onSignIn: () => void;
  onSignOut: () => void;
  userName?: string | null;
};

export function AuthMenuView({
  busy = false,
  error = false,
  locale,
  onSignIn,
  onSignOut,
  userName,
}: AuthMenuViewProps) {
  const s = t(layoutStrings, locale).auth;

  if (busy) {
    return (
      <span
        aria-label={s.loading}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground"
      >
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      </span>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {userName ? (
        <>
          <span
            aria-label={s.signedInAs.replace("{name}", userName)}
            className="hidden min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex"
          >
            <UserRound aria-hidden="true" className="size-4 shrink-0" />
            <span className="max-w-28 truncate">{userName}</span>
          </span>
          <Link
            href={`/${locale}/dashboard`}
            aria-label={s.dashboard}
            title={s.dashboard}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted",
              focusRing,
            )}
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            aria-label={s.signOut}
            title={s.signOut}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted",
              focusRing,
            )}
          >
            <LogOut aria-hidden="true" className="size-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          aria-label={s.signInWithGoogle}
          title={s.signInWithGoogle}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted",
            focusRing,
          )}
        >
          <LogIn aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">{s.signInWithGoogle}</span>
          <span className="sm:hidden">Google</span>
        </button>
      )}
      {error ? <span className="sr-only" role="alert">{s.failed}</span> : null}
    </div>
  );
}

/**
 * Where Google should send the visitor back to.
 *
 * Exported because it is the only part of sign-in worth testing on its own: it
 * decides a URL from data the page cannot vouch for. Anything that is not this
 * locale's own path collapses to the locale home, so a crafted location such as
 * `//evil.example` or `/thailand` cannot become a redirect target.
 *
 * The query string is kept on purpose. Arriving at `/th/create?type=promptpay`,
 * signing in, and landing on a generator set to URL would lose the reason the
 * person came.
 */
export function safeReturnPath(locale: Locale, path: string, search = ""): string {
  const home = `/${locale}`;
  const own = path === home || path.startsWith(`${home}/`);
  if (!own) return home;
  return search.startsWith("?") ? `${path}${search}` : path;
}

function EnabledAuthMenu({ locale }: { locale: Locale }) {
  const s = t(layoutStrings, locale).auth;
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [actionPending, setActionPending] = useState(false);
  const [failed, setFailed] = useState(false);

  // Read at click time from the live location rather than with useSearchParams:
  // this menu renders in the layout of prerendered pages, and that hook would
  // opt every one of them out of prerendering.
  function returnPath() {
    if (typeof window === "undefined") return safeReturnPath(locale, pathname);
    return safeReturnPath(locale, window.location.pathname, window.location.search);
  }

  async function signIn() {
    setActionPending(true);
    setFailed(false);
    const target = returnPath();
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: target,
        errorCallbackURL: target,
      });
      if (result.error) {
        setFailed(true);
        setActionPending(false);
      }
    } catch {
      setFailed(true);
      setActionPending(false);
    }
  }

  async function signOut() {
    setActionPending(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setActionPending(false);
    }
  }

  return (
    <div aria-label={s.accountControls}>
      <AuthMenuView
        busy={isPending || actionPending}
        error={failed}
        locale={locale}
        onSignIn={signIn}
        onSignOut={signOut}
        userName={session?.user.name}
      />
    </div>
  );
}

export function AuthMenu({
  enabled,
  locale,
}: {
  enabled: boolean;
  locale: Locale;
}) {
  if (!enabled) return null;
  return <EnabledAuthMenu locale={locale} />;
}
