import type { PrismaClient } from "@prisma/client";

import type { AdminTable } from "../AdminTable";
import type { AdminTableRegistry } from "../AdminTableRegistry";

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
    const where = table.buildWhere(params.search, params.filters);
    const select = table.buildPrismaSelect();

    const [rows, total] = await Promise.all([
      delegate.findMany({
        select,
        where,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: pageSize,
      }),
      delegate.count({ where }),
    ]);

    return {
      rows: (rows as Record<string, unknown>[]).map((r) => table.postProcessRow(r)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(params: GetByIdParams): Promise<Record<string, unknown> | null> {
    const table = this.resolveTable(params.slug);
    const delegate = this.getDelegate(table);
    const select = table.buildPrismaSelect();
    const pkValue = table.coercePrimaryKey(params.id);

    const row = await delegate.findUnique({
      select,
      where: { [table.primaryKeyColumn]: pkValue },
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
}
