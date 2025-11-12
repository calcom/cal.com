"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { UserStatsTable } from "../UserStatsTable";

export const MostBookedTeamMembersTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.membersWithMostBookings.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );


  if (isPending) return <ChartCard title={t("most_bookings_scheduled")} isPending={isPending} isError={isError} />;

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("most_bookings_scheduled")} isPending={isPending} isError={isError}>
      <UserStatsTable data={data} />
    </ChartCard>
  );
};
