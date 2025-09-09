"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard, ChartCardItem } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.popularEvents.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

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
