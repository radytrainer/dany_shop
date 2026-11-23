import { z } from "zod";
import { phoneSchema, telegramSchema } from "./checkout";

export const emailSchema = z.string().trim().toLowerCase().min(1, "validation.required").max(254).email("validation.email");

export const passwordSchema = z
  .string()
  .min(8, "validation.passwordWeak")
  .max(128, "validation.invalid")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "validation.passwordWeak");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.required").max(128),
  scope: z.enum(["customer", "admin"]).default("customer"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "validation.required").max(100),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "validation.passwordMismatch" });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "validation.required").max(100),
  phone: phoneSchema.optional().or(z.literal("").transform(() => undefined)),
  telegramUsername: telegramSchema,
  preferredLocale: z.enum(["en", "km"]).optional(),
  newsletter: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "validation.required"),
  newPassword: passwordSchema,
});

export const addressSchema = z.object({
  label: z.string().trim().max(50).optional().transform((v) => v || undefined),
  fullName: z.string().trim().min(2, "validation.required").max(100),
  phone: phoneSchema,
  province: z.string().trim().min(1, "validation.required").max(100),
  district: z.string().trim().min(1, "validation.required").max(100),
  commune: z.string().trim().min(1, "validation.required").max(100),
  addressLine: z.string().trim().min(1, "validation.required").max(300),
  notes: z.string().trim().max(500).optional().transform((v) => v || undefined),
  isDefault: z.boolean().optional(),
});
