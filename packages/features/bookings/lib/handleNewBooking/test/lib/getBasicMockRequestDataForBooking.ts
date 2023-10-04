import { getDate } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

export function getBasicMockRequestDataForBooking() {
  return {
    start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
    end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
    eventTypeSlug: "no-confirmation",
    timeZone: "Asia/Calcutta",
    language: "en",
    user: "teampro",
    metadata: {},
    hasHashedBookingLink: false,
    hashedLink: null,
  };
}
