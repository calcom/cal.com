import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import {
  bookingResponsesSchema,
  seatedBookingDataSchema,
} from "@/ee/bookings/2024-08-13/services/output.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { hashAPIKey, isApiKey, stripApiKey } from "@/lib/api-key";
import { defaultBookingResponses } from "@/lib/safe-parse/default-responses-booking";
import { safeParse } from "@/lib/safe-parse/safe-parse";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { BookingSeatRepository } from "@/modules/booking-seat/booking-seat.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreationSource } from "@prisma/client";
import { isURL, isPhoneNumber } from "class-validator";
import { Request } from "express";
import { DateTime } from "luxon";
import { NextApiRequest } from "next/types";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import {
  EventTypeMetaDataSchema,
  apiToInternalintegrationsMapping,
} from "@calcom/platform-libraries/event-types";
import {
  CancelBookingInput,
  CancelBookingInput_2024_08_13,
  CancelSeatedBookingInput_2024_08_13,
  CreateBookingInput_2024_08_13,
  CreateInstantBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
  GetBookingsInput_2024_08_13,
  MarkAbsentBookingInput_2024_08_13,
  RescheduleBookingInput,
  RescheduleBookingInput_2024_08_13,
  RescheduleSeatedBookingInput_2024_08_13,
} from "@calcom/platform-types";
import { BookingInputLocation_2024_08_13 } from "@calcom/platform-types/bookings/2024-08-13/inputs/location.input";
import { EventType } from "@calcom/prisma/client";

type BookingRequest = NextApiRequest & { userId: number | undefined } & OAuthRequestParams;

type OAuthRequestParams = {
  platformClientId: string;
  platformRescheduleUrl: string;
  platformCancelUrl: string;
  platformBookingUrl: string;
  platformBookingLocation?: string;
  arePlatformEmailsEnabled: boolean;
};

export enum Frequency {
  "YEARLY",
  "MONTHLY",
  "WEEKLY",
  "DAILY",
  "HOURLY",
  "MINUTELY",
  "SECONDLY",
}

const recurringEventSchema = z.object({
  dtstart: z.string().optional(),
  interval: z.number().int(),
  count: z.number().int(),
  freq: z.nativeEnum(Frequency),
  until: z.string().optional(),
});

