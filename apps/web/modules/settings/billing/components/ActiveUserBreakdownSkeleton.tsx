"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export function ActiveUserBreakdownSkeleton() {
  const { t } = useLocale();

  return (
    <div className="mt-5 rounded-xl border border-muted bg-cal-muted p-1">
      <div className="flex flex-col gap-1 px-4 py-5">
        <h2 className="text-default text-base font-semibold leading-none">{t("active_users_billing")}</h2>
        <SkeletonText className="mt-1 h-4 w-48" />
      </div>
      <div className="bg-default border-muted flex w-full rounded-[10px] border px-5 py-4">
        <div className="w-full">
          <div className="mb-4">
            <div className="border-subtle my-1 flex justify-between border-b border-dashed">
              <SkeletonText className="h-4 w-28" />
              <SkeletonText className="h-4 w-12" />
            </div>
            <div className="border-subtle my-1 flex justify-between border-b border-dashed">
              <SkeletonText className="h-4 w-24" />
              <SkeletonText className="h-4 w-10" />
            </div>
            <div className="my-1 flex justify-between">
              <SkeletonText className="h-4 w-20" />
              <SkeletonText className="h-4 w-10" />
            </div>
            <SkeletonText className="mt-4 h-2 w-full rounded-full" />
            <div className="mt-3 flex gap-3">
              <SkeletonText className="h-3 w-16" />
              <SkeletonText className="h-3 w-16" />
              <SkeletonText className="h-3 w-16" />
            </div>
          </div>
          <hr className="border-subtle -mx-5" />
          <div className="mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3">
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="h-4 w-40" />
                <SkeletonText className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
