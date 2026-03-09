export const getTranslation = jest.fn().mockResolvedValue({ t: (key: string) => key });
export const verifyPhoneNumber = jest.fn();
export const sendVerificationCode = jest.fn();
export const createApiKeyHandler = jest.fn();
export const credentialForCalendarServiceSelect = {
  id: true,
  type: true,
  key: true,
  userId: true,
  teamId: true,
  appId: true,
  invalid: true,
};
export const CreationSource = { API_V2: "API_V2", API: "API", WEBAPP: "WEBAPP" };
export const TimeUnit = { HOUR: "HOUR", MINUTE: "MINUTE", DAY: "DAY" };
export const WorkflowTriggerEvents = {
  BEFORE_EVENT: "BEFORE_EVENT",
  AFTER_EVENT: "AFTER_EVENT",
  NEW_EVENT: "NEW_EVENT",
};

import {
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
} from "@calcom/platform-constants";

export const SCOPE_TO_PERMISSION: Record<string, number> = {
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
};

export const PERMISSION_TO_SCOPE: Record<number, string> = {
  [EVENT_TYPE_READ]: "EVENT_TYPE_READ",
  [EVENT_TYPE_WRITE]: "EVENT_TYPE_WRITE",
  [BOOKING_READ]: "BOOKING_READ",
  [BOOKING_WRITE]: "BOOKING_WRITE",
  [SCHEDULE_READ]: "SCHEDULE_READ",
  [SCHEDULE_WRITE]: "SCHEDULE_WRITE",
  [APPS_READ]: "APPS_READ",
  [APPS_WRITE]: "APPS_WRITE",
  [PROFILE_READ]: "PROFILE_READ",
  [PROFILE_WRITE]: "PROFILE_WRITE",
};
