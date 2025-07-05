import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "@calcom/prisma/client";

@Injectable()
export class OrganizationsDelegationCredentialRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async findById(delegationCredentialId: string) {
    return this.dbRead.prisma.delegationCredential.findUnique({ where: { id: delegationCredentialId } });
  }

  async findByIdWithWorkspacePlatform(delegationCredentialId: string) {
    return this.dbRead.prisma.delegationCredential.findUnique({
      where: { id: delegationCredentialId },
      include: { workspacePlatform: true },
    });
  }

  async updateIncludeWorkspacePlatform(
    delegationCredentialId: string,
    data: Prisma.DelegationCredentialUncheckedUpdateInput
  ) {
    return this.dbWrite.prisma.delegationCredential.update({
      where: { id: delegationCredentialId },
      data,
      include: { workspacePlatform: true },
    });
  }

  async findDelegatedUserProfiles(orgId: number, domain: string) {
    return this.dbRead.prisma.profile.findMany({
      select: {
        userId: true,
      },
      where: {
        organizationId: orgId,
        user: { email: { endsWith: domain } },
      },
    });
  }
}
