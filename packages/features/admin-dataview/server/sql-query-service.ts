import type { PrismaClient } from "@prisma/client";

import type { AdminTableRegistry } from "../AdminTableRegistry";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Service for executing read-only SQL queries from the admin Data Studio.
 *
 * Safety layers:
 * 1. Only SELECT / WITH…SELECT statements allowed
 * 2. DML/DDL keywords blocked (INSERT, UPDATE, DELETE, DROP, etc.)
 * 3. Only tables registered in the AdminTableRegistry can be queried
 * 4. Hidden fields (access: "hidden") are redacted from results
 * 5. Enforces a maximum row limit (1000)
 * 6. Wraps execution in a READ ONLY transaction
 * 7. Uses the readonly Prisma connection
 * 8. Query timeout (30s)
 */

const MAX_ROWS = 1000;
const QUERY_TIMEOUT_MS = 30_000;

/** Blocklist of SQL keywords that indicate mutation or admin commands */
const BLOCKED_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "COMMENT",
  "LOCK",
  "SET ",
  "RESET",
  "DISCARD",
  "EXECUTE",
  "PREPARE",
  "DEALLOCATE",
  "LISTEN",
  "NOTIFY",
  "LOAD",
  "DO ",
  "CALL",
  "IMPORT",
  "SECURITY",
];

/**
 * Known Prisma model → PG table name overrides (from @@map directives).
 * Models without an override use their PascalCase name as the PG table.
 */
const MODEL_TO_PG_TABLE: Record<string, string> = {
  User: "users",
  Avatar: "avatars",
};

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  executionTimeMs: number;
}

export class SqlQueryService {
  private allowedTables: Map<string, Set<string>>;
  private hiddenColumns: Map<string, Set<string>>;
  private allHiddenColumns: Set<string>;

  constructor(
    private prisma: PrismaClient,
    private registry: AdminTableRegistry
  ) {
    // Build allowlists from the registry
    this.allowedTables = new Map();
    this.hiddenColumns = new Map();
    this.allHiddenColumns = new Set();

    for (const table of registry.getAll()) {
      const pgName = MODEL_TO_PG_TABLE[table.modelName] ?? table.modelName;
      const visibleCols = new Set<string>();
      const hiddenCols = new Set<string>();

      for (const field of table.fields) {
        if (field.relation) continue; // relation fields aren't real PG columns
        const pgCol = field.pgColumn ?? field.column;
        if (field.access === "hidden") {
          hiddenCols.add(pgCol);
          this.allHiddenColumns.add(pgCol);
          // Also block the Prisma name if it differs
          if (field.pgColumn && field.pgColumn !== field.column) {
            hiddenCols.add(field.column);
            this.allHiddenColumns.add(field.column);
          }
        } else {
          visibleCols.add(pgCol);
        }
      }

      // Store under both PG table name and model name (queries may use either)
      this.allowedTables.set(pgName, visibleCols);
      if (pgName !== table.modelName) {
        this.allowedTables.set(table.modelName, visibleCols);
      }

      this.hiddenColumns.set(pgName, hiddenCols);
      if (pgName !== table.modelName) {
        this.hiddenColumns.set(table.modelName, hiddenCols);
      }
    }
  }

  /** Returns the list of allowed PG table names (for error messages / autocomplete) */
  get allowedTableNames(): string[] {
    // Deduplicate: prefer PG name
    const seen = new Set<string>();
    const names: string[] = [];
    for (const table of this.registry.getAll()) {
      const pgName = MODEL_TO_PG_TABLE[table.modelName] ?? table.modelName;
      if (!seen.has(pgName)) {
        seen.add(pgName);
        names.push(`"${pgName}"`);
      }
    }
    return names;
  }

