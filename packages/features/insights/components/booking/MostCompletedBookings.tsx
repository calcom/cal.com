"use client";

import { useMemo } from "react";

import dayjs from "@calcom/dayjs";
import { useChangeTimeZoneWithPreservedLocalTime } from "@calcom/features/data-table/hooks/useChangeTimeZoneWithPreservedLocalTime";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";
import { UserStatsTable } from "../UserStatsTable";

export const MostCompletedTeamMembersTable = () => {
  const { t } = useLocale();
  let insightsBookingParams = useInsightsBookingParameters();

  const currentEndDate = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs().endOf("day").toISOString();
    }, [])
  );

  // booking with endDate < now is "accepted" booking
  insightsBookingParams = {
    ...insightsBookingParams,
    endDate: currentEndDate,
  };

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithMostCompletedBookings.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("most_bookings_completed")}>
      <UserStatsTable data={data} />
    </ChartCard>
  );
};
