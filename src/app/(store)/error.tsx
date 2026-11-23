"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" strokeWidth={1.3} aria-hidden />
      <h1 className="mt-4 font-heading text-3xl">{t("common.somethingWrong")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("common.somethingWrongBody")}</p>
      <Button size="xl" className="mt-8" onClick={reset}>
        {t("common.retry")}
      </Button>
    </div>
  );
}
