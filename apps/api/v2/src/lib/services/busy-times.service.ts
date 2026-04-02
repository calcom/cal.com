import { BusyTimesService as BaseBusyTimesService } from "@calcom/platform-libraries/slots";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";

@Injectable()
export class BusyTimesService extends BaseBusyTimesService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
