"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from "recharts";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsRoutingParameters } from "../../hooks/useInsightsRoutingParameters";
import { ChartCard } from "../ChartCard";

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    name: string;
    color: string;
    payload: { answer: string; fullAnswer: string; count: number };
  }>;
}) => {
  const { t } = useLocale();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{payload[0].payload.fullAnswer}</p>
      <p>
        {t("response_count")}: {payload[0].value}
      </p>
    </div>
  );
};

export function MostSubmittedAnswers() {
  const { t } = useLocale();
  const insightsRoutingParams = useInsightsRoutingParameters();
  const { data, isLoading } = trpc.viewer.insights.mostSubmittedAnswers.useQuery(insightsRoutingParams, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
  });

  if (isLoading) {
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Transform data for chart
  const chartData = data.map((item) => ({
    answer: item.answer.length > 30 ? `${item.answer.substring(0, 30)}...` : item.answer,
    fullAnswer: item.answer,
    count: item.count,
  }));

  return (
    <ChartCard title={t("most_submitted_answers")}>
      <div className="h-96 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 10,
              left: 20,
              bottom: 5,
            }}
            barCategoryGap="10%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" className="text-xs" axisLine={false} tickLine={false} />
            <YAxis dataKey="answer" type="category" className="text-xs" axisLine={false} tickLine={false} />
            <Tooltip cursor={false} content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              fill="var(--cal-bg-subtle)"
              radius={[0, 2, 2, 0]}
              activeBar={<Rectangle fill="var(--cal-bg-info)" />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
