import { PrismaBookingAttendeeRepository } from "@/lib/repositories/prisma-booking-attendee.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { Injectable } from "@nestjs/common";

import { BookingAttendeesRemoveService as BaseBookingAttendeesRemoveService } from "@calcom/platform-libraries/bookings";

import { BookingEventHandlerService } from "./booking-event-handler.service";

@Injectable()
export class BookingAttendeesRemoveService extends BaseBookingAttendeesRemoveService {
  constructor(
    bookingEventHandlerService: BookingEventHandlerService,
    featuresRepository: PrismaFeaturesRepository,
    bookingAttendeeRepository: PrismaBookingAttendeeRepository
  ) {
    super({ bookingEventHandlerService, featuresRepository, bookingAttendeeRepository });
  }
}