@Injectable()
export class InputBookingsService_2024_08_13 {
  private readonly logger = new Logger("InputBookingsService_2024_08_13");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly config: ConfigService,
    private readonly apiKeyRepository: ApiKeysRepository,
    private readonly bookingSeatRepository: BookingSeatRepository,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14,
    private readonly platformBookingsService: PlatformBookingsService,
    private readonly usersRepository: UsersRepository
  ) {}

  async createBookingRequest(
    request: Request,
    body: CreateBookingInput_2024_08_13 | CreateInstantBookingInput_2024_08_13
  ): Promise<BookingRequest> {
    const oAuthClientParams = await this.platformBookingsService.getOAuthClientParams(body.eventTypeId);
    const bodyTransformed = await this.transformInputCreateBooking(body, oAuthClientParams?.platformClientId);

    const newRequest = { ...request };
    const userId = (await this.createBookingRequestOwnerId(request)) ?? undefined;

    this.logger.log(`createBookingRequest_2024_08_13`, {
      requestId: request.get("X-Request-Id"),
      ownerId: userId,
      oAuthClientParams,
    });

    if (oAuthClientParams) {
      Object.assign(newRequest, { userId, ...oAuthClientParams });
      newRequest.body = {
        ...bodyTransformed,
        noEmail: !oAuthClientParams.arePlatformEmailsEnabled,
        creationSource: CreationSource.API_V2,
      };
    } else {
      Object.assign(newRequest, { userId });
      newRequest.body = { ...bodyTransformed, noEmail: false, creationSource: CreationSource.API_V2 };
    }

    return newRequest as unknown as BookingRequest;
  }

  async transformInputCreateBooking(inputBooking: CreateBookingInput_2024_08_13, platformClientId?: string) {
    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
      inputBooking.eventTypeId
    );

    if (!eventType) {
      throw new NotFoundException(`Event type with id=${inputBooking.eventTypeId} not found`);
    }

    this.validateBookingLengthInMinutes(inputBooking, eventType);

    const lengthInMinutes = inputBooking.lengthInMinutes ?? eventType.length;
    const startTime = DateTime.fromISO(inputBooking.start, { zone: "utc" }).setZone(
      inputBooking.attendee.timeZone
    );
    const endTime = startTime.plus({ minutes: lengthInMinutes });

    const guests =
      inputBooking.guests && platformClientId
        ? await this.platformBookingsService.getPlatformAttendeesEmails(inputBooking.guests, platformClientId)
        : inputBooking.guests;
    const attendeeEmail =
      inputBooking.attendee.email && platformClientId
        ? await this.platformBookingsService.getPlatformAttendeeEmail(
            inputBooking.attendee.email,
            platformClientId
          )
        : inputBooking.attendee.email;

    const inputLocation = inputBooking.location || inputBooking.meetingUrl;
    this.isBookingLocationWithEventTypeLocations(inputLocation, eventType);
    const location = inputLocation ? this.transformLocation(inputLocation) : undefined;

    return {
      start: startTime.toISO(),
      end: endTime.toISO(),
      eventTypeId: inputBooking.eventTypeId,
      timeZone: inputBooking.attendee.timeZone,
      language: inputBooking.attendee.language || "en",
      metadata: inputBooking.metadata || {},
      hasHashedBookingLink: false,
      guests,
      // note(Lauris): responses with name and email are required by the handleNewBooking
      responses: {
        ...(inputBooking.bookingFieldsResponses || {}),
        name: inputBooking.attendee.name,
        email: attendeeEmail ?? "",
        attendeePhoneNumber: inputBooking.attendee.phoneNumber,
        guests,
        location,
      },
    };
  }

  validateBookingLengthInMinutes(inputBooking: CreateBookingInput_2024_08_13, eventType: EventType) {
    const eventTypeMetadata = EventTypeMetaDataSchema.parse(eventType.metadata);
    if (inputBooking.lengthInMinutes && !eventTypeMetadata?.multipleDuration) {
      throw new BadRequestException(
        "Can't specify 'lengthInMinutes' because event type does not have multiple possible lengths. Please, remove the 'lengthInMinutes' field from the request."
      );
    }
    if (
      inputBooking.lengthInMinutes &&
      !eventTypeMetadata?.multipleDuration?.includes(inputBooking.lengthInMinutes)
    ) {
      throw new BadRequestException(
        `Provided 'lengthInMinutes' is not one of the possible lengths for the event type. The possible lengths are: ${eventTypeMetadata?.multipleDuration?.join(
          ", "
        )}`
      );
    }
  }

  async createRecurringBookingRequest(
    request: Request,
    body: CreateRecurringBookingInput_2024_08_13
  ): Promise<BookingRequest> {
    const oAuthClientParams = await this.platformBookingsService.getOAuthClientParams(body.eventTypeId);
    // note(Lauris): update to this.transformInputCreate when rescheduling is implemented
    const bodyTransformed = await this.transformInputCreateRecurringBooking(
      body,
      oAuthClientParams?.platformClientId
    );

    const newRequest = { ...request };
    const userId = (await this.createBookingRequestOwnerId(request)) ?? undefined;

    if (oAuthClientParams) {
      Object.assign(newRequest, {
        userId,
        ...oAuthClientParams,
        noEmail: !oAuthClientParams.arePlatformEmailsEnabled,
      });
    } else {
      Object.assign(newRequest, { userId });
    }

    newRequest.body = bodyTransformed.map((event) => ({
      ...event,
      creationSource: CreationSource.API_V2,
    }));

    return newRequest as unknown as BookingRequest;
  }

  transformLocation(location: string | BookingInputLocation_2024_08_13): {
    value: string;
    optionValue: string;
  } {
    if (typeof location === "string") {
      // note(Lauris): this is for backwards compatibility because before switching to booking location objects
      // we only received a string. If someone is complaining that their location is not displaying as a URL
      // or whatever check that they are not providing a string for bookign location but one of the input objects.
      if (isURL(location, { require_protocol: false }) || location.startsWith("www.")) {
        return {
          value: "link",
          optionValue: location,
        };
      }

      if (isPhoneNumber(location)) {
        return {
          value: "phone",
          optionValue: location,
        };
      }

      return {
        value: "somewhereElse",
        optionValue: location,
      };
    }

    if (location.type === "integration") {
      const integration = apiToInternalintegrationsMapping[location.integration];
      if (!integration) {
        throw new BadRequestException(`Invalid integration: ${location.integration}`);
      }
      return {
        value: integration,
        optionValue: "",
      };
    }

    if (location.type === "address") {
      return {
        value: "inPerson",
        optionValue: "",
      };
    }

    if (location.type === "attendeeAddress") {
      return {
        value: "attendeeInPerson",
        optionValue: location.address,
      };
    }

    if (location.type === "link") {
      return {
        value: "link",
        optionValue: "",
      };
    }

    if (location.type === "phone") {
      return {
        value: "userPhone",
        optionValue: "",
      };
    }

    if (location.type === "organizersDefaultApp") {
      return {
        value: "conferencing",
        optionValue: "",
      };
    }

    if (location.type === "attendeePhone") {
      return {
        value: "phone",
        optionValue: location.phone,
      };
    }

    if (location.type === "attendeeDefined") {
      return {
        value: "somewhereElse",
        optionValue: location.location,
      };
    }

    throw new BadRequestException(
      `Booking location with type ${(location as BookingInputLocation_2024_08_13).type} not valid.`
    );
  }

  private isBookingLocationWithEventTypeLocations(
    inputBookingLocation: undefined | string | BookingInputLocation_2024_08_13,
    dbEventType: EventType
  ) {
    if (!inputBookingLocation || typeof inputBookingLocation === "string") {
      // note(Lauris): for backwards compatibility because we had string locations before so let them pass.
      return true;
    }

    const eventTypeLocations = this.outputEventTypesService.transformLocations(dbEventType.locations);
    const allowedLocationTypes = eventTypeLocations.map((location) => location.type);

    const isAllowed = allowedLocationTypes.includes(inputBookingLocation.type);
    if (!isAllowed) {
      throw new BadRequestException(
        `Booking location with type ${inputBookingLocation.type} not valid for event type with id=${
          dbEventType.id
        }. The event type has following location types: ${allowedLocationTypes.join(
          ", "
        )}, and only these types are allowed for booking location.`
      );
    }

    if (inputBookingLocation.type === "integration" && "integration" in inputBookingLocation) {
      const allowedIntegrations = eventTypeLocations
        .filter((location) => location.type === "integration")
        .map((location) => location.integration);

      const isAllowedIntegration = allowedIntegrations.includes(inputBookingLocation.integration);
      if (!isAllowedIntegration) {
        throw new BadRequestException(
          `Booking location with integration ${
            inputBookingLocation.integration
          } not valid for event type with id=${
            dbEventType.id
          }. The event type has following integrations: ${allowedIntegrations.join(
            ", "
          )}, and only these integrations are allowed for booking location.`
        );
      }
    }

    return true;
  }

  async transformInputCreateRecurringBooking(
    inputBooking: CreateRecurringBookingInput_2024_08_13,
    platformClientId?: string
  ) {
    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
      inputBooking.eventTypeId
    );
    if (!eventType) {
      throw new NotFoundException(`Event type with id=${inputBooking.eventTypeId} not found`);
    }
    if (!eventType.recurringEvent) {
      throw new NotFoundException(`Event type with id=${inputBooking.eventTypeId} is not a recurring event`);
    }

    const occurrence = recurringEventSchema.parse(eventType.recurringEvent);
    const repeatsEvery = occurrence.interval;

    if (inputBooking.recurrenceCount && inputBooking.recurrenceCount > occurrence.count) {
      throw new BadRequestException(
        "Provided recurrence count is higher than the event type's recurring event count."
      );
    }
    const repeatsTimes = inputBooking.recurrenceCount || occurrence.count;
    // note(Lauris): timeBetween 0=yearly, 1=monthly and 2=weekly
    const timeBetween = occurrence.freq;

    const events = [];
    const recurringEventId = uuidv4();

    let startTime = DateTime.fromISO(inputBooking.start, { zone: "utc" }).setZone(
      inputBooking.attendee.timeZone
    );

    const guests =
      inputBooking.guests && platformClientId
        ? await this.platformBookingsService.getPlatformAttendeesEmails(inputBooking.guests, platformClientId)
        : inputBooking.guests;
    const attendeeEmail =
      inputBooking.attendee.email && platformClientId
        ? await this.platformBookingsService.getPlatformAttendeeEmail(
            inputBooking.attendee.email,
            platformClientId
          )
        : inputBooking.attendee.email;

    const inputLocation = inputBooking.location || inputBooking.meetingUrl;
    this.isBookingLocationWithEventTypeLocations(inputLocation, eventType);
    const location = inputLocation ? this.transformLocation(inputLocation) : undefined;

    for (let i = 0; i < repeatsTimes; i++) {
      const endTime = startTime.plus({ minutes: eventType.length });

      events.push({
        start: startTime.toISO(),
        end: endTime.toISO(),
        eventTypeId: inputBooking.eventTypeId,
        recurringEventId,
        timeZone: inputBooking.attendee.timeZone,
        language: inputBooking.attendee.language || "en",
        metadata: inputBooking.metadata || {},
        hasHashedBookingLink: false,
        guests,
        // note(Lauris): responses with name and email are required by the handleNewBooking
        responses: {
          ...(inputBooking.bookingFieldsResponses || {}),
          name: inputBooking.attendee.name,
          email: attendeeEmail,
          attendeePhoneNumber: inputBooking.attendee.phoneNumber,
          guests,
          location,
        },
        schedulingType: eventType.schedulingType,
      });

      switch (timeBetween) {
        case 0: // Yearly
          startTime = startTime.plus({ years: repeatsEvery });
          break;
        case 1: // Monthly
          startTime = startTime.plus({ months: repeatsEvery });
          break;
        case 2: // Weekly
          startTime = startTime.plus({ weeks: repeatsEvery });
          break;
        default:
          throw new Error("Unsupported timeBetween value");
      }
    }

    return events;
  }

  async createRescheduleBookingRequest(
    request: Request,
    bookingUid: string,
    body: RescheduleBookingInput
  ): Promise<BookingRequest> {
    const bodyTransformed = this.isRescheduleSeatedBody(body)
      ? await this.transformInputRescheduleSeatedBooking(bookingUid, body)
      : await this.transformInputRescheduleBooking(bookingUid, body);

    const oAuthClientParams = await this.platformBookingsService.getOAuthClientParams(
      bodyTransformed.eventTypeId
    );

    const newRequest = { ...request };
    let userId: number | undefined = undefined;

    if (
      oAuthClientParams &&
      request.body.rescheduledBy &&
      !request.body.rescheduledBy.includes(oAuthClientParams.platformClientId)
    ) {
      request.body.rescheduledBy = OAuthClientUsersService.getOAuthUserEmail(
        oAuthClientParams.platformClientId,
        request.body.rescheduledBy
      );
    }

    if (request.body.rescheduledBy) {
      if (request.body.rescheduledBy !== bodyTransformed.responses.email) {
        userId = (await this.usersRepository.findByEmail(request.body.rescheduledBy))?.id;
      }
    }

    const location = await this.getRescheduleBookingLocation(bookingUid);
    if (oAuthClientParams) {
      Object.assign(newRequest, { userId, ...oAuthClientParams, platformBookingLocation: location });
      newRequest.body = {
        ...bodyTransformed,
        noEmail: !oAuthClientParams.arePlatformEmailsEnabled,
        creationSource: CreationSource.API_V2,
      };
    } else {
      Object.assign(newRequest, { userId, platformBookingLocation: location });
      newRequest.body = { ...bodyTransformed, noEmail: false, creationSource: CreationSource.API_V2 };
    }

    return newRequest as unknown as BookingRequest;
  }

  isRescheduleSeatedBody(body: RescheduleBookingInput): body is RescheduleSeatedBookingInput_2024_08_13 {
    return body.hasOwnProperty("seatUid");
  }

  async transformInputRescheduleSeatedBooking(
    bookingUid: string,
    inputBooking: RescheduleSeatedBookingInput_2024_08_13
  ) {
    const booking = await this.bookingsRepository.getByUidWithAttendeesAndUserAndEvent(bookingUid);
    // todo create booking seat module, repository and fetch the seat to get info
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }
    if (!booking.eventTypeId) {
      throw new NotFoundException(`Booking with uid=${bookingUid} is missing event type`);
    }
    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(booking.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event type with id=${booking.eventTypeId} not found`);
    }

    const seat = await this.bookingSeatRepository.getByReferenceUid(inputBooking.seatUid);
    if (!seat) {
      throw new NotFoundException(`Seat with uid=${inputBooking.seatUid} does not exist.`);
    }

    const { responses: bookingResponses } = seatedBookingDataSchema.parse(seat.data);
    const attendee = booking.attendees.find((attendee) => attendee.email === bookingResponses.email);

    if (!attendee) {
      throw new NotFoundException(
        `Attendee with e-mail ${bookingResponses.email} for booking with uid=${bookingUid} and seatUid=${inputBooking.seatUid} not found`
      );
    }

    const startTime = DateTime.fromISO(inputBooking.start, { zone: "utc" }).setZone(attendee.timeZone);
    const endTime = startTime.plus({ minutes: eventType.length });

    return {
      start: startTime.toISO(),
      end: endTime.toISO(),
      eventTypeId: eventType.id,
      timeZone: attendee.timeZone,
      language: attendee.locale,
      metadata: seat.metadata || {},
      hasHashedBookingLink: false,
      guests: [],
      responses: { ...bookingResponses },
      rescheduleUid: inputBooking.seatUid,
    };
  }

  async transformInputRescheduleBooking(bookingUid: string, inputBooking: RescheduleBookingInput_2024_08_13) {
    const booking = await this.bookingsRepository.getByUidWithAttendeesAndUserAndEvent(bookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }
    if (!booking.eventTypeId) {
      throw new NotFoundException(`Booking with uid=${bookingUid} is missing event type`);
    }
    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(booking.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event type with id=${booking.eventTypeId} not found`);
    }

    const bookingResponses = safeParse(
      bookingResponsesSchema,
      booking.responses,
      defaultBookingResponses,
      false
    );
    const bookingResponsesMissing =
      bookingResponses.name === defaultBookingResponses.name &&
      bookingResponses.email === defaultBookingResponses.email;

    const attendee = bookingResponsesMissing
      ? booking.attendees[0]
      : booking.attendees.find((attendee) => attendee.email === bookingResponses.email);

    if (!attendee) {
      throw new NotFoundException(
        `Attendee with e-mail ${bookingResponses.email} for booking with uid=${bookingUid} not found`
      );
    }

    if (bookingResponsesMissing) {
      bookingResponses.name = attendee.name;
      bookingResponses.email = attendee.email;
      bookingResponses.attendeePhoneNumber = attendee.phoneNumber || undefined;
    }

    const startTime = DateTime.fromISO(inputBooking.start, { zone: "utc" }).setZone(attendee.timeZone);
    const endTime = startTime.plus({ minutes: eventType.length });

    return {
      start: startTime.toISO(),
      end: endTime.toISO(),
      eventTypeId: eventType.id,
      timeZone: attendee.timeZone,
      language: attendee.locale,
      metadata: booking.metadata || {},
      hasHashedBookingLink: false,
      guests: bookingResponses.guests,
      responses: { ...bookingResponses, rescheduledReason: inputBooking.reschedulingReason },
      rescheduleUid: bookingUid,
    };
  }

  async getRescheduleBookingLocation(rescheduleBookingUid: string) {
    const booking = await this.bookingsRepository.getByUid(rescheduleBookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${rescheduleBookingUid} not found`);
    }
    return booking.location;
  }

  private async createBookingRequestOwnerId(req: Request): Promise<number | undefined> {
    try {
      const bearerToken = req.get("Authorization")?.replace("Bearer ", "");
      if (bearerToken) {
        if (isApiKey(bearerToken, this.config.get<string>("api.apiKeyPrefix") ?? "cal_")) {
          const strippedApiKey = stripApiKey(bearerToken, this.config.get<string>("api.keyPrefix"));
          const apiKeyHash = hashAPIKey(strippedApiKey);
          const keyData = await this.apiKeyRepository.getApiKeyFromHash(apiKeyHash);
          return keyData?.userId;
        } else {
          // Access Token
          const ownerId = await this.oAuthFlowService.getOwnerId(bearerToken);
          return ownerId;
        }
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  transformGetBookingsFilters(queryParams: GetBookingsInput_2024_08_13) {
    return {
      attendeeEmail: queryParams.attendeeEmail,
      attendeeName: queryParams.attendeeName,
      afterStartDate: queryParams.afterStart,
      beforeEndDate: queryParams.beforeEnd,
      teamIds: queryParams.teamsIds || (queryParams.teamId ? [queryParams.teamId] : undefined),
      eventTypeIds:
        queryParams.eventTypeIds || (queryParams.eventTypeId ? [queryParams.eventTypeId] : undefined),
      afterUpdatedDate: queryParams.afterUpdatedAt,
      beforeUpdatedDate: queryParams.beforeUpdatedAt,
      afterCreatedDate: queryParams.afterCreatedAt,
      beforeCreatedDate: queryParams.beforeCreatedAt,
    };
  }

  transformGetBookingsSort(queryParams: GetBookingsInput_2024_08_13) {
    if (
      !queryParams.sortStart &&
      !queryParams.sortEnd &&
      !queryParams.sortCreated &&
      !queryParams.sortUpdatedAt
    ) {
      return undefined;
    }

    return {
      sortStart: queryParams.sortStart,
      sortEnd: queryParams.sortEnd,
      sortCreated: queryParams.sortCreated,
      sortUpdated: queryParams.sortUpdatedAt,
    };
  }

  async createCancelBookingRequest(
    request: Request,
    bookingUid: string,
    body: CancelBookingInput
  ): Promise<BookingRequest> {
    const bodyTransformed = this.isCancelSeatedBody(body)
      ? await this.transformInputCancelSeatedBooking(bookingUid, body)
      : await this.transformInputCancelBooking(bookingUid, body);

    const booking = await this.bookingsRepository.getByUid(bodyTransformed.uid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }

    const oAuthClientParams = booking.eventTypeId
      ? await this.platformBookingsService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const newRequest = { ...request };
    const userId = (await this.createBookingRequestOwnerId(request)) ?? undefined;

    if (oAuthClientParams) {
      Object.assign(newRequest, { userId, ...oAuthClientParams });
      newRequest.body = { ...bodyTransformed, noEmail: !oAuthClientParams.arePlatformEmailsEnabled };
    } else {
      Object.assign(newRequest, { userId });
      newRequest.body = { ...bodyTransformed, noEmail: false };
    }

    return newRequest as unknown as BookingRequest;
  }

  isCancelSeatedBody(body: CancelBookingInput): body is CancelSeatedBookingInput_2024_08_13 {
    return body.hasOwnProperty("seatUid");
  }

  async transformInputCancelBooking(bookingUid: string, inputBooking: CancelBookingInput_2024_08_13) {
    const recurringBooking = await this.bookingsRepository.getRecurringByUid(bookingUid);
    // note(Lauris): isRecurring means that recurringEventId was passed as uid. isRecurring does not refer to the uid of 1 individual booking within a recurring booking consisting of many bookings.
    // That is what recurringEventId refers to.
    const isRecurringUid = !!recurringBooking.length;

    if (isRecurringUid && inputBooking.cancelSubsequentBookings) {
      throw new BadRequestException(
        "Cannot cancel subsequent bookings for recurring event - you have to provide uid of one of the individual bookings of a recurring booking."
      );
    }

    if (isRecurringUid) {
      return {
        // note(Lauris): set uid as one of the oldest individual recurring ids
        uid: recurringBooking[0].uid,
        cancellationReason: inputBooking.cancellationReason,
        allRemainingBookings: true,
      };
    }

    if (inputBooking.cancelSubsequentBookings) {
      return {
        uid: bookingUid,
        cancellationReason: inputBooking.cancellationReason,
        cancelSubsequentBookings: true,
      };
    }

    return {
      uid: bookingUid,
      cancellationReason: inputBooking.cancellationReason,
      allRemainingBookings: false,
    };
  }

  async transformInputCancelSeatedBooking(
    bookingUid: string,
    inputBooking: CancelSeatedBookingInput_2024_08_13
  ) {
    // note(Lauris): for recurring seated booking it is not possible to cancel all remaining bookings
    // for an individual person, so api users need to call booking by booking using uid + seatUid to cancel it.
    return {
      uid: bookingUid,
      cancellationReason: "",
      allRemainingBookings: false,
      seatReferenceUid: inputBooking.seatUid,
    };
  }

  transformInputMarkAbsentBooking(inputBooking: MarkAbsentBookingInput_2024_08_13) {
    return {
      noShowHost: inputBooking.host,
      attendees: inputBooking.attendees?.map((attendee) => ({
        email: attendee.email,
        noShow: attendee.absent,
      })),
    };
  }
}
