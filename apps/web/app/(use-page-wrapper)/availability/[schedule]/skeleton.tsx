"use client";

import Shell from "@calcom/features/shell/Shell";
import { SkeletonText, SkeletonContainer, SkeletonButton } from "@calcom/ui/components/skeleton";

export function AvailabilityScheduleSkeleton() {
  return (
    <Shell withoutMain={true}>
      <SkeletonContainer>
        <div className="max-w-full">
          {/* Header section */}
          <div className="bg-default sticky top-0 z-10 mb-0 flex items-center py-2 md:mb-6 md:mt-0 lg:mb-9">
            {/* Back button */}
            <div className="flex items-center">
              <SkeletonText className="h-6 w-6 rounded-md ltr:mr-2 rtl:ml-2" /> {/* Back button */}
            </div>

            {/* Title section */}
            <header className="flex w-full max-w-full items-center truncate">
              <div className="w-full truncate ltr:mr-4 rtl:ml-4 md:block">
                <SkeletonText className="font-cal max-w-28 sm:max-w-72 md:max-w-80 hidden h-6 truncate text-xl font-semibold tracking-wide md:block" />
                {/* Title */}
                <SkeletonText className="mt-1 hidden h-4 w-64 text-sm md:block" /> {/* Subtitle */}
              </div>

              {/* Action buttons */}
              <div className="relative shrink-0 md:relative md:bottom-auto md:right-auto">
                {/* Desktop buttons - Set to Default, Delete, and Save */}
                <div className="flex items-center justify-end">
                  {/* Set to Default - desktop only */}
                  <div className="hidden items-center rounded-md sm:flex">
                    <SkeletonText className="h-4 w-28" /> {/* "Set to Default" text */}
                    <div className="ml-2 h-5 w-11 rounded-full bg-gray-200" /> {/* Toggle */}
                    <div className="mx-3 h-4 w-px bg-gray-200" /> {/* Divider */}
                  </div>
                  {/* Delete button */}
                  <SkeletonButton className="mr-2 hidden h-9 w-9 rounded-md sm:inline-flex" />
                  {/* Second divider */}
                  <div className="mx-3 hidden h-4 w-px bg-gray-200 sm:inline" /> {/* Divider */}
                  {/* Save button - updated to match screenshot */}
                  <SkeletonButton className="h-9 w-20 rounded-md bg-gray-200" /> {/* Save button */}
                </div>
              </div>
            </header>
          </div>

          {/* Main content */}
          <div className="mt-4 w-full md:mt-0">
            <div className="flex flex-col sm:mx-0 xl:flex-row xl:space-x-6">
              <div className="flex-1 flex-row xl:mr-0 xl:w-[75%]">
                {/* Schedule container */}
                <div className="border-subtle mb-6 rounded-md border">
                  <div className="flex flex-col gap-4 p-2 sm:p-4">
                    {/* Days of the week */}
                    {Array(7)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="flex w-full flex-col gap-4 last:mb-0 sm:flex-row sm:gap-6 sm:px-0">
                          {/* Day toggle and name */}
                          <div className="flex h-[36px] items-center justify-between sm:w-32">
                            <div>
                              <div className="text-default flex flex-row items-center space-x-2 rtl:space-x-reverse">
                                <div className="mr-2 h-6 w-11 rounded-full bg-gray-200" /> {/* Toggle */}
                                <SkeletonText className="h-5 w-16 text-sm" /> {/* Day name */}
                              </div>
                            </div>
                          </div>

                          {/* Time inputs - conditional rendering based on day being active */}
                          {i !== 0 &&
                            i !== 6 && ( // Only show time inputs for Monday-Friday
                              <div className="flex sm:gap-2">
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-1 last:mb-0 sm:gap-2">
                                    <div className="flex flex-row gap-2 sm:gap-3">
                                      <SkeletonText className="h-9 w-[90px] rounded-md sm:w-[100px]" />{" "}
                                      {/* Time input */}
                                      <span className="text-default w-2 self-center"> - </span>
                                      <SkeletonText className="h-9 w-[90px] rounded-md sm:w-[100px]" />{" "}
                                      {/* Time input */}
                                    </div>
                                    <SkeletonText className="h-9 w-9 rounded-md" /> {/* Add button */}
                                  </div>
                                </div>
                                <SkeletonText className="h-9 w-9 rounded-md" /> {/* Copy button */}
                              </div>
                            )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Date overrides section */}
                <div className="p-6">
                  <div className="flex items-center">
                    <SkeletonText className="h-5 w-32 font-medium" /> {/* Date overrides */}
                    <SkeletonText className="ml-2 h-4 w-4 rounded-full" /> {/* Info icon */}
                  </div>
                  <SkeletonText className="mb-4 mt-1 h-4 w-full max-w-md text-sm" /> {/* Description */}
                  <div className="stack-y-2">
                    <SkeletonButton className="h-9 w-36 rounded-md" /> {/* Add an override button */}
                  </div>
                </div>
              </div>

              {/* Sidebar - only visible on desktop */}
              <div className="min-w-40 col-span-3 hidden stack-y-2 md:block lg:col-span-1 xl:w-[25%]">
                <div className="xl:max-w-80 w-full pr-4 sm:ml-0 sm:mr-36 sm:p-0">
                  <div>
                    <SkeletonText className="mb-1 h-4 w-24 text-sm" /> {/* Timezone */}
                    <SkeletonText className="mt-1 h-9 w-72 rounded-md" /> {/* Timezone selector */}
                  </div>

                  <hr className="border-subtle my-6 mr-8" />

                  <div className="rounded-md">
                    <SkeletonText className="h-5 w-64 text-sm" /> {/* Something doesn't look right? */}
                    <div className="mt-3 flex">
                      <SkeletonButton className="h-9 w-40 rounded-md" /> {/* Launch troubleshooter */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SkeletonContainer>
    </Shell>
  );
}
