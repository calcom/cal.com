"use client";

import { AdminPaymentHistory } from "@calcom/features/billing/components";
import { trpc } from "@calcom/trpc/react";

export const TeamPaymentHistory = ({ teamId }: { teamId: number }) => {
  const { data: billingData, isLoading } = trpc.viewer.teams.adminGetBilling.useQuery({
    id: teamId,
  });

  return <AdminPaymentHistory billingData={billingData} isLoading={isLoading} entityType="team" />;
};
