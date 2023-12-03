import { trpc } from "@calcom/trpc";

export const AttendeesBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.totalAttendees.useQuery(undefined, {
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
        You met with <strong className="text-blue-500">{timeCapsule.uniqueAttendees}</strong> unique attendees
      </h1>
      <h1 className="font-cal text-emphasis mt-2 text-4xl font-extrabold sm:text-4xl">
        You spent the most time in meetings with:
      </h1>
      {timeCapsule.topAttendees.map((attendee, i) => {
        const name = attendee["name"];
        const minutes = attendee["minutes"];
        return (
          <h1
            className={`font-cal text-emphasis mt-2 text-${4 - i}xl font-extrabold sm:text-${4 - i}xl`}
            key={attendee["email"]}>
            {name} - <strong className="text-blue-500">{minutes}</strong> minutes
          </h1>
        );
      })}
    </>
  );
};
