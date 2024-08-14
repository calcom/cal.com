import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import { handleNewBooking } from "@calcom/platform-libraries";
import { CreateBookingInput_2024_08_13, RescheduleBookingInput_2024_08_13 } from "@calcom/platform-types";

@Injectable()
export class BookingsService_2024_08_13 {
  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13,
    private readonly bookingsRepository: BookingsRepository_2024_08_13
  ) {}

  async createBooking(
    request: Request,
    body: CreateBookingInput_2024_08_13 | RescheduleBookingInput_2024_08_13
  ) {
    const bookingRequest = await this.inputService.createBookingRequest(request, body);
    const booking = await handleNewBooking(bookingRequest);
    if (!booking.id) {
      throw new Error("Booking was not created");
    }

    const databaseBooking = await this.bookingsRepository.getById(booking.id);
    if (!databaseBooking) {
      throw new Error(`Booking with id=${booking.id} was not found in the database`);
    }

    return this.outputService.getOutputBooking(databaseBooking);
  }
}
