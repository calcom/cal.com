"use client";

import { Skeleton } from "@calid/features/ui/components/skeleton";
import React from "react";

export default function SkeletonLoader() {
  return (
    <div className="flex w-full flex-col space-y-4">
      {/* Main form section */}
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="border-subtle space-y-6 rounded-md border p-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
