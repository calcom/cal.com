import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import { FeaturesRepository as PrismaFeaturesRepositoryLib } from "@calcom/features/flags/features.repository";
import { PrismaClient } from "@calcom/prisma";

@Injectable()
export class PrismaFeaturesRepository extends PrismaFeaturesRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
