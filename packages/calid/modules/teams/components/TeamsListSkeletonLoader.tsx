"use client";

import { SkeletonText } from "@calid/features/ui/components/skeleton";
import React from "react";

export function TeamsListSkeletonLoader() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-4 flex justify-end">
        <SkeletonText className="h-10 w-40" />
      </div>

      <ul className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="border-default bg-default group relative rounded-md border transition">
            <div className="flex items-center justify-between p-4">
              <div className="flex min-w-0 flex-1 items-center space-x-3">
                <SkeletonText className="h-10 w-10 flex-shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <SkeletonText className="mb-2 h-5 w-32" />
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <SkeletonText className="h-5 w-24 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex flex-shrink-0 items-center space-x-2">
                <SkeletonText className="h-6 w-16 rounded-full" />
                <SkeletonText className="h-8 w-8 rounded" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TeamsListSkeletonLoader;
