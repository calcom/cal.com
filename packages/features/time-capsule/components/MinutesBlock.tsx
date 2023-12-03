import { trpc } from "@calcom/trpc";

export const MinutesBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.totalMinutes.useQuery(undefined, {
    staleTime: 30000,
    trpc: {
      context: { skipBatch: true },
    },
    enabled: true,
  });

  if (isLoading || !isSuccess) return null;

  return (
    <>
      <h1 className="font-cal text-emphasis mt-2 text-5xl font-extrabold sm:text-5xl ">
        You booked <strong className="text-blue-500">{timeCapsule.totalMinutes}</strong> minutes of meeting
        this year
      </h1>
      <h1 className="font-cal text-emphasis mt-2 text-3xl font-extrabold sm:text-3xl">
        <strong className="text-blue-500">{timeCapsule.totalMeetings}</strong> meetings
      </h1>
      <h1 className="font-cal text-emphasis mt-2 text-3xl font-extrabold sm:text-3xl">
        <strong className="text-blue-500">{timeCapsule.averageMinutes}</strong> average minutes
      </h1>
    </>
  );
};
