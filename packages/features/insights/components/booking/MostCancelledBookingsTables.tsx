"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { UserStatsTable } from "../UserStatsTable";

export const MostCancelledBookingsTables = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.membersWithMostCancelledBookings.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  return (
    <ChartCard title={t("most_cancelled_bookings")} isPending={isPending} isError={isError}>
      {isSuccess && data ? <UserStatsTable data={data} /> : null}
    </ChartCard>
  );
};
