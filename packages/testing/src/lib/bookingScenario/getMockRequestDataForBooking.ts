import { getDate } from "./bookingScenario";
import type { SchedulingType } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";
import type { Tracking } from "../types";

export const DEFAULT_TIMEZONE_BOOKER = "Asia/Kolkata";
export function getBasicMockRequestDataForBooking() {
  return {
    start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
    end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
    eventTypeSlug: "no-confirmation",
    timeZone: DEFAULT_TIMEZONE_BOOKER,
    language: "en",
    user: "teampro",
    metadata: {},
    hasHashedBookingLink: false,
  };
}

type CommonPropsMockRequestData = {
  rescheduleUid?: string;
  bookingUid?: string;
  recurringEventId?: string;
  recurringCount?: number;
  rescheduledBy?: string;
  cancelledBy?: string;
  schedulingType?: SchedulingType;
  guests?: string[];
  responses: {
    email: string;
    name: string;
    location?: { optionValue: ""; value: string };
    attendeePhoneNumber?: string;
    smsReminderNumber?: string;
  };
  _isDryRun?: boolean;
  hashedLink?: string;
  hasHashedBookingLink?: boolean;
};

export function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: number;
    user?: string;
    creationSource?: CreationSource;
    tracking?: Tracking;
  } & CommonPropsMockRequestData;
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}

export function getMockRequestDataForDynamicGroupBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: 0;
    eventTypeSlug: string;
    user: string;
  } & CommonPropsMockRequestData;
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
