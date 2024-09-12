"use client";

import { Suspense } from "react";

import { SkeletonText, SkeletonContainer } from "@calcom/ui";

import type { FlagAdminListProps } from "../components/FlagAdminList";
import { FlagAdminList } from "../components/FlagAdminList";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export const FlagListingView = (props: FlagAdminListProps) => {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <FlagAdminList {...props} />;
    </Suspense>
  );
};
