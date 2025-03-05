import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

import { Prisma } from "@calcom/prisma/client";

@Injectable()
export class OrganizationsDwdRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(dwdId: string) {
    return this.dbRead.prisma.domainWideDelegation.findUnique({ where: { id: dwdId } });
  }

  async findByIdWithWorkspacePlatform(dwdId: string) {
    return this.dbRead.prisma.domainWideDelegation.findUnique({
      where: { id: dwdId },
      include: { workspacePlatform: true },
    });
  }

  async updateIncludeWorkspacePlatform(dwdId: string, data: Prisma.DomainWideDelegationUncheckedUpdateInput) {
    return this.dbRead.prisma.domainWideDelegation.update({
      where: { id: dwdId },
      data,
      include: { workspacePlatform: true },
    });
  }
}
