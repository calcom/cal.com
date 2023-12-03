import { trpc } from "@calcom/trpc";

export const EventTypesBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.eventTypes.useQuery(undefined, {
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
        You booked the most:
      </h1>
      {timeCapsule.topEventTypes.map((eventType, i) => {
        return (
          <h1
            className={`font-cal text-emphasis mt-2 text-${5 - i}xl font-extrabold sm:text-${4 - i}xl`}
            key={eventType[0]}>
            {eventType[0]} - <strong className="text-blue-500">{eventType[1]}</strong> bookings
          </h1>
        );
      })}
    </>
  );
};
