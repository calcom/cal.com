import { FilterHostsService as BaseFilterHostsService } from "@calcom/platform-libraries/slots";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";

@Injectable()
export class FilterHostsService extends BaseFilterHostsService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
    });
  }
}
