import { QualifiedHostsService as BaseQualifiedHostsService } from "@calcom/platform-libraries/slots";
import { Injectable } from "@nestjs/common";
import { PrismaBookingRepository } from "@/lib/repositories/prisma-booking.repository";
import { FilterHostsService } from "@/lib/services/filter-hosts.service";

@Injectable()
export class QualifiedHostsService extends BaseQualifiedHostsService {
  constructor(bookingRepository: PrismaBookingRepository, filterHostsService: FilterHostsService) {
    super({
      bookingRepo: bookingRepository,
      filterHostsService,
    });
  }
}
