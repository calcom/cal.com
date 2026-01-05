"use client";

import { SkeletonText, SkeletonButton, SkeletonAvatar } from "@calid/features/ui/components/skeleton";
import React from "react";

export const WorkflowLoading: React.FC = () => {
  return (
    <div className="bg-default min-h-screen">
      <div className="mx-auto max-w-full">
        <div className="mb-8 w-full">
          <nav
            className="no-scrollbar border-muted scrollbar-hide flex overflow-x-auto border-b pb-0"
            aria-label="Tabs"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <div className="flex min-w-max space-x-1">
              <div className="inline-flex h-fit items-center justify-center whitespace-nowrap p-4 text-sm font-medium leading-none transition md:mb-0">
                <SkeletonAvatar className="me-2 h-6 w-6" />
                <SkeletonText className="h-4 w-24" />
              </div>
            </div>
          </nav>
        </div>

        <div className="mx-auto justify-center text-center">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3">
            {[...Array(6)].map((_, idx) => (
              <div
                key={idx}
                className="border-border bg-card flex flex-col items-center justify-center rounded-lg border p-4">
                <div className="bg-muted mb-4 h-10 w-10 animate-pulse rounded-md" />
                <SkeletonText className="mb-2 h-5 w-32" />
                <SkeletonText className="mb-4 h-4 w-40" />
                <SkeletonButton className="h-9 w-28 rounded-md" />
              </div>
            ))}
          </div>

          <div className="w-full text-center">
            <div className="mx-auto mt-10 flex items-center justify-center px-12 text-center">
              <SkeletonButton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>

        <div className="mt-10 w-full max-w-full space-y-4 pb-6">
          <SkeletonText className="mb-4 h-6 w-40" />

          <div className="space-y-4">
            <div className="bg-card border-default flex items-start justify-between rounded-md border px-3 py-5">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <SkeletonText className="h-5 w-48" />
                  <div className="flex items-center space-x-2">
                    <SkeletonText className="h-6 w-11 rounded-full" />
                    <SkeletonText className="h-8 w-8 rounded-md" />
                  </div>
                </div>
                <SkeletonText className="mb-2 h-4 w-56" />
                <div className="flex items-center justify-start space-x-2">
                  <SkeletonText className="h-6 w-32 rounded-full" />
                  <SkeletonText className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
