import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaMembershipRepository } from "@/lib/repositories/prisma-membership.repository";
import { Injectable } from "@nestjs/common";

import { CheckBookingLimitsService as BaseCheckBookingLimitsService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class CheckBookingLimitsService extends BaseCheckBookingLimitsService {
  constructor(bookingRepository: PrismaBookingRepository, membershipRepository: PrismaMembershipRepository) {
    super({
      membershipRepo: membershipRepository,
      bookingRepo: bookingRepository,
    });
  }
}
