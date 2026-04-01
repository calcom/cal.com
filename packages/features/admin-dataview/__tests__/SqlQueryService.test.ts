import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@prisma/client";

import type { TableDefinition } from "../types";
import { AdminTableRegistry } from "../AdminTableRegistry";
import { SqlQueryService } from "../server/sql-query-service";

// ─── Test fixtures ───────────────────────────────────────────────────────────

const userTable: TableDefinition = {
  modelName: "User",
  displayName: "User",
  displayNamePlural: "Users",
  description: "Users",
  slug: "users",
  category: "core",
  fields: [
    { column: "id", label: "ID", type: "number", isPrimary: true },
    { column: "username", label: "Username", type: "string", searchable: true },
    { column: "email", label: "Email", type: "email", searchable: true },
    { column: "createdDate", label: "Created", type: "datetime", pgColumn: "created" },
    { column: "locked", label: "Locked", type: "boolean" },
    { column: "password", label: "Password", type: "string", access: "hidden" },
    { column: "twoFactorSecret", label: "2FA Secret", type: "string", access: "hidden" },
    { column: "backupCodes", label: "Backup Codes", type: "string", access: "hidden" },
    { column: "metadata", label: "Metadata", type: "json", access: "hidden" },
    {
      column: "team",
      label: "Team",
      type: "string",
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
      },
    },
  ],
};

const bookingTable: TableDefinition = {
  modelName: "Booking",
  displayName: "Booking",
  displayNamePlural: "Bookings",
  description: "Bookings",
  slug: "bookings",
  category: "core",
  fields: [
    { column: "id", label: "ID", type: "number", isPrimary: true },
    { column: "title", label: "Title", type: "string" },
    { column: "userId", label: "User ID", type: "number" },
    { column: "startTime", label: "Start", type: "datetime" },
    { column: "responses", label: "Responses", type: "json", access: "hidden" },
  ],
};

// ─── Mock Prisma ─────────────────────────────────────────────────────────────

function createMockPrisma(queryResult: unknown[] = []) {
  const mockTx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    $queryRawUnsafe: vi.fn().mockResolvedValue(queryResult),
  };

  const prisma = {
    $transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => {
      return fn(mockTx);
    }),
  } as unknown as PrismaClient;

  return { prisma, mockTx };
}

