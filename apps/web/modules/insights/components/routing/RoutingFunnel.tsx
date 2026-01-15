"use client";

import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

import { useToggleableLegend } from "@calcom/web/modules/insights/hooks/useToggleableLegend";
import { ChartCard } from "../ChartCard";
import { RoutingFunnelContent, legend } from "./RoutingFunnelContent";
import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

export function RoutingFunnel() {
  const { t } = useLocale();
  const insightsRoutingParams = useInsightsRoutingParameters();
  const { enabledLegend, toggleSeries } = useToggleableLegend(legend);
  const { data, isSuccess, isLoading, isError } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
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
        onSeriesToggle={toggleSeries}
        isPending={isLoading}
        isError={isError}>
        <RoutingFunnelSkeleton />
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title={t("routing_funnel")}
      legend={legend}
      enabledLegend={enabledLegend}
      onSeriesToggle={toggleSeries}
      isPending={isLoading}
      isError={isError}>
      <RoutingFunnelContent data={data} enabledLegend={enabledLegend} />
    </ChartCard>
  );
}
