import { makeUserActor } from "@calcom/platform-libraries/bookings";
import type {
  BookingInputLocation_2024_08_13,
  UpdateBookingInputLocation_2024_08_13,
  UpdateBookingLocationInput_2024_08_13,
} from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import { UsersRepository } from "@/modules/users/users.repository";

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly eventTypeAccessService: EventTypeAccessService,
    private readonly bookingEventHandlerService: BookingEventHandlerService
  ) {}

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const existingBooking = await this.bookingsRepository.getByUidWithEventType(bookingUid);
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }

    if (existingBooking.eventTypeId && existingBooking.eventType) {
      const eventType = await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
        existingBooking.eventTypeId
      );
      if (eventType) {
        const isAllowed = await this.eventTypeAccessService.userIsEventTypeAdminOrOwner(user, eventType);
        if (!isAllowed) {
          throw new ForbiddenException(
            "User is not authorized to update this booking location. User must be the event type owner, host, team admin or owner, or org admin or owner."
          );
        }
      }
    }

    const { location } = input;

    if (location) {
      return await this.updateLocation(existingBooking, location, user);
    }

    return this.bookingsService.getBooking(existingBooking.uid, user);
  }

  private async updateLocation(
    existingBooking: Booking,
    inputLocation: UpdateBookingInputLocation_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const bookingUid = existingBooking.uid;
    const oldLocation = existingBooking.location;
    const bookingLocation = this.getLocationValue(inputLocation) ?? existingBooking.location;

    if (!existingBooking.userId) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    if (!existingBooking.eventTypeId) {
      throw new NotFoundException(`No event type found for booking with uid=${bookingUid}`);
    }

    const existingBookingHost = await this.usersRepository.findById(existingBooking.userId);

    if (!existingBookingHost) {
      throw new NotFoundException(`No user found for booking with uid=${bookingUid}`);
    }

    const bookingFieldsLocation = this.inputService.transformLocation(
      inputLocation as BookingInputLocation_2024_08_13
    );

    const responses = (existingBooking.responses || {}) as Record<string, unknown>;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = { ...rest, location: bookingFieldsLocation };

    const updatedBooking = await this.bookingsRepository.updateBooking(bookingUid, {
      location: bookingLocation,
      responses: updatedBookingResponses,
    });

    await this.bookingEventHandlerService.onLocationChanged({
      bookingUid: existingBooking.uid,
      actor: makeUserActor(user.uuid),
      organizationId: existingBookingHost.organizationId ?? null,
      source: "API_V2",
      auditData: {
        location: {
          old: oldLocation,
          new: bookingLocation,
        },
      },
    });

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }

  private getLocationValue(loc: UpdateBookingInputLocation_2024_08_13): string | undefined {
    if (loc.type === "address") return loc.address;
    if (loc.type === "link") return loc.link;
    if (loc.type === "phone") return loc.phone;
    if (loc.type === "attendeeAddress") return loc.address;
    if (loc.type === "attendeePhone") return loc.phone;
    if (loc.type === "attendeeDefined") return loc.location;

    this.logger.log(
      `Booking location service getLocationValue - loc ${JSON.stringify(
        loc
      )} was passed but the type is not supported.`
    );

    return undefined;
  }
}
