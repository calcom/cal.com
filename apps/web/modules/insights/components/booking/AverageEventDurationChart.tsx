"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";

const COLOR = {
  AVERAGE: "#3b82f6",
};

type AverageEventDurationData = RouterOutputs["viewer"]["insights"]["averageEventDuration"][number];

// Custom duration formatter that shows hours and minutes
const formatDuration = (minutes: number) => {
  if (!minutes) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const remainingMinutesStr = remainingMinutes.toFixed(1);

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutesStr}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${remainingMinutesStr}m`;
  }
};

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
    payload: AverageEventDurationData;
  }>;
  label?: string;
}) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default text-inverted border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{label}</p>
      {payload.map((entry, index: number) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {formatDuration(entry.value)}
        </p>
      ))}
    </div>
  );
};

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.averageEventDuration.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  return (
    <ChartCard title={t("average_event_duration")} isPending={isPending} isError={isError}>
      {isSuccess && data ? (
        data.every((item) => item["Average"] === 0) ? (
          <div className="text-default flex h-60 text-center">
            <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
          </div>
        ) : (
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="Date" className="text-xs" axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  className="text-xs opacity-50"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatDuration}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="linear"
                  dataKey="Average"
                  name={t("average_event_duration")}
                  stroke={COLOR.AVERAGE}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      ) : null}
    </ChartCard>
  );
};
