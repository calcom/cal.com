import dayjs from "@calcom/dayjs";
import { trpc } from "@calcom/trpc";

export const StreaksBlock = () => {
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
        Your longest streak of meetings was{" "}
        <strong className="text-blue-500"> {timeCapsule.meetingStreak} </strong>days
        <br />
        from{" "}
        <strong className="text-blue-500">
          {dayjs().dayOfYear(timeCapsule.meetingStreakStart).format("MMMM Do")}
        </strong>{" "}
        to{" "}
        <strong className="text-blue-500">
          {dayjs()
            .dayOfYear(timeCapsule.meetingStreakStart + timeCapsule.meetingStreak - 1)
            .format("MMMM Do")}
        </strong>
      </h1>
    </>
  );
};
