export const EVENT_TYPE_READ = 1; // 2^0
export const EVENT_TYPE_WRITE = 2; // 2^1
export const BOOKING_READ = 4; // 2^2
export const BOOKING_WRITE = 8; // 2^3
export const SCHEDULE_READ = 16; // 2^4
export const SCHEDULE_WRITE = 32; // 2^5
export const APPS_READ = 64; // 2^6
export const APPS_WRITE = 128; // 2^7
export const PROFILE_READ = 256; // 2^8;
export const PROFILE_WRITE = 512; // 2^9;

export const PERMISSIONS = [
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
  APPS_READ,
  APPS_WRITE,
  PROFILE_READ,
  PROFILE_WRITE,
] as const;

export type PLATFORM_PERMISSION = (typeof PERMISSIONS)[number];

export const PERMISSION_MAP = {
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
  APPS_READ,
  APPS_WRITE,
  PROFILE_READ,
  PROFILE_WRITE,
} as const;

export const PERMISSIONS_GROUPED_MAP = {
  EVENT_TYPE: {
    read: EVENT_TYPE_READ,
    write: EVENT_TYPE_WRITE,
    key: "eventType",
    label: "Event Type",
  },
  BOOKING: {
    read: BOOKING_READ,
    write: BOOKING_WRITE,
    key: "booking",
    label: "Booking",
  },
  SCHEDULE: {
    read: SCHEDULE_READ,
    write: SCHEDULE_WRITE,
    key: "schedule",
    label: "Schedule",
  },
  APPS: {
    read: APPS_READ,
    write: APPS_WRITE,
    key: "apps",
    label: "Apps",
  },
  PROFILE: {
    read: PROFILE_READ,
    write: PROFILE_WRITE,
    key: "profile",
    label: "Profile",
  },
} as const;
