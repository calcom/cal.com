import { Card, Title, LineChart } from "@tremor/react";

import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { valueFormatter } from "./index";

const AverageEventDurationChart = () => {
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const { startDate, endDate } = dateRange;
  const { selectedTeamId: teamId } = filter;

  if (!startDate || !endDate || !teamId) return null;

  const { data, isSuccess } = trpc.viewer.analytics.averageEventDuration.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Average Event Duration</Title>
      {isSuccess && data.length > 0 && (
        <LineChart
          className="mt-4 h-80"
          data={data}
          index="Date"
          categories={["Average"]}
          colors={["blue"]}
          valueFormatter={valueFormatter}
        />
      )}
    </Card>
  );
};

export { AverageEventDurationChart };
