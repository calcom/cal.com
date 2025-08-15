"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";
import { ShowAllDataDialog } from "../ShowAllDataDialog";
import { UserStatsTable } from "../UserStatsTable";

export const MostCancelledBookingsTables = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const [showAllDialog, setShowAllDialog] = useState(false);

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithMostCancelledBookings.useQuery(
    insightsBookingParams,
    {
      staleTime: 180000,
      refetchOnWindowFocus: false,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const { data: allData, isLoading: isLoadingAll } =
    trpc.viewer.insights.membersWithMostCancelledBookings.useQuery(
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

  const renderTableContent = (items: typeof tableData) => <UserStatsTable data={items} />;

  return (
    <>
      <ChartCard
        title={t("most_cancelled_bookings")}
        cta={
          hasMoreData
            ? {
                label: t("show_all_columns"),
                onClick: () => setShowAllDialog(true),
              }
            : undefined
        }>
        {renderTableContent(tableData.slice(0, 10))}
      </ChartCard>

      {showAllDialog && (
        <ShowAllDataDialog
          isOpen={showAllDialog}
          onClose={() => setShowAllDialog(false)}
          title={t("most_cancelled_bookings")}>
          {isLoadingAll ? <LoadingInsight /> : renderTableContent(allData?.data || [])}
        </ShowAllDataDialog>
      )}
    </>
  );
};
