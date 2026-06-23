import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase and most managed Postgres providers require SSL.
// When the connection string already contains ?sslmode=require (Supabase default),
// the pg driver honours it automatically.  We also set ssl.rejectUnauthorized=false
// as a fallback for self-signed certs on Render's internal Postgres.
// This is safe because the connection is already encrypted via TLS.
const sslConfig = process.env.DATABASE_URL.includes("sslmode=disable")
  ? false
  : { rejectUnauthorized: false };

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
