import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { valueFormatter } from "../lib/valueFormatter";
import { ChartCard } from "./ChartCard";
import { LineChart } from "./LineChart";
import { LoadingInsight } from "./LoadingInsights";

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const { scope, selectedTeamId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();
  const { timeZone } = useDataTable();

  const { data, isSuccess, isPending } = trpc.viewer.insights.averageEventDuration.useQuery(
    {
      scope,
      selectedTeamId,
      startDate,
      endDate,
      timeZone: timeZone || CURRENT_TIMEZONE,
      eventTypeId,
      memberUserId,
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
  const isNoData = data.every((item) => item["Average"] === 0);
  return (
    <ChartCard title={t("average_event_duration")}>
      {isNoData && (
        <div className="text-default flex h-60 text-center">
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
    </ChartCard>
  );
};
