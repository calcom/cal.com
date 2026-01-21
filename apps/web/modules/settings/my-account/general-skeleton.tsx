"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <SkeletonContainer>
        <div className="border-subtle stack-y-6 rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />

          <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
        </div>
      </SkeletonContainer>
    </SettingsHeader>
  );
};
