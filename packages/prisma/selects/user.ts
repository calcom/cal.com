import { Prisma } from "@prisma/client";

export const availabilityUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  timeZone: true,
  email: true,
  bufferTime: true,
  startTime: true,
  username: true,
  endTime: true,
  timeFormat: true,
  defaultScheduleId: true,
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
});

export const baseUserSelect = Prisma.validator<Prisma.UserSelect>()({
  name: true,
  destinationCalendar: true,
  locale: true,
  hideBranding: true,
  theme: true,
  brandColor: true,
  darkBrandColor: true,
  ...availabilityUserSelect,
});

export const userSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    name: true,
    allowDynamicBooking: true,
    destinationCalendar: true,
    locale: true,
    hideBranding: true,
    theme: true,
    brandColor: true,
    darkBrandColor: true,
    metadata: true,
    ...availabilityUserSelect,
  },
});
