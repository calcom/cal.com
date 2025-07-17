"use client";

import { useColumnFilters } from "@calcom/features/data-table";
import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { ChartCard } from "./ChartCard";
import { RoutingFunnelContent, legend } from "./RoutingFunnelContent";
import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

export function RoutingFunnel() {
  const { t } = useLocale();
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const columnFilters = useColumnFilters({
    exclude: ["createdAt"],
  });
  const { data, isSuccess, isLoading } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
      columnFilters,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isLoading || !isSuccess || !data) {
    return (
      <ChartCard title={t("routing_funnel")} legend={legend}>
        <RoutingFunnelSkeleton />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t("routing_funnel")} legend={legend}>
      <RoutingFunnelContent data={data} />
    </ChartCard>
  );
}
