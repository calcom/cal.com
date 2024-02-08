import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";

export { getEventTypeById } from "@calcom/lib/getEventTypeById";
export { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
export { getUsernameList } from "@calcom/lib/defaultEvents";

const handleNewBooking = newBookingMethods.default;
export { handleNewBooking };
export { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
export type { EventType } from "@calcom/lib/getEventTypeById";
export { getConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
export type { Calendars } from "./getConnectedDestinationCalendars";
export { getBusyCalendarTimes } from "@calcom/core/CalendarManager";

export {
  transformWorkingHoursForClient,
  transformAvailabilityForClient,
  transformDateOverridesForClient,
} from "@calcom/lib/schedules/client/transformers";
export type {
  ScheduleWithAvailabilities,
  ScheduleWithAvailabilitiesForWeb,
} from "@calcom/lib/schedules/client/transformers";
