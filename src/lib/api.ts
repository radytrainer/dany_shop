import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@/generated/prisma/client";

/**
 * Consistent API envelope:
 *   success → { ok: true, data }
 *   failure → { ok: false, error: { code, message, fields? } }
 */
export type ApiErrorBody = {
  ok: false;
  error: { code: string; message: string; fields?: Record<string, string> };
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: Record<string, string>, code = "BAD_REQUEST") =>
  new ApiError(400, code, message, fields);
export const unauthorized = (message = "Authentication required") => new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "You do not have permission to do this") => new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found") => new ApiError(404, "NOT_FOUND", message);
export const conflict = (message: string, code = "CONFLICT") => new ApiError(409, code, message);
export const tooManyRequests = () => new ApiError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: ApiError) {
  const body: ApiErrorBody = { ok: false, error: { code: error.code, message: error.message } };
  if (error.fields) body.error.fields = error.fields;
  return NextResponse.json(body, { status: error.status });
}

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Convert anything thrown inside a handler into a safe JSON response. */
export function toErrorResponse(err: unknown) {
  if (err instanceof ApiError) return fail(err);
  if (err instanceof ZodError) return fail(badRequest("Validation failed", zodFields(err), "VALIDATION_ERROR"));
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return fail(conflict("A record with this value already exists", "DUPLICATE"));
    if (err.code === "P2025") return fail(notFound());
    if (err.code === "P2003") return fail(conflict("This record is referenced by other data", "IN_USE"));
  }
  console.error("[api] unhandled error", err);
  return fail(new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again."));
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wrap a route handler with uniform error handling. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Invalid JSON body");
  }
  return schema.parse(body);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const all = url.searchParams.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return schema.parse(obj);
}
