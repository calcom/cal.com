"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";

export function SkeletonLoader() {
  const { t } = useLocale();
  return (
    <SettingsHeader title={t("general")} description={t("general_description")} borderInShellHeader={true}>
      <div className="space-y-8 rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="rounded-md bg-amber-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <Icon className="h-5 w-5 text-amber-500" name="triangle-alert" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <SkeletonText className="h-4 w-full max-w-xl" />
              <SkeletonText className="mt-2 h-4 w-48" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SkeletonText className="h-5 w-32" />
          <SkeletonText className="h-10 w-full rounded-md border" />
        </div>

        <div className="space-y-3">
          <SkeletonText className="h-5 w-32" />
          <SkeletonText className="h-10 w-full rounded-md border" />
          <SkeletonText className="h-4 w-full max-w-lg text-sm" />
        </div>

        <div className="space-y-3">
          <SkeletonText className="h-5 w-32" />
          <SkeletonText className="h-10 w-full rounded-md border" />
        </div>

        <div className="my-8 border-t border-neutral-200 dark:border-neutral-700" />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-64" />
            <SkeletonText className="h-4 w-full max-w-md" />
          </div>
          <SkeletonText className="h-6 w-12 rounded-full" />
        </div>

        <div className="my-8 border-t border-neutral-200 dark:border-neutral-700" />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-80" />
            <SkeletonText className="h-4 w-full max-w-lg" />
          </div>
          <SkeletonText className="h-6 w-12 rounded-full" />
        </div>

        <div className="mt-8 flex justify-end">
          <SkeletonText className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </SettingsHeader>
  );
}
