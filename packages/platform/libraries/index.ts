import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import getBookingInfo from "@calcom/features/bookings/lib/getBookingInfo";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import * as newBookingMethods from "@calcom/features/bookings/lib/handleNewBooking";
import { getClientSecretFromPayment } from "@calcom/features/ee/payments/pages/getClientSecretFromPayment";
import { handleCreatePhoneCall } from "@calcom/features/handleCreatePhoneCall";
import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import * as instantMeetingMethods from "@calcom/features/instant-meeting/handleInstantMeeting";
import getAllUserBookings from "@calcom/lib/bookings/getAllUserBookings";
import { symmetricEncrypt, symmetricDecrypt } from "@calcom/lib/crypto";
import { getRoutedUrl } from "@calcom/lib/server/getRoutedUrl";
import { getTeamMemberEmailForResponseOrContactUsingUrlQuery } from "@calcom/lib/server/getTeamMemberEmailFromCrm";
import { getTranslation } from "@calcom/lib/server/i18n";
import { MembershipRole } from "@calcom/prisma/enums";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";
import { paymentDataSelect } from "@calcom/prisma/selects/payment";
import type { TeamQuery } from "@calcom/trpc/server/routers/loggedInViewer/integrations.handler";
import { createNewUsersConnectToOrgIfExists } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

export { getUsersCredentials } from "@calcom/lib/server/getUsersCredentials";

export { slugify } from "@calcom/lib/slugify";
export { getBookingForReschedule };

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

export { getBusyCalendarTimes } from "@calcom/lib/CalendarManager";

export type {
  BookingCreateBody,
  BookingResponse,
  RecurringBookingCreateBody,
} from "@calcom/features/bookings/types";
export { HttpError } from "@calcom/lib/http-error";

export { MINUTES_TO_BOOK } from "@calcom/lib/constants";

export { cityTimezonesHandler } from "@calcom/features/cityTimezones/cityTimezonesHandler";
export type { CityTimezones } from "@calcom/features/cityTimezones/cityTimezonesHandler";

export { TRPCError } from "@trpc/server";
export { createNewUsersConnectToOrgIfExists };

export { getAllUserBookings };
export { getBookingInfo };
export { handleCancelBooking };

export { userMetadata, bookingMetadataSchema } from "@calcom/prisma/zod-utils";

export { parseBookingLimit } from "@calcom/lib/intervalLimits/isBookingLimits";

export { parseRecurringEvent } from "@calcom/lib/isRecurringEvent";
export { dynamicEvent } from "@calcom/lib/defaultEvents";

export { symmetricEncrypt, symmetricDecrypt };

export { getTranslation };

export { roundRobinReassignment } from "@calcom/features/ee/round-robin/roundRobinReassignment";
export { roundRobinManualReassignment } from "@calcom/features/ee/round-robin/roundRobinManualReassignment";

export { ErrorCode } from "@calcom/lib/errorCodes";

export { validateCustomEventName } from "@calcom/lib/event";
export type { TeamQuery };

export { credentialForCalendarServiceSelect };
export { MembershipRole };

export { paymentDataSelect };
export { getClientSecretFromPayment };

export { confirmHandler as confirmBookingHandler } from "@calcom/trpc/server/routers/viewer/bookings/confirm.handler";

export { getBookingFieldsWithSystemFields };

export { getRoutedUrl };

export { getTeamMemberEmailForResponseOrContactUsingUrlQuery };

export { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";
export { encryptServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
export { createHandler as createApiKeyHandler } from "@calcom/trpc/server/routers/viewer/apiKeys/create.handler";
export { getCalendarLinks } from "@calcom/lib/bookings/getCalendarLinks";
