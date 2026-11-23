/**
 * Only allow same-site relative redirects after sign-in (prevents open redirects).
 * Resolves against a dummy origin the same way browsers do (incl. backslash tricks). Safe on server and client.
 */
export function safeNext(next: string | null | undefined, fallback: string) {
  if (!next || !next.startsWith("/")) return fallback;
  try {
    const base = "http://same-origin.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
