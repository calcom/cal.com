import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

export default function PendingReportsBadge() {
  const { data: pendingReportsCount } = trpc.viewer.organizations.pendingReportsCount.useQuery();
  if (!pendingReportsCount) return null;
  return (
    <Badge rounded variant="orange" className="ml-1">
      {pendingReportsCount}
    </Badge>
  );
}
