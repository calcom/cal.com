import { Prisma } from "@prisma/client";

export const dynamicEventSelector = Prisma.validator<Prisma.UserSelect>()({
  username: true,
  name: true,
  weekStart: true,
  metadata: true,
  brandColor: true,
  darkBrandColor: true,
  theme: true,
  organizationId: true,
  organization: {
    select: {
      slug: true,
      name: true,
    },
  },
});

export const publicEventSelector = Prisma.validator<Prisma.EventTypeSelect>()({
  id: true,
  title: true,
  description: true,
  eventName: true,
  slug: true,
  isInstantEvent: true,
  schedulingType: true,
  length: true,
  locations: true,
  customInputs: true,
  disableGuests: true,
  metadata: true,
  lockTimeZoneToggleOnBookingPage: true,
  requiresConfirmation: true,
  requiresBookerEmailVerification: true,
  recurringEvent: true,
  price: true,
  currency: true,
  seatsPerTimeSlot: true,
  seatsShowAvailabilityCount: true,
  bookingFields: true,
  team: {
    select: {
      parentId: true,
      metadata: true,
      brandColor: true,
      darkBrandColor: true,
      slug: true,
      name: true,
      logo: true,
      theme: true,
      parent: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  },
  successRedirectUrl: true,
  workflows: {
    include: {
      workflow: {
        include: {
          steps: true,
        },
      },
    },
  },
  hosts: {
    select: {
      user: {
        select: {
          id: true,
          avatarUrl: true,
          username: true,
          name: true,
          weekStart: true,
          brandColor: true,
          darkBrandColor: true,
          theme: true,
          metadata: true,
        },
      },
    },
  },
  owner: {
    select: {
      id: true,
      avatarUrl: true,
      weekStart: true,
      username: true,
      name: true,
      theme: true,
      metadata: true,
      brandColor: true,
      darkBrandColor: true,
    },
  },
  hidden: true,
  assignAllTeamMembers: true,
});

export const eventDataSelector = Prisma.validator<Prisma.EventTypeArgs>()({
  select: publicEventSelector,
});

export type Event = Prisma.EventTypeGetPayload<typeof eventDataSelector>;
