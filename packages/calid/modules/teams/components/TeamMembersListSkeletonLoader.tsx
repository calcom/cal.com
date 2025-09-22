"use client";

import { SkeletonText } from "@calid/features/ui/components/skeleton";
import React from "react";

interface TeamMembersListSkeletonLoaderProps {
  enableBulkActions?: boolean;
}

export function TeamMembersListSkeletonLoader({
  enableBulkActions = true,
}: TeamMembersListSkeletonLoaderProps) {
  return (
    <div className="space-y-4">
      {/* Header with search and actions skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full justify-between gap-4">
          <SkeletonText className="h-10 w-64" />
          <SkeletonText className="h-10 w-64" />
        </div>
      </div>

      {/* Members count skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonText className="h-5 w-24" />
      </div>

      {/* Table container skeleton */}
      <div className="border-subtle bg-primary overflow-auto rounded-lg border" style={{ height: "600px" }}>
        {/* Table header skeleton */}
        <div className="border-subtle sticky top-0 z-10 border-b bg-gray-50">
          <div className="flex">
            {enableBulkActions && (
              <div className="flex items-center px-4 py-3" style={{ width: 50 }}>
                <SkeletonText className="h-4 w-4" />
              </div>
            )}
            <div className="flex items-center px-4 py-3" style={{ width: 500 }}>
              <SkeletonText className="h-5 w-24" />
            </div>
            <div className="flex items-center px-4 py-3" style={{ width: 300 }}>
              <SkeletonText className="h-5 w-16" />
            </div>
            <div className="flex items-center px-4 py-3" style={{ width: 300 }}>
              <SkeletonText className="h-5 w-20" />
            </div>
            <div className="flex items-center px-4 py-3" style={{ width: 300 }}>
              <SkeletonText className="h-8 w-16" />
            </div>
          </div>
        </div>

        {/* Table body skeleton rows */}
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center py-2">
              {enableBulkActions && (
                <div className="flex items-center px-4" style={{ width: 50 }}>
                  <SkeletonText className="h-4 w-4" />
                </div>
              )}
              <div className="flex items-center px-4" style={{ width: 500 }}>
                <div className="flex items-center gap-3">
                  <SkeletonText className="h-10 w-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonText className="h-4 w-32" />
                    <SkeletonText className="h-3 w-40" />
                  </div>
                </div>
              </div>
              <div className="flex items-center px-4" style={{ width: 300 }}>
                <SkeletonText className="h-6 w-16 rounded-full" />
              </div>
              <div className="flex items-center px-4" style={{ width: 300 }}>
                <SkeletonText className="h-4 w-20" />
              </div>
              <div className="flex items-center px-4" style={{ width: 300 }}>
                <div className="flex w-full justify-end">
                  <SkeletonText className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeamMembersListSkeletonLoader;
