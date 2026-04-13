"use client";

import { useEffect } from "react";

export function usePagination({
  totalCount,
  pageSize,
  page,
  onClamp,
}: {
  totalCount: number | undefined;
  pageSize: number;
  page: number;
  onClamp: (page: number) => void;
}) {
  const totalPages = totalCount != null ? Math.ceil(totalCount / pageSize) : 0;

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      onClamp(totalPages);
    }
  }, [totalPages, page, onClamp]);

  const startItem = (page - 1) * pageSize + 1;
  const endItem = totalCount != null ? Math.min(page * pageSize, totalCount) : page * pageSize;

  return { totalPages, startItem, endItem } as const;
}
