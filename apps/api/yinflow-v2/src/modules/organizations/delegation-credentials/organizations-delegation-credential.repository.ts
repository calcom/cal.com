import { Injectable } from "@nestjs/common";

import { Prisma } from "@calcom/prisma/client";

import { PrismaReadService } from "../../prisma/prisma-read.service";

@Injectable()
export class OrganizationsDelegationCredentialRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

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
    return this.dbRead.prisma.delegationCredential.update({
      where: { id: delegationCredentialId },
      data,
      include: { workspacePlatform: true },
    });
  }
}
