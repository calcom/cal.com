"use client";

import Shell from "@calcom/features/shell/Shell";
import { SkeletonContainer, SkeletonText, SkeletonAvatar } from "@calcom/ui/components/skeleton";

export const EventTypeEditPageSkeleton = () => {
  return (
    <Shell
      heading={<SkeletonText className="h-8 w-48" />}
      subtitle={<SkeletonText className="h-4 w-24" />}
      backPath="/event-types">
      <div className="flex flex-col xl:flex-row xl:space-x-6">
        <div className="hidden xl:block">
          <div className="primary-navigation w-64 flex-shrink-0">
            <div className="flex flex-col space-y-1">
              {/* Tab navigation items */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="group flex w-64 flex-row items-center rounded-md px-3 py-[10px] text-sm font-medium leading-none">
                  <SkeletonAvatar className="mr-3 h-4 w-4" />
                  <div className="flex w-full flex-col">
                    <SkeletonText className="h-4 w-24" />
                    <SkeletonText className="mt-1 h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full ltr:mr-2 rtl:ml-2">
          <div className="bg-default border-subtle mt-4 rounded-md sm:mx-0 md:border md:p-6 xl:mt-0">
            <SkeletonContainer>
              <div className="mb-8">
                <SkeletonText className="h-8 w-full max-w-md" />
              </div>

              <div className="mb-6 space-y-6">
                {/* Form fields */}
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex flex-col space-y-2">
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="h-10 w-full" />
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <SkeletonText className="h-10 w-20" />
                <SkeletonText className="h-10 w-20" />
              </div>
            </SkeletonContainer>
          </div>
        </div>
      </div>
    </Shell>
  );
};
