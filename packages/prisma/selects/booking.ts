import type { Prisma } from "@prisma/client";

export const bookingMinimalSelect = {
  id: true,
  title: true,
  userPrimaryEmail: true,
  description: true,
  customInputs: true,
  startTime: true,
  attendees: true,
  endTime: true,
  metadata: true,
} satisfies Prisma.BookingSelect;
