"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Card, CardFrame, CardFrameFooter, CardFrameHeader, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

function CardSkeleton() {
  return (
    <div data-testid="settings-toggle-skeleton">
      <Card>
        <CardPanel className="flex items-center justify-between gap-4">
          <CardFrameHeader className="p-0">
            <Skeleton className="my-0.5 h-4 w-36" />
            <Skeleton className="my-0.5 h-4 w-52" />
          </CardFrameHeader>
          <Skeleton className="h-4.5 w-7.5 shrink-0 rounded-full" />
        </CardPanel>
      </Card>
    </div>
  );
}

export const SkeletonLoader = () => {
  const { t } = useLocale();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("general")}>
          <AppHeaderDescription>{t("general_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex flex-col gap-4">
        <CardFrame>
          <Card>
            <CardPanel className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-2 max-md:col-span-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>

                <div className="col-span-2 flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-8 w-40 rounded-md" />
                  </div>
                </div>

                <div className="col-span-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-full rounded-md" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-8 w-full rounded-md" />
                  </div>
                </div>
              </div>
            </CardPanel>
          </Card>

          <CardFrameFooter className="flex justify-end">
            <Skeleton className="h-8 w-24 rounded-md" />
          </CardFrameFooter>
        </CardFrame>

        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </>
  );
};
