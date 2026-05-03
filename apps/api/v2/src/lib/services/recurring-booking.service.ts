import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { RegularBookingService } from "@/lib/services/regular-booking.service";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(regularBookingService: RegularBookingService) {
    super({
      regularBookingService,
    });
  }
}
