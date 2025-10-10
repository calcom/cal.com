"use client";

import { AdminBillingInfo } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const OrgBillingInfo = ({ orgId }: { orgId: number }) => {
  // Organizations are just teams with isOrganization: true
  // Use the unified teams.adminGetBilling endpoint
  const { data: billingData, isLoading } = trpc.viewer.teams.adminGetBilling.useQuery({
    id: orgId,
  });

  return <AdminBillingInfo billingData={billingData} isLoading={isLoading} entityType="organization" />;
};
