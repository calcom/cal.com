"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Rectangle,
} from "recharts";

import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { ChartCard } from "./ChartCard";
import { LoadingInsight } from "./LoadingInsights";

type BookingsByHourData = {
  hour: number;
  count: number;
};

export const BookingsByHourChartContent = ({ data }: { data: BookingsByHourData[] }) => {
  const { t } = useLocale();

  const chartData = data.map((item) => ({
    hour: `${item.hour.toString().padStart(2, "0")}:00`,
    count: item.count,
  }));

  const maxBookings = Math.max(...data.map((item) => item.count));
  const isEmpty = maxBookings === 0;

  if (isEmpty) {
    return (
      <div className="text-default flex h-60 text-center">
        <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 0, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" className="text-xs" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} className="text-xs opacity-50" axisLine={false} tickLine={false} />
          <Tooltip cursor={false} content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="var(--cal-bg-subtle)"
            radius={[2, 2, 0, 0]}
            activeBar={<Rectangle fill="var(--cal-bg-info)" />}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
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
    payload: { hour: string; count: number };
  }>;
  label?: string;
}) => {
  const { t } = useLocale();
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="bg-default border-subtle rounded-lg border p-3 shadow-lg">
      <p className="text-default font-medium">{label}</p>
      {payload.map((entry, index: number) => (
        <p key={index}>
          {t("bookings")}: {entry.value}
        </p>
      ))}
    </div>
  );
};

export const BookingsByHourChart = () => {
  const { t } = useLocale();
  const { timeZone } = useDataTable();
  const { scope, selectedTeamId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.bookingsByHourStats.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
      eventTypeId,
      memberUserId,
      timeZone: timeZone || CURRENT_TIMEZONE,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("bookings_by_hour")}>
      <BookingsByHourChartContent data={data} />
    </ChartCard>
  );
};
