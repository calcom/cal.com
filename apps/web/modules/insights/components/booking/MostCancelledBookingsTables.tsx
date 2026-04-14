"use client";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { UserStatsTable } from "../UserStatsTable";

export const MostCancelledBookingsTables = () => {
  const { t } = useLocale();
  const { isReady, ...insightsBookingParams } = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } =
    trpc.viewer.insights.membersWithMostCancelledBookings.useQuery(insightsBookingParams, {
      enabled: isReady,
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    });

  return (
    <ChartCard title={t("most_cancelled_bookings")} isPending={isPending} isError={isError}>
      {isSuccess && data ? <UserStatsTable data={data} /> : null}
    </ChartCard>
  );
};
