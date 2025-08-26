import type logger from "@calcom/lib/logger";

import type { BookingDataSchemaGetter, CreateBookingData } from "../../dto/types";
import { checkActiveBookingsLimitForBooker } from "../../handleNewBooking/checkActiveBookingsLimitForBooker";
import { checkIfBookerEmailIsBlocked } from "../../handleNewBooking/checkIfBookerEmailIsBlocked";
import { getBookingData } from "../../handleNewBooking/getBookingData";
import type { AwaitedBookingData } from "../../handleNewBooking/getBookingData";
import type { getEventTypeResponse } from "../../handleNewBooking/getEventTypesFromDB";
import { createLoggerWithEventDetails } from "../../handleNewBooking/logger";
import { validateBookingTimeIsNotOutOfBounds } from "../../handleNewBooking/validateBookingTimeIsNotOutOfBounds";
import { validateEventLength } from "../../handleNewBooking/validateEventLength";
import type { EnrichmentBeforeValidationOutputContext } from "./enrichmentBeforeValidation";

export type BookingValidationInputContext = EnrichmentBeforeValidationOutputContext & {
  rawBookingData: CreateBookingData;
  userId?: number;
  eventTimeZone?: string;
};

export type BookingValidationOutputContext = {
  eventType: getEventTypeResponse;
  bookingData: AwaitedBookingData;
  bookerEmail: string;
  bookerPhoneNumber?: string;
  bookerName: string | { firstName: string; lastName?: string };
  additionalNotes?: string;
  location: string;
  reqBody: any; // Complex type that varies based on booking data schema
  isDryRun: boolean;
  loggerWithEventDetails: typeof logger;
};

export interface IBookingValidationServiceDependencies {
  bookingDataSchemaGetter: BookingDataSchemaGetter;
}

export interface IBookingValidationService {
  validate(context: BookingValidationInputContext): Promise<BookingValidationOutputContext>;
}

export class BookingValidationService implements IBookingValidationService {
  constructor(private readonly deps: IBookingValidationServiceDependencies) {}

  async validate(context: BookingValidationInputContext): Promise<BookingValidationOutputContext> {
    const { eventType, rawBookingData, userId, eventTimeZone } = context;

    const bookingDataSchema = this.deps.bookingDataSchemaGetter({
      view: rawBookingData.rescheduleUid ? "reschedule" : "booking",
      bookingFields: eventType.bookingFields,
    });

    const bookingData = await getBookingData({
      reqBody: rawBookingData,
      eventType,
      schema: bookingDataSchema,
    });

    const {
      recurringCount,
      noEmail,
      eventTypeId,
      eventTypeSlug,
      hasHashedBookingLink,
      language,
      appsStatus: reqAppsStatus,
      name: bookerName,
      attendeePhoneNumber: bookerPhoneNumber,
      email: bookerEmail,
      guests: reqGuests,
      location,
      notes: additionalNotes,
      smsReminderNumber,
      rescheduleReason,
      luckyUsers,
      routedTeamMemberIds,
      reroutingFormResponses,
      routingFormResponseId,
      _isDryRun: isDryRun = false,
      _shouldServeCache,
      ...reqBody
    } = bookingData;

    const loggerWithEventDetails = createLoggerWithEventDetails(eventTypeId, reqBody.user, eventTypeSlug);

    await validateBookingTimeIsNotOutOfBounds<typeof eventType>(
      reqBody.start,
      reqBody.timeZone,
      eventType,
      eventTimeZone,
      loggerWithEventDetails
    );

    validateEventLength({
      reqBodyStart: reqBody.start,
      reqBodyEnd: reqBody.end,
      eventTypeMultipleDuration: eventType.metadata?.multipleDuration,
      eventTypeLength: eventType.length,
      logger: loggerWithEventDetails,
    });

    await checkIfBookerEmailIsBlocked({ loggedInUserId: userId, bookerEmail });

    if (!rawBookingData.rescheduleUid) {
      await checkActiveBookingsLimitForBooker({
        eventTypeId,
        maxActiveBookingsPerBooker: eventType.maxActiveBookingsPerBooker,
        bookerEmail,
        offerToRescheduleLastBooking: eventType.maxActiveBookingPerBookerOfferReschedule,
      });
    }

    return {
      eventType,
      bookingData,
      bookerEmail,
      bookerPhoneNumber,
      bookerName,
      additionalNotes,
      location,
      reqBody,
      isDryRun,
      loggerWithEventDetails,
    };
  }
}
