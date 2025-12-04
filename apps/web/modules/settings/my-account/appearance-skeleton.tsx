"use client";

import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("appearance")} description={t("appearance_description")}>
      <SkeletonContainer>
        <div className="border-subtle mt-6 flex items-center rounded-t-xl border p-6 text-sm">
          <SkeletonText className="h-8 w-1/3" />
        </div>
        <div className="border-subtle stack-y-6 border-x px-4 py-6 sm:px-6">
          <div className="[&>*]:bg-emphasis flex w-full items-center justify-center gap-x-2 *:animate-pulse">
            <div className="h-32 flex-1 rounded-md p-5" />
            <div className="h-32 flex-1 rounded-md p-5" />
            <div className="h-32 flex-1 rounded-md p-5" />
          </div>
          <div className="flex justify-between">
            <SkeletonText className="h-8 w-1/3" />
            <SkeletonText className="h-8 w-1/3" />
          </div>

          <SkeletonText className="h-8 w-full" />
        </div>
        <div className="rounded-b-lg">
          <SectionBottomActions align="end">
            <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
          </SectionBottomActions>
        </div>
      </SkeletonContainer>
    </SettingsHeader>
  );
};
