"use client";

import { AdminBillingInfo } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const OrgBillingInfo = ({ orgId }: { orgId: number }) => {
  const { data: billingData, isLoading } = trpc.viewer.organizations.adminGetBilling.useQuery({
    id: orgId,
  });

  return <AdminBillingInfo billingData={billingData} isLoading={isLoading} entityType="organization" />;
};
