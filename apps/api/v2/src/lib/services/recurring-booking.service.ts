import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { Injectable } from "@nestjs/common";

import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(regularBookingService: RegularBookingService) {
    super({
      regularBookingService,
    });
  }
}
