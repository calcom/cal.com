import { Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { valueFormatter } from "../lib/valueFormatter";
import { CardInsights } from "./Card";
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
    <CardInsights>
      <Title className="text-emphasis">{t("event_trends")}</Title>
      <LineChart
        className="linechart mt-4 h-80"
        data={eventsTimeLine ?? []}
        categories={["Created", "Completed", "Rescheduled", "Cancelled", "No-Show (Host)", "No-Show (Guest)"]}
        index="Month"
        colors={["purple", "green", "blue", "red", "slate", "orange"]}
        valueFormatter={valueFormatter}
      />
    </CardInsights>
  );
};
