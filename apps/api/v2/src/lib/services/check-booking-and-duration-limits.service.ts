import { CheckBookingLimitsService } from "@/lib/services/check-booking-limits.service";
import { Injectable } from "@nestjs/common";

import { CheckBookingAndDurationLimitsService as BaseCheckBookingAndDurationLimitsService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class CheckBookingAndDurationLimitsService extends BaseCheckBookingAndDurationLimitsService {
  constructor(checkBookingLimitsService: CheckBookingLimitsService) {
    super({
      checkBookingLimitsService: checkBookingLimitsService,
    });
  }
}
