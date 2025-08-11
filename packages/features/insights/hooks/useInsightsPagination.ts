import { useState } from "react";

export const useInsightsPagination = (defaultPageSize = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const offset = (currentPage - 1) * pageSize;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return {
    currentPage,
    pageSize,
    offset,
    limit: pageSize,
    handlePageChange,
    handlePageSizeChange,
  };
};
