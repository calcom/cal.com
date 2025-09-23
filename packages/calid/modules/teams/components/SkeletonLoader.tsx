"use client";

import { SkeletonText, SkeletonButton, SkeletonContainer } from "@calid/features/ui/components/skeleton";
import React from "react";

export default function SkeletonLoader() {
  return (
    <SkeletonContainer className="flex w-full flex-col space-y-6">
      {/* Settings Switch Section 1 */}
      <div className="border-default space-y-6 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-48" />
            <SkeletonText className="h-4 w-64" />
          </div>
          <SkeletonText className="h-6 w-12 rounded-full" />
        </div>
      </div>

      {/* Settings Switch Section 2 */}
      <div className="border-default space-y-6 rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-40" />
            <SkeletonText className="h-4 w-56" />
          </div>
          <SkeletonText className="h-6 w-12 rounded-full" />
        </div>
      </div>

      {/* Form Section with Input Fields */}
      <div className="border-default bg-primary overflow-auto rounded-lg border space-y-6 rounded-md border p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <SkeletonText className="h-4 w-24" />
            <SkeletonText className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-4 w-20" />
            <SkeletonText className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <SkeletonText className="h-4 w-16" />
            <SkeletonText className="h-24 w-full" />
          </div>
        </div>
        <div className="flex justify-end">
          <SkeletonButton className="h-10 w-20" />
        </div>
      </div>

      {/* Danger Zone Section */}
      <div className="border-subtle rounded-md border p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <SkeletonText className="h-5 w-32" />
            <SkeletonText className="h-4 w-48" />
          </div>
          <SkeletonButton className="h-10 w-32" />
        </div>
      </div>
    </SkeletonContainer>
  );
}
