"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { useInsightsRoutingParameters } from "@calcom/web/modules/insights/hooks/useInsightsRoutingParameters";
import { useToggleableLegend } from "@calcom/web/modules/insights/hooks/useToggleableLegend";
import { useMemo } from "react";
import { ChartCard } from "../ChartCard";
import type { LegendKey } from "./RoutingFunnelContent";
import { legend, RoutingFunnelContent } from "./RoutingFunnelContent";
import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

export function RoutingFunnel() {
  const { t } = useLocale();
  const insightsRoutingParams = useInsightsRoutingParameters();
  const chartLegend = useMemo(
    () => legend.map((item) => ({ label: item.key, displayLabel: t(item.i18nKey), color: item.color })),
    [t]
  );
  const { enabledLegend, toggleSeries } = useToggleableLegend(chartLegend);
  const enabledKeys = enabledLegend.map((item) => item.label as LegendKey);
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
        legend={chartLegend}
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
      legend={chartLegend}
      enabledLegend={enabledLegend}
      onSeriesToggle={toggleSeries}
      isPending={isLoading}
      isError={isError}>
      <RoutingFunnelContent data={data} enabledKeys={enabledKeys} />
    </ChartCard>
  );
}
