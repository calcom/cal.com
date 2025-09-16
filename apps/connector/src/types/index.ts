export * from "./auth";

export interface PaginationQuery<T> {
  page?: number;
  limit?: number;
  orderBy?: keyof T;
  orderDir?: "asc" | "desc";
}
