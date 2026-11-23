import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

type Client = ReturnType<typeof createClient>;
const globalForPrisma = globalThis as unknown as { prisma?: Client };

function getClient(): Client {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

/**
 * Lazily-initialised Prisma client. Importing this module never connects or requires
 * DATABASE_URL (so `next build` works without a database); the client is created on first use
 * and reused across hot reloads in development.
 */
export const prisma = new Proxy({} as Client, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver === prisma ? client : receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Db = Client;
/** Interactive transaction client type. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
