import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { valueFormatter } from "../lib/valueFormatter";
import { ChartCard } from "./ChartCard";
import { LineChart } from "./LineChart";
import { LoadingInsight } from "./LoadingInsights";

export const EventTrendsChart = () => {
  const { t } = useLocale();
  const { scope, selectedTeamId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();
  const { timeZone } = useDataTable();

  const {
    data: eventTrends,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.eventTrends.useQuery(
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

  if (!isSuccess) return null;

  return (
    <ChartCard title={t("event_trends")}>
      <LineChart
        className="linechart ml-4 mt-4 h-80 sm:ml-0"
        data={eventTrends ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)", "No-Show (Guest)"]}
        index="Month"
        colors={["purple", "green", "blue", "red", "slate", "orange"]}
        valueFormatter={valueFormatter}
      />
    </ChartCard>
  );
};
