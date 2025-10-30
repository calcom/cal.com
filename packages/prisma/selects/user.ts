import type { Prisma } from "@calcom/prisma/client";

export const availabilityUserSelect = {
  id: true,
  timeZone: true,
  email: true,
  bufferTime: true,
  startTime: true,
  username: true,
  endTime: true,
  timeFormat: true,
  defaultScheduleId: true,
  isPlatformManaged: true,
  // Relationships
  schedules: {
    select: {
      availability: {
        select: {
          date: true,
          startTime: true,
          endTime: true,
          days: true,
        },
      },
      timeZone: true,
      id: true,
    },
  },
  availability: true,
  selectedCalendars: true,
  travelSchedules: true,
} satisfies Prisma.UserSelect;

export const baseUserSelect = {
  name: true,
  destinationCalendar: true,
  locale: true,
  hideBranding: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  ...availabilityUserSelect,
} satisfies Prisma.UserSelect;

export const userSelect = {
  name: true,
  allowDynamicBooking: true,
  destinationCalendar: true,
  locale: true,
  hideBranding: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  metadata: true,
  locked: true,
  ...availabilityUserSelect,
} satisfies Prisma.UserSelect;
