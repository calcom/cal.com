import { Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { CardInsights } from "./Card";
import { FeedbackTable } from "./FeedbackTable";
import { LoadingInsight } from "./LoadingInsights";

export const RecentFeedbackTable = () => {
  const { t } = useLocale();
  const { isAll, teamId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.recentRatings.useQuery(
    {
      startDate,
      endDate,
      teamId,
      eventTypeId,
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
    <CardInsights>
      <Title className="text-emphasis">{t("recent_ratings")}</Title>
      <FeedbackTable data={data} />
    </CardInsights>
  );
};
