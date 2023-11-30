export const EVENT_TYPE_READ = 1; // 2^0
export const EVENT_TYPE_WRITE = 2; // 2^1
export const BOOKING_READ = 4; // 2^2
export const BOOKING_WRITE = 8; // 2^3
export const SCHEDULE_READ = 16; // 2^4
export const SCHEDULE_WRITE = 32; // 2^5

export const PERMISSIONS = [
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
] as const;

export const PERMISSION_MAP = {
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  BOOKING_READ,
  BOOKING_WRITE,
  SCHEDULE_READ,
  SCHEDULE_WRITE,
} as const;
