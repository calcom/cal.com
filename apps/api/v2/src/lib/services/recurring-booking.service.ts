import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { PrismaFeaturesRepository } from "@/lib/repositories/prisma-features.repository";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(
    regularBookingService: RegularBookingService,
    bookingEventHandler: BookingEventHandlerService,
    featuresRepository: PrismaFeaturesRepository
  ) {
    super({
      regularBookingService,
      bookingEventHandler,
      featuresRepository,
    });
  }
}
