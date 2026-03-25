"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Card,
  CardFrame,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";

export function InvoicesTableSkeleton() {
  const { t } = useLocale();

  return (
    <CardFrame>
      <CardFrameHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardFrameTitle>{t("invoices")}</CardFrameTitle>
        <Skeleton className="w-30 h-9 sm:h-8 rounded-lg" />
      </CardFrameHeader>
      <Card>
        <CardPanel className="px-4 pt-1 pb-4">
          {/* Header row */}
          <div className="flex gap-2 border-b h-10 items-center">
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[20%]" />
            <Skeleton className="h-4 w-[15%]" />
          </div>
          {/* Data rows */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-2 py-4 not-last:border-b">
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-4 w-[15%]" />
              <Skeleton className="h-4 w-[20%]" />
              <Skeleton className="h-4 w-[15%]" />
            </div>
          ))}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
