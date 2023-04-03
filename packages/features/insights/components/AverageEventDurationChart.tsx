import { LineChart, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedMemberUserId } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId, selectedUserId } = filter;

  const { data, isSuccess, isLoading } = trpc.viewer.insights.averageEventDuration.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId: teamId ?? undefined,
    memberUserId: selectedMemberUserId ?? undefined,
    userId: selectedUserId ?? undefined,
  });

  if (isLoading) return <LoadingInsight />;

  if (!isSuccess || !startDate || !endDate || (!teamId && !selectedUserId)) return null;

  return (
    <CardInsights>
      <Title>{t("average_event_duration")}</Title>
      {data && (data.length === 0 || (data.length === 1 && data[0].Average === 0)) && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
      {data && data.length > 0 && data[0].Average > 0 && (
        <LineChart
          className="mt-4 h-80"
          data={data}
          index="Date"
          categories={["Average"]}
          colors={["blue"]}
          valueFormatter={valueFormatter}
        />
      )}
    </CardInsights>
  );
};
