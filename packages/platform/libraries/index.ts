import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";
import * as instantMeetingMethods from "@calcom/features/instant-meeting/handleInstantMeeting";

export { getEventTypeById } from "@calcom/lib/getEventTypeById";
export { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
export { getUsernameList } from "@calcom/lib/defaultEvents";

const handleNewBooking = newBookingMethods.default;
export { handleNewBooking };
const handleInstantMeeting = instantMeetingMethods.default;
export { handleInstantMeeting };
export { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
export { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";

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
export type {
  BookingCreateBody,
  BookingResponse,
  RecurringBookingCreateBody,
} from "@calcom/features/bookings/types";
export { HttpError } from "@calcom/lib/http-error";
export type { AppsStatus } from "@calcom/types/Calendar";

export { MINUTES_TO_BOOK } from "@calcom/lib/constants";
