/** Read one translated field from a `{ "km": { "name": "…" } }` JSON column, falling back to the base value. */
export function translated(base: string, translations: unknown, locale: string, field = "name"): string {
  if (!translations || typeof translations !== "object") return base;
  const tr = (translations as Record<string, unknown>)[locale];
  if (!tr || typeof tr !== "object") return base;
  const v = (tr as Record<string, unknown>)[field];
  return typeof v === "string" && v.trim() ? v : base;
}
