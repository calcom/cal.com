import prisma, { bookingMinimalSelect } from "@calcom/prisma";

export const getBooking = async (bookingId: number) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: bookingId,
    },
    select: {
      ...bookingMinimalSelect,
      uid: true,
      location: true,
      status: true,
      isRecorded: true,
      eventTypeId: true,
      references: true,
      fromReschedule: true,
      noShowHost: true,
      eventType: {
        select: {
          id: true,
          teamId: true,
          parentId: true,
          calVideoSettings: {
            select: {
              requireEmailForGuests: true,
            },
          },
          hosts: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          users: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          uuid: true,
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
