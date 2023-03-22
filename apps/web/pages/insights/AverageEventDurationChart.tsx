import { Card, Title, LineChart } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { valueFormatter } from "./index";

const AverageEventDurationChart = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const { startDate, endDate } = dateRange;
  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess } = trpc.viewer.analytics.averageEventDuration.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });

  if (!startDate || !endDate || !teamId) return null;

  return (
    <Card>
      <Title>{t("average_event_duration")}</Title>
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
