import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { ISimpleLogger } from "@calcom/features/di/shared/services/logger.service";
import type { getSpamCheckService } from "@calcom/features/di/watchlist/containers/SpamCheckService.container";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { AppsStatus } from "@calcom/types/Calendar";
import type { BookingFlowConfig, CreateRegularBookingData } from "../dto/types";
import type { getBookingData } from "../handleNewBooking/getBookingData";
import type { getEventTypeResponse } from "../handleNewBooking/getEventTypesFromDB";

export type BookingData = Awaited<ReturnType<typeof getBookingData>>;

export type EnrichmentInput = {
  eventTypeId: number;
  eventTypeSlug: string | undefined;
};

export type EnrichedEventType = getEventTypeResponse & {
  isTeamEventType: boolean;
  timeZone: string | null;
};

export type EnrichmentOutput = {
  eventType: EnrichedEventType;
};

export type ValidationInputContext = EnrichmentInput & {
  rawBookingData: CreateRegularBookingData;
  userId?: number;
  eventTimeZone?: string;
};

export type BookingFormData = {
  booker: {
    name: string | { firstName: string; lastName?: string };
    phoneNumber: string | null;
    email: string;
    timeZone: string;
    smsReminderNumber: string | null;
    language: string | null;
  };
  rawBookingLocation: string;
  additionalNotes: string;
  startTime: string;
  endTime: string;
  rawGuests: string[] | null;
  responses: BookingData["responses"];
  rescheduleData: {
    reason: string | null;
    rawUid: string | null;
    rescheduledBy: string | null;
  };
  customInputs: CreateRegularBookingData["customInputs"];
  calEventResponses: BookingData["calEventResponses"];
  calEventUserFieldsResponses: BookingData["calEventUserFieldsResponses"];
  metadata: CreateRegularBookingData["metadata"];
  creationSource: CreateRegularBookingData["creationSource"];
  tracking: CreateRegularBookingData["tracking"];
};

export type PreparedBookingData = {
  eventType: EnrichedEventType;
  bookingFormData: BookingFormData;
  bookingData: BookingData;
  loggedInUser: {
    id: number | null;
  };
  routingData: {
    routedTeamMemberIds: number[] | null;
    reroutingFormResponses: CreateRegularBookingData["reroutingFormResponses"] | null;
    routingFormResponseId: number | null;
    rawTeamMemberEmail: string | null;
    crmRecordId: string | null;
    crmOwnerRecordType: string | null;
    crmAppSlug: string | null;
    skipContactOwner: boolean | null;
    contactOwnerEmail: string | null;
  };
  bookingMeta: {
    areCalendarEventsEnabled: boolean;
    skipAvailabilityCheck: boolean;
    skipEventLimitsCheck: boolean;
    skipBookingTimeOutOfBoundsCheck: boolean;
    skipCalendarSyncTaskCreation: boolean;
    appsStatus: AppsStatus[] | undefined;
    platform: {
      clientId: string | null;
      rescheduleUrl: string | null;
      cancelUrl: string | null;
      bookingUrl: string | null;
      bookingLocation: string | null;
    } | null;
  };
  config: BookingFlowConfig;
  hashedBookingLinkData: {
    hasHashedBookingLink: boolean;
    hashedLink: string | null;
  } | null;
  recurringBookingData: {
    luckyUsers: number[];
    recurringCount: number;
    allRecurringDates: { start: string; end?: string }[] | null;
    isFirstRecurringSlot: boolean;
    numSlotsToCheckForAvailability: number;
    recurringEventId: string | null;
    thirdPartyRecurringEventId: string | null;
  };
  teamOrUserSlug: string | string[] | null;
  seatsData: {
    bookingUid: string | null;
  };
  spamCheckService: ReturnType<typeof getSpamCheckService>;
  eventOrganizationId: number | null;
};

export interface IBookingDataPreparationServiceDependencies {
  log: ISimpleLogger;
  bookingRepository: BookingRepository;
  userRepository: UserRepository;
}
