import { Grid } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { KPICard } from "./components/KPICard";

const BookingKPICards = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const [startDate, endDate] = dateRange;

  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess } = trpc.viewer.analytics.eventsByStatus.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });

  const categories: {
    title: string;
    index: "created" | "completed" | "rescheduled" | "cancelled";
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
  ];

  if (!startDate || !endDate || !teamId) return null;
  if (data?.empty) return null;

  return (
    <Grid numColsSm={2} numColsLg={4} className="gap-x-6 gap-y-6">
      {isSuccess &&
        categories.map((item) => (
          <KPICard
            key={item.title}
            title={item.title}
            value={data[item.index].count}
            previousMetricData={data[item.index]}
            previousDateRange={data.previousRange}
          />
        ))}
    </Grid>
  );
};

export { BookingKPICards };
