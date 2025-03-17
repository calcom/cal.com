import { Grid } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { SkeletonContainer, SkeletonText } from "@calcom/ui";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { CardInsights } from "./Card";
import { KPICard } from "./KPICard";

export const BookingKPICards = () => {
  const { t } = useLocale();
  const { startDate, endDate, teamId, userId, isAll, memberUserId, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.eventsByStatus.useQuery(
    {
      startDate,
      endDate,
      teamId,
      eventTypeId,
      memberUserId,
      userId,
      isAll,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  const categories: {
    title: string;
    index:
      | "created"
      | "completed"
      | "rescheduled"
      | "cancelled"
      | "no_show"
      | "rating"
      | "csat"
      | "no_show_guest";
  }[] = [
    {
      title: t("events_created"),
      index: "created",
    },
    {
      title: t("events_completed"),
      index: "completed",
    },
    {
      title: t("events_rescheduled"),
      index: "rescheduled",
    },
    {
      title: t("events_cancelled"),
      index: "cancelled",
    },
    {
      title: t("event_ratings"),
      index: "rating",
    },
    {
      title: t("event_no_show"),
      index: "no_show",
    },
    {
      title: t("event_no_show_guest"),
      index: "no_show_guest",
    },
    {
      title: t("csat_score"),
      index: "csat",
    },
  ];

  if (isPending) {
    return <LoadingKPICards categories={categories} />;
  }

  if (!isSuccess || !data) return null;

  return (
    <>
      <Grid numColsSm={2} numColsLg={4} className="gap-x-4 gap-y-4">
        {categories.map((item) => (
          <KPICard
            key={item.title}
            title={item.title}
            value={data[item.index].count}
            previousMetricData={data[item.index]}
            previousDateRange={data.previousRange}
          />
        ))}
      </Grid>
    </>
  );
};

const LoadingKPICards = (props: { categories: { title: string; index: string }[] }) => {
  const { categories } = props;
  return (
    <Grid numColsSm={2} numColsLg={4} className="gap-x-4 gap-y-4">
      {categories.map((item) => (
        <CardInsights key={item.title}>
          <SkeletonContainer className="flex w-full flex-col">
            <SkeletonText className="mt-2 h-4 w-32" />
            <SkeletonText className="mt-2 h-6 w-16" />
            <SkeletonText className="mt-4 h-6 w-44" />
          </SkeletonContainer>
        </CardInsights>
      ))}
    </Grid>
  );
};
