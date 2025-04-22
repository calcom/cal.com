"use client";

import Shell from "@calcom/features/shell/Shell";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

export function AvailabilityScheduleSkeleton() {
  return (
    <Shell withoutMain={true}>
      <SkeletonContainer>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <SkeletonText className="h-8 w-36" />
            <SkeletonText className="ml-2 h-4 w-4" /> {/* Pencil icon */}
            <div className="ml-2">
              <SkeletonText className="h-4 w-64" /> {/* Sun - Sat, 9:00 AM - 5:00 PM */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonText className="h-4 w-24" /> {/* Set to Default text */}
            <div className="h-6 w-12 rounded-full bg-gray-200" /> {/* Toggle */}
            <div className="mx-2">|</div>
            <SkeletonButton className="h-9 w-20 rounded-md" /> {/* Save button */}
          </div>
        </div>

        <div className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
          <div className="flex-1 flex-row xl:mr-0">
            <div className="border-subtle mb-6 rounded-md border p-6">
              {/* Schedule skeleton */}
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="mb-4 flex items-center">
                    <div className="mr-4 flex items-center">
                      <div className="mr-3 h-5 w-10 rounded-full bg-gray-200" /> {/* Toggle */}
                      <SkeletonText className="h-5 w-24" /> {/* Day name */}
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                      <SkeletonText className="h-5 w-5" /> {/* Dash */}
                      <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                      <div className="ml-2 flex gap-2">
                        <SkeletonText className="h-9 w-9 rounded-md" /> {/* Add button */}
                        <SkeletonText className="h-9 w-9 rounded-md" /> {/* Duplicate button */}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Date overrides section */}
            <div className="mb-6">
              <div className="mb-2 flex items-center">
                <SkeletonText className="h-5 w-32" /> {/* Date overrides */}
                <SkeletonText className="ml-2 h-5 w-5 rounded-full" /> {/* Info icon */}
              </div>
              <SkeletonText className="h-4 w-full max-w-md" /> {/* Description */}
              <div className="mt-4">
                <SkeletonButton className="h-9 w-36 rounded-md" /> {/* Add an override button */}
              </div>
            </div>
          </div>

          <div className="min-w-40 space-y-6 md:block">
            <div className="w-full">
              <SkeletonText className="mb-2 h-4 w-24" /> {/* Timezone */}
              <SkeletonText className="h-10 w-64 rounded-md" /> {/* Timezone selector */}
            </div>

            <div className="mt-6 w-full">
              <SkeletonText className="mb-2 h-4 w-64" /> {/* Something doesn't look right? */}
              <SkeletonButton className="h-9 w-48 rounded-md" /> {/* Launch troubleshooter */}
            </div>
          </div>
        </div>
      </SkeletonContainer>
    </Shell>
  );
}
