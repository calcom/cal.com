"use client";

import { Badge } from "@calcom/ui/components/badge";

export interface PendingReportsBadgeProps {
  count: number | undefined;
}

export function PendingReportsBadge({ count }: PendingReportsBadgeProps) {
  if (!count) return null;
  return (
    <Badge variant="orange" className="ml-1 min-h-5 min-w-5 rounded-full px-1.5">
      {count}
    </Badge>
  );
}
