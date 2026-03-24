"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { useInsightsBookingParameters } from "@calcom/web/modules/insights/hooks/useInsightsBookingParameters";
import { ChartCard, ChartCardItem } from "../ChartCard";

export const RescheduleReasonsTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();

  const { data, isSuccess, isPending, isError } = trpc.viewer.insights.rescheduleReasons.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const renderContent = () => {
    if (!isSuccess) return null;
    if (!data || data.length === 0) {
      return <div className="p-4 text-center text-sm text-subtle">{t("no_reschedule_reasons")}</div>;
    }
    return data.map((item) => (
      <ChartCardItem key={item.reason} count={item.count}>
        {item.reason}
      </ChartCardItem>
    ));
  };

  return (
    <ChartCard title={t("reschedule_reasons")} isPending={isPending} isError={isError}>
      {renderContent()}
    </ChartCard>
  );
};
