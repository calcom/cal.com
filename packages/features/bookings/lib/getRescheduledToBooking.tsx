import prisma from "@calcom/prisma";

export const getRescheduledToBooking = async (originalBookingUid: string) => {
  const rescheduledTo = await prisma.booking.findFirst({
    where: {
      fromReschedule: originalBookingUid,
    },
    select: {
      uid: true,
    },
  });

  return rescheduledTo;
};
