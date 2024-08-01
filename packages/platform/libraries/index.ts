import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarService } from "@calcom/app-store/applecalendar/lib";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";
import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import * as instantMeetingMethods from "@calcom/features/instant-meeting/handleInstantMeeting";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import { getTranslation } from "@calcom/lib/server/i18n";
import { updateHandler as updateScheduleHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.handler";
import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
import {
  createNewUsersConnectToOrgIfExists,
  sendSignupToOrganizationEmail,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export { slugify } from "@calcom/lib/slugify";
export { getBookingForReschedule };
export { updateScheduleHandler };
export type UpdateScheduleOutputType = Awaited<
  ReturnType<
    typeof import("@calcom/trpc/server/routers/viewer/availability/schedule/update.handler").updateHandler
  >
>;
export { getEventTypeById } from "@calcom/lib/event-types/getEventTypeById";
export { getEventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
export { getEventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export { createHandler as createEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/create.handler";
export { updateHandler as updateEventType } from "@calcom/trpc/server/routers/viewer/eventTypes/update.handler";

export { SchedulingType, PeriodType } from "@calcom/prisma/enums";

export type { EventType } from "@calcom/lib/event-types/getEventTypeById";
export type { EventTypesByViewer } from "@calcom/lib/event-types/getEventTypesByViewer";
export type { EventTypesPublic } from "@calcom/lib/event-types/getEventTypesPublic";
export type { UpdateEventTypeReturn } from "@calcom/trpc/server/routers/viewer/eventTypes/update.handler";

export type PublicEventType = Awaited<ReturnType<typeof getPublicEvent>>;
export { getPublicEvent };
export { getUsernameList } from "@calcom/lib/defaultEvents";

const handleNewBooking = newBookingMethods.default;
export { handleNewBooking };
const handleInstantMeeting = instantMeetingMethods.default;
export { handleInstantMeeting };

export { handleMarkNoShow };

export { getAvailableSlots };
export type AvailableSlotsType = Awaited<ReturnType<typeof getAvailableSlots>>;
export { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";

export { getConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
export type { ConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
export { getBusyCalendarTimes } from "@calcom/core/CalendarManager";

export {
  transformWorkingHoursForAtom,
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformApiScheduleAvailability,
  transformApiScheduleOverrides,
} from "@calcom/lib/schedules/transformers";

export type {
  BookingCreateBody,
  BookingResponse,
  RecurringBookingCreateBody,
} from "@calcom/features/bookings/types";
export { HttpError } from "@calcom/lib/http-error";
export type { AppsStatus } from "@calcom/types/Calendar";

export { MINUTES_TO_BOOK } from "@calcom/lib/constants";

export { cityTimezonesHandler } from "@calcom/lib/cityTimezonesHandler";
export type { CityTimezones } from "@calcom/lib/cityTimezonesHandler";

export { TRPCError } from "@trpc/server";
export type { TUpdateInputSchema } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.schema";

export { createNewUsersConnectToOrgIfExists, sendSignupToOrganizationEmail };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { eventTypeBookingFields, eventTypeLocations } from "@calcom/prisma/zod-utils";

export { EventTypeMetaDataSchema, userMetadata } from "@calcom/prisma/zod-utils";

export {
  transformApiEventTypeBookingFields,
  transformApiEventTypeLocations,
  getResponseEventTypeLocations,
  getResponseEventTypeBookingFields,
  TransformedLocationsSchema,
  BookingFieldsSchema,
} from "@calcom/lib/event-types/transformers";

export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { dynamicEvent } from "@calcom/lib/defaultEvents";

export { symmetricEncrypt };
export { CalendarService };

export { getCalendar };

export { getTranslation };

export { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
