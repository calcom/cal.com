import { LineChart, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedUserId } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess } = trpc.viewer.insights.averageEventDuration.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
    userId: selectedUserId ?? undefined,
  });

  if (!isSuccess || data?.length == 0 || !startDate || !endDate || !teamId) return null;

  return (
    <CardInsights>
      <Title>{t("average_event_duration")}</Title>
      <LineChart
        className="mt-4 h-80"
        data={data}
        index="Date"
        categories={["Average"]}
        colors={["blue"]}
        valueFormatter={valueFormatter}
      />
    </CardInsights>
  );
};
