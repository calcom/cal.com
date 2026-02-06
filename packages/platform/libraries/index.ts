import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm";
import {
  sendVerificationCode,
  verifyPhoneNumber,
} from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { getRoutedUrl } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import { symmetricDecrypt, symmetricEncrypt } from "@calcom/lib/crypto";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import { createNewUsersConnectToOrgIfExists } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export { slugify } from "@calcom/lib/slugify";
export { slugifyLenient } from "@calcom/lib/slugify-lenient";
export { getBookingForReschedule };

export { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";
export {
  DEFAULT_WEBHOOK_VERSION,
  WebhookVersion,
} from "@calcom/features/webhooks/lib/interface/IWebhookRepository";
export {
  AttributeType,
  CreationSource,
  MembershipRole,
  PeriodType,
  SchedulingType,
  TimeUnit,
  WebhookTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
} from "@calcom/prisma/enums";
export type { EventBusyDate } from "@calcom/types/Calendar";

export { handleMarkNoShow };
export { handleCreatePhoneCall };

export type {
  BookingCreateBody,
  BookingResponse,
} from "@calcom/features/bookings/types";
export type { ConnectedCalendar } from "@calcom/features/calendars/lib/CalendarManager";
export { getBusyCalendarTimes } from "@calcom/features/calendars/lib/CalendarManager";
export type { ConnectedDestinationCalendars } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
export { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";
export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export { ENABLE_ASYNC_TASKER, MINUTES_TO_BOOK } from "@calcom/lib/constants";
export { TRPCError } from "@trpc/server";
export { createNewUsersConnectToOrgIfExists };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { dynamicEvent } from "@calcom/features/eventtypes/lib/defaultEvents";
export { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";
export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { bookingMetadataSchema, teamMetadataSchema, userMetadata } from "@calcom/prisma/zod-utils";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";
export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
export { validateCustomEventName } from "@calcom/features/eventtypes/lib/eventNaming";

export type TeamQuery = Prisma.TeamGetPayload<{
  select: {
    id: true;
    credentials: {
      select: typeof import("@calcom/prisma/selects/credential").credentialForCalendarServiceSelect;
    };
    name: true;
    logoUrl: true;
    members: {
      select: {
        role: true;
      };
    };
  };
}>;

export { credentialForCalendarServiceSelect };
export { paymentDataSelect };
export { getClientSecretFromPayment };

export type { GroupedAttribute } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export { groupMembershipAttributes } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export { confirmHandler as confirmBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
export { getBookingFieldsWithSystemFields };

export { getRoutedUrl };

export { getTeamMemberEmailForResponseOrContactUsingUrlQuery };

export { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
export { getCalendarLinks } from "@calcom/features/bookings/lib/getCalendarLinks";
export { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
export { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
export { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
export type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/trpc/server/routers/viewer/attributes/findTeamMembersMatchingAttributeLogic.schema";

export { verifyPhoneNumber, sendVerificationCode };

export { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
export { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";
export { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
export { StripeBillingService } from "@calcom/features/ee/billing/service/billingProvider/StripeBillingService";
export { TeamService } from "@calcom/features/ee/teams/services/teamService";
export type { OAuth2Tokens } from "@calcom/features/oauth/services/OAuthService";
export { OAuthService } from "@calcom/features/oauth/services/OAuthService";
export { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
export { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
export type { Tasker } from "@calcom/features/tasker/tasker";
export { getTasker } from "@calcom/features/tasker/tasker-factory";
export { verifyCodeChallenge } from "@calcom/lib/pkce";
export { validateUrlForSSRFSync } from "@calcom/lib/ssrfProtection";
export { checkEmailVerificationRequired } from "@calcom/trpc/server/routers/publicViewer/checkIfUserEmailVerificationRequired.handler";
export { verifyCode as verifyCodeAuthenticated } from "@calcom/trpc/server/routers/viewer/organizations/verifyCode.handler";
export type { OrgMembershipLookup } from "@calcom/trpc/server/routers/viewer/slots/util";
