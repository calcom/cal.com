import {
  PrismaFeatureRepository as PrismaFeatureRepositoryLib,
  PrismaTeamFeatureRepository as PrismaTeamFeatureRepositoryLib,
  PrismaUserFeatureRepository as PrismaUserFeatureRepositoryLib,
} from "@calcom/platform-libraries/repositories";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaFeatureRepository extends PrismaFeatureRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}

@Injectable()
export class PrismaTeamFeatureRepository extends PrismaTeamFeatureRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}

@Injectable()
export class PrismaUserFeatureRepository extends PrismaUserFeatureRepositoryLib {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
