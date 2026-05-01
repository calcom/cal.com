import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { Injectable } from "@nestjs/common";

import { BookingAttendeesService as BaseBookingAttendeesService } from "@calcom/platform-libraries/bookings";

import { BookingAttendeesRemoveService } from "./booking-attendees-remove.service";

@Injectable()
export class BookingAttendeesService extends BaseBookingAttendeesService {
  constructor(
    bookingRepository: PrismaBookingRepository,
    bookingAttendeesRemoveService: BookingAttendeesRemoveService
  ) {
    super({ bookingRepository, bookingAttendeesRemoveService });
  }
}
