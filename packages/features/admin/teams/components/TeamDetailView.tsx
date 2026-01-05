"use client";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { Suspense } from "react";

import { TeamDetail } from "./TeamDetail";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle mb-8 mt-6 space-y-6">
        <SkeletonText className="h-32 w-full" />
        <SkeletonText className="h-48 w-full" />
        <SkeletonText className="h-48 w-full" />
      </div>
    </SkeletonContainer>
  );
};

export const TeamDetailView = ({ teamId }: { teamId: number }) => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        <TeamDetail teamId={teamId} />
      </Suspense>
    </NoSSR>
  );
};
