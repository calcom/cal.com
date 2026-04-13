"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import { Pagination, PaginationContent, PaginationItem } from "@coss/ui/components/pagination";
import { ChevronLeftIcon, ChevronRightIcon } from "@coss/ui/icons";

export function PaginationControls({
  page,
  totalPages,
  startItem,
  endItem,
  totalCount,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLocale();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-sm">
        {t("pagination_status", {
          currentRange: `${startItem}-${endItem}`,
          totalItems: totalCount,
        })}
      </span>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label={t("previous")}>
              <ChevronLeftIcon />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label={t("next")}>
              <ChevronRightIcon />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
