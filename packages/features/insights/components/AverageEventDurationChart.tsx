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
  const isNoData = (data && data.length === 0) || data.every((item) => item["Average"] === 0);
  return (
    <CardInsights>
      <Title>{t("average_event_duration")}</Title>
      {isNoData && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
      {data && data.length > 0 && !isNoData && (
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
