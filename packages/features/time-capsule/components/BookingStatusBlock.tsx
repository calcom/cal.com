import { trpc } from "@calcom/trpc";

export const BookingStatusBlock = () => {
  const {
    data: timeCapsule,
    isSuccess,
    isLoading,
  } = trpc.viewer.timeCapsule.bookingStatuses.useQuery(undefined, {
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
        You accepted{" "}
        <strong className="text-blue-500">
          {(100 * timeCapsule.bookingStatuses.accepted) /
            (timeCapsule.bookingStatuses.accepted + timeCapsule.bookingStatuses.rejected)}
          %
        </strong>{" "}
        of bookings
        <br />
        and rescheduled <strong className="text-blue-500">
          {timeCapsule.bookingStatuses.rescheduled}{" "}
        </strong>{" "}
        times
      </h1>
    </>
  );
};
