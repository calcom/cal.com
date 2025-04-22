"use client";

import Shell from "@calcom/features/shell/Shell";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

export function AvailabilityScheduleSkeleton() {
  return (
    <Shell withoutMain={true}>
      <SkeletonContainer>
        <div className="mb-4">
          <SkeletonText className="h-8 w-48" />
          <div className="mt-2">
            <SkeletonText className="h-4 w-32" />
            <SkeletonText className="mt-1 h-4 w-40" />
          </div>
        </div>

        <div className="mb-4 flex justify-end gap-2">
          <SkeletonButton className="h-9 w-20 rounded-md" />
          <SkeletonButton className="h-9 w-20 rounded-md" />
        </div>

        <div className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
          <div className="flex-1 flex-row xl:mr-0">
            <div className="border-subtle mb-6 rounded-md border p-6">
              {/* Schedule skeleton */}
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="mb-4 flex">
                    <SkeletonText className="mr-4 h-6 w-28" />
                    <SkeletonText className="h-6 w-full" />
                  </div>
                ))}
            </div>
          </div>
          <div className="min-w-40 col-span-3 hidden space-y-2 md:block lg:col-span-1">
            <div className="w-full pr-4 sm:ml-0 sm:p-0">
              <SkeletonText className="mb-2 h-4 w-24" />
              <SkeletonText className="h-10 w-64 rounded-md" />
            </div>
          </div>
        </div>
      </SkeletonContainer>
    </Shell>
  );
}
