"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton } from "@coss/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <div className="space-y-6">
        <div className="border-subtle stack-y-6 rounded-b-xl border border-t-0 px-4 py-8 sm:px-6">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="ml-auto h-8 w-20 rounded-md p-5" />
        </div>
      </div>
    </SettingsHeader>
  );
};
