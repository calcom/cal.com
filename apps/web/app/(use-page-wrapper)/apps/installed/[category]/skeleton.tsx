"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

export function InstalledAppsSkeleton() {
  const { t } = useLocale();

  return (
    <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
      <SkeletonContainer>
        <div className="flex flex-col gap-y-8">
          {/* App Category Navigation Skeleton */}
          <div className="flex flex-col xl:flex-row xl:space-x-6">
            {/* Vertical tabs skeleton for desktop */}
            <div className="hidden xl:block">
              <div className="flex flex-col space-y-1">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div key={`nav-${i}`} className="flex items-center space-x-2 rounded-md p-2">
                      <div className="h-4 w-4 rounded bg-gray-200" />
                      <SkeletonText className="h-4 w-20" />
                    </div>
                  ))}
              </div>
            </div>

            {/* Horizontal tabs skeleton for mobile */}
            <div className="block overflow-x-scroll xl:hidden">
              <div className="flex space-x-4">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={`mobile-nav-${i}`}
                      className="flex items-center space-x-2 whitespace-nowrap rounded-md p-2">
                      <div className="h-4 w-4 rounded bg-gray-200" />
                      <SkeletonText className="h-4 w-20" />
                    </div>
                  ))}
              </div>
            </div>

            {/* Main content area */}
            <main className="w-full min-w-0">
              {/* Calendar category skeleton */}
              <div className="mb-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <SkeletonText className="h-6 w-32 font-semibold" />
                    <SkeletonText className="mt-1 h-4 w-64" />
                  </div>
                  <SkeletonButton className="h-9 w-32 rounded-md" />
                </div>

                {/* Connected calendars section */}
                <div className="mb-6">
                  <SkeletonText className="mb-4 h-5 w-40" />
                  <div className="space-y-3">
                    {Array(2)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={`connected-${i}`}
                          className="border-subtle flex items-center rounded-md border p-4">
                          <div className="mr-3 h-10 w-10 rounded-md bg-gray-200" />
                          <div className="flex-1">
                            <SkeletonText className="h-5 w-32" />
                            <SkeletonText className="mt-1 h-4 w-24" />
                          </div>
                          <SkeletonButton className="h-8 w-20 rounded-md" />
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Other categories skeleton - IntegrationsContainer */}
              <div className="border-subtle rounded-md border p-7">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <SkeletonText className="h-6 w-32 font-semibold" />
                    <SkeletonText className="mt-1 h-4 w-64" />
                  </div>
                  <SkeletonButton className="h-9 w-20 rounded-md" />
                </div>

                {/* App list skeleton */}
                <div className="space-y-4">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <div key={`app-${i}`} className="border-subtle flex items-center rounded-md border p-4">
                        <div className="mr-4 h-12 w-12 rounded-md bg-gray-200" />
                        <div className="flex-1">
                          <SkeletonText className="h-5 w-40" />
                          <SkeletonText className="mt-1 h-4 w-32" />
                          <SkeletonText className="mt-2 h-4 w-full" />
                          <SkeletonText className="mt-1 h-4 w-3/4" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <SkeletonButton className="h-8 w-8 rounded-md" />
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Empty state skeleton for categories with no apps */}
              <div className="mt-8 text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-200" />
                <SkeletonText className="mx-auto h-6 w-48" />
                <SkeletonText className="mx-auto mt-2 h-4 w-64" />
                <SkeletonButton className="mx-auto mt-4 h-9 w-32 rounded-md" />
              </div>
            </main>
          </div>
        </div>
      </SkeletonContainer>
    </InstalledAppsLayout>
  );
}
