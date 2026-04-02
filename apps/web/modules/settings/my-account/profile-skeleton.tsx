"use client";

import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Card, CardFrame, CardFrameFooter, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

export const SkeletonLoader = () => {
  const { t } = useLocale();

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("profile")}>
          <AppHeaderDescription>
            {t("profile_description", { appName: APP_NAME })}
          </AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>

      <div className="flex flex-col gap-4">
        {/* Profile form card */}
        <CardFrame>
          <Card>
            <CardPanel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Avatar */}
                <div className="flex items-center gap-4 max-md:col-span-2">
                  <Skeleton className="size-16 shrink-0 rounded-full" data-testid="skeleton-avatar" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-28 rounded-md" />
                  </div>
                </div>

                {/* Username */}
                <div className="col-span-full flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-3 w-64" />
                </div>

                {/* Full name */}
                <div className="col-span-full flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>

                {/* Email */}
                <div className="col-span-full flex flex-col gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>

                {/* Bio */}
                <div className="col-span-full flex flex-col gap-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-[165px] w-full rounded-md" />
                </div>
              </div>
            </CardPanel>
          </Card>
          <CardFrameFooter className="flex justify-end">
            <Skeleton className="h-8 w-20 rounded-md" />
          </CardFrameFooter>
        </CardFrame>

        {/* Danger zone card */}
        <CardFrame data-testid="danger-zone-skeleton">
          <Card>
            <CardPanel>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-64" />
              </div>
            </CardPanel>
          </Card>
          <CardFrameFooter className="flex justify-end">
            <Skeleton className="h-8 w-32 rounded-md" />
          </CardFrameFooter>
        </CardFrame>
      </div>
    </>
  );
};
