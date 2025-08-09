import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { FilterHostsService } from "@/lib/services/filter-hosts.service";
import { Injectable } from "@nestjs/common";

import { QualifiedHostsService as BaseQualifiedHostsService } from "@calcom/platform-libraries/bookings";

@Injectable()
export class QualifiedHostsService extends BaseQualifiedHostsService {
  constructor(bookingRepository: PrismaBookingRepository) {
    super({
      bookingRepo: bookingRepository,
      filterHostsService: new FilterHostsService(bookingRepository),
    });
  }
}
