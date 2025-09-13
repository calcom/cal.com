import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { Injectable } from "@nestjs/common";

import { FilterHostsService as BaseFilterHostsService } from "@calcom/platform-libraries/slots";

@Injectable()
export class FilterHostsService extends BaseFilterHostsService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
