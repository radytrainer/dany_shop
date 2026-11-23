import { z } from "zod";
import { cartItemsSchema, couponCodeSchema } from "./cart";

/** Zod messages are i18n keys so the same schema yields translated errors on the client. */
const required = (max: number) => z.string().trim().min(1, "validation.required").max(max, "validation.invalid");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "validation.required")
  .refine((v) => /^\+?[\d\s().-]{8,20}$/.test(v) && v.replace(/\D/g, "").length >= 8 && v.replace(/\D/g, "").length <= 15, "validation.phone");

export const telegramSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, ""))
  .refine((v) => v === "" || /^[A-Za-z0-9_]{5,32}$/.test(v), "validation.telegram")
  .optional()
  .transform((v) => (v ? v : undefined));

export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "validation.email")
  .optional()
  .transform((v) => (v ? v : undefined));

export const checkoutCustomerSchema = z.object({
  fullName: required(100).refine((v) => v.length >= 2, "validation.required"),
  phone: phoneSchema,
  telegramUsername: telegramSchema,
  email: optionalEmailSchema,
  province: required(100),
  district: required(100),
  commune: required(100),
  addressLine: required(300),
  deliveryNotes: z.string().trim().max(500, "validation.invalid").optional().transform((v) => (v ? v : undefined)),
});
export type CheckoutCustomer = z.input<typeof checkoutCustomerSchema>;

export const CONTACT_CHANNELS = ["TELEGRAM", "WHATSAPP", "MESSENGER"] as const;

export const checkoutSchema = z.object({
  items: cartItemsSchema.min(1, "checkout.emptyCart"),
  couponCode: couponCodeSchema.nullish(),
  deliveryMethodId: z.string({ message: "validation.selectDelivery" }).uuid("validation.selectDelivery"),
  contactChannel: z.enum(CONTACT_CHANNELS, { message: "validation.selectChannel" }),
  customer: checkoutCustomerSchema,
  saveAddress: z.boolean().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
