import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PlatformBillingRepository } from "@calcom/platform-libraries/organizations";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaPlatformBillingRepository extends PlatformBillingRepository {
  constructor(dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
