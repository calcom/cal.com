import type { Prisma } from "../client";

export const availabilityUserSelect = {
  id: true,
  uuid: true,
  timeZone: true,
  email: true,
  bufferTime: true,
  username: true,
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
