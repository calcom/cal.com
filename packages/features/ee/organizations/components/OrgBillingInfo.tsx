"use client";

import { AdminBillingInfo } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const OrgBillingInfo = ({ orgId }: { orgId: number }) => {
  // Organizations are just teams with isOrganization: true
  const { data: billingData, isLoading } = trpc.viewer.adminTeams.getBilling.useQuery({
    id: orgId,
  });

  return <AdminBillingInfo billingData={billingData} isLoading={isLoading} entityType="organization" />;
};
