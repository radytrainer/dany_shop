"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { api, ApiClientError } from "@/lib/fetcher";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { translateLoose } from "@/i18n/translator";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "exists">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("validation.email"));
      return;
    }
    setState("loading");
    try {
      const res = await api<{ status: "subscribed" | "exists" }>("/api/newsletter", { method: "POST", json: { email } });
      setState(res.status === "exists" ? "exists" : "done");
      setEmail("");
    } catch (err) {
      setState("idle");
      setError(err instanceof ApiClientError ? translateLoose(t, err.fields?.email, errorText(t, err)) : t("common.somethingWrong"));
    }
  }

  const dark = tone === "dark";
  return (
    <form onSubmit={onSubmit} className={cn("w-full max-w-md", className)} noValidate>
      <div className={cn("flex items-center border-b", dark ? "border-white/40" : "border-foreground")}>
        <label htmlFor="newsletter-email" className="sr-only">
          {t("home.newsletterPlaceholder")}
        </label>
        <input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("home.newsletterPlaceholder")}
          className={cn("h-12 min-w-0 flex-1 bg-transparent text-sm outline-none", dark ? "placeholder:text-white/60" : "placeholder:text-muted-foreground")}
          aria-invalid={!!error}
        />
        <button type="submit" disabled={state === "loading"} className="inline-flex h-12 items-center gap-2 px-2 text-xs font-semibold tracking-[0.14em] uppercase">
          {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          <span className="sr-only sm:not-sr-only">{t("home.newsletterSubmit")}</span>
        </button>
      </div>
      <p className={cn("mt-3 min-h-5 text-xs", error ? "text-destructive" : dark ? "text-white/80" : "text-muted-foreground")} role="status">
        {error ??
          (state === "done" ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5" /> {t("home.newsletterSuccess")}
            </span>
          ) : state === "exists" ? (
            t("home.newsletterExists")
          ) : (
            ""
          ))}
      </p>
    </form>
  );
}
