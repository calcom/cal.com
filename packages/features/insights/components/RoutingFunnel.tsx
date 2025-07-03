"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { useColumnFilters } from "@calcom/features/data-table";
import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { ChartCard } from "./ChartCard";

// Custom Tooltip component
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  const totalSubmissions = payload.find((p) => p.dataKey === "totalSubmissions")?.value || 0;

  return (
    <div className="bg-inverted text-inverted border-subtle rounded-lg border p-3 shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.toReversed().map((entry, index: number) => {
        const value = entry.value;
        let displayValue = value.toString();

        if (entry.dataKey === "successfulRoutings" || entry.dataKey === "acceptedBookings") {
          const percentage = totalSubmissions > 0 ? ((value / totalSubmissions) * 100).toFixed(1) : "0";
          displayValue = `${value} (${percentage}%)`;
        }

        return (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {displayValue}
          </p>
        );
      })}
    </div>
  );
};

interface RoutingFunnelData {
  name: string;
  totalSubmissions: number;
  successfulRoutings: number;
  acceptedBookings: number;
}

interface RoutingFunnelContentProps {
  data: RoutingFunnelData[];
}

export function RoutingFunnelContent({ data }: RoutingFunnelContentProps) {
  const { t } = useLocale();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Area
          type="monotone"
          name={t("routing_funnel_total_submissions")}
          dataKey="totalSubmissions"
          stackId="1"
          stroke="#8884d8"
          fill="#8884d8"
        />
        <Area
          type="monotone"
          name={t("routing_funnel_successful_routings")}
          dataKey="successfulRoutings"
          stackId="1"
          stroke="#83a6ed"
          fill="#83a6ed"
        />
        <Area
          type="monotone"
          name={t("routing_funnel_accepted_bookings")}
          dataKey="acceptedBookings"
          stackId="1"
          stroke="#82ca9d"
          fill="#82ca9d"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RoutingFunnel() {
  const { t } = useLocale();
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const columnFilters = useColumnFilters({
    exclude: ["createdAt"],
  });
  const { data, isSuccess } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
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
    return null;
  }

  return (
    <ChartCard title={t("routing_funnel")}>
      <RoutingFunnelContent data={data} />
    </ChartCard>
  );
}
