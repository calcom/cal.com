import { trpc } from "@calcom/trpc";

import { valueFormatter } from "../lib/valueFormatter";
import { BarChart } from "./BarChart";

export const DailyMinutesBarChart = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.calendar.useQuery(undefined, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
    enabled: true,
  });

  if (isLoading || !isSuccess) return null;
  return (
    <>
      <h1 className="font-cal text-emphasis mt-2 text-5xl font-extrabold sm:text-5xl">
        Your top day was <strong className="text-blue-500">{timeCapsule.topDayOfWeek["Month"]}</strong>
      </h1>
      <div className="mb-4 space-y-4">
        <BarChart
          className="linechart mt-4 h-80"
          data={timeCapsule.daysOfWeek ?? []}
          categories={["Minutes"]}
          index="Month"
          colors={["blue"]}
          valueFormatter={valueFormatter}
        />
      </div>
    </>
  );
};
