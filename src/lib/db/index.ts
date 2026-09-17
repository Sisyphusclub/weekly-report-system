import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getConfig } from "@/lib/config";
import * as schema from "./schema";

const state = globalThis as typeof globalThis & { weeklyPool?: Pool };
export function getPool() {
  state.weeklyPool ??= new Pool({
    connectionString: getConfig().DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  return state.weeklyPool;
}
export function getDb() {
  return drizzle(getPool(), { schema });
}

export async function closePool() {
  const pool = state.weeklyPool;
  if (!pool) return;
  delete state.weeklyPool;
  await pool.end();
}
