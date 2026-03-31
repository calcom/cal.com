"use client";

import { Skeleton } from "@coss/ui/components/skeleton";
import { Suspense } from "react";
import { ExperimentsAdminList } from "./ExperimentsAdminList";

function SkeletonLoader() {
  return (
    <div className="mb-8 mt-6 space-y-6">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export const ExperimentsListingView = () => {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <ExperimentsAdminList />
    </Suspense>
  );
};
