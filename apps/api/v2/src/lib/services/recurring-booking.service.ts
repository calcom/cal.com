import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { TEAM_FEATURE_REPOSITORY } from "@/lib/modules/team-feature-repository.tokens";
import { Inject, Injectable } from "@nestjs/common";
import type { ITeamFeatureRepository } from "@calcom/platform-libraries/pbac";
import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(
    regularBookingService: RegularBookingService,
    bookingEventHandler: BookingEventHandlerService,
    @Inject(TEAM_FEATURE_REPOSITORY) teamFeatureRepository: ITeamFeatureRepository
  ) {
    super({
      regularBookingService,
      bookingEventHandler,
      teamFeatureRepository: teamFeatureRepository,
    });
  }
}
