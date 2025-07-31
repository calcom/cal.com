"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { valueFormatter } from "../../lib/valueFormatter";
import { ChartCard } from "../ChartCard";
import { LineChart } from "../LineChart";
import { LoadingInsight } from "../LoadingInsights";

export const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.averageEventDuration.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
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
