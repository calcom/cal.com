import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsDwdRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(dwdId: string) {
    return this.dbRead.prisma.domainWideDelegation.findUnique({ where: { id: dwdId } });
  }
}
