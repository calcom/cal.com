import type { Prisma } from "@calcom/prisma/client";

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

export const bookingAuthorizationCheckSelect = {
  userId: true,
  eventType: {
    select: {
      teamId: true,
      users: {
        select: {
          id: true,
          email: true,
        },
      },
      hosts: {
        select: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      },
    },
  },
  attendees: {
    select: {
      email: true,
    },
  },
} satisfies Prisma.BookingSelect;

export const bookingDetailsSelect = {
  uid: true,
  rescheduled: true,
  fromReschedule: true,
} satisfies Prisma.BookingSelect;
