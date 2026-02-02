"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PanelCard } from "@calcom/ui/components/card";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export function InvoicesTableSkeleton() {
  const { t } = useLocale();

  return (
    <PanelCard title={t("invoices")} className="mt-5">
      <div className="p-4">
        {/* Header row */}
        <div className="mb-3 flex gap-4 border-b pb-3">
          <SkeletonText className="h-4 w-20" />
          <SkeletonText className="h-4 w-24" />
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="h-4 flex-1" />
          <SkeletonText className="h-4 w-24" />
          <SkeletonText className="h-4 w-16" />
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            <SkeletonText className="h-4 w-20" />
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-4 w-16" />
            <SkeletonText className="h-4 w-16" />
            <SkeletonText className="h-4 flex-1" />
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-4 w-8" />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
