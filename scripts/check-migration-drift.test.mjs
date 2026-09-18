import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { generateMySQLDrizzleJson } from "drizzle-kit/api";
import * as schema from "../src/db/schema.ts";
import { checkMigrationDrift, verifyMigrationData } from "./check-migration-drift.mjs";

async function fixture() {
  const json = async (file) => JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
  return {
    current: await generateMySQLDrizzleJson(schema, undefined, "snake_case"),
    snapshot: await json("drizzle-mariadb/meta/0000_snapshot.json"),
    journal: await json("drizzle-mariadb/meta/_journal.json"),
    sql: await readFile(new URL("../drizzle-mariadb/0000_phase2a_mariadb.sql", import.meta.url), "utf8"),
    files: ["0000_phase2a_mariadb.sql", "meta"], metaFiles: ["0000_snapshot.json", "_journal.json"],
  };
}
test("actual Phase 2A MariaDB schema, snapshot and SQL agree offline", async () => {
  const result = await checkMigrationDrift();
  assert.equal(result.tables, 10);
  assert.ok(result.statements > 0);
});
const mutations = {
  "schema column": (f) => { f.current.tables.user.columns.email.notNull = false; },
  "snapshot column": (f) => { f.snapshot.tables.user.columns.email.type = "int"; },
  "snapshot metadata": (f) => { f.snapshot._meta.schemas.drift = "wrong"; },
  "SQL content": (f) => { f.sql = f.sql.replace('`email` varchar(255)', '`email` int'); },
  "SQL extra statement": (f) => { f.sql += '\nDROP TABLE `user`;'; },
  "SQL breakpoint": (f) => { f.sql = f.sql.replace("--> statement-breakpoint", ""); },
  "journal tag": (f) => { f.journal.entries[0].tag = "other"; },
  "journal missing entry": (f) => { f.journal.entries = []; },
  "snapshot chain": (f) => { f.snapshot.prevId = f.snapshot.id; },
  "extra migration": (f) => { f.files.push("0001_extra.sql"); },
  "missing SQL": (f) => { f.files = ["meta"]; },
  "extra snapshot": (f) => { f.metaFiles.push("0001_snapshot.json"); },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`detect ${name} drift (in-memory fixture only)`, async () => {
    const f = await fixture(); mutate(f);
    await assert.rejects(verifyMigrationData(f), /\[drift\]/);
  });
}
test("portable line endings do not create drift", async () => {
  const f = await fixture(); f.sql = f.sql.replace(/\n/g, "\r\n") + "\r\n";
  await verifyMigrationData(f);
});
test("CLI ignores cwd .env and works without DATABASE_URL from any cwd", async () => {
  const dir = await mkdtemp(join(tmpdir(), "nqr-drift-test-"));
  try {
    // Synthetic trap, never the user's .env. Importing this config must fail.
    await writeFile(join(dir, "drizzle.config.ts"), 'throw new Error("CONFIG_TRAP");');
    await writeFile(join(dir, ".env"), 'DATABASE_URL=ENV_TRAP\n');
    const result = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
      resolve("scripts/check-migration-drift.mjs")], {
      cwd: dir, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 20000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /offline, no DB/);
    assert.doesNotMatch(result.stdout + result.stderr, /ENV_TRAP|CONFIG_TRAP/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
