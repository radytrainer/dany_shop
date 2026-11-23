/** Client-side helper for our JSON API envelope ({ ok, data } | { ok: false, error }). */

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { Accept: "application/json", ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  let body: { ok: boolean; data?: T; error?: { code: string; message: string; fields?: Record<string, string> } } | null = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok || !body?.ok) {
    const err = body?.error;
    throw new ApiClientError(res.status, err?.code ?? "NETWORK_ERROR", err?.message ?? "Request failed", err?.fields);
  }
  return body.data as T;
}
