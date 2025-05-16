import { Title } from "@tremor/react";

import { DataTableProvider } from "@calcom/features/data-table";
import { useDataTable } from "@calcom/features/data-table";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { CardInsights } from "./Card";
import { FeedbackTable } from "./FeedbackTable";
import { LoadingInsight } from "./LoadingInsights";

export const FeedbackTableContainer = () => {
  const { t } = useLocale();
  const { isAll, teamId, startDate, endDate, eventTypeId } = useInsightsParameters();

  return (
    <DataTableProvider defaultPageSize={10}>
      <FeedbackTableContent
        isAll={isAll}
        teamId={teamId}
        startDate={startDate}
        endDate={endDate}
        eventTypeId={eventTypeId}
      />
    </DataTableProvider>
  );
};

const FeedbackTableContent = ({
  isAll,
  teamId,
  startDate,
  endDate,
  eventTypeId,
}: {
  isAll?: boolean;
  teamId?: number;
  startDate: string;
  endDate: string;
  eventTypeId?: number;
}) => {
  const { t } = useLocale();
  const { limit, offset } = useDataTable();

  const { data, isSuccess, isPending } = trpc.viewer.insights.recentRatings.useQuery(
    {
      startDate,
      endDate,
      teamId,
      eventTypeId,
      isAll,
      limit,
      offset,
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
    <CardInsights>
      <Title className="text-emphasis">{t("all_ratings")}</Title>
      <FeedbackTable data={data.rows} totalRowCount={data.meta.totalRowCount} />
    </CardInsights>
  );
};
