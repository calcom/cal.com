import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { Injectable, Logger, HttpException, NotFoundException } from "@nestjs/common";

import { addGuestsHandler } from "@calcom/platform-libraries/bookings";
import type { AddGuestsInput_2024_08_13 } from "@calcom/platform-types";

@Injectable()
export class BookingGuestsService_2024_08_13 {
  private readonly logger = new Logger("BookingGuestsService_2024_08_13");

  constructor(
    private readonly bookingsRepository: BookingsRepository_2024_08_13,
    private readonly bookingsService: BookingsService_2024_08_13,
    private readonly platformBookingsService: PlatformBookingsService
  ) {}

  async addGuests(bookingUid: string, input: AddGuestsInput_2024_08_13, user: ApiAuthGuardUser) {
    const booking = await this.bookingsRepository.getByUidWithAttendeesAndUserAndEvent(bookingUid);
    if (!booking) {
      throw new NotFoundException(`Booking with uid ${bookingUid} not found`);
    }

    const platformClientParams = booking.eventTypeId
      ? await this.platformBookingsService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const emailsEnabled = platformClientParams ? platformClientParams.arePlatformEmailsEnabled : true;

    const res = await addGuestsHandler({
      ctx: { user },
      input: { bookingId: booking.id, guests: input.guests },
      emailsEnabled,
    });
    if (res.message === "Guests added") {
      return await this.bookingsService.getBooking(bookingUid, user);
    } else {
      throw new HttpException(
        "Failed to add guests to the booking",
        500
      );
    }
  }
}
