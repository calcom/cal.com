import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { RecurringBookingService as BaseRecurringBookingService } from "@calcom/platform-libraries/bookings";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class RecurringBookingService extends BaseRecurringBookingService {
  constructor(regularBookingService: RegularBookingService, prismaWriteService: PrismaWriteService) {
    super({
      regularBookingService,
      prismaClient: prismaWriteService.prisma as unknown as PrismaClient,
    });
  }
}
