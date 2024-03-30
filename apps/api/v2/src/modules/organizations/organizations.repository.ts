import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findById(organizationId: number) {
    return this.dbRead.prisma.team.findUnique({
      where: {
        id: organizationId,
      },
    });
  }
}
