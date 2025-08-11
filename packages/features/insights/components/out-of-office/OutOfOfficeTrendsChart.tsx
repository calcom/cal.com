"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import type { RouterOutputs } from "@calcom/trpc/react";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { valueFormatter } from "../../lib/valueFormatter";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";

const COLOR = {
  VACATION: "#22c55e",
  SICK: "#ef4444",
  PERSONAL: "#3b82f6",
  MEETING: "#a855f7",
  OTHER: "#64748b",
};

export const legend = [
  { label: "Vacation", color: COLOR.VACATION },
  { label: "Sick", color: COLOR.SICK },
  { label: "Personal", color: COLOR.PERSONAL },
  { label: "Meeting", color: COLOR.MEETING },
  { label: "Other", color: COLOR.OTHER },
];

type OutOfOfficeTrendsData = RouterOutputs["viewer"]["insights"]["outOfOfficeTrends"][number];

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
    payload: OutOfOfficeTrendsData;
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

export const OutOfOfficeTrendsChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const {
    data: outOfOfficeTrends,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.outOfOfficeTrends.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  if (isPending) return <LoadingInsight />;

  if (!isSuccess) return null;

  return (
    <ChartCard title={t("out_of_office_trends")} legend={legend}>
      <div className="linechart ml-4 mt-4 h-80 sm:ml-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={outOfOfficeTrends ?? []} margin={{ top: 30, right: 20, left: 0, bottom: 0 }}>
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
            {legend.map((item) => (
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
    </ChartCard>
  );
};
