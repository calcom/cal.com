"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard, ChartCardItem } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";
import { ShowAllDataDialog } from "../ShowAllDataDialog";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const [showAllDialog, setShowAllDialog] = useState(false);

  const { data, isSuccess, isPending } = trpc.viewer.insights.popularEvents.useQuery(insightsBookingParams, {
    staleTime: 180000,
    refetchOnWindowFocus: false,
    trpc: {
      context: { skipBatch: true },
    },
  });

  const { data: allData, isLoading: isLoadingAll } = trpc.viewer.insights.popularEvents.useQuery(
    { ...insightsBookingParams, limit: 1000 },
    {
      enabled: showAllDialog,
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !data) return null;

  const tableData = data.data || [];
  const total = data.total || 0;
  const hasMoreData = total > 10;

  const renderTableContent = (items: typeof tableData) => (
    <div>
      {items
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
  );

  return (
    <>
      <ChartCard
        title={t("popular_events")}
        cta={
          hasMoreData
            ? {
                label: t("show_all_columns"),
                onClick: () => setShowAllDialog(true),
              }
            : undefined
        }>
        {renderTableContent(tableData.slice(0, 10))}
        {tableData.length === 0 && (
          <div className="flex h-60 text-center">
            <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
          </div>
        )}
      </ChartCard>

      {showAllDialog && (
        <ShowAllDataDialog
          isOpen={showAllDialog}
          onClose={() => setShowAllDialog(false)}
          title={t("popular_events")}>
          {isLoadingAll ? <LoadingInsight /> : renderTableContent(allData?.data || [])}
        </ShowAllDataDialog>
      )}
    </>
  );
};
