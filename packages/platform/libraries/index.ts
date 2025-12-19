import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import getAllUserBookings from "@calcom/features/bookings/lib/getAllUserBookings";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/features/ee/teams/lib/getTeamMemberEmailFromCrm";
import {
  verifyPhoneNumber,
  sendVerificationCode,
} from "@calcom/features/ee/workflows/lib/reminders/verifyPhoneNumber";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { getRoutedUrl } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import { symmetricEncrypt, symmetricDecrypt } from "@calcom/lib/crypto";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import { createNewUsersConnectToOrgIfExists } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export { slugify } from "@calcom/lib/slugify";
export { slugifyLenient } from "@calcom/lib/slugify-lenient";
export { getBookingForReschedule };

export type { EventBusyDate } from "@calcom/types/Calendar";

export {
  CreationSource,
  SchedulingType,
  PeriodType,
  AttributeType,
  MembershipRole,
  TimeUnit,
  WebhookTriggerEvents,
  WorkflowTriggerEvents,
  WorkflowActions,
  WorkflowTemplates,
} from "@calcom/prisma/enums";

export {
  WebhookVersion,
  DEFAULT_WEBHOOK_VERSION,
} from "@calcom/features/webhooks/lib/interface/IWebhookRepository";

export { getUsernameList } from "@calcom/features/eventtypes/lib/defaultEvents";

export { handleMarkNoShow };
export { handleCreatePhoneCall };

export { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/features/calendars/lib/getConnectedDestinationCalendars";

export { getBusyCalendarTimes } from "@calcom/features/calendars/lib/CalendarManager";

export type { BookingCreateBody, BookingResponse } from "@calcom/features/bookings/types";
export { HttpError } from "@calcom/lib/http-error";

export { MINUTES_TO_BOOK, ENABLE_ASYNC_TASKER } from "@calcom/lib/constants";

export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";

export { TRPCError } from "@trpc/server";
export { createNewUsersConnectToOrgIfExists };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { userMetadata, bookingMetadataSchema, teamMetadataSchema } from "@calcom/prisma/zod-utils";

export { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";

export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { dynamicEvent } from "@calcom/features/eventtypes/lib/defaultEvents";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";

export { ErrorCode } from "@calcom/lib/errorCodes";

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

export { confirmHandler as confirmBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";
export { groupMembershipAttributes } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export type { GroupedAttribute } from "@calcom/trpc/server/routers/viewer/attributes/getByUserId.handler";
export { getBookingFieldsWithSystemFields };

export { getRoutedUrl };

export { getTeamMemberEmailForResponseOrContactUsingUrlQuery };

export { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
export { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
export { getCalendarLinks } from "@calcom/features/bookings/lib/getCalendarLinks";

export { findTeamMembersMatchingAttributeLogic } from "@calcom/app-store/_utils/raqb/findTeamMembersMatchingAttributeLogic";
export type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "@calcom/trpc/server/routers/viewer/attributes/findTeamMembersMatchingAttributeLogic.schema";
export { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";

export { verifyPhoneNumber, sendVerificationCode };

export { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";

export { verifyCode as verifyCodeAuthenticated } from "@calcom/trpc/server/routers/viewer/organizations/verifyCode.handler";

export { sendEmailVerificationByCode } from "@calcom/features/auth/lib/verifyEmail";

export { checkEmailVerificationRequired } from "@calcom/trpc/server/routers/publicViewer/checkIfUserEmailVerificationRequired.handler";

export { TeamService } from "@calcom/features/ee/teams/services/teamService";

export { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
export { getTasker } from "@calcom/features/tasker/tasker-factory";
export type { Tasker } from "@calcom/features/tasker/tasker";
