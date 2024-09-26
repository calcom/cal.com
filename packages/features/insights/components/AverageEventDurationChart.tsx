import { Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";
import { LineChart } from "./LineChart";
import { LoadingInsight } from "./LoadingInsights";

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedMemberUserId, isAll, initialConfig } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId, selectedUserId } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const { data, isSuccess, isPending } = trpc.viewer.insights.averageEventDuration.useQuery(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId: teamId ?? undefined,
      memberUserId: selectedMemberUserId ?? undefined,
      userId: selectedUserId ?? undefined,
      isAll,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
      // At least one of the following initial configs should have a value
      enabled: initialConfigIsReady,
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !startDate || !endDate || (!teamId && !selectedUserId)) return null;
  const isNoData = (data && data.length === 0) || data.every((item) => item["Average"] === 0);
  return (
    <CardInsights>
      <Title className="text-emphasis">{t("average_event_duration")}</Title>
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
    </CardInsights>
  );
};
