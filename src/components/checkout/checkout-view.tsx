"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { CouponForm } from "@/components/cart/coupon-form";
import { OrderTotals } from "@/components/cart/order-totals";
import { useCart } from "@/features/cart/cart-provider";
import { useMoney } from "@/features/store/store-provider";
import { useI18n } from "@/i18n/client";
import { errorText } from "@/i18n/errors";
import { api, ApiClientError } from "@/lib/fetcher";
import { checkoutCustomerSchema } from "@/lib/validations/checkout";
import { cn } from "@/lib/utils";
import { TextAreaField, TextField } from "./form-field";

type Channel = "TELEGRAM" | "WHATSAPP" | "MESSENGER";
type FormIn = z.input<typeof checkoutCustomerSchema>;
type FormOut = z.output<typeof checkoutCustomerSchema>;

export type SavedAddress = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  commune: string;
  addressLine: string;
  notes: string | null;
  isDefault: boolean;
};

export type DeliveryOption = {
  id: string;
  name: string;
  description: string | null;
  feeCents: number;
  freeOverCents: number | null;
  estimatedDays: string | null;
  isPickup: boolean;
};


const CHANNEL_META: Record<Channel, { icon: typeof Send; label: string }> = {
  TELEGRAM: { icon: Send, label: "Telegram" },
  MESSENGER: { icon: MessageCircle, label: "Messenger" },
  WHATSAPP: { icon: MessageCircle, label: "WhatsApp" },
};

