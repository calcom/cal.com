"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  SkeletonAvatar,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();
  return (
    <SettingsHeader
      title={t("profile")}
      description={t("profile_description", { appName: APP_NAME })}
      borderInShellHeader={true}>
      <SkeletonContainer>
        <div className="border-subtle stack-y-6 rounded-b-lg border border-t-0 px-4 py-8">
          <div className="flex items-center">
            <SkeletonAvatar className="me-4 mt-0 h-16 w-16 px-4" />
            <SkeletonButton className="h-6 w-32 rounded-md p-5" />
          </div>
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />

          <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
        </div>
      </SkeletonContainer>
    </SettingsHeader>
  );
};
