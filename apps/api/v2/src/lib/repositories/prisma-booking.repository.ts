import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { Injectable } from "@nestjs/common";

import { PrismaBookingRepository as PrismaBookingRepositoryLib } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaBookingRepository extends PrismaBookingRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
