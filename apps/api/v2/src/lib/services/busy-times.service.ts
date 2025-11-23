import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { Injectable } from "@nestjs/common";

import { BusyTimesService as BaseBusyTimesService } from "@calcom/platform-libraries/slots";

@Injectable()
export class BusyTimesService extends BaseBusyTimesService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
