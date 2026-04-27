import prisma, { bookingMinimalSelect } from "@calcom/prisma";

// TODO: use BookingRepository
export const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      location: true,
      isRecorded: true,
      eventTypeId: true,
      eventType: {
        select: {
          teamId: true,
          parentId: true,
          canSendCalVideoTranscriptionEmails: true,
          customReplyToEmail: true,
        },
      },
      user: {
        select: {
          id: true,
          timeZone: true,
          email: true,
          name: true,
          locale: true,
          destinationCalendar: true,
        },
      },
    },
  });

  return booking;
};

export type getBookingResponse = Awaited<ReturnType<typeof getBooking>>;
