import type { Prisma, PrismaClient } from "@prisma/client";

const bookingSelect = {
  startTime: true,
  description: true,
  customInputs: true,
  smsReminderNumber: true,
  location: true,
  attendees: {
    select: {
      email: true,
      name: true,
    },
  },
};

async function getBooking(prisma: PrismaClient, uid: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      uid,
    },
    select: bookingSelect,
  });

  if (booking) {
    // @NOTE: had to do this because Server side cant return [Object objects]
    // probably fixable with json.stringify -> json.parse
    booking["startTime"] = (booking?.startTime as Date)?.toISOString() as unknown as Date;
  }

  return booking;
}

export type GetBookingType = Prisma.PromiseReturnType<typeof getBooking>;

export default getBooking;
