import type { Prisma } from "@calcom/prisma/client";

export * from "./auth";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    [key: string]: any;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  orderBy?: keyof Prisma.UserOrderByWithRelationInput;
  orderDir?: "asc" | "desc";
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
