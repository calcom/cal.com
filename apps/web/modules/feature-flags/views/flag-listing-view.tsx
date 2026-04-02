"use client";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Suspense } from "react";
import { FlagAdminList } from "../components/FlagAdminList";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 stack-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export const FlagListingView = () => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        <FlagAdminList />
      </Suspense>
    </NoSSR>
  );
};
