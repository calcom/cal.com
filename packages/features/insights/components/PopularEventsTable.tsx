import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { ChartCard, ChartCardItem } from "./ChartCard";
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
      <div>
        {data
          .filter((item) => item.eventTypeId)
          .map((item) => (
            <ChartCardItem key={item.eventTypeId} count={item.count}>
              <div className="flex">
                <div className="bg-subtle mr-1.5 h-5 w-[2px] shrink-0 rounded-sm" />
                <p>{item.eventTypeName}</p>
              </div>
            </ChartCardItem>
          ))}
      </div>
      {data.length === 0 && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
    </ChartCard>
  );
};
