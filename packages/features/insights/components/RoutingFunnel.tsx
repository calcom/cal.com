"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

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
  if (active && payload && payload.length) {
    const totalSubmissions = payload.find((p) => p.dataKey === "totalSubmissions")?.value || 0;

    return (
      <div className="bg-inverted text-inverted border-subtle rounded-lg border p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry, index: number) => {
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
  }

  return null;
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
    <div className="w-full text-sm">
      <div className="flex h-12 items-center">
        <h2 className="text-emphasis text-md font-semibold">{t("routing_funnel")}</h2>
      </div>
      <div className="border-subtle w-full rounded-md border py-4">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
      </div>
    </div>
  );
}

export function RoutingFunnel() {
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const { data, isSuccess } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
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

  return <RoutingFunnelContent data={data} />;
}
