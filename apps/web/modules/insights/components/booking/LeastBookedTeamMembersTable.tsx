"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { UserStatsTable } from "../UserStatsTable";

export const LeastBookedTeamMembersTable = () => {
  const { t } = useLocale();
  const { isReady, ...insightsBookingParams } = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.membersWithLeastBookings.useQuery(
    insightsBookingParams,
    {
      enabled: isReady,
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  return (
    <ChartCard title={t("least_bookings_scheduled")} isPending={isPending} isError={isError}>
      {isSuccess && data ? <UserStatsTable data={data} /> : null}
    </ChartCard>
  );
};
