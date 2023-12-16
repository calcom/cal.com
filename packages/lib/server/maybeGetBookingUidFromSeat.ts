import type { PrismaClient } from "@calcom/prisma";

export async function maybeGetBookingUidFromSeat(prisma: PrismaClient, uid: string) {
  console.log("🚀 ~ file: maybeGetBookingUidFromSeat.ts:4 ~ maybeGetBookingUidFromSeat ~ uid:", uid);
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
  console.log(
    "🚀 ~ file: maybeGetBookingUidFromSeat.ts:18 ~ maybeGetBookingUidFromSeat ~ bookingSeat:",
    bookingSeat
  );
  if (bookingSeat) return { uid: bookingSeat.booking.uid, seatReferenceUid: uid };
  return { uid };
}
