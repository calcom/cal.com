"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PanelCard } from "@calcom/ui/components/card";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export function ActiveUserBreakdownSkeleton() {
  const { t } = useLocale();

  return (
    <PanelCard title={t("active_users_billing")} className="mt-5">
      <div className="p-4">
        <SkeletonText className="mb-4 h-4 w-64" />
        <div className="mb-3 flex gap-4 border-b pb-3">
          <SkeletonText className="h-4 w-32" />
          <SkeletonText className="h-4 w-40" />
          <SkeletonText className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="h-4 w-40" />
            <SkeletonText className="h-4 w-20" />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
