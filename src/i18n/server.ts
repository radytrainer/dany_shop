import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { createTranslator } from "./translator";

export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value;
    return isLocale(value) ? value : DEFAULT_LOCALE;
  } catch (err) {
    // Let Next.js control-flow errors (dynamic rendering bail-out) propagate.
    unstable_rethrow(err);
    // Outside a request scope (scripts, tests): fall back to the default language.
    return DEFAULT_LOCALE;
  }
});

export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: createTranslator(locale) };
}
