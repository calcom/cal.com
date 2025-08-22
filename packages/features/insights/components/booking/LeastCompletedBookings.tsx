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

export const LeastCompletedTeamMembersTable = () => {
  const { t } = useLocale();
  let insightsBookingParams = useInsightsBookingParameters();

  const currentTime = useChangeTimeZoneWithPreservedLocalTime(
    useMemo(() => {
      return dayjs().toISOString();
    }, [])
  );

  // booking with endDate < now is "accepted" booking
  insightsBookingParams = {
    ...insightsBookingParams,
    endDate: currentTime,
  };

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithLeastCompletedBookings.useQuery(
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
    <ChartCard title={t("least_bookings_completed")}>
      <UserStatsTable data={data} />
    </ChartCard>
  );
};
