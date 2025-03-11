import type { TDependencyData } from "@calcom/app-store/_appRegistry";
import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { CalendarService } from "@calcom/app-store/applecalendar/lib";
import { CalendarService as IcsFeedCalendarService } from "@calcom/app-store/ics-feedcalendar/lib";
import type { CredentialOwner } from "@calcom/app-store/types";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";
import getApps from "@calcom/app-store/utils";
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
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import * as instantMeetingMethods from "@calcom/features/instant-meeting/handleInstantMeeting";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import { symmetricEncrypt, symmetricDecrypt } from "@calcom/lib/crypto";
import {
  getFirstDelegationConferencingCredentialAppLocation,
  getFirstDelegationConferencingCredential,
  getDelegationCredentialOrRegularCredential,
  getDelegationCredentialOrFindRegularCredential,
  enrichUserWithDelegationConferencingCredentialsWithoutOrgId,
  enrichUserWithDelegationCredentialsWithoutOrgId,
  enrichHostsWithDelegationCredentials,
  enrichUsersWithDelegationCredentials,
  buildAllCredentials,
  getAllDelegationCredentialsForUserByAppSlug,
  getAllDelegationCredentialsForUserByAppType,
  checkIfSuccessfullyConfiguredInWorkspace,
} from "@calcom/lib/delegationCredential/server";
import { getRoutedUrl } from "@calcom/lib/server/getRoutedUrl";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/lib/server/getTeamMemberEmailFromCrm";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import type { TeamQuery } from "@calcom/trpc/server/routers/loggedInViewer/integrations.handler";
import { updateHandler as updateScheduleHandler } from "@calcom/trpc/server/routers/viewer/availability/schedule/update.handler";
import addDelegationCredential from "@calcom/trpc/server/routers/viewer/delegationCredential/add.handler";
import {
  createNewUsersConnectToOrgIfExists,
  sendSignupToOrganizationEmail,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import type { App } from "@calcom/types/App";
import type { CredentialPayload } from "@calcom/types/Credential";

export { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";

export { getApps };

export {
  getFirstDelegationConferencingCredentialAppLocation,
  getFirstDelegationConferencingCredential,
  getDelegationCredentialOrRegularCredential,
  getDelegationCredentialOrFindRegularCredential,
  enrichUserWithDelegationConferencingCredentialsWithoutOrgId,
  enrichUserWithDelegationCredentialsWithoutOrgId,
  enrichHostsWithDelegationCredentials,
  enrichUsersWithDelegationCredentials,
  buildAllCredentials,
  getAllDelegationCredentialsForUserByAppSlug,
  getAllDelegationCredentialsForUserByAppType,
  checkIfSuccessfullyConfiguredInWorkspace,
};

export { slugify } from "@calcom/lib/slugify";
export { getBookingForReschedule };
export { updateScheduleHandler };
export type UpdateScheduleOutputType = Awaited<
  ReturnType<
    typeof import("@calcom/trpc/server/routers/viewer/availability/schedule/update.handler").updateHandler
  >
>;

export { SchedulingType, PeriodType } from "@calcom/prisma/enums";

export { getUsernameList } from "@calcom/lib/defaultEvents";

const handleNewBooking = newBookingMethods.default;
export { handleNewBooking };
const handleInstantMeeting = instantMeetingMethods.default;
export { handleInstantMeeting };

export { handleMarkNoShow };
export { handleCreatePhoneCall };

export { handleNewRecurringBooking } from "@calcom/features/bookings/lib/handleNewRecurringBooking";

export { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/lib/getConnectedDestinationCalendars";
export type { ConnectedDestinationCalendars } from "@calcom/lib/getConnectedDestinationCalendars";

export { getConnectedApps } from "@calcom/lib/getConnectedApps";

export type { ConnectedApps } from "@calcom/lib/getConnectedApps";
export { getBusyCalendarTimes } from "@calcom/lib/CalendarManager";

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
export { createNewUsersConnectToOrgIfExists, sendSignupToOrganizationEmail };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { userMetadata, bookingMetadataSchema } from "@calcom/prisma/zod-utils";

export { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";

export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { dynamicEvent } from "@calcom/lib/defaultEvents";

export { symmetricEncrypt, symmetricDecrypt };
export { CalendarService };

export { getCalendar };

export { getTranslation };

export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";

export { ErrorCode } from "@calcom/lib/errorCodes";

export { IcsFeedCalendarService };
export { validateCustomEventName } from "@calcom/lib/event";
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

export { getBookingFieldsWithSystemFields };

export { getRoutedUrl };

export { getTeamMemberEmailForResponseOrContactUsingUrlQuery };

export { addDelegationCredential };

export { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
export { toggleDelegationCredentialEnabled } from "@calcom/trpc/server/routers/viewer/delegationCredential/toggleEnabled.handler";
export { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
