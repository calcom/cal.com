export const APPS_TYPE_ID_MAPPING: Record<string, string> = {
  stripe_payment: "stripe",
  google_calendar: "google-calendar",
  office365_calendar: "office365-calendar",
  apple_calendar: "apple-calendar",
  "ics-feed_calendar": "ics-feed",
  google_video: "google-meet",
};

export const EVENT_TYPE_READ = 1;
export const EVENT_TYPE_WRITE = 2;
export const BOOKING_READ = 4;
export const BOOKING_WRITE = 8;
export const SCHEDULE_READ = 16;
export const SCHEDULE_WRITE = 32;
export const APPS_READ = 64;
export const APPS_WRITE = 128;
export const PROFILE_READ = 256;
export const PROFILE_WRITE = 512;

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
  EVENT_TYPE: { read: EVENT_TYPE_READ, write: EVENT_TYPE_WRITE, key: "eventType", label: "Event Type" },
  BOOKING: { read: BOOKING_READ, write: BOOKING_WRITE, key: "booking", label: "Booking" },
  SCHEDULE: { read: SCHEDULE_READ, write: SCHEDULE_WRITE, key: "schedule", label: "Schedule" },
  APPS: { read: APPS_READ, write: APPS_WRITE, key: "apps", label: "Apps" },
  PROFILE: { read: PROFILE_READ, write: PROFILE_WRITE, key: "profile", label: "Profile" },
} as const;
