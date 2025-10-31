"use client";

import { AdminPaymentHistory } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const OrgPaymentHistory = ({ orgId }: { orgId: number }) => {
  const { data: billingData, isLoading } = trpc.viewer.adminTeams.getBilling.useQuery({
    id: orgId,
  });

  return <AdminPaymentHistory billingData={billingData} isLoading={isLoading} entityType="organization" />;
};
