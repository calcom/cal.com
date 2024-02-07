import { Prisma } from "@calcom/prisma/client";
import { getOriginalRescheduledBooking } from "../booking/getOriginalRescheduledBooking";
type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;

export function getICalSequence(originalRescheduledBooking: BookingType | null) {
  // If new booking set the sequence to 0
  if (!originalRescheduledBooking) {
    return 0;
  }

  // If rescheduling and there is no sequence set, assume sequence should be 1
  if (!originalRescheduledBooking.iCalSequence) {
    return 1;
  }

  // If rescheduling then increment sequence by 1
  return originalRescheduledBooking.iCalSequence + 1;
}