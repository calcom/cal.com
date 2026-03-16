import type { Prisma } from "../client";

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
  createdAt: true,
} satisfies Prisma.BookingSelect;

export const bookingDetailsSelect = {
  uid: true,
  rescheduled: true,
  fromReschedule: true,
  tracking: {
    select: {
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      utm_term: true,
      utm_content: true,
    },
  },
} satisfies Prisma.BookingSelect;
