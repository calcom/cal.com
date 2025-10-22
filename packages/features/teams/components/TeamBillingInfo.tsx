"use client";

import { AdminBillingInfo } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const TeamBillingInfo = ({ teamId }: { teamId: number }) => {
  const { data: billingData, isLoading } = trpc.viewer.adminTeams.getBilling.useQuery({
    id: teamId,
  });

  return <AdminBillingInfo billingData={billingData} isLoading={isLoading} entityType="team" />;
};