export function CheckoutView({
  deliveryMethods,
  channels,
  defaultChannel,
  minOrderCents,
  user,
  addresses,
}: {
  deliveryMethods: DeliveryOption[];
  channels: Record<Channel, boolean>;
  defaultChannel: Channel | null;
  minOrderCents: number | null;
  user: {
    name: string;
    email: string;
    phone: string | null;
    telegramUsername: string | null;
  } | null;
  addresses: SavedAddress[];
}) {
  const { t } = useI18n();
  const { format } = useMoney();
  const router = useRouter();
  const cart = useCart();
  const [channel, setChannel] = useState<Channel | null>(defaultChannel);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? null,
  );
  const [placed, setPlaced] = useState(false);

  const def = addresses.find((a) => a.id === selectedAddress);
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(checkoutCustomerSchema),
    mode: "onTouched",
    defaultValues: {
      fullName: def?.fullName ?? user?.name ?? "",
      phone: def?.phone ?? user?.phone ?? "",
      telegramUsername: user?.telegramUsername ?? "",
      email: user?.email ?? "",
      province: def?.province ?? "",
      district: def?.district ?? "",
      commune: def?.commune ?? "",
      addressLine: def?.addressLine ?? "",
      deliveryNotes: def?.notes ?? "",
    },
  });
  const { register, handleSubmit, formState, setValue, setError } = form;
  const errors = formState.errors;

  function applyAddress(a: SavedAddress) {
    setSelectedAddress(a.id);
    const opts = { shouldValidate: true, shouldDirty: true };
    setValue("fullName", a.fullName, opts);
    setValue("phone", a.phone, opts);
    setValue("province", a.province, opts);
    setValue("district", a.district, opts);
    setValue("commune", a.commune, opts);
    setValue("addressLine", a.addressLine, opts);
    setValue("deliveryNotes", a.notes ?? "", opts);
  }

  // Ensure the quote reflects the chosen delivery method.
  useEffect(() => {
    if (
      cart.deliveryMethodId &&
      !deliveryMethods.some((d) => d.id === cart.deliveryMethodId)
    )
      cart.setDeliveryMethodId(null);
  }, [cart, deliveryMethods]);

  const anyChannel = Object.values(channels).some(Boolean);
  const blocked = cart.lines.some(
    (l) =>
      l.issue === "UNAVAILABLE" ||
      l.issue === "OUT_OF_STOCK" ||
      l.issue === "INSUFFICIENT",
  );
  const belowMin = minOrderCents !== null && cart.subtotalCents < minOrderCents;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    let invalid = false;
    if (!cart.deliveryMethodId) {
      setDeliveryError(t("validation.selectDelivery"));
      invalid = true;
    }
    if (!channel) {
      setChannelError(t("validation.selectChannel"));
      invalid = true;
    }
    if (invalid) return;

    setSubmitting(true);
    try {
      const res = await api<{ orderNumber: string; confirmationUrl: string }>(
        "/api/orders",
        {
          method: "POST",
          json: {
            items: cart.lines.map((l) => ({
              variantId: l.variantId,
              quantity: l.quantity,
            })),
            couponCode: cart.couponCode,
            deliveryMethodId: cart.deliveryMethodId,
            contactChannel: channel,
            customer: values,
            saveAddress: !!user && saveAddress && !selectedAddress,
          },
        },
      );
      setPlaced(true);
      cart.clear();
      router.push(`${res.confirmationUrl}&new=1`);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiClientError) {
        if (err.code === "STOCK_CHANGED") {
          setFormError(t("checkout.stockChanged"));
          await cart.refreshQuote();
        } else if (err.code === "VALIDATION_ERROR" && err.fields) {
          for (const [path, msg] of Object.entries(err.fields)) {
            const field = path.replace(/^customer\./, "") as keyof FormIn;
            if (field in (form.getValues() as object))
              setError(field, { message: msg });
            else if (path === "deliveryMethodId")
              setDeliveryError(t("validation.selectDelivery"));
            else if (path === "contactChannel")
              setChannelError(t("validation.selectChannel"));
          }
          setFormError(t("validation.invalid"));
        } else if (err.code === "COUPON_INVALID") {
          setFormError(
            err.fields?.couponCode
              ? t(err.fields.couponCode as "coupon.INVALID", { amount: "" })
              : errorText(t, err),
          );
          cart.removeCoupon();
        } else if (err.code === "MIN_ORDER" && minOrderCents !== null) {
          setFormError(
            t("checkout.minOrder", { amount: format(minOrderCents) }),
          );
        } else {
          setFormError(errorText(t, err));
        }
      } else {
        setFormError(t("common.somethingWrongBody"));
      }
      toast.error(t("common.somethingWrong"));
    }
  });

  if (!cart.hydrated) {
    return (
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_420px]">
        <Skeleton className="h-[600px] rounded-none" />
        <Skeleton className="h-96 rounded-none" />
      </div>
    );
  }

  if (cart.lines.length === 0 && !placed) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title={t("cart.empty")}
        body={t("checkout.emptyCart")}
        action={{ label: t("cart.continueShopping"), href: "/shop" }}
      />
    );
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="font-heading text-4xl sm:text-5xl">
        {t("checkout.title")}
      </h1>
      {!user && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("checkout.signInPrompt")}{" "}
          <Link
            href="/account/login?next=/checkout"
            className="text-foreground underline underline-offset-4"
          >
            {t("nav.signIn")}
          </Link>{" "}
          · {t("checkout.guestNote")}
        </p>
      )}

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-8 grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16"
        data-testid="checkout-form"
      >
        <div className="space-y-10">
          {/* Contact */}
          <section aria-labelledby="contact-heading">
            <h2
              id="contact-heading"
              className="mb-5 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              1. {t("checkout.contact")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("checkout.fullName")}
                autoComplete="name"
                error={errors.fullName?.message}
                {...register("fullName")}
                className="sm:col-span-2"
              />
              <TextField
                label={t("checkout.phone")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="012 345 678"
                error={errors.phone?.message}
                {...register("phone")}
              />
              <TextField
                label={t("checkout.telegram")}
                optional
                placeholder="@username"
                autoComplete="off"
                error={errors.telegramUsername?.message}
                {...register("telegramUsername")}
              />
              <TextField
                label={t("checkout.email")}
                optional
                type="email"
                inputMode="email"
                autoComplete="email"
                error={errors.email?.message}
                {...register("email")}
                className="sm:col-span-2"
              />
            </div>
          </section>

          {/* Address */}
          <section aria-labelledby="address-heading">
            <h2
              id="address-heading"
              className="mb-5 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              2. {t("checkout.deliveryAddress")}
            </h2>
            {addresses.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("checkout.useSavedAddress")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => applyAddress(a)}
                      className={cn(
                        "border px-3 py-2 text-left text-xs",
                        selectedAddress === a.id
                          ? "border-foreground bg-foreground text-background"
                          : "hover:border-foreground",
                      )}
                    >
                      <span className="font-semibold">
                        {a.label ?? a.fullName}
                      </span>
                      <span className="block opacity-80">
                        {[a.addressLine, a.province].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t("checkout.address")}
                autoComplete="street-address"
                error={errors.addressLine?.message}
                {...register("addressLine", {
                  onChange: () => setSelectedAddress(null),
                })}
                className="sm:col-span-2"
              />
              <TextAreaField
                label={t("checkout.notes")}
                optional
                placeholder={t("checkout.notesPlaceholder")}
                error={errors.deliveryNotes?.message}
                {...register("deliveryNotes")}
                className="sm:col-span-2"
              />
            </div>
            {user && !selectedAddress && (
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="size-4 accent-foreground"
                />
                {t("account.addAddress")}
              </label>
            )}
          </section>

          {/* Delivery */}
          <section aria-labelledby="delivery-heading">
            <h2
              id="delivery-heading"
              className="mb-5 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              3. {t("checkout.deliveryMethod")}
            </h2>
            <div
              className="space-y-2"
              role="radiogroup"
              aria-labelledby="delivery-heading"
            >
              {deliveryMethods.map((d) => {
                const active = cart.deliveryMethodId === d.id;
                const Icon = d.isPickup ? Store : Truck;
                const free = d.feeCents === 0;
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      cart.setDeliveryMethodId(d.id);
                      setDeliveryError(null);
                    }}
                    className={cn(
                      "flex w-full items-center gap-4 border p-4 text-left transition-colors",
                      active
                        ? "border-foreground bg-secondary"
                        : "hover:border-foreground/60",
                    )}
                    data-testid="delivery-option"
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/40",
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    <Icon
                      className="size-5 shrink-0 text-muted-foreground"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">
                        {d.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          d.estimatedDays,
                          d.freeOverCents !== null
                            ? t("checkout.freeOver", {
                                amount: format(d.freeOverCents),
                              })
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="text-sm font-medium">
                      {free ? t("checkout.free") : format(d.feeCents)}
                    </span>
                  </button>
                );
              })}
            </div>
            {deliveryError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {deliveryError}
              </p>
            )}
          </section>

          {/* Contact channel */}
          <section aria-labelledby="channel-heading">
            <h2
              id="channel-heading"
              className="mb-2 text-xs font-semibold tracking-[0.16em] uppercase"
            >
              4. {t("checkout.contactChannel")}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {t("checkout.contactChannelHint")}
            </p>
            {anyChannel ? (
              <div
                className={cn(
                  "grid grid-cols-1 gap-2",
                  Object.values(channels).filter(Boolean).length === 3
                    ? "sm:grid-cols-3"
                    : "sm:grid-cols-2",
                )}
                role="radiogroup"
                aria-labelledby="channel-heading"
              >
                {(Object.keys(CHANNEL_META) as Channel[])
                  .filter((c) => channels[c])
                  .map((c) => {
                    const { icon: Icon, label } = CHANNEL_META[c];
                    const active = channel === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setChannel(c);
                          setChannelError(null);
                        }}
                        className={cn(
                          "flex h-14 items-center justify-center gap-2 border text-sm font-medium",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "hover:border-foreground/60",
                        )}
                        data-testid={`channel-${c.toLowerCase()}`}
                      >
                        <Icon className="size-4" aria-hidden />
                        {label}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-destructive">
                {t("order.channelNotConfigured")}
              </p>
            )}
            {channelError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {channelError}
              </p>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside
          className="h-fit space-y-6 bg-secondary p-5 sm:p-6 lg:sticky lg:top-24"
          aria-labelledby="summary-heading"
        >
          <h2 id="summary-heading" className="font-heading text-2xl">
            {t("checkout.orderSummary")}
          </h2>
          <ul className="max-h-80 space-y-4 overflow-y-auto">
            {cart.lines.map((l) => (
              <li
                key={l.variantId}
                className="flex gap-3"
                data-testid="summary-line"
              >
                <div className="relative h-20 w-15 shrink-0 bg-background">
                  {l.meta?.imageUrl && (
                    <Image
                      src={l.meta.imageUrl}
                      alt=""
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background">
                    {l.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-1">{l.meta?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.meta?.colorName} · {l.meta?.sizeName} ·{" "}
                    {l.meta ? format(l.meta.unitCents) : ""}
                  </p>
                  {l.issue && (
                    <p className="text-xs text-destructive">
                      {l.issue === "INSUFFICIENT" && l.meta
                        ? t("cart.quantityAdjusted", {
                            count: l.meta.available,
                          })
                        : t("cart.itemUnavailable")}
                    </p>
                  )}
                </div>
                <p className="text-sm tabular-nums">
                  {l.meta ? format(l.meta.unitCents * l.quantity) : ""}
                </p>
              </li>
            ))}
          </ul>
          <CouponForm />
          <OrderTotals showDelivery />
          {belowMin && minOrderCents !== null && (
            <p className="text-xs text-destructive">
              {t("checkout.minOrder", { amount: format(minOrderCents) })}
            </p>
          )}
          {blocked && (
            <p className="text-xs text-destructive">
              {t("cart.unavailableItems")}{" "}
              <Link href="/cart" className="underline">
                {t("cart.viewCart")}
              </Link>
            </p>
          )}
          {formError && (
            <p
              className="bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              data-testid="checkout-error"
            >
              {formError}
            </p>
          )}
          <Button
            type="submit"
            size="xl"
            className="w-full"
            disabled={submitting || blocked || belowMin || !anyChannel}
            data-testid="place-order"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />{" "}
                {t("checkout.placingOrder")}
              </>
            ) : (
              t("checkout.placeOrder")
            )}
          </Button>
          <p className="flex gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t("checkout.noPayment")}
          </p>
        </aside>
      </form>
    </div>
  );
}
