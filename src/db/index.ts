import "server-only";

import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

import * as schema from "@/db/schema";
import { getEnv } from "@/lib/env";
import { createAuthAwarePool } from "@/db/auth-pool";

export { schema };

type Database = MySql2Database<typeof schema>;

const UTC_SESSION_STATEMENT = "SET SESSION time_zone = '+00:00'";

const globalForDb = globalThis as unknown as {
  __nqrMariaPool?: mysql.Pool;
  __nqrMariaDb?: Database;
};

function createPool(): mysql.Pool {
  const { DATABASE_URL } = getEnv();
  const pool = mysql.createPool({
    uri: DATABASE_URL,
    connectionLimit: 5,
    connectTimeout: 5_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    queueLimit: 10,
    waitForConnections: true,
    timezone: "Z",
    decimalNumbers: true,
  });

  // `timezone: "Z"` controls mysql2's Date conversion only. MariaDB evaluates
  // TIMESTAMP/default expressions in the server session timezone, so enqueue
  // this as the first command on every newly established pooled connection.
  // EventEmitter delivery is synchronous; mysql2 queues this command before it
  // returns the connection to the waiting Drizzle query.
  pool.pool.on("connection", (connection) => {
    connection.query(UTC_SESSION_STATEMENT, (error) => {
      if (error) connection.destroy();
    });
  });

  return createAuthAwarePool(pool);
}

export function getDb(): Database {
  if (!globalForDb.__nqrMariaDb) {
    globalForDb.__nqrMariaPool ??= createPool();
    globalForDb.__nqrMariaDb = drizzle({
      client: globalForDb.__nqrMariaPool,
      schema,
      mode: "default",
    });
  }
  return globalForDb.__nqrMariaDb!;
}
