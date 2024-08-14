import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { Request } from "express";
import { DateTime } from "luxon";
import { NextApiRequest } from "next/types";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { CreateBookingInput_2024_08_13, RescheduleBookingInput_2024_08_13 } from "@calcom/platform-types";

type BookingRequest = NextApiRequest & { userId: number | undefined } & OAuthRequestParams;

const DEFAULT_PLATFORM_PARAMS = {
  platformClientId: "",
  platformCancelUrl: "",
  platformRescheduleUrl: "",
  platformBookingUrl: "",
  arePlatformEmailsEnabled: false,
  platformBookingLocation: undefined,
};

type OAuthRequestParams = {
  platformClientId: string;
  platformRescheduleUrl: string;
  platformCancelUrl: string;
  platformBookingUrl: string;
  platformBookingLocation?: string;
  arePlatformEmailsEnabled: boolean;
};

@Injectable()
export class InputBookingsService_2024_08_13 {
  private readonly logger = new Logger("InputBookingsService_2024_08_13");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly bookingsRepository: BookingsRepository_2024_08_13
  ) {}

  async createBookingRequest(
    request: Request,
    body: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13
  ): Promise<BookingRequest> {
    // note(Lauris): update to this.transformInputCreate when rescheduling is implemented
    const bodyTransformed = await this.transformInputCreateBooking(body as CreateBookingInput_2024_08_13);
    const oAuthClientId = request.get(X_CAL_CLIENT_ID);

    const newRequest = { ...request };
    const userId = (await this.createBookingRequestOwnerId(request)) ?? undefined;
    const oAuthParams = oAuthClientId
      ? await this.createBookingRequestOAuthClientParams(oAuthClientId)
      : DEFAULT_PLATFORM_PARAMS;

    Object.assign(newRequest, { userId, ...oAuthParams, platformBookingLocation: request.body.meetingUrl });
    newRequest.body = { ...bodyTransformed, noEmail: !oAuthParams.arePlatformEmailsEnabled };

    return newRequest as unknown as BookingRequest;
  }

  private async createBookingRequestOwnerId(req: Request): Promise<number | undefined> {
    try {
      const accessToken = req.get("Authorization")?.replace("Bearer ", "");
      if (accessToken) {
        return this.oAuthFlowService.getOwnerId(accessToken);
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async createBookingRequestOAuthClientParams(clientId: string) {
    const params = DEFAULT_PLATFORM_PARAMS;
    try {
      const client = await this.oAuthClientRepository.getOAuthClient(clientId);
      if (client) {
        params.platformClientId = clientId;
        params.platformCancelUrl = client.bookingCancelRedirectUri ?? "";
        params.platformRescheduleUrl = client.bookingRescheduleRedirectUri ?? "";
        params.platformBookingUrl = client.bookingRedirectUri ?? "";
        params.arePlatformEmailsEnabled = client.areEmailsEnabled ?? false;
      }
      return params;
    } catch (err) {
      this.logger.error(err);
      return params;
    }
  }

  transformInputCreate(inputBooking: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13) {
    const isReschedule = "rescheduleBookingUid" in inputBooking;
    const isBooking = "rescheduleBookingUid" in inputBooking === false;

    if (!("rescheduleBookingUid" in inputBooking)) {
      return this.transformInputCreateBooking(inputBooking);
    }
  }

  async transformInputCreateBooking(inputBooking: CreateBookingInput_2024_08_13) {
    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
      inputBooking.eventTypeId
    );
    if (!eventType) {
      throw new NotFoundException(`Event type with id=${inputBooking.eventTypeId} not found`);
    }

    const startTime = DateTime.fromISO(inputBooking.start, { zone: "utc" }).setZone(
      inputBooking.attendee.timeZone
    );
    const endTime = startTime.plus({ minutes: eventType.length });

    return {
      start: startTime.toISO(),
      end: endTime.toISO(),
      eventTypeId: inputBooking.eventTypeId,
      eventTypeSlug: eventType.slug,
      timeZone: inputBooking.attendee.timeZone,
      language: inputBooking.attendee.language || "en",
      metadata: inputBooking.metadata || {},
      hasHashedBookingLink: false,
      guests: inputBooking.guests,
      responses: inputBooking.bookingFieldsResponses
        ? {
            ...inputBooking.bookingFieldsResponses,
            name: inputBooking.attendee.name,
            email: inputBooking.attendee.email,
          }
        : { name: inputBooking.attendee.name, email: inputBooking.attendee.email },
      user: eventType.owner ? eventType.owner.username : eventType.team?.slug,
    };
  }

  async transformInputRescheduleBooking(inputBooking: RescheduleBookingInput_2024_08_13) {
    const booking = await this.bookingsRepository.getByUid(inputBooking.rescheduleBookingUid);

    if (!booking) {
      throw new NotFoundException(`Booking with uid=${inputBooking.rescheduleBookingUid} not found`);
    }

    if (!booking.eventTypeId) {
      throw new NotFoundException(
        `Booking with uid=${inputBooking.rescheduleBookingUid} is missing event type`
      );
    }

    const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(booking.eventTypeId);
    if (!eventType) {
      throw new NotFoundException(`Event type with id=${booking.eventTypeId} not found`);
    }

    // note(Lauris): we need to store attendee.timeZone, language in metadata of booking, but need to wait for refactor.
    return {};
    // return {
    //   start: inputBooking.start,
    //   end: this.getEndTime(inputBooking.start, eventType.length),
    //   eventTypeId: booking.eventTypeId,
    //   eventTypeSlug: eventType.slug,
    //   timeZone: booking.timeZone,
    //   language: inputBooking.attendee.language,
    //   metadata: inputBooking.metadata,
    //   hasHashedBookingLink: false,
    //   guests: inputBooking.guests,
    //   locationUrl: inputBooking.meetingUrl,
    //   responses: inputBooking.bookingFieldsResponses,
    //   user: eventType.owner ? eventType.owner.username : eventType.team?.slug
    // }
  }
}
