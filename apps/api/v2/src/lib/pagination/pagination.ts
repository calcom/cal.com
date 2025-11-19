import { PaginationMetaDto } from "@calcom/platform-types";

type Pagination = {
  skip: number;
  take: number;
  totalCount: number;
};

export function getPagination(pagination: Pagination): PaginationMetaDto {
  const { skip, take, totalCount } = pagination;

  const safeSkip = clamp({ value: skip, min: 0, max: totalCount });
  const itemsPerPage = take;
  const remainingItems = getRemainingItems(safeSkip, itemsPerPage, totalCount);
  const totalPages = getTotalPages(itemsPerPage, totalCount);
  const currentPage = getCurrentPage(safeSkip, itemsPerPage, totalPages);
  const hasNextPage = getHasNextPage(safeSkip, itemsPerPage, totalCount);
  const hasPreviousPage = getHasPreviousPage(safeSkip);
  const returnedItems = getReturnedItems(safeSkip, itemsPerPage, totalCount);

  return {
    returnedItems,
    totalItems: totalCount,
    itemsPerPage,
    remainingItems,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}

function getRemainingItems(skip: number, itemsPerPage: number, totalCount: number) {
  return clamp({
    value: totalCount - (skip + itemsPerPage),
    min: 0,
    max: totalCount,
  });
}

function getTotalPages(itemsPerPage: number, totalCount: number) {
  return itemsPerPage !== 0 ? Math.ceil(totalCount / itemsPerPage) : 0;
}

function getCurrentPage(skip: number, itemsPerPage: number, totalPages: number) {
  const rawCurrentPage = Math.floor(skip / itemsPerPage) + 1;
  if (totalPages === 0) {
    return 0;
  }
  return clamp({ value: rawCurrentPage, min: 1, max: totalPages });
}

function getHasNextPage(skip: number, itemsPerPage: number, totalCount: number) {
  return skip + itemsPerPage < totalCount;
}

function getHasPreviousPage(skip: number) {
  return skip > 0;
}

function getReturnedItems(skip: number, itemsPerPage: number, totalCount: number) {
  const remaining = totalCount - skip;
  return clamp({
    value: remaining,
    min: 0,
    max: itemsPerPage,
  });
}

type ClampArgs = {
  value: number;
  min: number;
  max: number;
};

export function clamp({ value, min, max }: ClampArgs): number {
  return Math.max(min, Math.min(value, max));
}
