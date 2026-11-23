/**
 * Money helpers. All arithmetic is done on integer minor units ("cents").
 * Values cross the wire as decimal strings ("15.00") and are stored as
 * Postgres DECIMAL(12,2). Floating point is never used for money math.
 */

export type Cents = number;

export const SUPPORTED_CURRENCIES = ["USD", "KHR"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

type DecimalLike = { toFixed(dp: number): string };

function isDecimalLike(v: unknown): v is DecimalLike {
  return typeof v === "object" && v !== null && "toFixed" in v && typeof (v as DecimalLike).toFixed === "function";
}

/**
 * Convert a decimal string / Prisma Decimal / integer-ish number to cents.
 * Strings with more than 2 decimals are rounded half-up on the 3rd digit.
 */
export function toCents(value: string | number | DecimalLike | null | undefined): Cents {
  if (value === null || value === undefined || value === "") return 0;
  let str: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid money value");
    str = value.toFixed(2);
  } else if (typeof value === "string") str = value.trim();
  else if (isDecimalLike(value)) str = value.toFixed(2);
  else throw new Error("Invalid money value");

  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(str);
  if (!match) throw new Error(`Invalid money value: ${str}`);
  const negative = match[1] === "-";
  const whole = parseInt(match[2], 10);
  const frac = (match[3] ?? "").padEnd(3, "0");
  let cents = whole * 100 + parseInt(frac.slice(0, 2), 10);
  if (parseInt(frac[2], 10) >= 5) cents += 1;
  return negative ? -cents : cents;
}

/** Cents → decimal string suitable for Prisma Decimal columns. */
export function fromCents(cents: Cents): string {
  if (!Number.isInteger(cents)) throw new Error("Cents must be an integer");
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const str = `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
  return negative ? `-${str}` : str;
}

/** Percentage of an amount using integer math. `percent` like "12.5". */
export function percentOf(cents: Cents, percent: string | number | DecimalLike): Cents {
  const hundredths = toCents(percent); // 12.5% → 1250
  return Math.round((cents * hundredths) / 10000);
}

/** Group an integer with commas: 1234567 → "1,234,567". Pure string math (no ICU data). */
function groupDigits(n: number): string {
  return String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Deterministic money formatting: identical output on the server (Node ICU) and in every browser,
 * so server-rendered prices never cause hydration mismatches. Cambodian convention in both
 * languages: "$55.00" and "41,000៛". `locale` is accepted for API symmetry.
 */
export function formatMoney(cents: Cents, currency: string = "USD", _locale: string = "en"): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  let body: string;
  if (currency === "KHR") {
    body = `${groupDigits(Math.round(abs / 100))}៛`;
  } else {
    const symbol = currency === "USD" ? "$" : `${currency} `;
    body = `${symbol}${groupDigits(Math.floor(abs / 100))}.${String(abs % 100).padStart(2, "0")}`;
  }
  return negative ? `-${body}` : body;
}

/** Approximate conversion using an admin-set fixed rate (e.g. 4100 KHR per USD). */
export function convertWithRate(cents: Cents, rate: string | DecimalLike): Cents {
  const rateHundredths = toCents(rate);
  return Math.round((cents * rateHundredths) / 100);
}
