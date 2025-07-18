"use client";

import { Title } from "@tremor/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

type HourlyBookingsData = {
  hour: number;
  bookingCount: number;
};

const HourlyBookingsChartContent = ({ data }: { data: HourlyBookingsData[] }) => {
  const { t } = useLocale();

  const chartData = data.map((item) => ({
    hour: `${item.hour.toString().padStart(2, "0")}:00`,
    bookings: item.bookingCount,
  }));

  const maxBookings = Math.max(...data.map((item) => item.bookingCount));
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
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-subtle" />
          <XAxis dataKey="hour" className="text-default text-xs" tick={{ fontSize: 12 }} />
          <YAxis className="text-default text-xs" tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--cal-bg-default)",
              border: "1px solid var(--cal-border-default)",
              borderRadius: "6px",
              color: "var(--cal-text-default)",
            }}
            labelStyle={{ color: "var(--cal-text-default)" }}
          />
          <Bar dataKey="bookings" fill="var(--cal-brand-default)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export { HourlyBookingsChartContent };

export const HourlyBookingsChart = () => {
  const { t } = useLocale();
  const { timeZone } = useDataTable();
  const { scope, selectedTeamId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.hourlyBookingStats.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
      eventTypeId,
      memberUserId,
      timeZone: timeZone || "UTC",
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
    <CardInsights>
      <Title className="text-emphasis">{t("hourly_bookings")}</Title>
      <HourlyBookingsChartContent data={data} />
    </CardInsights>
  );
};
