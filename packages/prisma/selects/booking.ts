import type { Prisma } from "@prisma/client";

export const bookingMinimalSelect = {
  id: true,
  title: true,
  userPrimaryEmail: true,
  description: true,
  customInputs: true,
  startTime: true,
  endTime: true,
  attendees: true,
  metadata: true,
} satisfies Prisma.BookingSelect;
