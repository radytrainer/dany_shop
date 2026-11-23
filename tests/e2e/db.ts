import "dotenv/config";
import pg from "pg";

/** Direct database checks for E2E assertions ("verify the order is saved in PostgreSQL"). */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}
