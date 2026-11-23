"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/checkout/form-field";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { api, ApiClientError } from "@/lib/fetcher";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { safeNext } from "@/lib/safe-next";

export function LoginForm({ next, scope = "customer" }: { next?: string; scope?: "customer" | "admin" }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", scope },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", json: values });
      router.replace(safeNext(next, scope === "admin" ? "/admin" : "/account"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "INVALID_CREDENTIALS") setError(t("account.invalidCredentials"));
      else setError(errorText(t, err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="login-form">
      <TextField label={t("account.email")} type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
      <TextField label={t("account.password")} type="password" autoComplete="current-password" error={errors.password?.message} {...form.register("password")} />
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {t("account.signingIn")}
          </>
        ) : (
          t("account.signIn")
        )}
      </Button>
      {scope === "customer" && (
        <p className="text-center text-sm text-muted-foreground">
          {t("account.noAccount")}{" "}
          <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-foreground underline underline-offset-4">
            {t("account.register")}
          </Link>
        </p>
      )}
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<typeof registerSchema>, unknown, z.output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await api("/api/auth/register", { method: "POST", json: values });
      router.replace(safeNext(next, "/account"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "EMAIL_TAKEN") form.setError("email", { message: "account.emailTaken" });
      else if (err instanceof ApiClientError && err.fields) {
        for (const [k, v] of Object.entries(err.fields)) form.setError(k as keyof z.input<typeof registerSchema>, { message: v });
      } else setError(errorText(t, err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" data-testid="register-form">
      <TextField label={t("account.name")} autoComplete="name" error={errors.name?.message} {...form.register("name")} />
      <TextField label={t("account.email")} type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
      <TextField label={t("account.phone")} optional type="tel" autoComplete="tel" error={errors.phone?.message} {...form.register("phone")} />
      <TextField label={t("account.password")} type="password" autoComplete="new-password" hint={t("validation.passwordWeak")} error={errors.password?.message} {...form.register("password")} />
      <TextField label={t("account.confirmPassword")} type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register("confirmPassword")} />
      {error && (
        <p className="bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="xl" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" /> {t("account.creating")}
          </>
        ) : (
          t("account.register")
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("account.haveAccount")}{" "}
        <Link href={`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-foreground underline underline-offset-4">
          {t("account.signIn")}
        </Link>
      </p>
    </form>
  );
}

export function SignOutButton({ className, redirectTo = "/" }: { className?: string; redirectTo?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        router.replace(redirectTo);
        router.refresh();
      }}
    >
      {t("account.signOut")}
    </button>
  );
}
