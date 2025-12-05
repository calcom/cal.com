"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("booking_limits")} description={t("booking_limits_global_description")}>
      <div className="flex flex-col gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonContainer key={index}>
            <div className="border-subtle flex items-center justify-between rounded-lg border p-6">
              <div className="flex flex-col gap-2">
                <SkeletonText className="h-5 w-48" />
                <SkeletonText className="h-3 w-64" />
              </div>
              <SkeletonButton className="h-6 w-10 " />
            </div>
          </SkeletonContainer>
        ))}
      </div>
    </SettingsHeader>
  );
};
