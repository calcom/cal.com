import { Prisma } from "@prisma/client";

export const bookingMinimalSelect = Prisma.validator<Prisma.BookingSelect>()({
  id: true,
  title: true,
  userPrimaryEmail: true,
  description: true,
  customInputs: true,
  startTime: true,
  endTime: true,
  attendees: {
    orderBy: {
      id: "asc",
    },
  },
  metadata: true,
});
