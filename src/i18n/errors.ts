import { ApiClientError } from "@/lib/fetcher";
import type { MessageKey, Translator } from "./translator";

const CODE_KEYS: Record<string, MessageKey> = {
  RATE_LIMITED: "errors.rateLimited",
  NETWORK_ERROR: "errors.network",
  UNAUTHORIZED: "errors.signInRequired",
  FORBIDDEN: "errors.forbidden",
  NOT_FOUND: "errors.notFound",
  STOCK_CHANGED: "checkout.stockChanged",
  EMPTY_CART: "checkout.emptyCart",
  VALIDATION_ERROR: "validation.invalid",
  INVALID_CREDENTIALS: "account.invalidCredentials",
  EMAIL_TAKEN: "account.emailTaken",
  WRONG_PASSWORD: "account.wrongPassword",
};

/** Customer-facing error text in the active language (never raw server English). */
export function errorText(t: Translator, err: unknown): string {
  if (err instanceof ApiClientError && CODE_KEYS[err.code]) return t(CODE_KEYS[err.code]);
  return t("common.somethingWrongBody");
}
