import "server-only";
import { prisma, type Tx } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/** Append-only audit log for sensitive admin operations. Never throws into the caller. */
export async function logAdminActivity(
  entry: { userId: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Prisma.InputJsonValue; ip?: string | null },
  db: typeof prisma | Tx = prisma,
) {
  try {
    await db.adminActivityLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? {},
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", err);
  }
}
