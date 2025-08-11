"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Pagination } from "@calcom/ui/components/pagination";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { useInsightsPagination } from "../../hooks/useInsightsPagination";
import { ChartCard, ChartCardItem } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const { currentPage, pageSize, offset, limit, handlePageChange, handlePageSizeChange } =
    useInsightsPagination();

  const { data, isSuccess, isPending } = trpc.viewer.insights.popularEvents.useQuery(
    { ...insightsBookingParams, limit, offset },
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

  const tableData = data.data || [];
  const total = data.total || 0;

  return (
    <ChartCard title={t("popular_events")}>
      <div>
        {tableData
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
      {tableData.length === 0 && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
      {total > pageSize && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50]}
          />
        </div>
      )}
    </ChartCard>
  );
};
