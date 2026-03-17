import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { PrismaTeamFeatureRepository as PrismaTeamFeatureRepositoryLib } from "@calcom/platform-libraries/repositories";
import type { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaTeamFeatureRepository extends PrismaTeamFeatureRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
