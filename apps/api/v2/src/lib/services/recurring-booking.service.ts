import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { BookingEventHandlerService } from "@/lib/services/booking-event-handler.service";
import { Injectable } from "@nestjs/common";

import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(
    regularBookingService: RegularBookingService,
    bookingEventHandler: BookingEventHandlerService
  ) {
    super({
      regularBookingService,
      bookingEventHandler,
    });
  }
}
