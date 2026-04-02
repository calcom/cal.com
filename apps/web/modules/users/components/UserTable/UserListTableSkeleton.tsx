"use client";

import { CTA_CONTAINER_CLASS_NAME } from "@calcom/features/data-table/lib/utils";
import { SkeletonButton, SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { DataTableSkeleton } from "~/data-table/components";

export function UserListTableSkeleton() {
  return (
    <SkeletonContainer>
      {/* Toolbar with search, filters, etc. */}
      <div className="grid w-full items-center gap-2 pb-4">
        <div className="flex w-full flex-col gap-2">
          <div className="flex w-full flex-wrap justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search bar */}
              <div className="border-default bg-default flex h-9 w-52 items-center gap-1 rounded-md border px-3 py-2">
                <div className="flex items-center justify-center">
                  <SkeletonText className="h-4 w-4" />
                </div>
                <SkeletonText className="h-4 w-40" />
              </div>

              {/* Filters */}
              <SkeletonButton className="h-9 w-28" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonButton className="h-9 w-20" />
              <SkeletonButton className="h-9 w-24" />
            </div>
          </div>
          <div>
            <SkeletonButton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTableSkeleton columns={7} rows={10} columnWidths={[30, 200, 100, 140, 120, 120, 80]} />

      {/* CTA actions at the bottom */}
      <div className={`mt-4 flex items-center gap-2 ${CTA_CONTAINER_CLASS_NAME}`}>
        <SkeletonButton className="h-9 w-32" />
        <SkeletonButton className="h-9 w-24" />
      </div>
    </SkeletonContainer>
  );
}
