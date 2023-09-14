import type { PaginationState } from "@tanstack/react-table";
import { useState, useMemo } from "react";

export function usePagination({
  defaultPageIndex = 1,
  defaultPageSize = 20,
}: {
  defaultPageIndex?: number;
  defaultPageSize?: number;
}) {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: defaultPageIndex,
    pageSize: defaultPageSize,
  });

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  return {
    pagination,
    setPagination,
  };
}
