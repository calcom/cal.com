import type { PrismaType } from "@calcom/prisma";

export async function maybeGetBookingUidFromSeat(prisma: PrismaType, uid: string) {
  // Look bookingUid in bookingSeat
  const bookingSeat = await prisma.bookingSeat.findUnique({
    where: {
      referenceUid: uid,
    },
    select: {
      booking: {
        select: {
          id: true,
          uid: true,
        },
      },
    },
  });
  if (bookingSeat) return bookingSeat.booking.uid;
  return uid;
}
