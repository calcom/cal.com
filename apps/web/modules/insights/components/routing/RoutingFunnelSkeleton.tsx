"use client";

import { SkeletonText } from "@calcom/ui/components/skeleton";

const BAR_HEIGHTS = [
  { top: 65, mid: 35, bot: 20 },
  { top: 45, mid: 25, bot: 15 },
  { top: 55, mid: 40, bot: 25 },
  { top: 70, mid: 30, bot: 10 },
  { top: 40, mid: 45, bot: 20 },
  { top: 60, mid: 20, bot: 30 },
  { top: 50, mid: 35, bot: 15 },
];

export function RoutingFunnelSkeleton() {
  return (
    <div className="relative h-[300px] w-full">
      {/* Chart container */}
      <div className="h-full w-full p-4">
        {/* Chart area */}
        <div className="relative h-[220px]">
          {/* Y-axis */}
          <div className="text-muted-foreground absolute bottom-0 left-0 top-0 flex w-8 flex-col justify-between text-xs">
            <SkeletonText className="h-3 w-6" />
            <SkeletonText className="h-3 w-6" />
            <SkeletonText className="h-3 w-6" />
            <SkeletonText className="h-3 w-6" />
            <SkeletonText className="h-3 w-6" />
          </div>

          {/* Chart content */}
          <div className="ml-8 h-full">
            {/* Grid lines */}
            <div className="flex h-full flex-col justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-muted border-b" />
              ))}
            </div>

            {/* Stacked area chart skeleton */}
            <div className="absolute inset-0 bottom-0 top-0 ml-0 flex items-end justify-between px-4">
              {BAR_HEIGHTS.map((h, i) => (
                <div key={i} className="flex w-8 flex-col items-center">
                  <div
                    className="w-full rounded-t bg-[#8884d8] opacity-20"
                    style={{ height: `${h.top}%` }}
                  />
                  <div
                    className="w-full bg-[#83a6ed] opacity-20"
                    style={{ height: `${h.mid}%` }}
                  />
                  <div
                    className="w-full rounded-b bg-[#82ca9d] opacity-20"
                    style={{ height: `${h.bot}%` }}
                  />

                  {/* X-axis label */}
                  <SkeletonText className="mt-2 h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend area */}
        <div className="mt-4 flex justify-center">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-[#8884d8]" />
              <SkeletonText className="h-3 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-[#83a6ed]" />
              <SkeletonText className="h-3 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-[#82ca9d]" />
              <SkeletonText className="w-26 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
