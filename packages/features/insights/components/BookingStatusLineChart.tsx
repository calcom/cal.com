import { Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";
import { LineChart } from "./LineChart";
import { LoadingInsight } from "./LoadingInsights";

export const BookingStatusLineChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const {
    selectedTeamId,
    selectedUserId,
    selectedTimeView = "week",
    dateRange,
    selectedEventTypeId,
    isAll,
    initialConfig,
  } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);
  const [startDate, endDate] = dateRange;

  if (!startDate || !endDate) return null;

  const {
    data: eventsTimeLine,
    isSuccess,
    isPending,
  } = trpc.viewer.insights.eventsTimeline.useQuery(
    {
      timeView: selectedTimeView,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId: selectedTeamId ?? undefined,
      eventTypeId: selectedEventTypeId ?? undefined,
      userId: selectedUserId ?? undefined,
      isAll,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
      enabled: initialConfigIsReady,
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess) return null;

  return (
    <CardInsights>
      <Title className="text-emphasis">{t("event_trends")}</Title>
      <LineChart
        className="linechart mt-4 h-80"
        data={eventsTimeLine ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)"]}
        index="Month"
        colors={["purple", "green", "blue", "red", "slate"]}
        valueFormatter={valueFormatter}
      />
    </CardInsights>
  );
};
