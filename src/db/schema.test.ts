import {
  createTableRelationsHelpers,
  extractTablesRelationalConfig,
} from "drizzle-orm/relations";
import { describe, expect, it } from "vitest";

import * as schema from "./schema";

describe("MariaDB relational schema", () => {
  it("exposes the Better Auth session-user join required by get-session", () => {
    const config = extractTablesRelationalConfig(
      schema,
      createTableRelationsHelpers,
    );

    expect(config.tables.session?.relations.user).toBeDefined();
    expect(config.tables.user?.relations.sessions).toBeDefined();
    expect(config.tables.user?.relations.accounts).toBeDefined();
    expect(config.tables.account?.relations.user).toBeDefined();
  });
});
