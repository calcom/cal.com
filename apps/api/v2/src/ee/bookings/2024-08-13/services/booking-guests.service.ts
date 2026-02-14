import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/repositories/bookings.repository";
import { BookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/bookings.service";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { Injectable, Logger, HttpException, NotFoundException, BadRequestException } from "@nestjs/common";

import { addGuestsHandler } from "@calcom/platform-libraries/bookings";
import type { AddGuestsInput_2024_08_13 } from "@calcom/platform-types";

const MAX_TOTAL_GUESTS_PER_BOOKING = 30;

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

    const currentGuestCount = booking.attendees.length;
    const newGuestCount = input.guests.length;
    const totalGuestCount = currentGuestCount + newGuestCount;

    if (totalGuestCount > MAX_TOTAL_GUESTS_PER_BOOKING) {
      const remainingSlots = Math.max(0, MAX_TOTAL_GUESTS_PER_BOOKING - currentGuestCount);
      throw new BadRequestException(
        `Cannot add ${newGuestCount} guests. This booking already has ${currentGuestCount} attendees. ` +
          `Maximum total guests allowed is ${MAX_TOTAL_GUESTS_PER_BOOKING}. You can add up to ${remainingSlots} more guests.`
      );
    }

    const platformClientParams = booking.eventTypeId
      ? await this.platformBookingsService.getOAuthClientParams(booking.eventTypeId)
      : undefined;

    const emailsEnabled = platformClientParams ? platformClientParams.arePlatformEmailsEnabled : true;

    const res = await addGuestsHandler({
      ctx: { user },
      input: { bookingId: booking.id, guests: input.guests },
      emailsEnabled,
      actionSource: "API_V2",
    });
    if (res.message === "Guests added") {
      return await this.bookingsService.getBooking(bookingUid, user);
    } else {
      throw new HttpException("Failed to add guests to the booking", 500);
    }
  }
}
