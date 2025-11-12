"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { RecentFeedbackTableContent } from "./RecentFeedbackTableContent";

export const RecentFeedbackTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.recentRatings.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });


  if (isPending) return <ChartCard title={t("recent_ratings")} isPending={isPending} isError={isError} />;

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("recent_ratings")} isPending={isPending} isError={isError}>
      <RecentFeedbackTableContent data={data} />
    </ChartCard>
  );
};
