import type { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import type { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import type { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import type { EventTypesRepository_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import type { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import type { EventTypeAccessService } from "@/modules/event-types/services/event-type-access.service";
import type { UsersRepository } from "@/modules/users/users.repository";
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import type {
  UpdateBookingLocationInput_2024_08_13,
  BookingInputLocation_2024_08_13,
  UpdateBookingInputLocation_2024_08_13,
} from "@calcom/platform-types";
import type { Booking } from "@calcom/prisma/client";

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly eventTypesRepository: EventTypesRepository_2024_06_14,
    private readonly eventTypeAccessService: EventTypeAccessService
  ) {}

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const existingBooking =
      await this.bookingsRepository.getBookingByUidWithUserAndEventDetails(
        bookingUid
      );
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
    }

    if (existingBooking.eventTypeId && existingBooking.eventType) {
      const eventType =
        await this.eventTypesRepository.getEventTypeByIdWithOwnerAndTeam(
          existingBooking.eventTypeId
        );
      if (eventType) {
        const isAllowed =
          await this.eventTypeAccessService.userIsEventTypeAdminOrOwner(
            user,
            eventType
          );
        if (!isAllowed) {
          throw new ForbiddenException(
            "User is not authorized to update this booking location. User must be the event type owner, host, team admin or owner, or org admin or owner."
          );
        }
      }
    }

    const { location } = input;

    if (location) {
      await this.syncCalendarEvent(existingBooking.id);
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
    const bookingLocation =
      this.getLocationValue(inputLocation) ?? existingBooking.location;

    if (!existingBooking.userId) {
      throw new NotFoundException(
        `No user found for booking with uid=${bookingUid}`
      );
    }

    if (!existingBooking.eventTypeId) {
      throw new NotFoundException(
        `No event type found for booking with uid=${bookingUid}`
      );
    }

    const existingBookingHost = await this.usersRepository.findById(
      existingBooking.userId
    );

    if (!existingBookingHost) {
      throw new NotFoundException(
        `No user found for booking with uid=${bookingUid}`
      );
    }

    const bookingFieldsLocation = this.inputService.transformLocation(
      inputLocation as BookingInputLocation_2024_08_13
    );

    const responses = (existingBooking.responses || {}) as Record<
      string,
      unknown
    >;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = {
      ...rest,
      location: bookingFieldsLocation,
    };

    const updatedBooking = await this.bookingsRepository.updateBooking(
      bookingUid,
      {
        location: bookingLocation,
        responses: updatedBookingResponses,
      }
    );

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }

  /*
  1. fetch booking refernces via booking id or uid
  2. if booking refernce not present, return
  3. if refernce present, use credentials from in there to retreive calendar event and then update it accordingly
  */
  private syncCalendarEvent(bookingId: number) {}

  private getLocationValue(
    loc: UpdateBookingInputLocation_2024_08_13
  ): string | undefined {
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
