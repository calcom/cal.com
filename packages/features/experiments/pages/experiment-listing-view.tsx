"use client";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Suspense } from "react";

import { ExperimentAdminList } from "../components/ExperimentAdminList";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div class="divide-subtle mb-8 mt-6 stack-y-6">
        <SkeletonText class="h-8 w-full" />
        <SkeletonText class="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export const ExperimentListingView = () => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        <ExperimentAdminList />
      </Suspense>
    </NoSSR>
  );
};
