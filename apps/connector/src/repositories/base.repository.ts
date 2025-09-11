import type { PaginationQuery } from "@/types";
import { DatabaseError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma";

export abstract class BaseRepository<T extends { id: number | string }> {
  constructor(protected prisma: PrismaClient) {}

  protected handleDatabaseError(error: any, operation: string): never {
    console.error(`Database error in ${operation}:`, error);

    if (error.code === "P2002") {
      throw new DatabaseError(`Duplicate entry: ${error.meta?.target?.join(", ") || "unknown field"}`);
    }

    if (error.code === "P2025") {
      throw new DatabaseError("Record not found");
    }

    if (error.code === "P2003") {
      throw new DatabaseError("Foreign key constraint failed");
    }

    throw new DatabaseError(`Database operation failed: ${operation}`, error);
  }

  protected buildPaginationOptions<T extends object>(query: PaginationQuery<T>) {
    const { page = 1, limit = 10, orderBy, orderDir = "desc" } = query;

    return {
      skip: (page - 1) * limit,
      take: limit,
      ...(orderBy ? { orderBy: { [orderBy]: orderDir } } : {}),
    };
  }

  protected async executePaginatedQuery<TResult, TOrderBy extends object>(
    query: PaginationQuery<TOrderBy>,
    findManyFn: (options: {
      skip: number;
      take: number;
      orderBy: TOrderBy | undefined;
    }) => Promise<TResult[]>,
    countFn: () => Promise<number>
  ) {
    const { page = 1, limit = 10 } = query;

    try {
      const rawOptions = this.buildPaginationOptions(query);
      const options = {
        skip: rawOptions.skip,
        take: rawOptions.take,
        orderBy: rawOptions.orderBy as TOrderBy | undefined,
      };

      const [data, total] = await Promise.all([findManyFn(options), countFn()]);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.handleDatabaseError(error, "paginated query");
    }
  }
}
