import type { Messages } from "./messages/en";
import en from "./messages/en";
import km from "./messages/km";
import type { Locale } from "./config";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];

export type MessageKey = Paths<Messages>;
export type TranslateVars = Record<string, string | number>;
export type Translator = (key: MessageKey, vars?: TranslateVars) => string;

export const dictionaries: Record<Locale, Messages> = { en, km };

function lookup(dict: Messages, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function createTranslator(locale: Locale): Translator {
  const dict = dictionaries[locale];
  return (key, vars) => interpolate(lookup(dict, key) ?? lookup(en, key) ?? key, vars);
}

/** Translate an arbitrary string key that may not be a known message (e.g. a zod error code). */
export function translateLoose(t: Translator, key: string | undefined, fallback?: string): string {
  if (!key) return fallback ?? "";
  const out = t(key as MessageKey);
  return out === key && fallback ? fallback : out;
}
