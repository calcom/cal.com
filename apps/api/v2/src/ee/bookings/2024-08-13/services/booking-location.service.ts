import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import type {
  UpdateBookingLocationInput_2024_08_13,
  BookingInputLocation_2024_08_13,
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

  getLocationValue(loc: BookingInputLocation_2024_08_13) {
    if ("address" in loc) return (loc as { address: string }).address;
    if ("link" in loc) return (loc as { link: string }).link;
    if ("phone" in loc) return (loc as { phone: string }).phone;
    if ("location" in loc) return (loc as { location: string }).location;
    if ("integration" in loc) return (loc as { integration: string }).integration;
    return undefined;
  }

  async updateLocation(
    existingBooking: Booking,
    location: BookingInputLocation_2024_08_13,
    user: ApiAuthGuardUser
  ) {
    const bookingUid = existingBooking.uid;
    let bookingLocation = existingBooking.location ?? "";

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

    const locationString = this.getLocationValue(location);
    bookingLocation = locationString ?? bookingLocation;

    const transformedLocation = this.inputService.transformLocation(location);

    const responses = (existingBooking.responses || {}) as Record<string, unknown>;
    const { location: _existingLocation, ...rest } = responses;

    const updatedBookingResponses = { ...rest, location: transformedLocation };

    const updatedBooking = await this.bookingsRepository.updateBooking(bookingUid, {
      location: bookingLocation,
      responses: updatedBookingResponses,
    });

    return this.bookingsService.getBooking(updatedBooking.uid, user);
  }
}
