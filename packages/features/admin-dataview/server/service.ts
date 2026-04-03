import type { PrismaClient } from "@calcom/prisma";

import type { AdminTable } from "../AdminTable";
import type { AdminTableRegistry } from "../AdminTableRegistry";

const ESTIMATED_COUNT_THRESHOLD = 100_000;

export interface ListParams {
  slug: string;
  page: number;
  pageSize?: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
  filters?: Record<string, unknown>;
}

export interface ListResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isEstimate?: boolean;
}

export interface GetByIdParams {
  slug: string;
  id: string | number;
}

export class AdminDataViewService {
  private prisma: PrismaClient;
  private registry: AdminTableRegistry;

  constructor(deps: { prisma: PrismaClient; registry: AdminTableRegistry }) {
    this.prisma = deps.prisma;
    this.registry = deps.registry;
  }

  async list(params: ListParams): Promise<ListResult> {
    const table = this.resolveTable(params.slug);
    const delegate = this.getDelegate(table);

    const pageSize = params.pageSize ?? table.pageSize;
    const page = Math.max(1, params.page);
    const skip = (page - 1) * pageSize;
    const sortField = table.resolveSortField(params.sortField);
    const sortDirection = params.sortDirection ?? table.defaultSortDirection;
    const where = {
      ...table.defaultWhere,
      ...table.buildWhere(params.search, params.filters),
    };
    const select = table.buildPrismaSelect();

    const hasFilters = Object.keys(where).length > 0;

    const [rows, countResult] = await Promise.all([
      delegate.findMany({
        select,
        where,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: pageSize,
      }),
      hasFilters
        ? delegate
            .count({ where })
            .then((c: number) => ({ total: c, isEstimate: false }))
        : this.getCountWithEstimateFallback(table, delegate),
    ]);

    const { total, isEstimate } = countResult;

    return {
      rows: (rows as Record<string, unknown>[]).map((r) =>
        table.postProcessRow(r)
      ),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      ...(isEstimate && { isEstimate }),
    };
  }

  async getById(
    params: GetByIdParams
  ): Promise<Record<string, unknown> | null> {
    const table = this.resolveTable(params.slug);
    const delegate = this.getDelegate(table);
    const select = table.buildPrismaSelect();
    const pkValue = table.coercePrimaryKey(params.id);

    const row = await delegate.findUnique({
      select,
      where: { [table.primaryKeyColumn]: pkValue, ...table.defaultWhere },
    });

    if (!row) return null;
    return table.postProcessRow(row as Record<string, unknown>);
  }

  private resolveTable(slug: string): AdminTable {
    const table = this.registry.getBySlug(slug);
    if (!table) throw new Error(`Unknown table slug: ${slug}`);
    return table;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getDelegate(table: AdminTable): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.prisma as any)[table.prismaAccessor];
  }

  private async getCountWithEstimateFallback(
    table: AdminTable,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: any
  ): Promise<{ total: number; isEstimate: boolean }> {
    try {
      const tableName = this.prismaModelToTableName(table.modelName);
      const result = (await this.prisma.$queryRawUnsafe(
        `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
        tableName
      )) as { estimate: bigint }[];
      const estimate = Number(result[0]?.estimate ?? -1);

      if (estimate > ESTIMATED_COUNT_THRESHOLD) {
        return { total: estimate, isEstimate: true };
      }
    } catch {
      // Fall through to exact count
    }

    const total = await delegate.count();
    return { total, isEstimate: false };
  }

  private prismaModelToTableName(modelName: string): string {
    const TABLE_NAME_OVERRIDES: Record<string, string> = {
      User: "users",
    };
    return TABLE_NAME_OVERRIDES[modelName] ?? modelName;
  }

  async globalSearch(query: string): Promise<GlobalSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) return { results: [] };

    const tables = this.registry.getAll();
    const isNumeric = /^\d+$/.test(trimmed);
    const numericValue = isNumeric ? parseInt(trimmed, 10) : null;

    const MAX_PER_TABLE = 5;

    const searches = tables.map(async (table) => {
      const hasSearchableFields = table.searchableFields.length > 0;
      const hasPkLookup = isNumeric && table.primaryKeyField?.type === "number";
      const hasStringPkLookup = table.primaryKeyField?.type === "string";

      if (!hasSearchableFields && !hasPkLookup && !hasStringPkLookup) return null;

      try {
        const delegate = this.getDelegate(table);
        const select = table.buildPrismaSelect();

        // Build OR conditions: searchable fields + PK lookup
        const orConditions: Record<string, unknown>[] = [];

        // Text search across searchable fields
        if (hasSearchableFields) {
          for (const fieldName of table.searchableFields) {
            const fieldDef = table.fields.find((f) => f.column === fieldName);
            if (!fieldDef || fieldDef.access === "hidden") continue;

            if (fieldDef.type === "string" || fieldDef.type === "email" || fieldDef.type === "url") {
              orConditions.push({ [fieldName]: { contains: trimmed, mode: "insensitive" } });
            }
            if (fieldDef.type === "number" && numericValue !== null) {
              orConditions.push({ [fieldName]: numericValue });
            }
          }
        }

        // Direct PK lookup for numeric queries
        if (hasPkLookup && numericValue !== null) {
          orConditions.push({ [table.primaryKeyColumn]: numericValue });
        }

        // String PK lookup (e.g. app slug, feature slug)
        if (table.primaryKeyField?.type === "string") {
          orConditions.push({
            [table.primaryKeyColumn]: { contains: trimmed, mode: "insensitive" },
          });
        }

        if (orConditions.length === 0) return null;

        const baseWhere = orConditions.length === 1 ? orConditions[0] : { OR: orConditions };
        const where = table.defaultWhere ? { ...table.defaultWhere, ...baseWhere } : baseWhere;

        const [rows, total] = await Promise.all([
          delegate.findMany({
            select,
            where,
            take: MAX_PER_TABLE,
            orderBy: { [table.primaryKeyColumn]: "desc" },
          }),
          delegate.count({ where }),
        ]);

        if (total === 0) return null;

        return {
          slug: table.slug,
          displayName: table.displayName,
          displayNamePlural: table.displayNamePlural,
          category: table.category,
          rows: (rows as Record<string, unknown>[]).map((r) => table.postProcessRow(r)),
          total,
        };
      } catch {
        // Skip tables that fail (e.g. missing DB table)
        return null;
      }
    });

    const settled = await Promise.allSettled(searches);
    const results = settled
      .filter(
        (r): r is PromiseFulfilledResult<GlobalSearchTableResult | null> =>
          r.status === "fulfilled" && r.value !== null
      )
      .map((r) => r.value!)
      .sort((a, b) => b.total - a.total);

    return { results };
  }
}

export interface GlobalSearchTableResult {
  slug: string;
  displayName: string;
  displayNamePlural: string;
  category: "core" | "billing" | "platform" | "abuse" | "system";
  rows: Record<string, unknown>[];
  total: number;
}

export interface GlobalSearchResult {
  results: GlobalSearchTableResult[];
}
