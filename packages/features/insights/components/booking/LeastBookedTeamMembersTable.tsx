"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Pagination } from "@calcom/ui/components/pagination";

import { useInsightsBookingParameters } from "../../hooks/useInsightsBookingParameters";
import { useInsightsPagination } from "../../hooks/useInsightsPagination";
import { ChartCard } from "../ChartCard";
import { LoadingInsight } from "../LoadingInsights";
import { UserStatsTable } from "../UserStatsTable";

export const LeastBookedTeamMembersTable = () => {
  const { t } = useLocale();
  const insightsBookingParams = useInsightsBookingParameters();
  const { currentPage, pageSize, offset, limit, handlePageChange, handlePageSizeChange } =
    useInsightsPagination();

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithLeastBookings.useQuery(
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
    <ChartCard title={t("least_booked_members")}>
      <UserStatsTable data={tableData} />
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
