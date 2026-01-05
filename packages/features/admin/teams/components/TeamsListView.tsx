"use client";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Suspense } from "react";

import { TeamsList } from "./TeamsList";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export const TeamsListView = () => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        <TeamsList />
      </Suspense>
    </NoSSR>
  );
};