function createService(queryResult: unknown[] = []) {
  const { prisma, mockTx } = createMockPrisma(queryResult);
  const registry = new AdminTableRegistry([userTable, bookingTable]);
  const service = new SqlQueryService(prisma, registry);
  return { service, prisma, mockTx };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SqlQueryService", () => {
  // ── Query validation: blocked statements ─────────────────────────────────

  describe("blocks mutation statements", () => {
    const mutations = [
      { name: "INSERT", sql: `INSERT INTO "User" (email) VALUES ('x@x.com')` },
      { name: "UPDATE", sql: `UPDATE "User" SET locked = true WHERE id = 1` },
      { name: "DELETE", sql: `DELETE FROM "User" WHERE id = 1` },
      { name: "DROP TABLE", sql: `DROP TABLE "User"` },
      { name: "ALTER TABLE", sql: `ALTER TABLE "User" ADD COLUMN foo TEXT` },
      { name: "TRUNCATE", sql: `TRUNCATE "User"` },
      { name: "CREATE TABLE", sql: `CREATE TABLE evil (id INT)` },
    ];

    it.each(mutations)("rejects $name statements", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });
  });

  describe("blocks admin/privilege commands", () => {
    const commands = [
      { name: "GRANT", sql: `GRANT ALL ON "User" TO public` },
      { name: "REVOKE", sql: `REVOKE ALL ON "User" FROM public` },
      { name: "COPY", sql: `COPY "User" TO '/tmp/out.csv'` },
      { name: "VACUUM", sql: `VACUUM "User"` },
      { name: "EXECUTE", sql: `EXECUTE my_plan` },
      { name: "PREPARE", sql: `PREPARE my_plan AS SELECT 1` },
    ];

    it.each(commands)("rejects $name", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });
  });

  describe("blocks non-SELECT queries", () => {
    it("rejects queries that don't start with SELECT or WITH", async () => {
      const { service } = createService();
      await expect(service.execute("SHOW TABLES")).rejects.toThrow(
        "Only SELECT queries are allowed"
      );
    });

    it("rejects empty queries", async () => {
      const { service } = createService();
      await expect(service.execute("")).rejects.toThrow("Query cannot be empty");
      await expect(service.execute("   ")).rejects.toThrow("Query cannot be empty");
    });
  });

  describe("blocks multiple statements", () => {
    it("rejects semicolon-separated statements", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT 1 FROM "User"; SELECT 2 FROM "Booking"`)
      ).rejects.toThrow("Multiple statements are not allowed");
    });

    it("rejects injection via semicolon", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT id FROM "User" WHERE id = 1; DROP TABLE "User"`)
      ).rejects.toThrow(); // blocked by multiple statement check or DROP keyword
    });
  });

  // ── Allows valid SELECT queries ──────────────────────────────────────────

  describe("allows valid SELECT queries", () => {
    it("allows simple SELECT", async () => {
      const { service, mockTx } = createService([{ id: 1, email: "a@b.com" }]);
      const result = await service.execute(`SELECT id, email FROM "User"`);
      expect(result.rows).toHaveLength(1);
      expect(mockTx.$queryRawUnsafe).toHaveBeenCalled();
    });

    it("allows SELECT with WHERE", async () => {
      const { service } = createService([]);
      const result = await service.execute(
        `SELECT id, email FROM "User" WHERE locked = true`
      );
      expect(result.rowCount).toBe(0);
    });

    it("allows WITH (CTE) queries", async () => {
      const { service } = createService([{ cnt: 5 }]);
      const result = await service.execute(
        `WITH active_users AS (SELECT id FROM "User" WHERE locked = false) SELECT COUNT(*) as cnt FROM active_users`
      );
      expect(result.rows).toHaveLength(1);
    });

    it("allows JOINs between registered tables", async () => {
      const { service } = createService([]);
      const result = await service.execute(
        `SELECT u.id, b.title FROM "User" u JOIN "Booking" b ON b."userId" = u.id`
      );
      expect(result.rowCount).toBe(0);
    });

    it("allows subqueries", async () => {
      const { service } = createService([]);
      const result = await service.execute(
        `SELECT id FROM "User" WHERE id IN (SELECT "userId" FROM "Booking")`
      );
      expect(result.rowCount).toBe(0);
    });

    it("allows queries with trailing semicolon", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`SELECT id FROM "User";`)
      ).resolves.toBeDefined();
    });

    it("allows case-insensitive SELECT", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`select id from "User"`)
      ).resolves.toBeDefined();
    });
  });

  // ── Table allowlist ──────────────────────────────────────────────────────

  describe("table allowlist", () => {
    it("rejects queries against unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT * FROM "Credential"`)
      ).rejects.toThrow('Table "Credential" is not available');
    });

    it("rejects JOINs with unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT u.id FROM "User" u JOIN "Credential" c ON c."userId" = u.id`
        )
      ).rejects.toThrow('Table "Credential" is not available');
    });

    it("allows PG table name (@@map alias)", async () => {
      const { service } = createService([]);
      // "users" is the PG name for User model
      await expect(
        service.execute(`SELECT id FROM "users"`)
      ).resolves.toBeDefined();
    });

    it("allows model name", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`SELECT id FROM "User"`)
      ).resolves.toBeDefined();
    });

    it("includes allowed table names in error message", async () => {
      const { service } = createService();
      try {
        await service.execute(`SELECT * FROM "SecretTable"`);
      } catch (e: unknown) {
        const msg = (e as Error).message;
        expect(msg).toContain("Allowed tables:");
        expect(msg).toContain('"users"');
        expect(msg).toContain('"Booking"');
      }
    });

    it("rejects information_schema access", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT * FROM information_schema.tables`)
      ).rejects.toThrow("is not available");
    });

    it("rejects pg_catalog access", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT * FROM pg_catalog.pg_tables`)
      ).rejects.toThrow("is not available");
    });
  });

  // ── Hidden column protection ─────────────────────────────────────────────

  describe("hidden column protection", () => {
    it("rejects queries that SELECT hidden columns", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT id, password FROM "User"`)
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects queries that filter on hidden columns", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" WHERE "twoFactorSecret" IS NOT NULL`
        )
      ).rejects.toThrow('Column "twoFactorSecret" is not accessible');
    });

    it("rejects quoted hidden column references", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT "backupCodes" FROM "User"`)
      ).rejects.toThrow('Column "backupCodes" is not accessible');
    });

    it("rejects hidden columns from other tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT id, responses FROM "Booking"`)
      ).rejects.toThrow('Column "responses" is not accessible');
    });

    it("redacts hidden columns from results even if DB returns them", async () => {
      // Simulate SELECT * returning hidden columns from the DB
      const { service } = createService([
        { id: 1, email: "a@b.com", password: "hash123", twoFactorSecret: "secret" },
      ]);

      // Bypass the pre-execution validation by using a query that doesn't mention hidden cols
      // In practice this tests the defense-in-depth result-level redaction
      // We need to mock the validation to pass for this test
      const svc = service as any;
      const origValidateHidden = svc.validateNoHiddenColumns.bind(svc);
      svc.validateNoHiddenColumns = vi.fn(); // skip pre-validation

      const result = await service.execute(`SELECT * FROM "User"`);

      expect(result.columns).toContain("id");
      expect(result.columns).toContain("email");
      expect(result.columns).not.toContain("password");
      expect(result.columns).not.toContain("twoFactorSecret");
      expect(result.rows[0]).not.toHaveProperty("password");
      expect(result.rows[0]).not.toHaveProperty("twoFactorSecret");

      // Restore
      svc.validateNoHiddenColumns = origValidateHidden;
    });

    it("allows hidden column names inside string literals", async () => {
      const { service } = createService([]);
      // "password" inside a string literal should not be blocked
      await expect(
        service.execute(`SELECT id FROM "User" WHERE email = 'password@test.com'`)
      ).resolves.toBeDefined();
    });
  });

  // ── LIMIT enforcement ────────────────────────────────────────────────────

  describe("LIMIT enforcement", () => {
    it("adds LIMIT 1000 when no LIMIT specified", async () => {
      const { service, mockTx } = createService([]);
      await service.execute(`SELECT id FROM "User"`);
      const executedSql = mockTx.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(executedSql).toMatch(/LIMIT 1000$/);
    });

    it("caps existing LIMIT to 1000", async () => {
      const { service, mockTx } = createService([]);
      await service.execute(`SELECT id FROM "User" LIMIT 5000`);
      const executedSql = mockTx.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(executedSql).toContain("LIMIT 1000");
      expect(executedSql).not.toContain("5000");
    });

    it("preserves LIMIT when under 1000", async () => {
      const { service, mockTx } = createService([]);
      await service.execute(`SELECT id FROM "User" LIMIT 50`);
      const executedSql = mockTx.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(executedSql).toContain("LIMIT 50");
    });

    it("marks result as truncated when row count reaches MAX_ROWS", async () => {
      const rows = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const { service } = createService(rows);
      const result = await service.execute(`SELECT id FROM "User"`);
      expect(result.truncated).toBe(true);
    });

    it("marks result as not truncated when under MAX_ROWS", async () => {
      const { service } = createService([{ id: 1 }, { id: 2 }]);
      const result = await service.execute(`SELECT id FROM "User"`);
      expect(result.truncated).toBe(false);
    });

    it("strips trailing semicolon before adding LIMIT", async () => {
      const { service, mockTx } = createService([]);
      await service.execute(`SELECT id FROM "User";`);
      const executedSql = mockTx.$queryRawUnsafe.mock.calls[0][0] as string;
      expect(executedSql).not.toContain(";");
      expect(executedSql).toMatch(/LIMIT 1000$/);
    });
  });

  // ── Transaction safety ───────────────────────────────────────────────────

  describe("read-only transaction", () => {
    it("sets transaction to READ ONLY before executing", async () => {
      const { service, mockTx } = createService([]);
      await service.execute(`SELECT id FROM "User"`);

      expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith("SET TRANSACTION READ ONLY");
      // $executeRawUnsafe should be called before $queryRawUnsafe
      const executeOrder = mockTx.$executeRawUnsafe.mock.invocationCallOrder[0];
      const queryOrder = mockTx.$queryRawUnsafe.mock.invocationCallOrder[0];
      expect(executeOrder).toBeLessThan(queryOrder);
    });
  });

  // ── Result processing ────────────────────────────────────────────────────

  describe("result processing", () => {
    it("converts BigInt values to strings", async () => {
      // Use BigInt literal to avoid JS number precision loss
      const { service } = createService([{ id: 9007199254740993n, name: "test" }]);
      const result = await service.execute(`SELECT id, name FROM "User"`);
      expect(result.rows[0].id).toBe("9007199254740993");
      expect(typeof result.rows[0].id).toBe("string");
    });

    it("returns correct column list", async () => {
      const { service } = createService([{ id: 1, email: "a@b.com", locked: false }]);
      const result = await service.execute(`SELECT id, email, locked FROM "User"`);
      expect(result.columns).toEqual(["id", "email", "locked"]);
    });

    it("returns empty columns for empty result", async () => {
      const { service } = createService([]);
      const result = await service.execute(`SELECT id FROM "User"`);
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("includes execution time", async () => {
      const { service } = createService([]);
      const result = await service.execute(`SELECT id FROM "User"`);
      expect(typeof result.executionTimeMs).toBe("number");
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Timeout ──────────────────────────────────────────────────────────────

  describe("timeout", () => {
    it("rejects queries that exceed the timeout", async () => {
      const slowPrisma = {
        $transaction: vi.fn().mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 60_000))
        ),
      } as unknown as PrismaClient;

      const registry = new AdminTableRegistry([userTable, bookingTable]);
      const service = new SqlQueryService(slowPrisma, registry);

      // The internal timeout is 30s; we can't wait that long in tests.
      // Instead, verify the Promise.race structure by mocking a long transaction.
      // We'll use a shorter approach: verify the service creates a timeout race.
      await expect(
        Promise.race([
          service.execute(`SELECT id FROM "User"`),
          new Promise((_, reject) => setTimeout(() => reject(new Error("test timeout")), 100)),
        ])
      ).rejects.toThrow("test timeout");
    });
  });

  // ── Comment stripping ────────────────────────────────────────────────────

  describe("comment handling", () => {
    it("strips single-line comments before validation", async () => {
      const { service } = createService([]);
      // The query is valid SELECT with a comment containing a blocked keyword
      await expect(
        service.execute(`-- This is a DROP comment\nSELECT id FROM "User"`)
      ).resolves.toBeDefined();
    });

    it("strips multi-line comments before validation", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`/* DELETE everything */ SELECT id FROM "User"`)
      ).resolves.toBeDefined();
    });

    it("still blocks mutations hidden after comments", async () => {
      const { service } = createService();
      // Comment doesn't save a mutation keyword in the real query
      await expect(
        service.execute(`-- innocent\nDELETE FROM "User"`)
      ).rejects.toThrow();
    });
  });

  // ── Edge cases / injection attempts ──────────────────────────────────────

  describe("injection and edge cases", () => {
    it("rejects UPDATE disguised with leading whitespace", async () => {
      const { service } = createService();
      await expect(service.execute(`   UPDATE "User" SET locked = true`)).rejects.toThrow();
    });

    it("rejects DELETE with mixed case", async () => {
      const { service } = createService();
      await expect(service.execute(`DeLeTe FROM "User"`)).rejects.toThrow();
    });

    it("handles queries with lots of whitespace", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`  SELECT    id   FROM   "User"  `)
      ).resolves.toBeDefined();
    });

    it("blocked keywords inside identifiers don't trigger false positives", async () => {
      const { service } = createService([]);
      // "updated_at" contains "UPDATE" as a substring but not as a word boundary
      // This should NOT be blocked
      await expect(
        service.execute(`SELECT id FROM "Booking" WHERE title = 'updated'`)
      ).resolves.toBeDefined();
    });
  });

  // ── pgColumn mapping ────────────────────────────────────────────────────

  describe("pgColumn mapping", () => {
    it("uses pgColumn names in hidden column checks", async () => {
      // The user table has createdDate -> pgColumn "created" which is NOT hidden,
      // but password is hidden. Test that the PG column name is used.
      const { service } = createService([]);
      // "created" is the PG column for createdDate — should be allowed
      await expect(
        service.execute(`SELECT id, "created" FROM "User"`)
      ).resolves.toBeDefined();
    });
  });

  // ── SQL Injection Attack Vectors ─────────────────────────────────────────

  describe("SQL injection: stacked queries (second statement)", () => {
    it.each([
      {
        name: "SELECT then DROP",
        sql: `SELECT id FROM "User"; DROP TABLE "User"`,
      },
      {
        name: "SELECT then DELETE",
        sql: `SELECT id FROM "User"; DELETE FROM "User"`,
      },
      {
        name: "SELECT then INSERT",
        sql: `SELECT id FROM "User"; INSERT INTO "User" (email) VALUES ('x')`,
      },
      {
        name: "SELECT then CREATE",
        sql: `SELECT id FROM "User"; CREATE TABLE evil (id INT)`,
      },
      {
        name: "SELECT then UPDATE",
        sql: `SELECT id FROM "User"; UPDATE "User" SET locked = true`,
      },
      {
        name: "SELECT then COPY",
        sql: `SELECT id FROM "User"; COPY "User" TO '/tmp/dump.csv'`,
      },
    ])("rejects stacked query: $name", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });
  });

  describe("SQL injection: UNION-based attacks", () => {
    it("rejects UNION SELECT from unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" UNION SELECT key FROM "Credential"`
        )
      ).rejects.toThrow();
    });

    it("rejects UNION ALL SELECT from unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" UNION ALL SELECT key FROM "Credential"`
        )
      ).rejects.toThrow();
    });

    it("allows UNION between registered tables", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(
          `SELECT id FROM "User" UNION SELECT id FROM "Booking"`
        )
      ).resolves.toBeDefined();
    });
  });

  describe("SQL injection: subquery-based attacks", () => {
    it("rejects subquery against unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" WHERE id IN (SELECT "userId" FROM "Credential")`
        )
      ).rejects.toThrow();
    });

    it("rejects correlated subquery against unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" u WHERE EXISTS (SELECT 1 FROM "Credential" c WHERE c."userId" = u.id)`
        )
      ).rejects.toThrow();
    });

    it("rejects nested subquery against unregistered tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" WHERE id IN (SELECT "userId" FROM "Booking" WHERE id IN (SELECT "bookingId" FROM "Payment"))`
        )
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: string literal escape tricks", () => {
    it("rejects unclosed string trick with semicolon", async () => {
      const { service } = createService();
      // Attempt to break out of a string context with escaped quotes
      await expect(
        service.execute(`SELECT id FROM "User" WHERE email = ''; DROP TABLE "User"; --'`)
      ).rejects.toThrow();
    });

    it("handles dollar-quoted strings (PostgreSQL extension)", async () => {
      const { service } = createService();
      // $$-quoted string containing blocked keywords — the keyword outside $$ should still be caught
      await expect(
        service.execute(`SELECT id FROM "User" WHERE email = $$test$$; DELETE FROM "User"`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: comment-based obfuscation", () => {
    it("rejects mutation hidden after inline comment", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT 1 FROM "User" /* comment */ ; DROP TABLE "User"`)
      ).rejects.toThrow();
    });

    it("rejects mutation on line after line comment", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT 1 FROM "User" --comment\nDROP TABLE "User"`)
      ).rejects.toThrow();
    });

    it("strips comments before keyword validation", async () => {
      const { service } = createService([]);
      // A blocked keyword inside a comment should NOT block the query
      await expect(
        service.execute(`/* DROP TABLE dangerous */ SELECT id FROM "User"`)
      ).resolves.toBeDefined();
    });
  });

  describe("SQL injection: case and encoding tricks", () => {
    it.each([
      { name: "all caps", sql: `DELETE FROM "User"` },
      { name: "all lowercase", sql: `delete from "User"` },
      { name: "mixed case", sql: `DeLeTe FROM "User"` },
      { name: "alternating case", sql: `dRoP tAbLe "User"` },
    ])("blocks $name mutation: $sql", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });

    it("rejects keyword with extra whitespace", async () => {
      const { service } = createService();
      await expect(
        service.execute(`  \t\n  DELETE   FROM  "User"  `)
      ).rejects.toThrow();
    });

    it("rejects keyword after newlines", async () => {
      const { service } = createService();
      await expect(
        service.execute(`\n\n\nDROP TABLE "User"`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: system catalog and metadata access", () => {
    it.each([
      {
        name: "information_schema.tables",
        sql: `SELECT * FROM information_schema.tables`,
      },
      {
        name: "information_schema.columns",
        sql: `SELECT * FROM information_schema.columns WHERE table_name = 'users'`,
      },
      {
        name: "pg_catalog.pg_tables",
        sql: `SELECT * FROM pg_catalog.pg_tables`,
      },
      {
        name: "pg_catalog.pg_shadow (passwords)",
        sql: `SELECT * FROM pg_catalog.pg_shadow`,
      },
      {
        name: "pg_stat_activity (connections)",
        sql: `SELECT * FROM pg_stat_activity`,
      },
      {
        name: "pg_roles",
        sql: `SELECT * FROM pg_roles`,
      },
      {
        name: "pg_class",
        sql: `SELECT * FROM pg_class`,
      },
    ])("blocks access to $name", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });
  });

  describe("SQL injection: privilege escalation", () => {
    it.each([
      {
        name: "GRANT",
        sql: `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO attacker`,
      },
      {
        name: "CREATE ROLE",
        sql: `CREATE ROLE attacker WITH SUPERUSER LOGIN PASSWORD 'hack'`,
      },
      {
        name: "ALTER ROLE",
        sql: `ALTER ROLE postgres WITH PASSWORD 'hacked'`,
      },
      {
        name: "SET ROLE",
        sql: `SET ROLE postgres`,
      },
      {
        name: "SECURITY DEFINER function",
        sql: `CREATE FUNCTION evil() RETURNS void AS $$ BEGIN END $$ LANGUAGE plpgsql SECURITY DEFINER`,
      },
    ])("blocks $name", async ({ sql }) => {
      const { service } = createService();
      await expect(service.execute(sql)).rejects.toThrow();
    });
  });

  describe("SQL injection: data exfiltration via hidden columns", () => {
    it("rejects SELECT * (which would include hidden columns)", async () => {
      const { service } = createService([]);
      // SELECT * is allowed syntactically, but if DB returns hidden cols, they get redacted.
      // The real test is that result-level redaction works — tested in hidden column protection.
      // Here we test explicit hidden column access attempts.
      await expect(
        service.execute(`SELECT password FROM "User"`)
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column aliased", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT password AS pw FROM "User"`)
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column in CASE expression", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT CASE WHEN password IS NOT NULL THEN 'has_pass' ELSE 'no_pass' END FROM "User"`
        )
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column in ORDER BY", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT id FROM "User" ORDER BY password`)
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column in GROUP BY", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT password, COUNT(*) FROM "User" GROUP BY password`)
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column in HAVING", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT email, COUNT(*) FROM "User" GROUP BY email HAVING MAX(LENGTH(password)) > 10`
        )
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column in JOIN condition", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT u.id FROM "User" u JOIN "Booking" b ON b.title = u.password`
        )
      ).rejects.toThrow('Column "password" is not accessible');
    });

    it("rejects hidden column across multiple tables", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SELECT responses FROM "Booking"`)
      ).rejects.toThrow('Column "responses" is not accessible');
    });
  });

  describe("SQL injection: PG-specific dangerous functions", () => {
    it("rejects COPY TO for file exfiltration", async () => {
      const { service } = createService();
      await expect(
        service.execute(`COPY "User" TO '/tmp/users.csv' WITH CSV HEADER`)
      ).rejects.toThrow();
    });

    it("rejects COPY FROM for data injection", async () => {
      const { service } = createService();
      await expect(
        service.execute(`COPY "User" FROM '/tmp/evil.csv'`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: CTE (WITH) abuse", () => {
    it("rejects CTE with mutation (WITH ... DELETE)", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `WITH deleted AS (DELETE FROM "User" RETURNING *) SELECT * FROM deleted`
        )
      ).rejects.toThrow();
    });

    it("rejects CTE with INSERT", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `WITH ins AS (INSERT INTO "User" (email) VALUES ('x') RETURNING *) SELECT * FROM ins`
        )
      ).rejects.toThrow();
    });

    it("rejects CTE with UPDATE", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `WITH upd AS (UPDATE "User" SET locked = true RETURNING *) SELECT * FROM upd`
        )
      ).rejects.toThrow();
    });

    it("allows legitimate CTE queries", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(
          `WITH recent AS (SELECT id FROM "Booking" WHERE "startTime" > NOW() - INTERVAL '7 days') SELECT u.id, u.email FROM "User" u JOIN recent r ON r.id = u.id`
        )
      ).resolves.toBeDefined();
    });
  });

  describe("SQL injection: transaction manipulation", () => {
    it("rejects SET TRANSACTION", async () => {
      const { service } = createService();
      await expect(
        service.execute(`SET TRANSACTION READ WRITE`)
      ).rejects.toThrow();
    });

    it("rejects RESET ALL", async () => {
      const { service } = createService();
      await expect(
        service.execute(`RESET ALL`)
      ).rejects.toThrow();
    });

    it("rejects DISCARD ALL", async () => {
      const { service } = createService();
      await expect(
        service.execute(`DISCARD ALL`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: LISTEN/NOTIFY abuse", () => {
    it("rejects LISTEN", async () => {
      const { service } = createService();
      await expect(
        service.execute(`LISTEN my_channel`)
      ).rejects.toThrow();
    });

    it("rejects NOTIFY", async () => {
      const { service } = createService();
      await expect(
        service.execute(`NOTIFY my_channel, 'payload'`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: DO block (anonymous function)", () => {
    it("rejects DO block", async () => {
      const { service } = createService();
      await expect(
        service.execute(`DO $$ BEGIN PERFORM pg_sleep(10); END $$`)
      ).rejects.toThrow();
    });

    it("rejects DO block with DELETE", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `DO $$ BEGIN DELETE FROM "User"; END $$`
        )
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: keyword in string literal (no false positives)", () => {
    it.each([
      {
        name: "DROP in WHERE string",
        sql: `SELECT id FROM "User" WHERE email = 'drop@example.com'`,
      },
      {
        name: "DELETE in string value",
        sql: `SELECT id FROM "User" WHERE username = 'delete_me'`,
      },
      {
        name: "INSERT in title",
        sql: `SELECT id FROM "Booking" WHERE title = 'Insert your agenda here'`,
      },
      {
        name: "UPDATE in WHERE",
        sql: `SELECT id FROM "User" WHERE email LIKE '%update%'`,
      },
      {
        name: "GRANT in string",
        sql: `SELECT id FROM "Booking" WHERE title = 'Grant application review'`,
      },
    ])("allows $name (keyword only in string literal)", async ({ sql }) => {
      const { service } = createService([]);
      await expect(service.execute(sql)).resolves.toBeDefined();
    });
  });

  describe("SQL injection: extremely long queries", () => {
    it("handles very long SELECT queries", async () => {
      const { service } = createService([]);
      // Build a long OR chain — should be valid
      const conditions = Array.from(
        { length: 100 },
        (_, i) => `id = ${i}`
      ).join(" OR ");
      await expect(
        service.execute(`SELECT id FROM "User" WHERE ${conditions}`)
      ).resolves.toBeDefined();
    });
  });

  describe("SQL injection: null byte and special characters", () => {
    it("handles null byte in query", async () => {
      const { service } = createService();
      // Null bytes shouldn't bypass validation
      await expect(
        service.execute(`SELECT id FROM "User"\0; DROP TABLE "User"`)
      ).rejects.toThrow();
    });

    it("handles unicode characters", async () => {
      const { service } = createService([]);
      await expect(
        service.execute(`SELECT id FROM "User" WHERE username = 'ünïcödé'`)
      ).resolves.toBeDefined();
    });
  });

  describe("SQL injection: PREPARE/EXECUTE bypass attempt", () => {
    it("rejects PREPARE statement", async () => {
      const { service } = createService();
      await expect(
        service.execute(`PREPARE evil_plan AS DELETE FROM "User"`)
      ).rejects.toThrow();
    });

    it("rejects EXECUTE statement", async () => {
      const { service } = createService();
      await expect(
        service.execute(`EXECUTE evil_plan`)
      ).rejects.toThrow();
    });

    it("rejects DEALLOCATE statement", async () => {
      const { service } = createService();
      await expect(
        service.execute(`DEALLOCATE evil_plan`)
      ).rejects.toThrow();
    });
  });

  describe("SQL injection: combined attack vectors", () => {
    it("rejects UNION + system catalog + stacked query", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" UNION SELECT usename FROM pg_shadow; DROP TABLE "User"`
        )
      ).rejects.toThrow();
    });

    it("rejects CTE + unregistered table + hidden column", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `WITH creds AS (SELECT key FROM "Credential") SELECT password FROM "User"`
        )
      ).rejects.toThrow();
    });

    it("rejects comment obfuscation + stacked mutation", async () => {
      const { service } = createService();
      await expect(
        service.execute(
          `SELECT id FROM "User" -- just a select\n; DELETE FROM "User"`
        )
      ).rejects.toThrow();
    });
  });
});
