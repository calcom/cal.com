import { OrganizationSettingsRepository as BaseOrganizationSettingsRepository } from "@calcom/platform-libraries/organizations";
import type { PrismaClient } from "@calcom/prisma";
import { Injectable } from "@nestjs/common";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class PrismaOrganizationSettingsRepository extends BaseOrganizationSettingsRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {
    super(dbWrite.prisma as unknown as PrismaClient);
  }
}
