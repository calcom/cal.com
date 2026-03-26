"use client";

import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

const skeletonItems = Array(3).fill(undefined);

export const OAuthClientsSkeleton = () => {
  return (
    <SkeletonContainer>
      <div className="mb-8">
        <SkeletonText className="h-7 w-64" />
        <div className="mt-2 flex items-start justify-between gap-4">
          <SkeletonText className="h-4 w-full max-w-xl" />
          <div className="bg-emphasis h-9 w-20 rounded-md" />
        </div>
      </div>
      <div className="border-subtle rounded-lg border">
        {skeletonItems.map((i, index) => (
          <div
            key={`oauth-client-skeleton-${index}`}
            className={`flex items-center justify-between p-4 ${
              index !== skeletonItems.length - 1 ? "border-subtle border-b" : ""
            }`}>
            <div className="flex items-center gap-4">
              <div className="bg-emphasis h-10 w-10 rounded-full" />
              <SkeletonText className="h-4 w-40" />
            </div>
            <div className="flex items-center gap-4">
              <SkeletonText className="h-5 w-20 rounded-full" />
              <div className="bg-emphasis h-5 w-5 rounded" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonContainer>
  );
};
