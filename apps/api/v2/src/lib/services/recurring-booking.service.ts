import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { Injectable } from "@nestjs/common";
import { PrismaTeamFeatureRepository } from "@/lib/repositories/prisma-team-feature.repository";
import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(
    regularBookingService: RegularBookingService,
    bookingEventHandler: BookingEventHandlerService,
    teamFeatureRepository: PrismaTeamFeatureRepository
  ) {
    super({
      regularBookingService,
      bookingEventHandler,
      teamFeatureRepository: teamFeatureRepository,
    });
  }
}
