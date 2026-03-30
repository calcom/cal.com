"use client";

import SettingsHeaderWithBackButton from "@calcom/features/settings/appDir/SettingsHeaderWithBackButton";
import { APP_NAME } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

export const SkeletonLoader = () => {
  const { t } = useLocale();

  return (
    <SettingsHeaderWithBackButton
      title={t("add_webhook")}
      description={t("add_webhook_description", { appName: APP_NAME })}
      borderInShellHeader={true}>
      <SkeletonContainer>
        <div className="divide-subtle border-subtle stack-y-6 rounded-b-lg border border-t-0 px-6 py-4">
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </SkeletonContainer>
    </SettingsHeaderWithBackButton>
  );
};
