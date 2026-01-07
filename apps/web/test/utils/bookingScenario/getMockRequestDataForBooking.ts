import { getDate } from "./bookingScenario";

import type { Tracking } from "@calcom/features/bookings/lib/handleNewBooking/types";
import type { SchedulingType } from "@calcom/prisma/client";
import type { CreationSource } from "@calcom/prisma/enums";

const DEFAULT_TIMEZONE_BOOKER = "Asia/Kolkata";

type BasicMockRequestData = {
  start: string;
  end: string;
  eventTypeSlug: string;
  timeZone: string;
  language: string;
  user: string;
  metadata: Record<string, unknown>;
  hasHashedBookingLink: boolean;
};

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

function getBasicMockRequestDataForBooking(): BasicMockRequestData {
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

export function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<BasicMockRequestData> & {
    eventTypeId: number;
    user?: string;
    creationSource?: CreationSource;
    tracking?: Tracking;
  } & CommonPropsMockRequestData;
}): BasicMockRequestData & typeof data {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}

export function getMockRequestDataForDynamicGroupBooking({
  data,
}: {
  data: Partial<BasicMockRequestData> & {
    eventTypeId: 0;
    eventTypeSlug: string;
    user: string;
  } & CommonPropsMockRequestData;
}): BasicMockRequestData & typeof data {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
