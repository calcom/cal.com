"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <div className="mt-4">
      <div className="bg-cal-muted border-muted flex flex-col rounded-xl border p-px">
        {/* Roles list header */}
        <div className="px-5 py-4">
          <h2 className="text-default text-sm font-semibold leading-none">{t("role")}</h2>
        </div>
        {/* Role List Items */}
        <div className="bg-default border-subtle divide divide-subtle flex flex-col rounded-[10px] border">
          {/* Generate 3 skeleton items */}
          {[...Array(3)].map((_, index) => (
            <div key={index} className="border-subtle flex border-b p-3">
              <div className="flex items-center gap-3 truncate">
                {/* Icon skeleton */}
                <div className="flex items-center justify-center">
                  <div className="h-3 w-3 animate-pulse rounded-full bg-gray-200" />
                </div>
                {/* Role name skeleton */}
                <SkeletonText className="h-4 w-20" />
                {/* Badge skeleton */}
                <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 ">
          <p className="text-subtle text-sm font-medium leading-tight">{t("learn_more_permissions")}</p>
        </div>
      </div>
    </div>
  );
};
