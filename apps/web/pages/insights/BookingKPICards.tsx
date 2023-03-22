import { Grid } from "@tremor/react";

import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { KPICard } from "./components/KPICard";

const categories: {
  title: string;
  index: "created" | "completed" | "rescheduled" | "cancelled";
}[] = [
  {
    title: "Events created",
    index: "created",
  },
  {
    title: "Events completed",
    index: "completed",
  },
  {
    title: "Events rescheduled",
    index: "rescheduled",
  },
  {
    title: "Events cancelled",
    index: "cancelled",
  },
];

const BookingKPICards = () => {
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const { startDate, endDate } = dateRange;
  const { selectedTeamId: teamId } = filter;

  if (!startDate || !endDate || !teamId) return null;

  const { data, isSuccess } = trpc.viewer.analytics.eventsByStatus.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });

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
