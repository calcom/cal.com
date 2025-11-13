import React from "react";

import classNames from "@calcom/ui/classNames";
import { SkeletonAvatar, SkeletonText } from "@calcom/ui/components/skeleton";

function SkeletonLoader() {
  return (
    <div className="animate-pulse">
      {/* Table rows with separator at the beginning */}
      <div className="divide-subtle divide-y">
        {/* Month separator skeleton */}
        <div className="bg-muted rounded-t py-2">
          <SkeletonItem isHeader={true} />
        </div>
        <div className="bg-muted">
          <SkeletonText className="ml-2 mt-3 h-4 w-28 rounded" />
        </div>

        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    </div>
  );
}

export default SkeletonLoader;

function SkeletonItem({ isHeader = false }: { isHeader?: boolean }) {
  return (
    <div
      className={classNames(
        "grid grid-cols-[132px_130px_185px_150px_140px_280px] gap-6 px-2",
        isHeader ? "py-2" : "py-2.5"
      )}>
      {/* Date column - 140px */}
      <div className="flex items-center">
        <SkeletonText className={classNames("h-4 rounded", isHeader ? "w-12" : "w-20")} />
      </div>

      {/* Time column - 140px */}
      <div className="flex items-center">
        <SkeletonText className={classNames("h-4 rounded", isHeader ? "w-12" : "w-28")} />
      </div>

      {/* Event column - 200px */}
      <div className="flex items-center">
        <SkeletonText className={classNames("h-4 rounded", isHeader ? "w-16" : "w-full")} />
      </div>

      {/* Who column - 160px, Avatar group */}
      <div className="flex items-center -space-x-1">
        {isHeader && <SkeletonText className="h-4 w-20 rounded" />}
        {!isHeader && (
          <>
            <SkeletonAvatar className="h-6 w-6 rounded-full" />
            <SkeletonAvatar className="h-6 w-6 rounded-full" />
            <SkeletonAvatar className="h-6 w-6 rounded-full" />
          </>
        )}
      </div>

      {/* Team column - 140px */}
      <div className="flex items-center">
        <SkeletonText className="h-4 w-20 rounded-md" />
      </div>

      {/* Actions column - 280px */}
      <div className="mr-2 flex items-center justify-end gap-2">
        {isHeader && <SkeletonText className="h-4 w-16 rounded-md" />}
        {!isHeader && (
          <>
            <SkeletonText className="h-4 w-16 rounded-md" />
            <SkeletonText className="h-4 w-20 rounded-md" />
            <SkeletonText className="h-4 w-8 rounded-md" />
          </>
        )}
      </div>
    </div>
  );
}
