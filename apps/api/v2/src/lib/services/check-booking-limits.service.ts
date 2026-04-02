import { CheckBookingLimitsService as BaseCheckBookingLimitsService } from "@calcom/platform-libraries/bookings";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";

@Injectable()
export class CheckBookingLimitsService extends BaseCheckBookingLimitsService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
