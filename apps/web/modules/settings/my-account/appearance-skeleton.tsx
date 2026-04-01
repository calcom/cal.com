"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameFooter,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("appearance")}>
          <AppHeaderDescription>{t("appearance_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>
            <Skeleton className="h-4 my-0.5 w-40" data-testid="skeleton-text" />
          </CardFrameTitle>
          <CardFrameDescription>
            <Skeleton className="h-4 my-0.5 w-64" data-testid="skeleton-text" />
          </CardFrameDescription>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <div className="flex-col flex w-full sm:flex-row gap-4 md:gap-6">
              <div className="flex-1 flex gap-4 sm:flex-col items-center">
                <Skeleton className="w-full max-sm:w-20 aspect-208/120 rounded-sm sm:rounded-lg" data-testid="skeleton-text" />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
              <div className="flex-1 flex gap-4 sm:flex-col items-center">
                <Skeleton className="w-full max-sm:w-20 aspect-208/120 rounded-sm sm:rounded-lg" data-testid="skeleton-text" />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
              <div className="flex-1 flex gap-4 sm:flex-col items-center">
                <Skeleton className="w-full max-sm:w-20 aspect-208/120 rounded-sm sm:rounded-lg" data-testid="skeleton-text" />
                <Skeleton className="h-4 w-full max-w-56" data-testid="skeleton-text" />
              </div>
            </div>
          </CardPanel>
        </Card>
        <CardFrameFooter className="flex justify-end">
          <Skeleton className="h-9 sm:h-8 w-20 rounded-lg" data-testid="skeleton-text" />
        </CardFrameFooter>
      </CardFrame>
    </>
  );
};
