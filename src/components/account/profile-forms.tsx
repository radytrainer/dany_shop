"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/checkout/form-field";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { api, ApiClientError } from "@/lib/fetcher";
import { changePasswordSchema, profileSchema } from "@/lib/validations/auth";

export function ProfileForms({ initial }: { initial: { name: string; email: string; phone: string; telegramUsername: string; newsletter: boolean } }) {
  const { t } = useI18n();
  const router = useRouter();
  const profile = useForm<z.input<typeof profileSchema>, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: initial.name, phone: initial.phone, telegramUsername: initial.telegramUsername, newsletter: initial.newsletter },
  });
  const password = useForm<z.input<typeof changePasswordSchema>, unknown, z.output<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const saveProfile = profile.handleSubmit(async (values) => {
    try {
      await api("/api/customers/profile", { method: "PUT", json: values });
      toast.success(t("account.profileSaved"));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) for (const [k, v] of Object.entries(err.fields)) profile.setError(k as "name", { message: v });
      else toast.error(t("common.somethingWrong"));
    }
  });

  const savePassword = password.handleSubmit(async (values) => {
    try {
      await api("/api/customers/password", { method: "PUT", json: values });
      toast.success(t("account.passwordChanged"));
      password.reset();
    } catch (err) {
      if (err instanceof ApiClientError && err.fields) for (const [k, v] of Object.entries(err.fields)) password.setError(k as "currentPassword", { message: v });
      else toast.error(errorText(t, err));
    }
  });

  const pe = profile.formState.errors;
  const we = password.formState.errors;
  return (
    <div className="grid gap-12 xl:grid-cols-2">
      <form onSubmit={saveProfile} noValidate className="space-y-4">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">{t("account.profile")}</h2>
        <TextField label={t("account.name")} error={pe.name?.message} {...profile.register("name")} />
        <TextField label={t("account.email")} value={initial.email} disabled readOnly name="email-readonly" />
        <TextField label={t("account.phone")} type="tel" optional error={pe.phone?.message} {...profile.register("phone")} />
        <TextField label={t("checkout.telegram")} optional placeholder="@username" error={pe.telegramUsername?.message} {...profile.register("telegramUsername")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-foreground" {...profile.register("newsletter")} />
          {t("home.newsletterTitle")}
        </label>
        <Button type="submit" size="xl" disabled={profile.formState.isSubmitting}>
          {profile.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {t("common.save")}
        </Button>
      </form>
      <form onSubmit={savePassword} noValidate className="space-y-4">
        <h2 className="text-xs font-semibold tracking-[0.16em] uppercase">{t("account.changePassword")}</h2>
        <TextField label={t("account.currentPassword")} type="password" autoComplete="current-password" error={we.currentPassword?.message} {...password.register("currentPassword")} />
        <TextField label={t("account.newPassword")} type="password" autoComplete="new-password" hint={t("validation.passwordWeak")} error={we.newPassword?.message} {...password.register("newPassword")} />
        <Button type="submit" size="xl" variant="outline" disabled={password.formState.isSubmitting}>
          {password.formState.isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {t("account.changePassword")}
        </Button>
      </form>
    </div>
  );
}
