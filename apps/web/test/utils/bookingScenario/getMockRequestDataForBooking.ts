import type { SchedulingType } from "@calcom/prisma/client";
import { getDate } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

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
    hashedLink: null,
  };
}
export function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: number;
    user?: string;
    rescheduleUid?: string;
    bookingUid?: string;
    recurringEventId?: string;
    recurringCount?: number;
    schedulingType?: SchedulingType;
    responses: {
      email: string;
      name: string;
      location: { optionValue: ""; value: string };
      smsReminderNumber?: string;
    };
  };
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
