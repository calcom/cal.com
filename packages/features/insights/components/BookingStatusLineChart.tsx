import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { valueFormatter } from "../lib/valueFormatter";
import { ChartCard } from "./ChartCard";
import { LineChart } from "./LineChart";
import { LoadingInsight } from "./LoadingInsights";

export const BookingStatusLineChart = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const {
    data: eventsTimeLine,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.eventsTimeline.useQuery(
    {
      startDate,
      endDate,
      teamId,
      eventTypeId,
      userId,
      isAll,
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
        data={eventsTimeLine ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)", "No-Show (Guest)"]}
        index="Month"
        colors={["purple", "green", "blue", "red", "slate", "orange"]}
        valueFormatter={valueFormatter}
      />
    </ChartCard>
  );
};
