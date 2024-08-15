import { BookingsRepository_2024_08_13 } from "@/ee/bookings/2024-08-13/bookings.repository";
import { InputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/input.service";
import { OutputBookingsService_2024_08_13 } from "@/ee/bookings/2024-08-13/services/output.service";
import { Injectable } from "@nestjs/common";
import { Request } from "express";

import { handleNewBooking, handleNewRecurringBooking } from "@calcom/platform-libraries";
import {
  CreateBookingInput_2024_08_13,
  RescheduleBookingInput_2024_08_13,
  CreateRecurringBookingInput_2024_08_13,
} from "@calcom/platform-types";

@Injectable()
export class BookingsService_2024_08_13 {
  constructor(
    private readonly inputService: InputBookingsService_2024_08_13,
    private readonly outputService: OutputBookingsService_2024_08_13,
    private readonly bookingsRepository: BookingsRepository_2024_08_13
  ) {}

  async createBooking(
    request: Request,
    body:
      | CreateBookingInput_2024_08_13
      | RescheduleBookingInput_2024_08_13
      | CreateRecurringBookingInput_2024_08_13
  ) {
    const isRecurring = "recurringEventTypeId" in body;

    if (isRecurring) {
      return this.createRecurringBooking(request, body);
    }

    const bookingRequest = await this.inputService.createBookingRequest(request, body);
    const booking = await handleNewBooking(bookingRequest);
    if (!booking.id) {
      throw new Error("Booking was not created");
    }

    const databaseBooking = await this.bookingsRepository.getByIdWithAttendees(booking.id);
    if (!databaseBooking) {
      throw new Error(`Booking with id=${booking.id} was not found in the database`);
    }

    return this.outputService.getOutputBooking(databaseBooking);
  }

  async createRecurringBooking(request: Request, body: CreateRecurringBookingInput_2024_08_13) {
    const bookingRequest = await this.inputService.createBookingRequest(request, body);
    const bookings = await handleNewRecurringBooking(bookingRequest);

    const transformed = [];

    for (const booking of bookings) {
      if (!booking.id) {
        throw new Error("Booking was not created");
      }

      const databaseBooking = await this.bookingsRepository.getByIdWithAttendees(booking.id);
      if (!databaseBooking) {
        throw new Error(`Booking with id=${booking.id} was not found in the database`);
      }

      transformed.push(this.outputService.getOutputBooking(databaseBooking));
    }

    return transformed;
  }
}
