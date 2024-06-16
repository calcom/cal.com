import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

const eventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  owner: true,
  teamId: true,
  recurringEvent: true,
  title: true,
  slug: true,
  requiresConfirmation: true,
  currency: true,
  length: true,
  description: true,
  price: true,
  bookingFields: true,
  disableGuests: true,
  metadata: true,
  locations: true,
  team: {
    select: {
      parentId: true,
    },
  },
  workflows: {
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
    },
  },
  customInputs: true,
  parentId: true,
});

const bookingSelect = Prisma.validator<Prisma.BookingSelect>()({
  title: true,
  description: true,
  customInputs: true,
  startTime: true,
  endTime: true,
  attendees: true,
  eventTypeId: true,
  responses: true,
  metadata: true,
  userPrimaryEmail: true,
  eventType: {
    select: eventTypeSelect,
  },
  location: true,
  userId: true,
  id: true,
  uid: true,
  payment: true,
  destinationCalendar: true,
  paid: true,
  recurringEventId: true,
  status: true,
  smsReminderNumber: true,
});

export class BookingRepository {
  static findBookingById({ id }: { id: number }) {
    return prisma.booking.findUniqueOrThrow({
      where: {
        id,
      },
      select: bookingSelect,
    });
  }

  static updateBookingById({ id, data }: { id: number; data: Prisma.BookingUpdateInput }) {
    return prisma.booking.update({
      where: {
        id,
      },
      data: Prisma.validator<Prisma.BookingUpdateInput>()(data),
    });
  }
}
