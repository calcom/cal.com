"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { useToggleableLegend } from "../../hooks/useToggleableLegend";
import { valueFormatter } from "../../lib/valueFormatter";
import { ChartCard } from "../ChartCard";

const COLOR = {
  CREATED: "#a855f7",
  COMPLETED: "#22c55e",
  RESCHEDULED: "#3b82f6",
  CANCELLED: "#ef4444",
  NO_SHOW_HOST: "#64748b",
  NO_SHOW_GUEST: "#f97316",
};

export const legend = [
  { label: "Created", color: COLOR.CREATED },
  { label: "Completed", color: COLOR.COMPLETED },
  { label: "Rescheduled", color: COLOR.RESCHEDULED },
  { label: "Cancelled", color: COLOR.CANCELLED },
  { label: "No-Show (Host)", color: COLOR.NO_SHOW_HOST },
  { label: "No-Show (Guest)", color: COLOR.NO_SHOW_GUEST },
];

type EventTrendsData = RouterOutputs["viewer"]["insights"]["eventTrends"][number];

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
    payload: EventTrendsData;
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default text-inverted border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{payload[0].payload.formattedDateFull}</p>
      {payload.map((entry, index: number) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {valueFormatter ? valueFormatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

export const EventTrendsChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const { enabledLegend, toggleSeries } = useToggleableLegend(legend);

  const {
    data: eventTrends,
    isSuccess,
    isPending,
    isError,
  } = trpc.viewer.insights.eventTrends.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  return (
    <ChartCard
      title={t("event_trends")}
      legend={legend}
      enabledLegend={enabledLegend}
      onSeriesToggle={toggleSeries}
      isPending={isPending}
      isError={isError}>
      {isSuccess ? (
        <div className="linechart ml-4 mt-4 h-80 sm:ml-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={eventTrends ?? []} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
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
              {enabledLegend.map((item) => (
                <Line
                  key={item.label}
                  type="linear"
                  dataKey={item.label}
                  name={item.label}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </ChartCard>
  );
};
