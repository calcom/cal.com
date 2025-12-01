import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import type {
  UpdateBookingLocationInput_2024_08_13,
  BookingInputLocation_2024_08_13,
  UpdateBookingInputLocation_2024_08_13,
} from "@calcom/platform-types";
import { Booking } from "@calcom/prisma/client";

@Injectable()
export class BookingLocationService_2024_08_13 {
  private readonly logger = new Logger("BookingLocationService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly usersRepository: UsersRepository,
    private readonly inputService: InputBookingsService_2024_08_13
  ) {}

  async updateBookingLocation(
    bookingUid: string,
    input: UpdateBookingLocationInput_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const existingBooking = await this.bookingsRepository.getByUid(bookingUid);
    if (!existingBooking) {
      throw new NotFoundException(`Booking with uid=${bookingUid} not found`);
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

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }

  private getLocationValue(loc: UpdateBookingInputLocation_2024_08_13): string | undefined {
    if (loc.type === "address") return loc.address;
    if (loc.type === "link") return loc.link;
    if (loc.type === "phone") return loc.phone;
    if (loc.type === "attendeeAddress") return loc.address;
    if (loc.type === "attendeePhone") return loc.phone;
    if (loc.type === "attendeeDefined") return loc.location;

    return undefined;
  }
}
