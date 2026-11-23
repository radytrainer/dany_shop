import { z } from "zod";

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const cartItemsSchema = z.array(cartItemSchema).max(50);

export const couponCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "validation.invalid")
  .transform((s) => s.toUpperCase());

export const quoteRequestSchema = z.object({
  items: cartItemsSchema,
  couponCode: couponCodeSchema.nullish(),
  deliveryMethodId: z.string().uuid().nullish(),
});
export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export const couponValidateSchema = z.object({
  code: couponCodeSchema,
  items: cartItemsSchema,
});
