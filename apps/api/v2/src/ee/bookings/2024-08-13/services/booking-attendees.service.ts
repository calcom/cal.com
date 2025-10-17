import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { Injectable, Logger } from "@nestjs/common";
import { NotFoundException } from "@nestjs/common";

import { addGuestsHandler } from "@calcom/platform-libraries/bookings";
import type { AddGuestsInput_2024_08_13 } from "@calcom/platform-types";

import { InputBookingsService_2024_08_13 } from "./input.service";

@Injectable()
export class BookingAttendeesService_2024_08_13 {
  private readonly logger = new Logger("BookingAttendeesService_2024_08_13");

  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13
  ) {}

  async addGuests(bookingUid: string, input: AddGuestsInput_2024_08_13, user: ApiAuthGuardUser) {
    const booking = await this.bookingsRepository.getByUidWithAttendeesAndUserAndEvent(bookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid ${bookingUid} not found`);
    }
    const res = await addGuestsHandler({
      ctx: { user },
      input: { bookingId: booking.id, guests: input.guests },
    });
    if (res.message === "Guests added") {
      return await this.bookingsService.getBooking(bookingUid, user);
    } else {
      throw new Error("Failed to add guests");
    }
  }
}
