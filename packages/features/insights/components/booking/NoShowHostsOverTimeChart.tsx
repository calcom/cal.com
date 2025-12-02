"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { valueFormatter } from "../../lib/valueFormatter";
import { ChartCard } from "../ChartCard";

const COLOR = {
  NO_SHOW_HOST: "#64748b",
};

type NoShowHostsOverTimeData = RouterOutputs["viewer"]["insights"]["noShowHostsOverTime"][number];

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
    payload: NoShowHostsOverTimeData;
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
          {t("no_show_hosts")}: {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const NoShowHostsOverTimeChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const {
    data: noShowHostsData,
    isSuccess,
    isPending,
    isError,
  } = trpc.viewer.insights.noShowHostsOverTime.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  return (
    <ChartCard title={t("no_show_hosts_over_time")} className="h-full" isPending={isPending} isError={isError}>
      {isSuccess ? (
        <div className="linechart ml-4 mt-4 h-80 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={noShowHostsData ?? []} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="Month" className="text-xs" axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                className="text-xs opacity-50"
                axisLine={false}
                tickLine={false}
                tickFormatter={valueFormatter}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="linear"
                dataKey="Count"
                name={t("no_show_hosts")}
                stroke={COLOR.NO_SHOW_HOST}
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
