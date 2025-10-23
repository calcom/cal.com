import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { BookingCancelService as BaseBookingCancelService } from "@calcom/features/bookings/lib/handleCancelBooking";

@Injectable()
export class BookingCancelService extends BaseBookingCancelService {
  constructor(prismaWriteService: PrismaWriteService) {
    super({
      prismaClient: prismaWriteService.prisma,
    });
  }
}
