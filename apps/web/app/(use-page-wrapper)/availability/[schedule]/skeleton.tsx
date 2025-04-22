"use client";

import Shell from "@calcom/features/shell/Shell";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

export function AvailabilityScheduleSkeleton() {
  return (
    <Shell withoutMain={true}>
      <SkeletonContainer>
        {/* Header section */}
        <div className="mb-10 mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center">
              <SkeletonText className="h-6 w-36" /> {/* Title */}
              <SkeletonText className="ml-2 h-4 w-4 rounded-md" /> {/* Pencil icon */}
            </div>
            <SkeletonText className="mt-1 h-4 w-64" /> {/* Schedule description */}
          </div>
          <div className="flex items-center">
            <SkeletonText className="h-4 w-24" /> {/* Set to Default text */}
            <div className="ml-2 h-5 w-10 rounded-full bg-gray-200" /> {/* Toggle */}
            <div className="mx-2 h-4 w-px bg-gray-200" /> {/* Divider */}
            <SkeletonButton className="ml-2 h-9 w-16 rounded-md" /> {/* Save button */}
          </div>
        </div>

        <div className="flex flex-col xl:flex-row xl:space-x-4">
          {/* Main content */}
          <div className="flex-1">
            {/* Schedule skeleton */}
            <div className="border-subtle mb-6 rounded-md border p-6">
              {Array(7)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="mb-4 flex items-center">
                    <div className="mr-2 flex w-28 items-center">
                      <div className="mr-2 h-5 w-10 rounded-full bg-gray-200" /> {/* Toggle */}
                      <SkeletonText className="h-5 w-16" /> {/* Day name */}
                    </div>
                    <div className="flex flex-1 items-center">
                      <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                      <div className="mx-2">
                        <SkeletonText className="h-5 w-2" /> {/* Dash */}
                      </div>
                      <SkeletonText className="h-9 w-24 rounded-md" /> {/* Time input */}
                      <div className="ml-4 flex gap-2">
                        <SkeletonText className="h-8 w-8 rounded-md" /> {/* Add button */}
                        <SkeletonText className="h-8 w-8 rounded-md" /> {/* Duplicate button */}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Date overrides section */}
            <div className="mb-6">
              <div className="mb-2 flex items-center">
                <SkeletonText className="h-5 w-28" /> {/* Date overrides */}
                <SkeletonText className="ml-2 h-4 w-4 rounded-full" /> {/* Info icon */}
              </div>
              <SkeletonText className="h-4 w-full max-w-md" /> {/* Description */}
              <div className="mt-4">
                <SkeletonButton className="h-9 w-36 rounded-md" /> {/* Add an override button */}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full xl:w-64">
            <div className="w-full">
              <SkeletonText className="mb-2 h-4 w-24" /> {/* Timezone */}
              <SkeletonText className="h-10 w-full rounded-md" /> {/* Timezone selector */}
            </div>

            <div className="mt-6 w-full">
              <SkeletonText className="mb-2 h-4 w-56" /> {/* Something doesn't look right? */}
              <SkeletonButton className="h-9 w-48 rounded-md" /> {/* Launch troubleshooter */}
            </div>
          </div>
        </div>
      </SkeletonContainer>
    </Shell>
  );
}
