"use client";

import {
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  SkeletonAvatar,
} from "@calcom/ui/components/skeleton";

import Shell from "~/shell/Shell";

export const EventTypeEditPageSkeleton = () => {
  const backButtonSkeleton = (
    <div className="bg-default sticky top-0 z-10 mb-0 flex items-center py-2 md:mb-9 md:mt-0">
      <div className="rounded-md ltr:mr-2 rtl:ml-2">
        <SkeletonButton className="h-8 w-8 rounded-md" />
      </div>
      <div className="w-full truncate ltr:mr-4 rtl:ml-4 md:block">
        <SkeletonText className="h-8 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <SkeletonButton className="h-9 w-9 rounded-md" />
        <SkeletonButton className="h-9 w-9 rounded-md" />
        <div className="flex space-x-2 rtl:space-x-reverse">
          <SkeletonButton className="h-9 w-24 rounded-md" />
          <SkeletonButton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );

  return (
    <Shell subtitle={<SkeletonText className="hidden h-4 w-24" />} afterHeading={backButtonSkeleton}>
      <div className="flex flex-col xl:flex-row xl:space-x-6">
        <div className="hidden xl:block">
          <div className="primary-navigation w-64 shrink-0">
            <div className="stack-y-1 flex flex-col">
              {/* Tab navigation items */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="group flex w-64 flex-row items-center rounded-md px-3 py-[10px] text-sm font-medium leading-none">
                  <div className="mr-3 h-4 w-4">
                    <SkeletonAvatar className="h-4 w-4" />
                  </div>
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

              <div className="stack-y-6 mb-6">
                {/* Form fields */}
                <div className="stack-y-2 flex flex-col">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-10 w-full" />
                </div>

                <div className="stack-y-2 flex flex-col">
                  <SkeletonText className="h-4 w-40" />
                  <div className="flex items-center">
                    <SkeletonText className="h-10 w-full" />
                    <SkeletonButton className="ml-2 h-10 w-10 rounded-md" />
                  </div>
                </div>

                <div className="stack-y-2 flex flex-col">
                  <SkeletonText className="h-4 w-36" />
                  <SkeletonText className="h-24 w-full" />
                </div>

                <div className="stack-y-2 flex flex-col">
                  <SkeletonText className="h-4 w-28" />
                  <div className="flex items-center">
                    <SkeletonText className="h-10 w-full" />
                    <SkeletonButton className="ml-2 h-10 w-10 rounded-md" />
                  </div>
                </div>

                <div className="stack-y-2 flex flex-col">
                  <SkeletonText className="h-4 w-32" />
                  <SkeletonText className="h-10 w-full" />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <SkeletonButton className="h-10 w-24 rounded-md" />
                <SkeletonButton className="h-10 w-24 rounded-md" />
              </div>
            </SkeletonContainer>
          </div>
        </div>
      </div>
    </Shell>
  );
};
