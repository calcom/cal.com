import { PrismaMembershipRepository as PrismaMembershipRepositoryLib } from "@calcom/platform-libraries/repositories";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaMembershipRepository extends PrismaMembershipRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