  async execute(rawSql: string): Promise<SqlQueryResult> {
    const sql = rawSql.trim();
    if (!sql) {
      throw new Error("Query cannot be empty");
    }

    this.validateQuery(sql);
    this.validateTables(sql);
    this.validateNoHiddenColumns(sql);
    const limitedSql = this.ensureLimit(sql);

    const start = performance.now();

    // Execute within a READ ONLY transaction for extra safety
    let timeoutId: NodeJS.Timeout;

    const rows = await Promise.race([
      this.prisma
        .$transaction(
          async (tx: PrismaTransactionClient) => {
            await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY");
            return tx.$queryRawUnsafe(limitedSql);
          },
          { timeout: QUERY_TIMEOUT_MS }
        )
        .finally(() => clearTimeout(timeoutId)),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Query timed out after ${QUERY_TIMEOUT_MS / 1000}s`)),
          QUERY_TIMEOUT_MS
        );
      }),
    ]);

    const executionTimeMs = Math.round(performance.now() - start);
    const resultRows = Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];

    // Redact hidden columns from results (defense-in-depth: even if SELECT * slips through)
    const columns =
      resultRows.length > 0
        ? Object.keys(resultRows[0]).filter((c) => !this.allHiddenColumns.has(c))
        : [];

    const sanitizedRows = resultRows.map((row) => {
      const clean: Record<string, unknown> = {};
      for (const col of columns) {
        const val = row[col];
        // Convert BigInt to string for JSON serialization
        clean[col] = typeof val === "bigint" ? val.toString() : val;
      }
      return clean;
    });

    const truncated = sanitizedRows.length >= MAX_ROWS;

    return {
      columns,
      rows: sanitizedRows,
      rowCount: sanitizedRows.length,
      truncated,
      executionTimeMs,
    };
  }

  /**
   * Validates the query is a read-only SELECT, contains no blocked keywords,
   * and is a single statement.
   */
  private validateQuery(sql: string): void {
    const normalized = this.stripCommentsAndNormalize(sql);

    // Must start with SELECT or WITH (for CTEs)
    if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
      throw new Error("Only SELECT queries are allowed. Query must start with SELECT or WITH.");
    }

    // Check for blocked keywords outside of string literals
    const withoutStrings = this.stripStringLiterals(normalized);

    for (const keyword of BLOCKED_KEYWORDS) {
      const trimmed = keyword.trim();
      const regex = new RegExp(`\\b${trimmed}\\b`, "i");
      if (regex.test(withoutStrings)) {
        throw new Error(
          `Query contains blocked keyword: ${trimmed}. Only read-only SELECT queries are allowed.`
        );
      }
    }

    // Reject multiple statements
    const withoutStrings2 = this.stripStringLiterals(sql);
    const parts = withoutStrings2.split(";").filter((p) => p.trim().length > 0);
    if (parts.length > 1) {
      throw new Error("Multiple statements are not allowed. Please submit a single SELECT query.");
    }
  }

  /**
   * Validates that only registry-registered tables are referenced in FROM/JOIN clauses.
   * Extracts table references and checks each against the allowlist.
   */
  private validateTables(sql: string): void {
    const withoutStrings = this.stripStringLiterals(sql);
    const cteNames = this.extractCteNames(withoutStrings);
    const referencedTables = this.extractTableReferences(withoutStrings)
      .filter((t) => !cteNames.has(t));

    for (const tableName of referencedTables) {
      if (!this.allowedTables.has(tableName)) {
        throw new Error(
          `Table "${tableName}" is not available for querying. ` +
            `Allowed tables: ${this.allowedTableNames.join(", ")}`
        );
      }
    }
  }

  /**
   * Validates that hidden columns are not explicitly selected.
   * We check the SELECT clause and WHERE clause for hidden column references.
   * This is a best-effort check — the result-level redaction is the final safety net.
   */
  private validateNoHiddenColumns(sql: string): void {
    const withoutStrings = this.stripStringLiterals(sql);

    // Check if any hidden column is explicitly referenced (quoted or unquoted)
    for (const hiddenCol of Array.from(this.allHiddenColumns)) {
      // Match "hiddenCol" (double-quoted) or bare hiddenCol as an identifier
      const quotedPattern = new RegExp(`"${hiddenCol}"`, "i");
      const barePattern = new RegExp(`\\b${hiddenCol}\\b`, "i");

      if (quotedPattern.test(withoutStrings) || barePattern.test(withoutStrings)) {
        throw new Error(
          `Column "${hiddenCol}" is not accessible. This field is restricted from admin queries.`
        );
      }
    }
  }

  /**
   * Extracts table names from FROM and JOIN clauses.
   * Handles both quoted ("TableName") and unquoted identifiers.
   */
  private extractTableReferences(sql: string): string[] {
    const tables: string[] = [];

    // Match: FROM "TableName", FROM TableName, JOIN "TableName", JOIN TableName
    // Also handles: LEFT JOIN, RIGHT JOIN, INNER JOIN, CROSS JOIN, FULL JOIN, LATERAL
    const fromJoinPattern =
      /\b(?:FROM|JOIN)\s+(?:LATERAL\s+)?(?:"([^"]+)"|([A-Za-z_]\w*))/gi;

    let match;
    while ((match = fromJoinPattern.exec(sql)) !== null) {
      const tableName = match[1] ?? match[2]; // quoted or unquoted
      if (tableName) {
        // Skip subquery aliases and SQL keywords
        const upper = tableName.toUpperCase();
        if (
          upper === "SELECT" ||
          upper === "LATERAL" ||
          upper === "UNNEST" ||
          upper === "GENERATE_SERIES"
        ) {
          continue;
        }
        tables.push(tableName);
      }
    }

    return Array.from(new Set(tables));
  }

  /**
   * Extracts CTE names from WITH clauses so they aren't flagged as unknown tables.
   * Matches: WITH name AS (...), name2 AS (...)
   */
  private extractCteNames(sql: string): Set<string> {
    const names = new Set<string>();
    // Match WITH ... AS or , name AS patterns
    const ctePattern = /\bWITH\b\s+|,\s*/gi;
    const normalized = sql.replace(/\s+/g, " ");
    const upperSql = normalized.toUpperCase();

    // Find the WITH clause
    const withIdx = upperSql.indexOf("WITH ");
    if (withIdx === -1) return names;

    // Extract CTE names: each is an identifier followed by AS
    const afterWith = normalized.substring(withIdx + 5);
    const cteNamePattern = /(?:^|,)\s*(?:"([^"]+)"|([A-Za-z_]\w*))\s+AS\s*\(/gi;
    let match;
    while ((match = cteNamePattern.exec(afterWith)) !== null) {
      const name = match[1] ?? match[2];
      if (name) names.add(name);
    }

    return names;
  }

  private ensureLimit(sql: string): string {
    const normalized = sql.replace(/\s+/g, " ").trim().toUpperCase();

    // Check if LIMIT already present
    if (/\bLIMIT\s+\d+/i.test(normalized)) {
      return sql.replace(/\bLIMIT\s+(\d+)/i, (_match, num) => {
        const existing = parseInt(num, 10);
        return `LIMIT ${Math.min(existing, MAX_ROWS)}`;
      });
    }

    // Remove trailing semicolon and add LIMIT
    const trimmed = sql.replace(/;\s*$/, "").trim();
    return `${trimmed} LIMIT ${MAX_ROWS}`;
  }

  /** Remove SQL comments and normalize whitespace, returns uppercased */
  private stripCommentsAndNormalize(sql: string): string {
    return sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  /** Replace string literals with empty strings for safe keyword/identifier scanning */
  private stripStringLiterals(sql: string): string {
    return sql
      .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, (_match, tag: string) => `\$${tag}\$\$${tag}\$`)
      .replace(/E'(?:[^']|'')*'/gi, "''")
      .replace(/'(?:[^']|'')*'/g, "''");
  }
}
