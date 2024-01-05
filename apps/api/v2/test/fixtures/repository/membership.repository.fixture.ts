import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Membership, MembershipRole, Prisma, Team, User } from "@prisma/client";

export class MembershipRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async create(data: Prisma.MembershipCreateInput) {
    return this.prismaWriteClient.membership.create({ data });
  }

  async delete(membershipId: Membership["id"]) {
    return this.prismaWriteClient.membership.delete({ where: { id: membershipId } });
  }

  async get(membershipId: Membership["id"]) {
    return this.primaReadClient.membership.findFirst({ where: { id: membershipId } });
  }

  async addUserToOrg(user: User, org: Team, role: MembershipRole, accepted: boolean) {
    const membership = await this.prismaWriteClient.membership.create({
      data: { teamId: org.id, userId: user.id, role, accepted },
    });
    await this.prismaWriteClient.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
    return membership;
  }
}
