"use client";

import { Badge } from "@calcom/ui/components/badge";

export interface PendingReportsBadgeProps {
  count: number | undefined;
}

export function PendingReportsBadge({ count }: PendingReportsBadgeProps) {
  if (!count) return null;
  return (
    <Badge rounded variant="orange" className="ml-1">
      {count}
    </Badge>
  );
}
