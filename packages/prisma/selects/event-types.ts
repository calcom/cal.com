import { Prisma } from "@prisma/client";

export const baseEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  description: true,
  length: true,
  schedulingType: true,
  recurringEvent: true,
  slug: true,
  hidden: true,
  price: true,
  currency: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresConfirmation: true,
  requiresBookerEmailVerification: true,
});

export const bookEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  slug: true,
  description: true,
  length: true,
  locations: true,
  customInputs: true,
  periodType: true,
  periodDays: true,
  periodStartDate: true,
  periodEndDate: true,
  recurringEvent: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresConfirmation: true,
  requiresBookerEmailVerification: true,
  metadata: true,
  periodCountCalendarDays: true,
  price: true,
  currency: true,
  disableGuests: true,
  userId: true,
  seatsPerTimeSlot: true,
  bookingFields: true,
  workflows: {
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
    },
  },
  users: {
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      bio: true,
      avatar: true,
      theme: true,
    },
  },
  successRedirectUrl: true,
  team: {
    select: {
      logo: true,
      parent: {
        select: {
          logo: true,
          name: true,
        },
      },
    },
  },
});

export const availiblityPageEventTypeSelect = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  availability: true,
  description: true,
  length: true,
  offsetStart: true,
  price: true,
  currency: true,
  periodType: true,
  periodStartDate: true,
  periodEndDate: true,
  periodDays: true,
  periodCountCalendarDays: true,
  locations: true,
  schedulingType: true,
  recurringEvent: true,
  requiresConfirmation: true,
  schedule: {
    select: {
      availability: true,
      timeZone: true,
    },
  },
  hidden: true,
  userId: true,
  slug: true,
  minimumBookingNotice: true,
  beforeEventBuffer: true,
  afterEventBuffer: true,
  timeZone: true,
  metadata: true,
  slotInterval: true,
  seatsPerTimeSlot: true,
  users: {
    select: {
      id: true,
      avatar: true,
      name: true,
      username: true,
      hideBranding: true,
      timeZone: true,
    },
  },
  team: {
    select: {
      logo: true,
      parent: {
        select: {
          logo: true,
          name: true,
        },
      },
    },
  },
});
