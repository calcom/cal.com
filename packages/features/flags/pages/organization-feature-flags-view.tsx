"use client";

import { Suspense } from "react";

import NoSSR from "@calcom/lib/components/NoSSR";
import { SkeletonText, SkeletonContainer } from "@calcom/ui/components/skeleton";

import { OrganizationFeatureFlagsList } from "../components/OrganizationFeatureFlagsList";

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

type OrganizationFeatureFlagsViewProps = {
  organizationId: number;
};

export const OrganizationFeatureFlagsView = ({ organizationId }: OrganizationFeatureFlagsViewProps) => {
  return (
    <NoSSR>
      <Suspense fallback={<SkeletonLoader />}>
        <OrganizationFeatureFlagsList organizationId={organizationId} />
      </Suspense>
    </NoSSR>
  );
};
