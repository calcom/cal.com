import { PrismaBookingReportRepository as BasePrismaBookingReportRepository } from "@calcom/platform-libraries/bookings";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaBookingReportRepository extends BasePrismaBookingReportRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
