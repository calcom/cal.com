import type { PaginationQuery } from "@/types";
import { DatabaseError } from "@/utils/error";

import type { PrismaClient } from "@calcom/prisma/client";
import type { Prisma } from "@calcom/prisma/client";

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

  protected buildPaginationOptions(query: PaginationQuery) {
    const { page = 1, limit = 10, orderBy, orderDir = "desc" } = query;

    return {
      skip: (page - 1) * limit,
      take: limit,
      orderBy: orderBy
        ? ({ [orderBy]: orderDir } as Prisma.UserOrderByWithRelationInput)
        : ({ createdDate: "desc" } as Prisma.UserOrderByWithRelationInput),
    };
  }

  protected async executePaginatedQuery<TResult>(
    findManyFn: () => Promise<TResult[]>,
    countFn: () => Promise<number>,
    query: PaginationQuery
  ) {
    const { page = 1, limit = 10 } = query;

    try {
      const [data, total] = await Promise.all([findManyFn(), countFn()]);

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
