import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { Injectable } from "@nestjs/common";

import { BookingAttendeesService as BaseBookingAttendeesService } from "@calcom/platform-libraries/bookings";

import { BookingAttendeesRemoveService } from "./booking-attendees-remove.service";
import { BookingEventHandlerService } from "./booking-event-handler.service";

@Injectable()
export class BookingAttendeesService extends BaseBookingAttendeesService {
  constructor(
    bookingEventHandlerService: BookingEventHandlerService,
    featuresRepository: PrismaFeaturesRepository,
    bookingRepository: PrismaBookingRepository,
    bookingAttendeesRemoveService: BookingAttendeesRemoveService
  ) {
    super({
      bookingEventHandlerService,
      featuresRepository,
      bookingRepository,
      bookingAttendeesRemoveService,
    });
  }
}
