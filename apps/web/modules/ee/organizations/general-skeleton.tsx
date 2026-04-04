"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Card, CardFrame, CardFrameFooter, CardFrameHeader, CardPanel } from "@coss/ui/components/card";
import { Skeleton } from "@coss/ui/components/skeleton";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";

function SettingsToggleSkeleton() {
  return (
    <Card>
      <CardPanel className="flex items-center justify-between gap-4">
        <CardFrameHeader className="p-0">
          <Skeleton className="my-0.5 h-4 w-48" />
          <Skeleton className="my-0.5 h-4 w-72" />
        </CardFrameHeader>
        <Skeleton className="h-5 w-8 shrink-0 rounded-full" />
      </CardPanel>
    </Card>
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
            <CardPanel>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Timezone field */}
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>

                {/* Start of week field */}
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>

                {/* Time format field with description */}
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </CardPanel>
          </Card>

          <CardFrameFooter className="flex justify-end">
            <Skeleton className="h-9 w-20 rounded-md" />
          </CardFrameFooter>
        </CardFrame>

        <SettingsToggleSkeleton />
        <SettingsToggleSkeleton />
        <SettingsToggleSkeleton />
        <SettingsToggleSkeleton />
      </div>
    </>
  );
};
