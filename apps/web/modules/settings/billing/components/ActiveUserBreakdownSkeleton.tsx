"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";

export function ActiveUserBreakdownSkeleton() {
  const { t } = useLocale();

  return (
    <CardFrame>
      <CardFrameHeader>
        <CardFrameTitle>{t("active_users_billing")}</CardFrameTitle>
        <CardFrameDescription>
          <Skeleton className="mt-1 h-4 w-48" />
        </CardFrameDescription>
      </CardFrameHeader>
      <Card>
        <CardPanel className="px-4 pt-1 pb-4">
          <div className="my-3">
            <div>
              <div className="py-2 flex justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="py-2 flex justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="py-2 flex justify-between gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </div>
          {/* Table header */}
          <div className="flex h-10 items-center gap-2 border-b">
            <Skeleton className="h-4 w-[25%]" />
            <Skeleton className="h-4 w-[50%]" />
            <Skeleton className="h-4 w-[25%]" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-2 py-4 not-last:border-b">
              <Skeleton className="h-4 w-[25%]" />
              <Skeleton className="h-4 w-[50%]" />
              <Skeleton className="h-4 w-[25%]" />
            </div>
          ))}
        </CardPanel>
      </Card>
    </CardFrame>
  );
}
