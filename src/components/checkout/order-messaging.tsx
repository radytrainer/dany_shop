"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { api } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

type Channel = "TELEGRAM" | "WHATSAPP" | "MESSENGER";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older/in-app browsers.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

/**
 * Sends the saved order to the seller. The order is already stored; opening the app
 * only records that the customer reached out (never confirms or marks it as paid).
 */
export function OrderMessaging({
  orderNumber,
  token,
  message,
  links,
  preferred,
}: {
  orderNumber: string;
  token: string | null;
  message: string;
  links: Record<Channel, string | null>;
  preferred: Channel;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState<Channel | null>(null);

  async function record(channel: Channel) {
    try {
      await api(`/api/orders/${orderNumber}/contact`, { method: "POST", json: { token, channel } });
    } catch {
      /* the order is already saved; recording the click is best-effort */
    }
  }

  async function copy() {
    const ok = await copyText(message);
    setCopied(ok);
    if (ok) toast.success(t("order.copiedDetails"));
    setTimeout(() => setCopied(false), 2500);
  }

  async function open(channel: Channel) {
    const link = links[channel];
    if (!link) return;
    if (channel === "MESSENGER") await copy(); // Messenger can't prefill: copy first, then open.
    void record(channel);
    setOpened(channel);
    const win = window.open(link, "_blank", "noopener,noreferrer");
    if (!win) window.location.assign(link);
  }

  const order: Channel[] = [preferred, ...(["TELEGRAM", "MESSENGER", "WHATSAPP"] as Channel[]).filter((c) => c !== preferred)];
  const available = order.filter((c) => links[c]);

  return (
    <div className="space-y-3" data-testid="order-messaging">
      {available.map((c, i) => {
        const Icon = c === "TELEGRAM" ? Send : MessageCircle;
        const label = c === "TELEGRAM" ? t("order.sendTelegram") : c === "WHATSAPP" ? t("order.sendWhatsapp") : t("order.openMessenger");
        return (
          <Button
            key={c}
            type="button"
            size="xl"
            variant={i === 0 ? "default" : "outline"}
            className={cn("w-full", c === "TELEGRAM" && i === 0 && "bg-[#229ED9] hover:bg-[#1c8bc0]", c === "WHATSAPP" && i === 0 && "bg-[#1f9e55] hover:bg-[#198a49]")}
            onClick={() => open(c)}
            data-testid={`send-${c.toLowerCase()}`}
            data-href={links[c] ?? undefined}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Button>
        );
      })}
      {links.MESSENGER && <p className="text-xs text-muted-foreground">{t("order.messengerHint")}</p>}
      <Button type="button" size="xl" variant="ghost" className="w-full border border-dashed" onClick={copy} data-testid="copy-order">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? t("common.copied") : t("order.copyDetails")}
      </Button>
      {opened && <p className="text-xs text-muted-foreground">{t("order.cantOpen")}</p>}
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">{t("order.copyDetails")}</summary>
        <pre className="mt-2 max-h-72 overflow-auto bg-background p-3 font-sans text-xs whitespace-pre-wrap" data-testid="order-message">
          {message}
        </pre>
      </details>
    </div>
  );
}
