import { CheckBookingAndDurationLimitsService as BaseCheckBookingAndDurationLimitsService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";

@Injectable()
export class CheckBookingAndDurationLimitsService extends BaseCheckBookingAndDurationLimitsService {
  constructor(checkBookingLimitsService: CheckBookingLimitsService) {
    super({
      checkBookingLimitsService: checkBookingLimitsService,
    });
  }
}
