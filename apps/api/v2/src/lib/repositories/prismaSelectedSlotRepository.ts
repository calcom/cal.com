import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaSelectedSlotsRepository as PrismaSelectedSlotsRepositoryLib } from "@calcom/platform-libraries/repositories";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaSelectedSlotRepository extends PrismaSelectedSlotsRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
