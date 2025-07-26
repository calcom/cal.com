import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { ChartCard } from "./ChartCard";
import { LoadingInsight } from "./LoadingInsights";
import { TotalUserFeedbackTable } from "./TotalUserFeedbackTable";

export const LowestRatedMembersTable = () => {
  const { t } = useLocale();
  const { scope, selectedTeamId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();
  const { timeZone } = useDataTable();

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithLowestRatings.useQuery(
    {
      scope,
      selectedTeamId,
      memberUserId,
      startDate,
      endDate,
      timeZone: timeZone || CURRENT_TIMEZONE,
      eventTypeId,
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

  return data && data.length > 0 ? (
    <ChartCard title={t("lowest_rated")}>
      <TotalUserFeedbackTable data={data} />
    </ChartCard>
  ) : (
    <></>
  );
};
