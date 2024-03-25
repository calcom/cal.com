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

  async isUserOrganizationAdmin(userId: number, organizationId: number) {
    const adminMembership = await this.dbRead.prisma.membership.findFirst({
      where: {
        userId,
        teamId: organizationId,
        accepted: true,
        OR: [{ role: "ADMIN" }, { role: "OWNER" }],
      },
    });

    return !!adminMembership;
  }
}
