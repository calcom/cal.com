"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { useColumnFilters } from "@calcom/features/data-table";
import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { ChartCard } from "./ChartCard";
import { RoutingFunnelSkeleton } from "./RoutingFunnelSkeleton";

// Dynamically load the RoutingFunnelContent component
const RoutingFunnelContent = dynamic(
  () => import("./RoutingFunnelContent").then((mod) => ({ default: mod.RoutingFunnelContent })),
  {
    loading: () => <RoutingFunnelSkeleton />,
    ssr: false,
  }
);

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

  if (!isSuccess || !data) {
    return (
      <ChartCard title={t("routing_funnel")}>
        <RoutingFunnelSkeleton />
      </ChartCard>
    );
  }

  return (
    <ChartCard title={t("routing_funnel")}>
      <Suspense fallback={<RoutingFunnelSkeleton />}>
        <RoutingFunnelContent data={data} />
      </Suspense>
    </ChartCard>
  );
}
