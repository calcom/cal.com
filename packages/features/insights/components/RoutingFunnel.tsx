"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import { useInsightsParameters } from "@calcom/features/insights/hooks/useInsightsParameters";
import { trpc } from "@calcom/trpc";

export function RoutingFunnel() {
  const { scope, selectedTeamId, startDate, endDate } = useInsightsParameters();
  const { data, isSuccess, isPending } = trpc.viewer.insights.getRoutingFunnelData.useQuery(
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

  console.log("💡 data", data);

  if (!isSuccess || !data) {
    return null;
  }

  return (
    <div className="w-full text-sm">
      <div className="flex h-12 items-center">
        <h2 className="text-emphasis text-md font-semibold">Routing Funnel Over Time</h2>
      </div>
      <div className="border-subtle w-full rounded-md border py-4">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="Form Submissions" stackId="1" stroke="#8884d8" fill="#8884d8" />
            <Area type="monotone" dataKey="Successful Routing" stackId="1" stroke="#83a6ed" fill="#83a6ed" />
            <Area type="monotone" dataKey="Accepted Bookings" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
