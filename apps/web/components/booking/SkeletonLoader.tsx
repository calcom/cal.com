import { SkeletonText } from "@calid/features/ui/components/skeleton";
import React from "react";

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default SkeletonLoader;

function SkeletonCard() {
  return (
    <div className="border-muted my-1.5 flex w-full animate-pulse flex-col items-start justify-between rounded-lg border bg-white shadow-sm dark:bg-slate-800">
      <div className="group w-full">
        <div className="cursor-pointer">
          <div className="flex flex-col pb-4">
            <div className="flex flex-col lg:flex-row">
              <div className="w-full px-4">
                <div className="flex cursor-pointer flex-col items-start justify-start pt-6">
                  <div className="flex w-full items-center gap-2 align-top text-base font-semibold leading-6">
                    <SkeletonText className="h-6 w-32" />
                    <SkeletonText className="h-4 w-8" />
                    <SkeletonText className="h-4 w-24" />
                    <SkeletonText className="h-4 w-16" />
                  </div>

                  <div className="flex cursor-pointer flex-row py-2 text-xs font-medium">
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="mx-2 h-4 w-2" />
                    <SkeletonText className="h-4 w-24" />
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <SkeletonText className="h-4 w-4 rounded" />
                      <SkeletonText className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex w-full flex-col lg:w-auto">
                <div className="flex w-full flex-row flex-wrap items-end justify-end space-x-2 space-y-2 py-4 pl-4 text-right text-sm font-medium lg:flex-row lg:flex-nowrap lg:items-start lg:space-y-0 lg:pl-0 ltr:pr-4 rtl:pl-4">
                  <div className="hidden items-center gap-2 md:flex">
                    <SkeletonText className="h-4 w-4 rounded" />
                    <SkeletonText className="h-5 w-32" />
                  </div>
                </div>

                <div className="flex-1" />

                <div className="flex flex-row justify-end pr-4">
                  <div className="flex items-center gap-2">
                    <SkeletonText className="h-4 w-12" />
                    <SkeletonText className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
