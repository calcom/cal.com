"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";
import { RecentFeedbackTableContent } from "./RecentFeedbackTableContent";

export const RecentFeedbackTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.recentRatings.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("recent_ratings")}>
      <RecentFeedbackTableContent data={data} />
    </ChartCard>
  );
};
