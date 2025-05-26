"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { ButtonGroup } from "../buttonGroup";
import { Select } from "../form/select";

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  pageSizeOptions?: number[];
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const Pagination = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  onNext,
  onPrevious,
}: PaginationProps) => {
  const { t } = useLocale();
  const [internalPageSize, setInternalPageSize] = useState(pageSize);
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageSizeChange = (option: { value: number; label: string } | null) => {
    if (option) {
      const newPageSize = option.value;
      setInternalPageSize(newPageSize);
      onPageSizeChange(newPageSize);
      // Reset to first page when changing page size
      onPageChange(1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
      onPrevious?.();
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
      onNext?.();
    }
  };

  const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
    value: size,
    label: `${size}`,
  }));

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between space-x-2">
      <div className="flex items-center space-x-2">
        <Select
          options={pageSizeSelectOptions}
          value={pageSizeSelectOptions.find((option) => option.value === internalPageSize)}
          onChange={handlePageSizeChange}
          size="sm"
        />
        <span className="text-default text-sm">{t("rows_per_page")}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-default text-sm">
          {t("pagination_status", {
            currentRange: `${startItem}-${endItem}`,
            totalItems,
          })}
        </span>
        <ButtonGroup containerProps={{ className: "space-x-1.5" }}>
          <Button
            variant="icon"
            StartIcon="arrow-left"
            onClick={handlePrevious}
            disabled={currentPage <= 1}
            color="secondary"
            size="sm"
          />
          <Button
            variant="icon"
            StartIcon="arrow-right"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            color="secondary"
            size="sm"
          />
        </ButtonGroup>
      </div>
    </div>
  );
};
