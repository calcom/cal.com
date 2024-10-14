import type { Prisma } from "@prisma/client";

import { BookingRepository } from "@calcom/lib/server/repository/booking";

import { validateOriginalRescheduledBooking } from "./validateOriginalRescheduledBooking";

export async function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
  const originalBooking = await BookingRepository.findOriginalRescheduledBooking(uid, seatsEventType);
  validateOriginalRescheduledBooking(originalBooking);

  return originalBooking;
}

export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;

export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>>;
