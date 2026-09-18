import { readFile, readdir } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateMySQLDrizzleJson, generateMySQLMigration } from "drizzle-kit/api";

const projectRoot = new URL("../", import.meta.url);
const zeroId = "00000000-0000-0000-0000-000000000000";
const fail = (reason) => { throw new Error(`[drift] ${reason}`); };
const persisted = (value) => JSON.parse(JSON.stringify(value));
const normalizeSql = (sql) => sql.replace(/\r\n/g, "\n").trimEnd();

/** Phase 2A has ONE MariaDB migration. Fail closed if that contract changes.
 * No SQL execution, push/migrate API, config import, dotenv or DB credentials.
 */
export async function verifyMigrationData({ current, snapshot, sql, journal, files, metaFiles }) {
  const tag = "0000_phase2a_mariadb";
  if (!isDeepStrictEqual([...files].sort(), [`${tag}.sql`, "meta"]) ||
      !isDeepStrictEqual([...metaFiles].sort(), ["0000_snapshot.json", "_journal.json"])) {
    fail("unexpected migration files; Phase 2A checker must be reviewed before adding migrations");
  }
  const entry = journal.entries?.[0];
  if (journal.version !== "7" || journal.dialect !== "mysql" || journal.entries?.length !== 1 ||
      entry?.idx !== 0 || entry.tag !== tag || entry.version !== "5" || entry.breakpoints !== true ||
      !Number.isSafeInteger(entry.when) || entry.when < 0) fail("invalid Phase 2A journal");
  if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(snapshot.id ?? "") ||
      snapshot.id === zeroId || snapshot.prevId !== zeroId) fail("invalid initial snapshot chain");
  const semantic = ({ id: _id, prevId: _prevId, ...rest }) => {
    // UUIDs identify generated snapshots, not schema semantics.
    void _id; void _prevId;
    const normalized = persisted(rest);
    // drizzle-kit CLI persists an empty MySQL `schemas` map that the public
    // generator API omits. MariaDB has no per-table PostgreSQL-style schemas.
    normalized._meta.schemas ??= {};
    return normalized;
  };
  if (!isDeepStrictEqual(semantic(current), semantic(snapshot))) {
    fail("schema.ts and stored snapshot differ (including metadata); do not auto-rewrite migrations");
  }
  const empty = await generateMySQLDrizzleJson({}, undefined, "snake_case");
  const statements = await generateMySQLMigration(empty, current);
  const expectedSql = statements.join("--> statement-breakpoint\n");
  if (normalizeSql(sql) !== normalizeSql(expectedSql)) {
    fail("initial SQL differs from schema regeneration; only CRLF and final whitespace are ignored");
  }
  return { tables: Object.keys(current.tables).length, statements: statements.length };
}

export async function checkMigrationDrift() {
  // Never import src/db/index.ts or drizzle.config.ts: the checker is offline
  // and must not read DATABASE_URL or attempt a MariaDB connection.
  const schema = await import(new URL("src/db/schema.ts", projectRoot).href);
  const json = async (path) => JSON.parse(await readFile(new URL(path, projectRoot), "utf8"));
  return verifyMigrationData({
    current: await generateMySQLDrizzleJson(schema, undefined, "snake_case"),
    snapshot: await json("drizzle-mariadb/meta/0000_snapshot.json"),
    sql: await readFile(new URL("drizzle-mariadb/0000_phase2a_mariadb.sql", projectRoot), "utf8"),
    journal: await json("drizzle-mariadb/meta/_journal.json"),
    files: await readdir(new URL("drizzle-mariadb/", projectRoot)),
    metaFiles: await readdir(new URL("drizzle-mariadb/meta/", projectRoot)),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 2) throw new Error(`Usage: node ${fileURLToPath(import.meta.url)}`);
    const result = await checkMigrationDrift();
    console.log(`[drift] PASS: ${result.tables} tables, ${result.statements} SQL statements; offline, no DB`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
