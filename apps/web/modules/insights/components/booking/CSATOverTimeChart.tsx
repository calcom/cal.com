"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "../ChartCard";

const COLOR = {
  CSAT: "#22c55e",
};

type CSATOverTimeData = RouterOutputs["viewer"]["insights"]["csatOverTime"][number];

// Custom Tooltip component
const CustomTooltip = ({
  active,
  payload,
  label: _label,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: CSATOverTimeData;
  }>;
  label?: string;
}) => {
  const { t } = useLocale();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default text-inverted border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{payload[0].payload.formattedDateFull}</p>
      {payload.map((entry, index: number) => (
        <p key={index} style={{ color: entry.color }}>
          {t("csat")}: {entry.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
};

export const CSATOverTimeChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const {
    data: csatData,
    isSuccess,
    isPending,
    isError,
  } = trpc.viewer.insights.csatOverTime.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  return (
    <ChartCard title={t("csat_over_time")} className="h-full" isPending={isPending} isError={isError}>
      {isSuccess ? (
        <div className="linechart ml-4 mt-4 h-80 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={csatData ?? []} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="Month" className="text-xs" axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={true}
                className="text-xs opacity-50"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="linear"
                dataKey="CSAT"
                name={t("csat")}
                stroke={COLOR.CSAT}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </ChartCard>
  );
};
