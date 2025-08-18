"use client";

import { SkeletonLoader } from "@calcom/features/apps/components/SkeletonLoader";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

export function InstalledAppsSkeleton() {
  const { t } = useLocale();

  return (
    <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
      <SkeletonLoader />
    </InstalledAppsLayout>
  );
}
