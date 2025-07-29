"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { valueFormatter } from "../../lib/valueFormatter";
import { ChartCard } from "../ChartCard";
import { LineChart } from "../LineChart";
import { LoadingInsight } from "../LoadingInsights";

export const EventTrendsChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const {
    data: eventTrends,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.eventTrends.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  if (isPending) return <LoadingInsight />;

  if (!isSuccess) return null;

  return (
    <ChartCard title={t("event_trends")}>
      <LineChart
        className="linechart ml-4 mt-4 h-80 sm:ml-0"
        data={eventTrends ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)", "No-Show (Guest)"]}
        index="Month"
        colors={["purple", "green", "blue", "red", "slate", "orange"]}
        valueFormatter={valueFormatter}
      />
    </ChartCard>
  );
};
