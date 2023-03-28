import { Prisma } from "@prisma/client";

export const availabilityUserSelect = Prisma.validator<Prisma.UserSelect>()({
  credentials: true,
  timeZone: true,
  bufferTime: true,
  availability: true,
  id: true,
  startTime: true,
  username: true,
  endTime: true,
  selectedCalendars: true,
  timeFormat: true,
  schedules: {
    select: {
      availability: true,
      timeZone: true,
      id: true,
    },
  },
  defaultScheduleId: true,
});

export const baseUserSelect = Prisma.validator<Prisma.UserSelect>()({
  email: true,
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
    email: true,
    name: true,
    allowDynamicBooking: true,
    destinationCalendar: true,
    locale: true,
    avatar: true,
    hideBranding: true,
    theme: true,
    brandColor: true,
    darkBrandColor: true,
    metadata: true,
    ...availabilityUserSelect,
  },
});
