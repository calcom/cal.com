import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarService } from "@calcom/app-store/applecalendar/lib";
import { CalendarService as IcsFeedCalendarService } from "@calcom/app-store/ics-feedcalendar/lib";
import type { CredentialOwner } from "@calcom/app-store/types";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";
import AttendeeCancelledEmail from "@calcom/emails/templates/attendee-cancelled-email";
import AttendeeDeclinedEmail from "@calcom/emails/templates/attendee-declined-email";
import AttendeeRequestEmail from "@calcom/emails/templates/attendee-request-email";
import AttendeeRescheduledEmail from "@calcom/emails/templates/attendee-rescheduled-email";
import AttendeeScheduledEmail from "@calcom/emails/templates/attendee-scheduled-email";
import AttendeeUpdatedEmail from "@calcom/emails/templates/attendee-updated-email";
import OrganizerCancelledEmail from "@calcom/emails/templates/organizer-cancelled-email";
import OrganizerReassignedEmail from "@calcom/emails/templates/organizer-reassigned-email";
import OrganizerRequestEmail from "@calcom/emails/templates/organizer-request-email";
import OrganizerRescheduledEmail from "@calcom/emails/templates/organizer-rescheduled-email";
import OrganizerScheduledEmail from "@calcom/emails/templates/organizer-scheduled-email";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";
import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import * as instantMeetingMethods from "@calcom/features/instant-meeting/handleInstantMeeting";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import { symmetricEncrypt, symmetricDecrypt } from "@calcom/lib/crypto";
import getBulkEventTypes from "@calcom/lib/event-types/getBulkEventTypes";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import type { TeamQuery } from "@calcom/trpc/server/routers/loggedInViewer/integrations.handler";
import { updateHandler as updateScheduleHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.handler";
import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
import {
  createNewUsersConnectToOrgIfExists,
  sendSignupToOrganizationEmail,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { App } from "@calcom/types/App";
import type { CredentialPayload } from "@calcom/types/Credential";

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
export { handleCreatePhoneCall };

export { getAvailableSlots };
export type AvailableSlotsType = Awaited<ReturnType<typeof getAvailableSlots>>;
export { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";

export { getConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";
export type { ConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";

export { getConnectedApps } from "@calcom/lib/getConnectedApps";
export { bulkUpdateEventsToDefaultLocation } from "@calcom/lib/bulkUpdateEventsToDefaultLocation";
export type { ConnectedApps } from "@calcom/lib/getConnectedApps";
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

export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";

export { TRPCError } from "@trpc/server";
export type { TUpdateInputSchema } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.schema";
export type { TUpdateInputSchema as TUpdateEventTypeInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/update.schema";
export { createNewUsersConnectToOrgIfExists, sendSignupToOrganizationEmail };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { eventTypeBookingFields, eventTypeLocations } from "@calcom/prisma/zod-utils";

export { EventTypeMetaDataSchema, userMetadata, bookingMetadataSchema } from "@calcom/prisma/zod-utils";

export {
  // note(Lauris): Api to internal
  transformBookingFieldsApiToInternal,
  transformLocationsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformRecurrenceApiToInternal,
  transformBookerLayoutsApiToInternal,
  transformConfirmationPolicyApiToInternal,
  transformEventColorsApiToInternal,
  transformSeatsApiToInternal,
  // note(Lauris): Internal to api
  transformBookingFieldsInternalToApi,
  transformLocationsInternalToApi,
  transformIntervalLimitsInternalToApi,
  transformFutureBookingLimitsInternalToApi,
  transformRecurrenceInternalToApi,
  transformBookerLayoutsInternalToApi,
  transformRequiresConfirmationInternalToApi,
  transformEventTypeColorsInternalToApi,
  transformSeatsInternalToApi,
  // note(Lauris): schemas
  InternalLocationsSchema,
  InternalLocationSchema,
  BookingFieldsSchema,
  BookingFieldSchema,
  // note(Lauris): constants
  systemBeforeFieldName,
  systemBeforeFieldEmail,
  systemBeforeFieldLocation,
  systemAfterFieldRescheduleReason,
} from "@calcom/lib/event-types/transformers";

export type {
  SystemField,
  CustomField,
  NameSystemField,
  EmailSystemField,
  InternalLocation,
} from "@calcom/lib/event-types/transformers";

export { parseBookingLimit, parseEventTypeColor } from "@calcom/lib";

export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { dynamicEvent } from "@calcom/lib/defaultEvents";

export { symmetricEncrypt, symmetricDecrypt };
export { CalendarService };

export { getCalendar };

export { getTranslation };

export { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";

export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";

export { ErrorCode } from "@calcom/lib/errorCodes";

export { IcsFeedCalendarService };
export { validateCustomEventName } from "@calcom/core/event";
export { getEnabledAppsFromCredentials };
export type { App };
export type { CredentialDataWithTeamName };
export type { LocationOption };
export type { TeamQuery };
export type { CredentialOwner };
export type { TDependencyData };
export type { CredentialPayload };

export { getAppFromSlug };
export { credentialForCalendarServiceSelect };
export { MembershipRole };

export { paymentDataSelect };
export { getClientSecretFromPayment };

export { confirmHandler as confirmBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";

export { AttendeeScheduledEmail };

export { OrganizerScheduledEmail };

export { AttendeeDeclinedEmail };

export { AttendeeCancelledEmail };

export { OrganizerCancelledEmail };

export { OrganizerReassignedEmail };

export { OrganizerRescheduledEmail };

export { AttendeeRescheduledEmail };

export { AttendeeUpdatedEmail };

export { OrganizerRequestEmail };

export { AttendeeRequestEmail };
export { handleDeleteCredential };
export { getBulkEventTypes };

export { getBookingFieldsWithSystemFields };
