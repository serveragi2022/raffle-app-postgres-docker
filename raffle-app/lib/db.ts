import { Pool, type QueryResultRow } from "pg";

// Single shared connection pool for the whole server process. Next.js
// dev-mode hot-reloading can re-evaluate this module, so we stash the pool
// on globalThis to avoid opening a fresh pool (and leaking connections) on
// every reload.
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL environment variable.");
  }
  return new Pool({
    connectionString,
    // Plain self-hosted Postgres in Docker typically doesn't use TLS on the
    // internal network. Set DATABASE_SSL=true if your Postgres requires it.
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = createPool();
  }
  return global.__pgPool;
}

/** Runs a parameterized SQL query and returns the full result. */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const pool = getPool();
  const result = await pool.query<T>(text, params as any[]);
  return { rows: result.rows, rowCount: result.rowCount };
}

/** Runs a query and returns the first row (or null). */
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const { rows } = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Runs `fn` inside a single client checked out from the pool, wrapped in a transaction. */
export async function withTransaction<T>(fn: (client: import("pg").PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export class DbError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}
