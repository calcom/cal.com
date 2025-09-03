"use client";

import { useInsightsRoutingParameters } from "@calcom/features/insights/hooks/useInsightsRoutingParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useToggleableLegend } from "../../hooks/useToggleableLegend";
import { ChartCard } from "../ChartCard";
import { RoutingFunnelContent, legend } from "./RoutingFunnelContent";
import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

export function RoutingFunnel() {
  const { t } = useLocale();
  const insightsRoutingParams = useInsightsRoutingParameters();
  const { enabledLegend, toggleSeries } = useToggleableLegend(legend);
  const { data, isSuccess, isLoading } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
    insightsRoutingParams,
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isLoading || !isSuccess || !data) {
    return (
      <ChartCard
        title={t("routing_funnel")}
        legend={legend}
        enabledLegend={enabledLegend}
        onSeriesToggle={toggleSeries}>
        <RoutingFunnelSkeleton />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("routing_funnel")}
      legend={legend}
      enabledLegend={enabledLegend}
      onSeriesToggle={toggleSeries}>
      <RoutingFunnelContent data={data} enabledLegend={enabledLegend} />
    </ChartCard>
  );
}
