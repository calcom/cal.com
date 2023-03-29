import { LineChart, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";

export const BookingStatusLineChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { selectedTeamId, selectedTimeView = "week", dateRange, selectedEventTypeId } = filter;
  const [startDate, endDate] = dateRange;

  if (!startDate || !endDate) return null;

  const { data: eventsTimeLine, isSuccess } = trpc.viewer.insights.eventsTimeline.useQuery({
    timeView: selectedTimeView,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId: selectedTeamId || -1,
    eventTypeId: selectedEventTypeId ?? undefined,
  });

  if (!isSuccess) return null;

  return (
    <CardInsights>
      <Title>{t("event_trends")}</Title>
      <LineChart
        className="mt-4 h-80"
        data={eventsTimeLine ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled"]}
        index="Month"
        colors={["gray", "green", "blue", "red"]}
        valueFormatter={valueFormatter}
      />
    </CardInsights>
  );
};
