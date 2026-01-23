import { Injectable } from "@nestjs/common";
import type { Logger as TsLogger } from "tslog";

import { BookingDataPreparationService as BaseBookingDataPreparationService } from "@calcom/platform-libraries/bookings";

import { Logger } from "@/lib/logger.bridge";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { PrismaUserRepository } from "@/lib/repositories/prisma-user.repository";

@Injectable()
export class BookingDataPreparationService extends BaseBookingDataPreparationService {
  constructor(
    bridgeLogger: Logger,
    bookingRepository: PrismaBookingRepository,
    userRepository: PrismaUserRepository
  ) {
    super({
      log: bridgeLogger as unknown as TsLogger<unknown>,
      bookingRepository,
      userRepository,
    });
  }
}
