"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import AppsLayout from "@components/apps/layouts/AppsLayout";

export function AppHomePageSkeleton() {
  const { t } = useLocale();

  return (
    <AppsLayout
      isPublic
      heading={t("app_store")}
      subtitle={t("app_store_description")}
      headerClassName="sm:hidden lg:block hidden"
      isAdmin={false}>
      <SkeletonContainer>
        <div className="flex flex-col gap-y-8">
          {/* Featured Categories section */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <SkeletonText className="h-6 w-40 font-semibold" />
              <div className="flex">
                <SkeletonButton className="mx-1 h-8 w-8 rounded-md" /> {/* Left arrow */}
                <SkeletonButton className="mx-1 h-8 w-8 rounded-md" /> {/* Right arrow */}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Category cards - 5 items based on screenshot */}
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`category-${i}`}
                    className="bg-subtle flex h-48 flex-col items-center justify-center rounded-md p-4">
                    <div className="mb-3 h-14 w-14 rounded-full bg-gray-200" /> {/* Icon placeholder */}
                    <SkeletonText className="h-5 w-24 text-center" /> {/* Category name */}
                    <SkeletonText className="mt-1 h-4 w-16 text-center" /> {/* Apps count */}
                  </div>
                ))}
            </div>
          </div>

          {/* Most Popular section */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <SkeletonText className="h-6 w-40 font-semibold" />
              <div className="flex">
                <SkeletonButton className="mx-1 h-8 w-8 rounded-md" /> {/* Left arrow */}
                <SkeletonButton className="mx-1 h-8 w-8 rounded-md" /> {/* Right arrow */}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {/* App cards - 3 items */}
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={`app-${i}`} className="border-subtle flex flex-col rounded-md border p-4">
                    <div className="flex items-center">
                      <div className="mr-3 h-10 w-10 rounded-md bg-gray-200" /> {/* App icon */}
                      <div className="flex-1">
                        <SkeletonText className="h-5 w-32" /> {/* App name */}
                        <SkeletonText className="mt-1 h-4 w-24" /> {/* Developer name */}
                      </div>
                    </div>
                    <SkeletonText className="mt-3 h-4 w-full" /> {/* Description line 1 */}
                    <SkeletonText className="mt-2 h-4 w-3/4" /> {/* Description line 2 */}
                    <div className="mt-4 flex justify-between">
                      <SkeletonButton className="h-9 w-24 rounded-md" /> {/* Details button */}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* All apps section */}
          <div className="mt-4">
            <SkeletonText className="h-6 w-32 font-semibold" />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {/* App cards - 6 items */}
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={`all-app-${i}`} className="border-subtle flex flex-col rounded-md border p-4">
                    <div className="flex items-center">
                      <div className="mr-3 h-10 w-10 rounded-md bg-gray-200" /> {/* App icon */}
                      <div className="flex-1">
                        <SkeletonText className="h-5 w-32" /> {/* App name */}
                        <SkeletonText className="mt-1 h-4 w-24" /> {/* Developer name */}
                      </div>
                    </div>
                    <SkeletonText className="mt-3 h-4 w-full" /> {/* Description line 1 */}
                    <SkeletonText className="mt-2 h-4 w-3/4" /> {/* Description line 2 */}
                    <div className="mt-4 flex justify-between">
                      <SkeletonButton className="h-9 w-24 rounded-md" /> {/* Details button */}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </SkeletonContainer>
    </AppsLayout>
  );
}
