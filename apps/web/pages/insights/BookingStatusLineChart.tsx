import { Card, LineChart, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { valueFormatter } from "./index";

const BookingStatusLineChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { selectedTeamId, selectedTimeView = "week", dateRange } = filter;
  const { startDate, endDate } = dateRange;

  if (!startDate || !endDate) return null;

  const { data: eventsTimeLine } = trpc.viewer.analytics.eventsTimeline.useQuery({
    timeView: selectedTimeView,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId: selectedTeamId || -1,
  });
  return (
    <Card>
      <Title>{t("event_trends")}</Title>
      <LineChart
        className="mt-4 h-80"
        data={eventsTimeLine ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled"]}
        index="Month"
        colors={["gray", "green", "blue", "red"]}
        valueFormatter={valueFormatter}
      />
    </Card>
  );
};

export { BookingStatusLineChart };
