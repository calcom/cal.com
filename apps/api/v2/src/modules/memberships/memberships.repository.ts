import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class MembershipsRepository {
  constructor(private readonly dbRead: PrismaReadService) {}

  async findOrgUserMembership(organizationId: number, userId: number) {
    const membership = await this.dbRead.prisma.membership.findUniqueOrThrow({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: organizationId,
        },
      },
    });

    return membership;
  }
}
