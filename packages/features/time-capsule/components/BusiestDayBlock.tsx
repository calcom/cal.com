import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc";

export const BusiestDayBlock = () => {
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
        Your busiest day was{" "}
        <strong className="text-blue-500">
          {dayjs().dayOfYear(timeCapsule.topDay[0]).format("MMMM Do")}
        </strong>{" "}
        with <strong className="text-blue-500">105</strong> minutes
      </h1>
    </>
  );
};
