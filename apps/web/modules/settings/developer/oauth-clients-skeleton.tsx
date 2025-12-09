"use client";

import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

const skeletonItems = Array(3).fill(undefined);

export const OAuthClientsSkeleton = () => {
  return (
    <SkeletonContainer>
      <div className="mb-4 flex justify-end">
        <div className="bg-emphasis h-9 w-36 rounded-md" />
      </div>
      <div className="border-subtle rounded-lg border">
        {skeletonItems.map((i, index) => (
          <div
            key={i}
            className={`flex items-center justify-between p-4 ${
              index !== skeletonItems.length - 1 ? "border-subtle border-b" : ""
            }`}>
            <div className="mb-0.5 flex items-center gap-4">
              <div className="bg-emphasis h-8 w-8 rounded-full" />
              <div className="mt-0.5 flex flex-col">
                <SkeletonText className="h-4 w-32" />
                <SkeletonText className="mt-2 h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SkeletonText className="h-5 w-16 rounded-full" />
              <div className="bg-emphasis h-5 w-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
};
