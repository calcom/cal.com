import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { ChartCard } from "./ChartCard";
import { LoadingInsight } from "./LoadingInsights";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.popularEventTypes.useQuery(
    {
      startDate,
      endDate,
      teamId,
      userId,
      eventTypeId,
      memberUserId,
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

  if (!isSuccess || !data) return null;

  return (
    <ChartCard title={t("popular_events")}>
      <div className="overflow-hidden rounded-md">
        {data.map(
          (item) =>
            item.eventTypeId && (
              <div
                key={item.eventTypeId}
                className="text-default border-muted flex items-center justify-between border-b px-4 py-3 last:border-b-0">
                <div className="text-sm font-medium">{item.eventTypeName}</div>
                <div className="text-sm font-medium">{item.count}</div>
              </div>
            )
        )}
      </div>
      {data.length === 0 && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
    </ChartCard>
  );
};
